import { Response } from 'express';
import { AuthRequest } from '../../middlewares/authMiddleware.js';
import * as reportsService from './reports.service.js';

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

export function classifyProduct(p: {
  positivePct: number;
  negativePct: number;
  total: number;
}): 'star' | 'needs_attention' | 'mixed' {
  const { positivePct, negativePct, total } = p;
  if (total < PRODUCT_MATRIX_CONFIG.minVolumeForClassification) return 'mixed';
  if (positivePct >= PRODUCT_MATRIX_CONFIG.star.minPositivePct && negativePct <= PRODUCT_MATRIX_CONFIG.star.maxNegativePct) {
    return 'star';
  }
  if (negativePct >= PRODUCT_MATRIX_CONFIG.needsAttention.minNegativePct || negativePct > positivePct) {
    return 'needs_attention';
  }
  return 'mixed';
}

export async function getProductMatrix(req: AuthRequest, res: Response) {
  try {
    let datasetId = parseInt(String(req.params.datasetId || req.query.datasetId || ''));

    if (!datasetId || isNaN(datasetId)) {
      const latest = await reportsService.findLatestCompletedDataset(req.user!.userId);
      if (!latest) {
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
      datasetId = latest.id;
    } else {
      const dataset = await reportsService.findDatasetByIdAndUser(datasetId, req.user!.userId);
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

    const rows = await reportsService.getProductStatsByDataset(datasetId);

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
        name: row.product_name as string,
        totalReviews: total,
        positivePct: posPct,
        negativePct: negPct,
        netScore,
        score: prodScore,
        category: classifyProduct({ positivePct: posPct, negativePct: negPct, total }),
      };
    });

    const filtered = allProducts.filter((item: any) => {
      if (item.totalReviews < minVolume) return false;
      if (search && !item.name.toLowerCase().includes(search)) return false;
      return true;
    });

    const tabs = { star: 0, needs_attention: 0, mixed: 0 };
    filtered.forEach((item: any) => {
      if (item.category === 'star') tabs.star++;
      else if (item.category === 'needs_attention') tabs.needs_attention++;
      else tabs.mixed++;
    });

    const categoryProducts = filtered.filter((item: any) => item.category === category);

    categoryProducts.sort((a: any, b: any) => {
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

export async function getOverviewReport(req: AuthRequest, res: Response) {
  try {
    const datasetId = parseInt(String(req.params.datasetId));

    const dataset = await reportsService.findDatasetByIdAndUser(datasetId, req.user!.userId);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found or unauthorized' });
    }
    if (dataset.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Dataset analysis is not completed yet' });
    }

    const sentimentRows = await reportsService.getSentimentCountsByDataset(datasetId);

    let totalFeedbacks = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    sentimentRows.forEach((row: any) => {
      const cnt = Number(row.count);
      totalFeedbacks += cnt;
      if (row.sentiment === 'Positive') positiveCount += cnt;
      if (row.sentiment === 'Negative') negativeCount += cnt;
      if (row.sentiment === 'Neutral') neutralCount += cnt;
    });

    const positivePct = totalFeedbacks > 0 ? Math.round((positiveCount / totalFeedbacks) * 100) : 0;
    const negativePct = totalFeedbacks > 0 ? Math.round((negativeCount / totalFeedbacks) * 100) : 0;
    const neutralPct = totalFeedbacks > 0 ? Math.max(0, 100 - positivePct - negativePct) : 0;

    const averageScore = totalFeedbacks > 0
      ? Number(((positiveCount * 5.0 + neutralCount * 3.0 + negativeCount * 1.0) / totalFeedbacks).toFixed(1))
      : 0;
    const healthScore = positivePct;

    const sentimentBreakdown = [
      { name: 'Positive', value: positiveCount, fill: '#10b981', pct: positivePct },
      { name: 'Negative', value: negativeCount, fill: '#f43f5e', pct: negativePct },
      { name: 'Neutral', value: neutralCount, fill: '#38bdf8', pct: neutralPct },
    ];

    const productRows = await reportsService.getProductStatsByDataset(datasetId);

    let topProduct = 'N/A';
    let criticalProduct = 'N/A';
    let topProductDetails: any = null;
    let criticalProductDetails: any = null;
    let maxPos = -1;
    let maxNeg = -1;

    const actionMatrix = {
      star: [] as any[],
      needsAttention: [] as any[],
      mixed: [] as any[],
    };

    productRows.forEach((row: any) => {
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
          score: prodScore,
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
          score: prodScore,
        };
      }

      const productData = {
        name: row.product_name,
        totalReviews: total,
        positivePct: Math.round(posPct),
        negativePct: Math.round(negPct),
        score: prodScore,
      };

      if (posPct >= 80) {
        actionMatrix.star.push(productData);
      } else if (negPct >= 40) {
        actionMatrix.needsAttention.push(productData);
      } else {
        actionMatrix.mixed.push(productData);
      }
    });

    const aspectRows = await reportsService.getAspectStatsByDataset(datasetId);
    const aspectPerformance = aspectRows.map((row: any) => ({
      aspect: row.aspect,
      Positive: Number(row.positive),
      Negative: Number(row.negative),
      Neutral: Number(row.neutral),
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
        sentimentBreakdown,
      },
      actionMatrix,
      aspectPerformance,
      products: productRows.map((r: any) => r.product_name),
      aspects: aspectRows.map((r: any) => r.aspect),
    });
  } catch (error) {
    console.error('Error fetching overview report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getDrilldownReport(req: AuthRequest, res: Response) {
  try {
    const datasetId = parseInt(String(req.params.datasetId));

    const dataset = await reportsService.findDatasetByIdAndUser(datasetId, req.user!.userId);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found or unauthorized' });
    }

    const { product, polarity, aspect, keyword } = req.query;
    const rows = await reportsService.getDrilldownTriplets({
      datasetId,
      product: product as string | undefined,
      polarity: polarity as string | undefined,
      aspect: aspect as string | undefined,
      keyword: keyword as string | undefined,
    });

    const wordMap = new Map<string, { text: string; value: number; sentiment: string }>();

    const triplets = rows.map((r: any) => {
      const freq = Number(r.frequency);
      const text = String(r.opinion);
      const sentiment = String(r.sentiment);

      if (wordMap.has(text)) {
        wordMap.get(text)!.value += freq;
      } else {
        wordMap.set(text, { text, value: freq, sentiment });
      }

      return {
        aspect: r.aspect,
        opinion: text,
        polarity: sentiment,
        frequency: freq,
      };
    });

    res.json({
      triplets,
      wordCloud: Array.from(wordMap.values()),
    });
  } catch (error) {
    console.error('Error fetching drilldown report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getProductDetail(req: AuthRequest, res: Response) {
  try {
    let datasetId = parseInt(String(req.params.datasetId || req.query.datasetId || ''));
    const productName = decodeURIComponent(String(req.params.productName || ''));

    if (!productName) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    if (!datasetId || isNaN(datasetId)) {
      const latest = await reportsService.findLatestCompletedDataset(req.user!.userId);
      if (!latest) {
        return res.status(404).json({ error: 'No completed dataset found' });
      }
      datasetId = latest.id;
    } else {
      const dataset = await reportsService.findDatasetByIdAndUser(datasetId, req.user!.userId);
      if (!dataset) {
        return res.status(404).json({ error: 'Dataset not found or unauthorized' });
      }
    }

    const stat = await reportsService.getProductSummaryStats(datasetId, productName);
    if (!stat) {
      return res.status(404).json({ error: 'Product not found in this dataset' });
    }

    const totalReviews = Number(stat.total_reviews) || 0;
    const pCount = Number(stat.positive_count) || 0;
    const nCount = Number(stat.negative_count) || 0;
    const neuCount = Number(stat.neutral_count) || 0;
    const totalSentiments = pCount + nCount + neuCount || 1;

    const positivePct = Math.round((pCount / totalSentiments) * 100);
    const negativePct = Math.round((nCount / totalSentiments) * 100);
    const netScore = positivePct - negativePct;

    const aspectRows = await reportsService.getProductAspectDrivers(datasetId, productName);
    const opinionRows = await reportsService.getProductTopOpinions(datasetId, productName);

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

    negativeDrivers.sort((a, b) => a.impact - b.impact);
    positiveDrivers.sort((a, b) => b.impact - a.impact);

    const { aspect: filterAspect, keyword: filterKeyword } = req.query;

    const wcRows = await reportsService.getProductWordCloud({
      datasetId,
      productName,
      filterAspect: filterAspect as string | undefined,
      filterKeyword: filterKeyword as string | undefined,
    });
    const wordCloud = wcRows.map((r: any) => ({
      text: String(r.opinion),
      value: Number(r.frequency),
      sentiment: String(r.sentiment),
    }));

    const quoteRows = await reportsService.getProductQuotes({
      datasetId,
      productName,
      filterAspect: filterAspect as string | undefined,
      filterKeyword: filterKeyword as string | undefined,
    });

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
        negative: negativeDrivers.slice(0, 8),
        positive: positiveDrivers.slice(0, 8),
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
