/**
 * US EPA PM2.5 Air Quality Index utilities (2024 revision).
 * Breakpoints: https://www.airnow.gov/sites/default/files/2024-02/pm-naaqs-air-quality-index-fact-sheet.pdf
 * Formula:     https://www.airnow.gov/aqi/aqi-calculator-concentration/
 *
 * Each breakpoint carries both its concentration range AND its AQI range,
 * so the interpolation is correct at Very Unhealthy and Hazardous levels
 * (categories that span more than 50 AQI points).
 */
export interface AQIBreakpoint {
  min: number;
  max: number;
  aqiLo: number;
  aqiHi: number;
  category: string;
  color: string;
}

export const AQI_BREAKPOINTS: AQIBreakpoint[] = [
  { min: 0.0,   max: 9.0,   aqiLo: 0,   aqiHi: 50,  category: 'Good',                           color: '#4ade80' },
  { min: 9.1,   max: 35.4,  aqiLo: 51,  aqiHi: 100, category: 'Moderate',                       color: '#facc15' },
  { min: 35.5,  max: 55.4,  aqiLo: 101, aqiHi: 150, category: 'Unhealthy for Sensitive Groups', color: '#fb923c' },
  { min: 55.5,  max: 125.4, aqiLo: 151, aqiHi: 200, category: 'Unhealthy',                      color: '#f87171' },
  { min: 125.5, max: 225.4, aqiLo: 201, aqiHi: 300, category: 'Very Unhealthy',                 color: '#c084fc' },
  { min: 225.5, max: 500.4, aqiLo: 301, aqiHi: 500, category: 'Hazardous',                      color: '#7f1d1d' },
];

/** Compute AQI from a raw PM2.5 reading in µg/m³ (24-hour average). */
export const calculateAQI = (pm25: number): number => {
  if (pm25 == null || pm25 < 0) return 0;
  // EPA truncates concentration to one decimal before applying the formula.
  const c = Math.trunc(pm25 * 10) / 10;
  for (const bp of AQI_BREAKPOINTS) {
    if (c <= bp.max) {
      const spanAqi = bp.aqiHi - bp.aqiLo;
      const spanC = bp.max - bp.min;
      if (spanC <= 0) return bp.aqiLo;
      return Math.round((spanAqi / spanC) * (c - bp.min) + bp.aqiLo);
    }
  }
  return 500;
};

export const getAQICategory = (pm25: number): { category: string; color: string } => {
  if (pm25 == null || pm25 < 0) {
    return { category: 'Good', color: AQI_BREAKPOINTS[0].color };
  }
  for (const bp of AQI_BREAKPOINTS) {
    if (pm25 <= bp.max) return { category: bp.category, color: bp.color };
  }
  const last = AQI_BREAKPOINTS[AQI_BREAKPOINTS.length - 1];
  return { category: last.category, color: last.color };
};

/** Actionable advice per AQI category, aligned with EPA AirNow guidance. */
export const getHealthRecommendations = (category: string): string => {
  switch (category) {
    case 'Good':
      return 'Air quality is satisfactory. No restrictions on outdoor activity.';
    case 'Moderate':
      return 'Unusually sensitive individuals should consider reducing prolonged or heavy outdoor exertion.';
    case 'Unhealthy for Sensitive Groups':
      return 'People with heart or lung disease, older adults, children, and teens should reduce prolonged or heavy outdoor exertion.';
    case 'Unhealthy':
      return 'Everyone should reduce prolonged or heavy outdoor exertion. Sensitive groups should avoid it entirely.';
    case 'Very Unhealthy':
      return 'Everyone should avoid prolonged or heavy outdoor exertion; sensitive groups should remain indoors and keep activity levels low.';
    case 'Hazardous':
      return 'Health emergency: everyone should remain indoors with windows closed and avoid all outdoor physical activity.';
    default:
      return 'Air quality information is currently unavailable.';
  }
};

// Format PM2.5 value for display
export const formatPM25 = (pm25: number): string => {
  return pm25.toFixed(1);
};