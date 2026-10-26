import { Router } from 'express';
import { db } from '../database/index.ts';
import { datasets, reviews, feedbackResults } from '../database/schema.ts';
import { eq, and, sql } from 'drizzle-orm';
import { authenticate } from '../middlewares/authMiddleware.ts';

const router = Router();

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

export default router;
