import React, { useEffect, useState } from 'react';
import {
  LineChart,
  // BarChart, // BarChart was imported but not used, consider removing if not planned for use
  Line,
  // Bar, // Bar was imported but not used
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Text,
} from 'recharts';
import axios from 'axios';
import { API } from '@/config/api';
// import { formatPM25 } from '@/utils/aqiUtils'; // This import was present but not used in the provided code.

interface AQIChartProps {
  type?: 'line' | 'bar'; // 'bar' type would require BarChart and Bar components
  data?: any[];
  timeRange?: '24h' | '7d' | '30d';
  sensorId?: string;
  selectedMetric?: string;
  height?: number;
  onDataLoaded?: () => void;
}

const metricAliasMap: Record<string, string> = {
  // Example: 'ozone': 'O3',
};

const AQIChart: React.FC<AQIChartProps> = ({
  type = 'line', // Currently, only LineChart is implemented
  data,
  timeRange = '24h',
  sensorId,
  height = 300,
  selectedMetric,
  onDataLoaded,
}) => {
  const dataKey = metricAliasMap[selectedMetric!] || selectedMetric!;
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedMetric) {
      setLoading(false);
      setError('No metric selected.');
      return;
    }
    if (data || !sensorId) {
        if (data) {
            setChartData(data);
            setLoading(false);
        } else if (!sensorId && !data) { // Handle case where sensorId is missing and no data is provided
            setLoading(false);
            // setError('Sensor ID is required to fetch data.'); // Or set chartData to []
            setChartData([]);
        }
        return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null); 

        let responseData;
        const backendField = metricAliasMap[selectedMetric!] || selectedMetric!;

        if (timeRange === '24h') {
          const response = await axios.get(API.hourly, {
            params: {
              sensor_id: sensorId,
              metric: backendField, 
            },
          });

          responseData = response.data.map((item: any) => ({
            time: new Date(item.time+'Z').toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            [dataKey]: item[backendField],
          }));
        } else {
          // Fetch historical data from /api/historical
          const response = await axios.get(API.historical, {
            params: { 
              time_range: timeRange,
              sensor_id: sensorId,
              metric: backendField,
            },
          });

          const now = new Date();
          // Start with the full data from the API response for the historical range
          let filteredHistoricalData = [...response.data];

          if (timeRange === '7d') {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filteredHistoricalData = filteredHistoricalData
              .filter((item: any) => new Date(item.timestamp) > sevenDaysAgo);
            // REMOVED: .filter((_: any, i: number) => i % 6 === 0); 
            // Now all data points within the last 7 days will be included.
          } else if (timeRange === '30d') {
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            filteredHistoricalData = filteredHistoricalData
              .filter((item: any) => new Date(item.timestamp) > thirtyDaysAgo);
            // REMOVED: .filter((_: any, i: number) => i % 24 === 0); 
            // Now all data points within the last 30 days will be included.
            // If 30 points are too many for the X-axis, consider a less aggressive sampling,
            // e.g., filteredHistoricalData = filteredHistoricalData.filter((_: any, i: number) => i % 2 === 0); // for every other day
          }

          responseData = filteredHistoricalData.map((item: any) => ({
            ...item, 
            time: new Date(item.timestamp+'Z').toLocaleDateString([], {month: 'numeric', day: 'numeric'}), // e.g., "5/14"
            [dataKey]: item[backendField],
          }));
        }

        setChartData(responseData);
        onDataLoaded?.();
        setError(null);
        
      } catch (err) {
        console.error("Error fetching chart data:", err);
        setError(`Failed to load chart data for ${selectedMetric}.`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sensorId, timeRange, data, selectedMetric, dataKey]);

  const finalData = data || chartData;

  const getMaxValue = () => {
    if (!selectedMetric || finalData.length === 0) return 100; 
    const values = finalData.map(d => d[dataKey!] ?? 0).filter(v => typeof v === 'number');
    if (values.length === 0) return 100; 
    const max = Math.max(...values);

    const metricMaxStrategies: Record<string, () => number> = {
      'pm2.5': () => Math.ceil(Math.min(Math.max(10, max * 1.2), 500)),
      'pm10': () => Math.ceil(Math.min(Math.max(10, max * 1.2), 500)),
      'pm4': () => Math.ceil(Math.min(Math.max(10, max * 1.2), 500)),
      'pm1': () => Math.ceil(Math.min(Math.max(10, max * 1.2), 500)),
      'temperature': () => Math.ceil(max + 5),
      'humidity': () => 100,
      'pressure': () => Math.ceil(max + 10),
      // Sensirion VOC/NOx indexes run 0-500 with 100 as the ambient baseline.
      'voc': () => 500,
      'nox': () => 500,
      'NO2': () => Math.ceil(Math.min(Math.max(0.1, max * 1.2), 5)),
      'O3': () => Math.ceil(Math.min(Math.max(0.1, max * 1.2), 5)),
      'SO2': () => Math.ceil(Math.min(Math.max(0.1, max * 1.2), 5)),
    };

    const fallback = () => Math.ceil(Math.max(10, max * 1.1)); 
    return (metricMaxStrategies[selectedMetric!] || fallback)();
  };

  const metricColors: Record<string, string> = {
    // Chart colors (non-primary categories kept as distinct hues so a user
    // comparing multiple metrics can tell them apart; the brand olive is
    // reserved for primary UI accents elsewhere so it doesn't bleed into
    // "this is PM2.5" signaling).
    'pm2.5': '#7a9c1f',
    'pm10': '#a3b76e',
    'pm4': '#c0d090',
    'pm1': '#d9e2b3',
    'temperature': '#f97316',
    'humidity': '#06b6d4',
    'pressure': '#a855f7',
    'voc': '#10b981',
    'nox': '#f43f5e',
    'NO2': '#ef4444',
    'O3': '#22c55e',
    'SO2': '#eab308',
  };
  const chartColor = metricColors[selectedMetric || 'pm2.5'] || '#64748b';

  const metricUnits: Record<string, string> = {
    'pm2.5': 'µg/m³',
    'pm10': 'µg/m³',
    'pm4': 'µg/m³',
    'pm1': 'µg/m³',
    'temperature': '°C',
    'humidity': '%',
    'pressure': 'hPa',
    'voc': 'index',
    'nox': 'index',
    'NO2': 'ppm',
    'O3': 'ppm',
    'SO2': 'ppm',
  };
  const yLabel = metricUnits[selectedMetric || 'pm2.5'] || '';

  const maxValue = getMaxValue();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length && selectedMetric) {
      return (
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-sm">
          <p className="font-semibold text-gray-700 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }} className="text-gray-600">
              {entry.name}: <span className="font-bold">{entry.value}</span> {metricUnits[selectedMetric]}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Condition for loading or no data
  const showLoadingOrNoData = (loading && !data) || (!loading && finalData.length === 0 && !error && sensorId);

if (showLoadingOrNoData) {
  return (
    <div className="w-full h-[300px] flex flex-col items-center justify-center animate-fade-in">
      <div className="relative w-16 h-16 mb-4">
        {/* Outer glowing halo spinner */}
        <div className="absolute inset-0 rounded-full border-[6px] border-t-transparent border-l-transparent border-primary animate-spin-slow blur-sm opacity-80 shadow-[0_0_30px_rgba(122,156,31,0.4)]" />

        {/* Mid ring - counter-rotating blur ring */}
        <div className="absolute inset-1 rounded-full border-[4px] border-r-transparent border-b-transparent border-sky-400 animate-spin-reverse blur-[2px] opacity-90 shadow-[0_0_12px_rgba(56,189,248,0.5)]" />

        {/* Inner aura ring */}
        <div className="absolute inset-[6px] rounded-full border-[2px] border-primary/20 animate-pulse-slow" />

        {/* Center pulse dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-3.5 h-3.5 rounded-full bg-primary shadow-[0_0_10px_rgba(122,156,31,0.6)]">
            <div className="absolute inset-0 rounded-full bg-primary/60 opacity-50 animate-ping-fast blur-[2px]" />
          </div>
        </div>
      </div>

      <p className="text-sm text-center text-gray-500 animate-pulse-slow tracking-wide">
        {loading
          ? `Fetching ${selectedMetric || 'air quality'} data...`
          : `No data available for ${selectedMetric || 'the selected metric'}.`}
      </p>
    </div>
  );
}

  if (error) {
    return (
      <div className="w-full h-[300px] flex flex-col items-center justify-center text-red-600 p-4 bg-red-50 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-red-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <p className="font-semibold">Error Loading Chart</p>
        <p className="text-sm text-center">{error}</p>
      </div>
    );
  }
  
  if (!selectedMetric) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-gray-500">
        Please select a metric to display the chart.
      </div>
    );
  }

  // If after all checks, finalData is still empty (e.g. API returned empty for a valid query)
  if (finalData.length === 0) {
    return (
         <div className="w-full h-[300px] flex flex-col items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-center text-gray-500">
                No data points available for {selectedMetric} in the selected range.
            </p>
        </div>
    );
  }


  return (
    <div className="w-full overflow-hidden bg-white dark:bg-gray-900 p-2 rounded-xl shadow-lg">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={finalData} margin={{ top: 5, right: 20, left: 10, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="time"
            tick={(props) => {
              const { x, y, payload } = props;
              return (
                <Text
                  x={x}
                  y={y}
                  dy={10} 
                  angle={-35} 
                  textAnchor="end"
                  fontSize={10}
                  fill="#6b7280" 
                >
                  {payload.value}
                </Text>
              );
            }}
            height={50} 
            interval="preserveStartEnd" 
          />
          <YAxis
            label={{
              value: yLabel,
              angle: -90,
              position: 'insideLeft',
              fill: '#4b5563', 
              fontSize: 12,
              dy: 30, 
            }}
            domain={[0, maxValue]}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            stroke="#d1d5db"
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value, entry) => <span style={{ color: entry.color }}>{value}</span>}
            wrapperStyle={{ 
              paddingTop: '5px',
              fontSize: '12px'
            }}
            verticalAlign="bottom"
            align="center"
          />
          <Line
            type="monotone"
            dataKey={dataKey} 
            name={selectedMetric?.toUpperCase()}
            stroke={chartColor}
            fillOpacity={0.1} 
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 1, fill: chartColor }}
            activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2, fill: chartColor }}
            animationDuration={1000}
            connectNulls={true} 
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 -mt-1 text-center">
  {timeRange === '24h'
    ? 'Values shown are hourly averages.'
    : 'Values shown are daily averages.'}
    </p>

    </div>
  );
};

export default AQIChart;
