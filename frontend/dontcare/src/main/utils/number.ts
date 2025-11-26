export const formatNumber = (numLike: string | number, digits = 2) => {
  const n = typeof numLike === 'string' ? Number(numLike) : numLike;
  if (Number.isNaN(n)) return String(numLike);
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
};
