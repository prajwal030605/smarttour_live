/**
 * Polynomial Regression (degree 2) with least squares fitting.
 * Model: y = a*x^2 + b*x + c
 */

export interface DataPoint {
  x: number;
  y: number;
}

function solve3x3(matrix: number[][], rhs: number[]): [number, number, number] {
  const a = matrix.map((row) => [...row]);
  const b = [...rhs];

  for (let i = 0; i < 3; i++) {
    let maxRow = i;
    for (let r = i + 1; r < 3; r++) {
      if (Math.abs(a[r][i]) > Math.abs(a[maxRow][i])) maxRow = r;
    }
    if (Math.abs(a[maxRow][i]) < 1e-12) return [0, 0, 0];

    [a[i], a[maxRow]] = [a[maxRow], a[i]];
    [b[i], b[maxRow]] = [b[maxRow], b[i]];

    const pivot = a[i][i];
    for (let c = i; c < 3; c++) a[i][c] /= pivot;
    b[i] /= pivot;

    for (let r = 0; r < 3; r++) {
      if (r === i) continue;
      const factor = a[r][i];
      for (let c = i; c < 3; c++) a[r][c] -= factor * a[i][c];
      b[r] -= factor * b[i];
    }
  }

  return [b[0], b[1], b[2]];
}

export function polynomialRegression(data: DataPoint[]): { a: number; b: number; c: number } {
  if (data.length < 3) {
    const c = data[0]?.y ?? 0;
    return { a: 0, b: 0, c };
  }

  let sx = 0;
  let sx2 = 0;
  let sx3 = 0;
  let sx4 = 0;
  let sy = 0;
  let sxy = 0;
  let sx2y = 0;

  for (const p of data) {
    const x = p.x;
    const y = p.y;
    const x2 = x * x;
    sx += x;
    sx2 += x2;
    sx3 += x2 * x;
    sx4 += x2 * x2;
    sy += y;
    sxy += x * y;
    sx2y += x2 * y;
  }

  const n = data.length;
  const [a, b, c] = solve3x3(
    [
      [sx4, sx3, sx2],
      [sx3, sx2, sx],
      [sx2, sx, n],
    ],
    [sx2y, sxy, sy]
  );

  return { a, b, c };
}

export function predict(data: DataPoint[], nextX: number): number {
  const { a, b, c } = polynomialRegression(data);
  return a * nextX * nextX + b * nextX + c;
}

export function meanSquaredError(data: DataPoint[]): number {
  if (data.length === 0) return 0;
  const { a, b, c } = polynomialRegression(data);
  const sumSquaredError = data.reduce((sum, p) => {
    const predicted = a * p.x * p.x + b * p.x + c;
    const error = p.y - predicted;
    return sum + error * error;
  }, 0);
  return sumSquaredError / data.length;
}
