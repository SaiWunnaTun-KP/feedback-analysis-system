import { Router } from 'express';
import { db } from '../database/index.ts';
import { datasets, reviews, feedbackResults } from '../database/schema.ts';
import { eq, and, sql, desc } from 'drizzle-orm';
import { authenticate } from '../middlewares/authMiddleware.ts';

const router = Router();

export const PRODUCT_MATRIX_CONFIG = {
  star: {
    minPositivePct: 75,
    maxNegativePct: 15,
  },
  needsAttention: {
    minNegativePct: 30,
  },
  minVolumeForClassification: 5,
};

export function classifyProduct(p: { positivePct: number; negativePct: number; total: number }): "star" | "needs_attention" | "mixed" {
  const { positivePct, negativePct, total } = p;
  if (total < PRODUCT_MATRIX_CONFIG.minVolumeForClassification) return "mixed";
  if (positivePct >= PRODUCT_MATRIX_CONFIG.star.minPositivePct && negativePct <= PRODUCT_MATRIX_CONFIG.star.maxNegativePct) {
    return "star";
  }
  if (negativePct >= PRODUCT_MATRIX_CONFIG.needsAttention.minNegativePct || negativePct > positivePct) {
    return "needs_attention";
  }
  return "mixed";
}

async function getProductMatrixHandler(req: any, res: any) {
  try {
    let datasetId = parseInt(req.params.datasetId || req.query.datasetId as string);

    if (!datasetId || isNaN(datasetId)) {
      // Find latest completed dataset for user
      const userDatasets = await db
        .select()
        .from(datasets)
        .where(and(eq(datasets.userId, req.user.userId), eq(datasets.status, 'COMPLETED')))
        .orderBy(desc(datasets.createdAt))
        .limit(1);

      if (userDatasets.length === 0) {
        return res.json({
          tabs: { star: 0, needs_attention: 0, mixed: 0 },
          products: [],
          pagination: {
            page: 1,
            page_size: 10,
            total_items: 0,
            total_pages: 1,
          },
        });
      }
      datasetId = userDatasets[0].id;
    } else {
      const [dataset] = await db
        .select()
        .from(datasets)
        .where(and(eq(datasets.id, datasetId), eq(datasets.userId, req.user.userId)));
      if (!dataset) {
        return res.status(404).json({ error: 'Dataset not found or unauthorized' });
      }
      if (dataset.status !== 'COMPLETED') {
        return res.status(400).json({ error: 'Dataset analysis is not completed yet' });
      }
    }

    const categoryParam = ((req.query.category as string) || 'needs_attention').toLowerCase();
    const category = categoryParam === 'needsattention' ? 'needs_attention' : categoryParam;
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const sort = ((req.query.sort as string) || 'volume').toLowerCase();
    const minVolume = parseInt((req.query.min_volume || req.query.minVolume) as string) || 5;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.max(1, parseInt((req.query.page_size || req.query.pageSize) as string) || 10);

    const productStats = await db.execute(sql`
      SELECT 
        r.product_name, 
        SUM(CASE WHEN f.sentiment = 'Positive' THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN f.sentiment = 'Negative' THEN 1 ELSE 0 END) as negative_count,
        COUNT(*) as total_count
      FROM ${feedbackResults} f
      JOIN ${reviews} r ON f.review_id = r.id
      WHERE r.dataset_id = ${datasetId}
      GROUP BY r.product_name
    `);

    const rows = Array.isArray(productStats) ? productStats : ((productStats as any).rows || []);

    const allProducts = rows.map((row: any) => {
      const pCount = Number(row.positive_count) || 0;
      const nCount = Number(row.negative_count) || 0;
      const total = Number(row.total_count) || 0;

      const posPct = total > 0 ? Math.round((pCount / total) * 100) : 0;
      const negPct = total > 0 ? Math.round((nCount / total) * 100) : 0;
      const neuCount = Math.max(0, total - pCount - nCount);
      const prodScore = total > 0 
        ? Number(((pCount * 5.0 + neuCount * 3.0 + nCount * 1.0) / total).toFixed(1))
        : 0;
      const netScore = posPct - negPct;

      return {
        name: row.product_name,
        totalReviews: total,
        positivePct: posPct,
        negativePct: negPct,
        netScore,
        score: prodScore,
        category: classifyProduct({ positivePct: posPct, negativePct: negPct, total }),
      };
    });

    // 1. Apply search and min_volume before classification & counting
    const filtered = allProducts.filter((item) => {
      if (item.totalReviews < minVolume) return false;
      if (search && !item.name.toLowerCase().includes(search)) return false;
      return true;
    });

    // 2. Count for tabs based on filtered dataset
    const tabs = {
      star: 0,
      needs_attention: 0,
      mixed: 0,
    };

    filtered.forEach((item) => {
      if (item.category === 'star') tabs.star++;
      else if (item.category === 'needs_attention') tabs.needs_attention++;
      else tabs.mixed++;
    });

    // 3. Filter by selected category
    const categoryProducts = filtered.filter((item) => item.category === category);

    // 4. Sort - All options ascending when chosen
    categoryProducts.sort((a, b) => {
      switch (sort) {
        case 'volume':
          if (a.totalReviews !== b.totalReviews) return a.totalReviews - b.totalReviews;
          return a.name.localeCompare(b.name);
        case 'net_score':
        case 'netscore':
          if (a.netScore !== b.netScore) return a.netScore - b.netScore;
          return a.totalReviews - b.totalReviews;
        case 'pos_pct':
        case 'positivepct':
          if (a.positivePct !== b.positivePct) return a.positivePct - b.positivePct;
          return a.totalReviews - b.totalReviews;
        case 'neg_pct':
        case 'negativepct':
          if (a.negativePct !== b.negativePct) return a.negativePct - b.negativePct;
          return a.totalReviews - b.totalReviews;
        default:
          return a.totalReviews - b.totalReviews;
      }
    });

    // 5. Pagination
    const total_items = categoryProducts.length;
    const total_pages = Math.ceil(total_items / pageSize) || 1;
    const safePage = Math.min(page, total_pages);
    const offset = (safePage - 1) * pageSize;
    const pagedProducts = categoryProducts.slice(offset, offset + pageSize);

    return res.json({
      tabs,
      products: pagedProducts,
      pagination: {
        page: safePage,
        page_size: pageSize,
        total_items,
        total_pages,
      },
    });
  } catch (error) {
    console.error('Error fetching product matrix:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/reports/product-matrix
router.get('/product-matrix', authenticate, getProductMatrixHandler);
// GET /api/reports/:datasetId/product-matrix
router.get('/:datasetId/product-matrix', authenticate, getProductMatrixHandler);

// GET /api/reports/:datasetId/overview
router.get('/:datasetId/overview', authenticate, async (req: any, res: any) => {
  try {
    const datasetId = parseInt(req.params.datasetId);

    // Check if dataset belongs to user and is COMPLETED
    const [dataset] = await db.select().from(datasets).where(and(eq(datasets.id, datasetId), eq(datasets.userId, req.user.userId)));
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found or unauthorized' });
    }
    if (dataset.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Dataset analysis is not completed yet' });
    }

    // 1. Executive Overview Stats & Doughnut Chart Data
    const sentimentCounts = await db.execute(sql`
      SELECT f.sentiment, COUNT(*) as count 
      FROM ${feedbackResults} f
      JOIN ${reviews} r ON f.review_id = r.id
      WHERE r.dataset_id = ${datasetId}
      GROUP BY f.sentiment
    `);

    let totalFeedbacks = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    sentimentCounts.rows.forEach((row: any) => {
      const count = Number(row.count);
      totalFeedbacks += count;
      if (row.sentiment === 'Positive') positiveCount += count;
      if (row.sentiment === 'Negative') negativeCount += count;
      if (row.sentiment === 'Neutral') neutralCount += count;
    });

    const positivePct = totalFeedbacks > 0 ? Math.round((positiveCount / totalFeedbacks) * 100) : 0;
    const negativePct = totalFeedbacks > 0 ? Math.round((negativeCount / totalFeedbacks) * 100) : 0;
    const neutralPct = totalFeedbacks > 0 ? Math.max(0, 100 - positivePct - negativePct) : 0;

    // Option A: 5.0 for Positive, 3.0 for Neutral, 1.0 for Negative
    const averageScore = totalFeedbacks > 0 
      ? Number(((positiveCount * 5.0 + neutralCount * 3.0 + negativeCount * 1.0) / totalFeedbacks).toFixed(1))
      : 0;

    const healthScore = positivePct;

    const sentimentBreakdown = [
      { name: 'Positive', value: positiveCount, fill: '#10b981', pct: positivePct },
      { name: 'Negative', value: negativeCount, fill: '#f43f5e', pct: negativePct },
      { name: 'Neutral', value: neutralCount, fill: '#38bdf8', pct: neutralPct }
    ];

    // Top / Critical Products
    const productStats = await db.execute(sql`
      SELECT 
        r.product_name, 
        SUM(CASE WHEN f.sentiment = 'Positive' THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN f.sentiment = 'Negative' THEN 1 ELSE 0 END) as negative_count,
        COUNT(*) as total_count
      FROM ${feedbackResults} f
      JOIN ${reviews} r ON f.review_id = r.id
      WHERE r.dataset_id = ${datasetId}
      GROUP BY r.product_name
    `);

    let topProduct = 'N/A';
    let criticalProduct = 'N/A';
    let topProductDetails: any = null;
    let criticalProductDetails: any = null;
    let maxPos = -1;
    let maxNeg = -1;

    const actionMatrix = {
      star: [] as any[],
      needsAttention: [] as any[],
      mixed: [] as any[]
    };

    productStats.rows.forEach((row: any) => {
      const pCount = Number(row.positive_count);
      const nCount = Number(row.negative_count);
      const total = Number(row.total_count);

      const posPct = total > 0 ? (pCount / total) * 100 : 0;
      const negPct = total > 0 ? (nCount / total) * 100 : 0;
      const neuCount = Math.max(0, total - pCount - nCount);
      const prodScore = total > 0 
        ? Number(((pCount * 5.0 + neuCount * 3.0 + nCount * 1.0) / total).toFixed(1))
        : 0;

      if (pCount > maxPos) {
        maxPos = pCount;
        topProduct = row.product_name;
        topProductDetails = {
          name: row.product_name,
          positiveCount: pCount,
          totalReviews: total,
          positivePct: Math.round(posPct),
          score: prodScore
        };
      }
      if (nCount > maxNeg) {
        maxNeg = nCount;
        criticalProduct = row.product_name;
        criticalProductDetails = {
          name: row.product_name,
          negativeCount: nCount,
          totalReviews: total,
          negativePct: Math.round(negPct),
          score: prodScore
        };
      }

      // Product Action Matrix
      const productData = {
        name: row.product_name,
        totalReviews: total,
        positivePct: Math.round(posPct),
        negativePct: Math.round(negPct),
        score: prodScore
      };

      if (posPct >= 80) {
        actionMatrix.star.push(productData);
      } else if (negPct >= 40) {
        actionMatrix.needsAttention.push(productData);
      } else {
        actionMatrix.mixed.push(productData);
      }
    });

    // Aspect Performance
    const aspectStats = await db.execute(sql`
      SELECT 
        f.aspect,
        SUM(CASE WHEN f.sentiment = 'Positive' THEN 1 ELSE 0 END) as positive,
        SUM(CASE WHEN f.sentiment = 'Negative' THEN 1 ELSE 0 END) as negative,
        SUM(CASE WHEN f.sentiment = 'Neutral' THEN 1 ELSE 0 END) as neutral
      FROM ${feedbackResults} f
      JOIN ${reviews} r ON f.review_id = r.id
      WHERE r.dataset_id = ${datasetId}
      GROUP BY f.aspect
    `);

    const aspectPerformance = aspectStats.rows.map((row: any) => ({
      aspect: row.aspect,
      Positive: Number(row.positive),
      Negative: Number(row.negative),
      Neutral: Number(row.neutral)
    }));

    res.json({
      executiveOverview: {
        totalFeedbacks,
        healthScore,
        averageScore,
        positiveCount,
        negativeCount,
        neutralCount,
        positivePct,
        negativePct,
        neutralPct,
        topProduct,
        criticalProduct,
        topProductDetails,
        criticalProductDetails,
        sentimentBreakdown
      },
      actionMatrix,
      aspectPerformance,
      products: productStats.rows.map((r: any) => r.product_name), // for filter dropdown
      aspects: aspectStats.rows.map((r: any) => r.aspect) // for filter dropdown
    });

  } catch (error) {
    console.error('Error fetching overview report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// GET /api/reports/:datasetId/drilldown
router.get('/:datasetId/drilldown', authenticate, async (req: any, res: any) => {
  try {
    const datasetId = parseInt(req.params.datasetId);

    // Check if dataset belongs to user
    const [dataset] = await db.select().from(datasets).where(and(eq(datasets.id, datasetId), eq(datasets.userId, req.user.userId)));
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found or unauthorized' });
    }

    const { product, polarity, aspect, keyword } = req.query;

    const conditions = [sql`r.dataset_id = ${datasetId}`];

    if (product && product !== 'all') {
      conditions.push(sql`r.product_name = ${product}`);
    }
    if (polarity && polarity !== 'all') {
      conditions.push(sql`f.sentiment = ${polarity}`);
    }
    if (aspect && aspect !== 'all') {
      conditions.push(sql`f.aspect = ${aspect}`);
    }
    if (keyword) {
      conditions.push(sql`f.opinion ILIKE ${'%' + keyword + '%'}`);
    }

    const whereClause = sql.join(conditions, sql` AND `);

    // Triplet Table data
    const query = sql`
      SELECT f.aspect, f.opinion, f.sentiment, COUNT(*) as frequency
      FROM feedback_results f
      JOIN reviews r ON f.review_id = r.id
      WHERE ${whereClause}
      GROUP BY f.aspect, f.opinion, f.sentiment
      ORDER BY frequency DESC
    `;

    const result = await db.execute(query);

    // Prepare Word Cloud Data
    // Group by opinion text and sum frequency
    const wordMap = new Map<string, { text: string; value: number; sentiment: string }>();

    const rows = Array.isArray(result) ? result : (result as any).rows || [];

    const triplets = rows.map((r: any) => {
      const freq = Number(r.frequency);
      const text = String(r.opinion);
      const sentiment = String(r.sentiment);

      if (wordMap.has(text)) {
        const existing = wordMap.get(text)!;
        existing.value += freq;
      } else {
        wordMap.set(text, { text, value: freq, sentiment });
      }

      return {
        aspect: r.aspect,
        opinion: text,
        polarity: sentiment,
        frequency: freq
      };
    });

    res.json({
      triplets,
      wordCloud: Array.from(wordMap.values())
    });

  } catch (error) {
    console.error('Error fetching drilldown report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/:datasetId/product/:productName or /api/reports/product/:productName
async function getProductDetailHandler(req: any, res: any) {
  try {
    let datasetId = parseInt(req.params.datasetId || (req.query.datasetId as string));
    const productName = decodeURIComponent(req.params.productName || '');

    if (!productName) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    if (!datasetId || isNaN(datasetId)) {
      // Find latest completed dataset for user
      const userDatasets = await db
        .select()
        .from(datasets)
        .where(and(eq(datasets.userId, req.user.userId), eq(datasets.status, 'COMPLETED')))
        .orderBy(desc(datasets.createdAt))
        .limit(1);

      if (userDatasets.length === 0) {
        return res.status(404).json({ error: 'No completed dataset found' });
      }
      datasetId = userDatasets[0].id;
    } else {
      const [dataset] = await db
        .select()
        .from(datasets)
        .where(and(eq(datasets.id, datasetId), eq(datasets.userId, req.user.userId)));
      if (!dataset) {
        return res.status(404).json({ error: 'Dataset not found or unauthorized' });
      }
    }

    // 1. Product Summary
    const productStatsResult = await db.execute(sql`
      SELECT 
        r.product_name,
        COUNT(DISTINCT r.id) as total_reviews,
        SUM(CASE WHEN f.sentiment = 'Positive' THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN f.sentiment = 'Negative' THEN 1 ELSE 0 END) as negative_count,
        SUM(CASE WHEN f.sentiment = 'Neutral' THEN 1 ELSE 0 END) as neutral_count,
        MAX(r.created_at) as last_updated
      FROM ${reviews} r
      LEFT JOIN ${feedbackResults} f ON r.id = f.review_id
      WHERE r.dataset_id = ${datasetId} AND r.product_name = ${productName}
      GROUP BY r.product_name
    `);

    const statsRows = Array.isArray(productStatsResult) ? productStatsResult : ((productStatsResult as any).rows || []);
    if (statsRows.length === 0) {
      return res.status(404).json({ error: 'Product not found in this dataset' });
    }

    const stat = statsRows[0];
    const totalReviews = Number(stat.total_reviews) || 0;
    const pCount = Number(stat.positive_count) || 0;
    const nCount = Number(stat.negative_count) || 0;
    const neuCount = Number(stat.neutral_count) || 0;
    const totalSentiments = pCount + nCount + neuCount || 1;

    const positivePct = Math.round((pCount / totalSentiments) * 100);
    const negativePct = Math.round((nCount / totalSentiments) * 100);
    const netScore = positivePct - negativePct;

    // 2. Aspect Drivers (Positive & Negative Impact)
    const aspectStatsResult = await db.execute(sql`
      SELECT 
        f.aspect,
        SUM(CASE WHEN f.sentiment = 'Positive' THEN 1 ELSE 0 END) as pos_count,
        SUM(CASE WHEN f.sentiment = 'Negative' THEN 1 ELSE 0 END) as neg_count,
        SUM(CASE WHEN f.sentiment = 'Neutral' THEN 1 ELSE 0 END) as neu_count,
        COUNT(*) as mention_count
      FROM ${feedbackResults} f
      JOIN ${reviews} r ON f.review_id = r.id
      WHERE r.dataset_id = ${datasetId} AND r.product_name = ${productName}
      GROUP BY f.aspect
    `);

    const aspectRows = Array.isArray(aspectStatsResult) ? aspectStatsResult : ((aspectStatsResult as any).rows || []);

    // Get top opinion words for each aspect
    const opinionsResult = await db.execute(sql`
      SELECT 
        f.aspect,
        f.opinion,
        COUNT(*) as count
      FROM ${feedbackResults} f
      JOIN ${reviews} r ON f.review_id = r.id
      WHERE r.dataset_id = ${datasetId} AND r.product_name = ${productName}
      GROUP BY f.aspect, f.opinion
      ORDER BY count DESC
    `);
    const opinionRows = Array.isArray(opinionsResult) ? opinionsResult : ((opinionsResult as any).rows || []);
    const aspectTopOpinions: Record<string, string[]> = {};
    opinionRows.forEach((r: any) => {
      const asp = r.aspect;
      if (!aspectTopOpinions[asp]) aspectTopOpinions[asp] = [];
      if (aspectTopOpinions[asp].length < 3 && r.opinion) {
        aspectTopOpinions[asp].push(r.opinion);
      }
    });

    const negativeDrivers: any[] = [];
    const positiveDrivers: any[] = [];

    aspectRows.forEach((row: any) => {
      const aspect = row.aspect;
      const pos = Number(row.pos_count) || 0;
      const neg = Number(row.neg_count) || 0;
      const mentions = Number(row.mention_count) || 0;

      // Impact score: aspect contribution to Net Score (scaled to points)
      const rawImpact = totalSentiments > 0 ? ((pos - neg) / totalSentiments) * 100 : 0;
      const impact = Number(rawImpact.toFixed(1));

      const driverItem = {
        aspect,
        impact,
        mentionCount: mentions,
        topOpinions: aspectTopOpinions[aspect] || [],
      };

      if (impact < 0 || (impact === 0 && neg > pos)) {
        negativeDrivers.push(driverItem);
      } else if (impact > 0 || (impact === 0 && pos >= neg)) {
        positiveDrivers.push(driverItem);
      }
    });

    // Sort negative drivers: most negative first (ascending: -14.2, -8.1, etc.)
    negativeDrivers.sort((a, b) => a.impact - b.impact);
    // Sort positive drivers: most positive first (descending: +20.5, +12.3, etc.)
    positiveDrivers.sort((a, b) => b.impact - a.impact);

    // Limit to top 8
    const topNegativeDrivers = negativeDrivers.slice(0, 8);
    const topPositiveDrivers = positiveDrivers.slice(0, 8);

    // 3. Word Cloud Data (with optional aspect & keyword filtering)
    const { aspect: filterAspect, keyword: filterKeyword } = req.query;
    const wcConditions = [
      sql`r.dataset_id = ${datasetId}`,
      sql`r.product_name = ${productName}`,
      sql`f.opinion IS NOT NULL`,
      sql`f.opinion != ''`
    ];
    if (filterAspect && filterAspect !== 'all') {
      wcConditions.push(sql`f.aspect = ${filterAspect}`);
    }
    if (filterKeyword) {
      wcConditions.push(sql`f.opinion ILIKE ${'%' + filterKeyword + '%'}`);
    }

    const wcResult = await db.execute(sql`
      SELECT f.opinion, f.sentiment, COUNT(*) as frequency
      FROM ${feedbackResults} f
      JOIN ${reviews} r ON f.review_id = r.id
      WHERE ${sql.join(wcConditions, sql` AND `)}
      GROUP BY f.opinion, f.sentiment
      ORDER BY frequency DESC
      LIMIT 80
    `);
    const wcRows = Array.isArray(wcResult) ? wcResult : ((wcResult as any).rows || []);
    const wordCloud = wcRows.map((r: any) => ({
      text: String(r.opinion),
      value: Number(r.frequency),
      sentiment: String(r.sentiment),
    }));

    // 4. Key Quotes (Positive and Negative quotes, with optional aspect & keyword filtering)
    const quoteConditions = [
      sql`r.dataset_id = ${datasetId}`,
      sql`r.product_name = ${productName}`
    ];
    if (filterAspect && filterAspect !== 'all') {
      quoteConditions.push(sql`f.aspect = ${filterAspect}`);
    }
    if (filterKeyword) {
      quoteConditions.push(sql`(f.opinion ILIKE ${'%' + filterKeyword + '%'} OR r.review_text ILIKE ${'%' + filterKeyword + '%'})`);
    }

    const quotesResult = await db.execute(sql`
      SELECT DISTINCT ON (r.id, f.sentiment)
        r.id,
        r.review_text,
        r.created_at,
        f.aspect,
        f.opinion,
        f.sentiment
      FROM ${reviews} r
      JOIN ${feedbackResults} f ON r.id = f.review_id
      WHERE ${sql.join(quoteConditions, sql` AND `)}
      ORDER BY r.id, f.sentiment, r.created_at DESC
      LIMIT 40
    `);
    const quoteRows = Array.isArray(quotesResult) ? quotesResult : ((quotesResult as any).rows || []);

    const positiveQuotes: any[] = [];
    const negativeQuotes: any[] = [];

    quoteRows.forEach((r: any) => {
      const item = {
        id: String(r.id),
        text: r.review_text,
        aspect: r.aspect,
        opinion: r.opinion,
        sentiment: r.sentiment,
        date: r.created_at ? new Date(r.created_at).toLocaleDateString() : undefined,
      };
      if (r.sentiment === 'Positive' && positiveQuotes.length < 6) {
        positiveQuotes.push(item);
      } else if (r.sentiment === 'Negative' && negativeQuotes.length < 6) {
        negativeQuotes.push(item);
      }
    });

    return res.json({
      product: {
        name: stat.product_name,
        totalReviews,
        positivePct,
        negativePct,
        netScore,
        lastUpdated: stat.last_updated ? new Date(stat.last_updated).toLocaleDateString() : undefined,
      },
      drivers: {
        negative: topNegativeDrivers,
        positive: topPositiveDrivers,
      },
      wordCloud,
      quotes: {
        positive: positiveQuotes,
        negative: negativeQuotes,
      },
    });

  } catch (error) {
    console.error('Error fetching product detail analysis:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

router.get('/:datasetId/product/:productName', authenticate, getProductDetailHandler);
router.get('/product/:productName', authenticate, getProductDetailHandler);

export default router;
