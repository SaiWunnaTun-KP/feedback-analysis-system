export * from './ProductActionMatrix/ProductActionMatrix';
export * from './ProductActionMatrix/MatrixControls';
export * from './ProductActionMatrix/CategoryTabs';
export * from './ProductActionMatrix/ProductCard';
export * from './ProductActionMatrix/ProductListView';
export * from './ProductActionMatrix/MatrixPagination';

export { default } from './ProductActionMatrix/ProductActionMatrix';

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
