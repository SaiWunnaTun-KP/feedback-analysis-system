import { db } from '../../database/index.js';
import { datasets, reviews, feedbackResults } from '../../database/schema.js';
import { eq, and, sql, desc } from 'drizzle-orm';

export async function findLatestCompletedDataset(userId: number) {
  const userDatasets = await db
    .select()
    .from(datasets)
    .where(and(eq(datasets.userId, userId), eq(datasets.status, 'COMPLETED')))
    .orderBy(desc(datasets.createdAt))
    .limit(1);
  return userDatasets[0] || null;
}

export async function findDatasetByIdAndUser(datasetId: number, userId: number) {
  const [dataset] = await db
    .select()
    .from(datasets)
    .where(and(eq(datasets.id, datasetId), eq(datasets.userId, userId)));
  return dataset || null;
}

export async function getProductStatsByDataset(datasetId: number) {
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
  return Array.isArray(productStats) ? productStats : ((productStats as any).rows || []);
}

export async function getSentimentCountsByDataset(datasetId: number) {
  const sentimentCounts = await db.execute(sql`
    SELECT f.sentiment, COUNT(*) as count 
    FROM ${feedbackResults} f
    JOIN ${reviews} r ON f.review_id = r.id
    WHERE r.dataset_id = ${datasetId}
    GROUP BY f.sentiment
  `);
  return Array.isArray(sentimentCounts) ? sentimentCounts : ((sentimentCounts as any).rows || []);
}

export async function getAspectStatsByDataset(datasetId: number) {
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
  return Array.isArray(aspectStats) ? aspectStats : ((aspectStats as any).rows || []);
}

export async function getDrilldownTriplets(params: {
  datasetId: number;
  product?: string;
  polarity?: string;
  aspect?: string;
  keyword?: string;
}) {
  const conditions = [sql`r.dataset_id = ${params.datasetId}`];

  if (params.product && params.product !== 'all') {
    conditions.push(sql`r.product_name = ${params.product}`);
  }
  if (params.polarity && params.polarity !== 'all') {
    conditions.push(sql`f.sentiment = ${params.polarity}`);
  }
  if (params.aspect && params.aspect !== 'all') {
    conditions.push(sql`f.aspect = ${params.aspect}`);
  }
  if (params.keyword) {
    conditions.push(sql`f.opinion ILIKE ${'%' + params.keyword + '%'}`);
  }

  const whereClause = sql.join(conditions, sql` AND `);

  const result = await db.execute(sql`
    SELECT f.aspect, f.opinion, f.sentiment, COUNT(*) as frequency
    FROM feedback_results f
    JOIN reviews r ON f.review_id = r.id
    WHERE ${whereClause}
    GROUP BY f.aspect, f.opinion, f.sentiment
    ORDER BY frequency DESC
  `);

  return Array.isArray(result) ? result : (result as any).rows || [];
}

export async function getProductSummaryStats(datasetId: number, productName: string) {
  const result = await db.execute(sql`
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
  const rows = Array.isArray(result) ? result : ((result as any).rows || []);
  return rows[0] || null;
}

export async function getProductAspectDrivers(datasetId: number, productName: string) {
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
  return Array.isArray(aspectStatsResult) ? aspectStatsResult : ((aspectStatsResult as any).rows || []);
}

export async function getProductTopOpinions(datasetId: number, productName: string) {
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
  return Array.isArray(opinionsResult) ? opinionsResult : ((opinionsResult as any).rows || []);
}

export async function getProductWordCloud(params: {
  datasetId: number;
  productName: string;
  filterAspect?: string;
  filterKeyword?: string;
}) {
  const wcConditions = [
    sql`r.dataset_id = ${params.datasetId}`,
    sql`r.product_name = ${params.productName}`,
    sql`f.opinion IS NOT NULL`,
    sql`f.opinion != ''`,
  ];

  if (params.filterAspect && params.filterAspect !== 'all') {
    const cleanAspect = String(params.filterAspect).replace(/[.,:;!?]+$/, '').trim();
    wcConditions.push(
      sql`(f.aspect = ${params.filterAspect} OR TRIM(TRAILING '.,:;!?' FROM f.aspect) = ${cleanAspect} OR f.aspect ILIKE ${cleanAspect + '%'})`
    );
  }
  if (params.filterKeyword) {
    wcConditions.push(sql`f.opinion ILIKE ${'%' + params.filterKeyword + '%'}`);
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
  return Array.isArray(wcResult) ? wcResult : ((wcResult as any).rows || []);
}

export async function getProductQuotes(params: {
  datasetId: number;
  productName: string;
  filterAspect?: string;
  filterKeyword?: string;
}) {
  const quoteConditions = [
    sql`r.dataset_id = ${params.datasetId}`,
    sql`r.product_name = ${params.productName}`,
  ];

  if (params.filterAspect && params.filterAspect !== 'all') {
    const cleanAspect = String(params.filterAspect).replace(/[.,:;!?]+$/, '').trim();
    quoteConditions.push(
      sql`(f.aspect = ${params.filterAspect} OR TRIM(TRAILING '.,:;!?' FROM f.aspect) = ${cleanAspect} OR f.aspect ILIKE ${cleanAspect + '%'})`
    );
  }
  if (params.filterKeyword) {
    quoteConditions.push(
      sql`(f.opinion ILIKE ${'%' + params.filterKeyword + '%'} OR r.review_text ILIKE ${'%' + params.filterKeyword + '%'})`
    );
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
  return Array.isArray(quotesResult) ? quotesResult : ((quotesResult as any).rows || []);
}
