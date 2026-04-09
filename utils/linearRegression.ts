/**
 * Linear Regression - Pure TypeScript implementation
 * Analytical formula: m = (NΣxy - ΣxΣy) / (NΣx² - (Σx)²), c = (Σy - mΣx) / N
 */

export interface DataPoint {
  x: number;
  y: number;
}

/**
 * Computes linear regression coefficients
 * Returns { m: slope, c: y-intercept }
 */
export function linearRegression(data: DataPoint[]): { m: number; c: number } {
  const N = data.length;
  if (N < 2) {
    return { m: 0, c: data[0]?.y ?? 0 };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (const p of data) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
  }

  const denom = N * sumX2 - sumX * sumX;
  const m = denom !== 0 ? (N * sumXY - sumX * sumY) / denom : 0;
  const c = (sumY - m * sumX) / N;

  return { m, c };
}

/**
 * Predicts next value: prediction = m * nextX + c
 */
export function predict(
  data: DataPoint[],
  nextX: number
): number {
  const { m, c } = linearRegression(data);
  return m * nextX + c;
}

/**
 * Mean Squared Error on provided points using fitted line.
 * Lower MSE indicates better fit.
 */
export function meanSquaredError(data: DataPoint[]): number {
  if (data.length === 0) return 0;

  const { m, c } = linearRegression(data);
  const sumSquaredError = data.reduce((sum, p) => {
    const predicted = m * p.x + c;
    const error = p.y - predicted;
    return sum + error * error;
  }, 0);

  return sumSquaredError / data.length;
}
