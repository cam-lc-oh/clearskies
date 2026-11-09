const API_BASE = import.meta.env.VITE_API_URL || "https://clearskies-backend.onrender.com";

export const API = {
  sensors: `${API_BASE}/api/sensors`,
  hourly: `${API_BASE}/api/hourly`,
  historical: `${API_BASE}/api/historical`,
  statistics: `${API_BASE}/api/statistics`,
  refreshTable: `${API_BASE}/api/refreshtable`,
  counter: `${API_BASE}/api/counter`,
  breathability: `${API_BASE}/api/breathability`,
  streak: `${API_BASE}/api/streak`,
  compare: `${API_BASE}/api/compare`,
  export: (format: string, sensorId: string, timeRange: string) =>
    `${API_BASE}/api/export?format=${format}&sensor_id=${sensorId}&time_range=${timeRange}`,
  networkHealth: `${API_BASE}/api/network-health`,
  epaComparison: `${API_BASE}/api/epa-comparison`,
  health: `${API_BASE}/health`,
} as const;
