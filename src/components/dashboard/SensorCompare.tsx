import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API } from '@/config/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { GitCompareArrows } from 'lucide-react';

const COLORS = ['#7a9c1f', '#eab308', '#ef4444', '#06b6d4', '#a855f7'];

interface SensorInfo {
  id: string;
  name: string;
}

const SensorCompare = () => {
  const [sensors, setSensors] = useState<SensorInfo[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sensorNames, setSensorNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchSensors = async () => {
      try {
        const res = await axios.get(API.sensors);
        const sensorList = res.data.map((s: any) => ({ id: s.id, name: s.name }));
        setSensors(sensorList);
        const nameMap: Record<string, string> = {};
        sensorList.forEach((s: SensorInfo) => { nameMap[s.id] = s.name; });
        setSensorNames(nameMap);
        // Default: first two sensors
        if (sensorList.length >= 2) {
          setSelected([sensorList[0].id, sensorList[1].id]);
        }
      } catch { /* silent */ }
    };
    fetchSensors();
  }, []);

  useEffect(() => {
    if (selected.length < 2) return;
    const fetchComparison = async () => {
      setLoading(true);
      try {
        // Fetch hourly data for each selected sensor individually
        const timeMap: Record<string, any> = {};
        await Promise.all(selected.map(async (sid) => {
          const name = sensorNames[sid] || sid;
          try {
            const res = await axios.get(API.hourly, {
              params: { sensor_id: sid, metric: 'pm2.5' }
            });
            res.data.forEach((point: any) => {
              const time = new Date(point.time + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              if (!timeMap[time]) timeMap[time] = { time };
              timeMap[time][name] = point['pm2.5'] ?? point['pm2.5_ug_m3'] ?? null;
            });
          } catch { /* skip this sensor */ }
        }));
        const merged = Object.values(timeMap).sort((a: any, b: any) =>
          a.time < b.time ? -1 : 1
        );
        setChartData(merged);
      } catch { /* silent */ }
      setLoading(false);
    };
    fetchComparison();
  }, [selected, sensorNames]);

  const toggleSensor = (id: string) => {
    if (selected.includes(id)) {
      if (selected.length > 2) setSelected(selected.filter(s => s !== id));
    } else if (selected.length < 4) {
      setSelected([...selected, id]);
    }
  };

  const selectedNames = selected.map(id => sensorNames[id] || id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card rounded-xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <GitCompareArrows className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-medium">Compare Sensors</h3>
      </div>

      {/* Sensor selector pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {sensors.map((sensor) => (
          <button
            key={sensor.id}
            onClick={() => toggleSensor(sensor.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              selected.includes(sensor.id)
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-800 text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {sensor.name}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="w-full h-[280px]">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Loading comparison...
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10 }}
                label={{ value: 'µg/m³', angle: -90, position: 'insideLeft', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {selectedNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select 2+ sensors to compare
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SensorCompare;
