/**
 * Holt-Winters Triple Exponential Smoothing (additive seasonality).
 *
 * Handles:
 *   - Level  (α) — the running baseline
 *   - Trend  (β) — rate of change
 *   - Season (γ) — day-of-week pattern (period = 7)
 *
 * Reference: Hyndman & Athanasopoulos, "Forecasting: Principles & Practice"
 *
 * Usage:
 *   const model = trainHoltWinters(dailyEntryCounts);
 *   const tomorrow = model.forecast(1);
 */

export interface HWParams {
  alpha: number; // level smoothing  0 < α < 1
  beta: number;  // trend smoothing  0 < β < 1
  gamma: number; // season smoothing 0 < γ < 1
  period: number; // seasonality length (7 = weekly)
}

export interface HWModel {
  /** One-step-ahead predictions for the training series. */
  fitted: number[];
  /** Final level L_n */
  level: number;
  /** Final trend T_n */
  trend: number;
  /** Final seasonal indices (length = period) */
  seasonal: number[];
  /** Forecast h steps ahead */
  forecast: (h: number) => number;
  /** RMSE of fitted values vs actual */
  rmse: number;
  /** Component snapshot for transparency */
  components: { level: number; trend: number; seasonality: number };
}

const DEFAULT_PARAMS: HWParams = {
  alpha: 0.3,
  beta: 0.1,
  gamma: 0.3,
  period: 7,
};

/**
 * Train a Holt-Winters model on a daily series `y` (integers ≥ 0).
 * Requires at least 2 full seasons (14 days) for reliable results.
 * Falls back gracefully when fewer points are available.
 */
export function trainHoltWinters(y: number[], params: Partial<HWParams> = {}): HWModel {
  const { alpha, beta, gamma, period } = { ...DEFAULT_PARAMS, ...params };

  if (y.length < 2) {
    const v = y[0] ?? 0;
    return trivialModel(v);
  }
  if (y.length < period * 2) {
    // Not enough data for seasonal decomposition — use simple linear trend
    return linearFallback(y);
  }

  // ── Initialise ────────────────────────────────────────────────────────────
  // Level: average of first period
  let L = y.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Trend: average slope over the first two periods
  const firstPeriodMean = L;
  const secondPeriodMean = y.slice(period, period * 2).reduce((a, b) => a + b, 0) / period;
  let T = (secondPeriodMean - firstPeriodMean) / period;

  // Seasonal indices: ratio of observed to estimated level for each period slot
  const S: number[] = [];
  for (let i = 0; i < period; i++) {
    // Average over the first two seasons for each slot
    const vals: number[] = [];
    for (let s = 0; s < 2 && s * period + i < y.length; s++) {
      vals.push(y[s * period + i]);
    }
    const periodMean = (firstPeriodMean + secondPeriodMean) / 2 || 1;
    S.push((vals.reduce((a, b) => a + b, 0) / vals.length) - periodMean);
  }

  // ── Fit ───────────────────────────────────────────────────────────────────
  const fitted: number[] = [];
  const seasons = [...S];

  for (let t = 0; t < y.length; t++) {
    const sIdx = t % period;
    const yt = y[t];
    const yHat = L + T + seasons[sIdx];
    fitted.push(Math.max(0, yHat));

    // Update
    const Lp = L;
    L = alpha * (yt - seasons[sIdx]) + (1 - alpha) * (L + T);
    T = beta * (L - Lp) + (1 - beta) * T;
    seasons[sIdx] = gamma * (yt - L) + (1 - gamma) * seasons[sIdx];
  }

  // ── RMSE ─────────────────────────────────────────────────────────────────
  const sse = y.reduce((s, yi, i) => s + (yi - fitted[i]) ** 2, 0);
  const rmse = Math.sqrt(sse / y.length);

  const levelSnapshot = L;
  const trendSnapshot = T;
  // The next upcoming season slot
  const nextSeason = seasons[y.length % period];

  return {
    fitted,
    level: L,
    trend: T,
    seasonal: seasons,
    rmse,
    components: { level: levelSnapshot, trend: trendSnapshot, seasonality: nextSeason },
    forecast(h: number): number {
      let lh = L;
      let th = T;
      const seas = [...seasons];
      let prediction = 0;
      for (let step = 1; step <= h; step++) {
        const sIdx = (y.length + step - 1) % period;
        prediction = lh + th + seas[sIdx];
        lh = lh + th; // level stays flat beyond training (no new observations)
      }
      return Math.max(0, Math.round(prediction));
    },
  };
}

// ─── Fallback helpers ─────────────────────────────────────────────────────

function trivialModel(v: number): HWModel {
  return {
    fitted: [v],
    level: v,
    trend: 0,
    seasonal: Array(7).fill(0),
    rmse: 0,
    components: { level: v, trend: 0, seasonality: 0 },
    forecast: () => Math.round(v),
  };
}

function linearFallback(y: number[]): HWModel {
  const n = y.length;
  // Ordinary least-squares linear trend
  let sx = 0, sy = 0, sxy = 0, sx2 = 0;
  for (let i = 0; i < n; i++) {
    sx += i; sy += y[i]; sxy += i * y[i]; sx2 += i * i;
  }
  const denom = n * sx2 - sx * sx || 1;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;

  const fitted = y.map((_, i) => Math.max(0, intercept + slope * i));
  const sse = y.reduce((s, yi, i) => s + (yi - fitted[i]) ** 2, 0);
  const rmse = Math.sqrt(sse / n);
  const level = intercept + slope * (n - 1);

  return {
    fitted,
    level,
    trend: slope,
    seasonal: Array(7).fill(0),
    rmse,
    components: { level, trend: slope, seasonality: 0 },
    forecast: (h: number) => Math.max(0, Math.round(level + slope * h)),
  };
}
