import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API } from '@/config/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ScrollReveal from '@/components/ScrollReveal';
import { Activity, Wifi, WifiOff, AlertTriangle, CheckCircle2, Signal, Wind } from 'lucide-react';
import { formatPM25, getAQICategory } from '@/utils/aqiUtils';

interface SensorHealth {
  id: string;
  name: string;
  status: 'online' | 'delayed' | 'offline';
  minutes_since_update: number;
  data_quality: number;
  location: { lat: number; lng: number };
  pm25?: number;
  aqiColor?: string;
  aqiCategory?: string;
}

const statusConfig = {
  online: { icon: CheckCircle2, color: '#4ade80', bg: 'bg-green-50 dark:bg-green-900/20', label: 'Online' },
  delayed: { icon: AlertTriangle, color: '#facc15', bg: 'bg-yellow-50 dark:bg-yellow-900/20', label: 'Delayed' },
  offline: { icon: WifiOff, color: '#f87171', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Offline' },
};

interface OutageEvent {
  sensor: string;
  status: 'delayed' | 'offline';
  timestamp: string;
  minutesAgo: number;
}

const OUTAGE_STORAGE_KEY = 'clearskies_outage_log';

const loadOutageLog = (): OutageEvent[] => {
  try {
    const stored = localStorage.getItem(OUTAGE_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as OutageEvent[];
    // Keep only last 7 days
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return parsed.filter(e => new Date(e.timestamp).getTime() > cutoff);
  } catch { return []; }
};

const saveOutageLog = (log: OutageEvent[]) => {
  // Keep max 50 entries, last 7 days
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const trimmed = log.filter(e => new Date(e.timestamp).getTime() > cutoff).slice(-50);
  localStorage.setItem(OUTAGE_STORAGE_KEY, JSON.stringify(trimmed));
};

const NetworkHealth = () => {
  const [data, setData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [outageLog, setOutageLog] = useState<OutageEvent[]>([]);

  useEffect(() => {
    const fetchHealth = async () => {
      // Always fetch sensor data for PM2.5 readings
      let sensorData: any[] = [];
      try {
        const sensorRes = await axios.get(API.sensors);
        sensorData = sensorRes.data;
      } catch { /* silent */ }

      const pmMap: Record<string, { pm25: number; color: string; category: string }> = {};
      sensorData.forEach((s: any) => {
        const cat = getAQICategory(s.pm25);
        pmMap[s.id] = { pm25: s.pm25, color: cat.color, category: cat.category };
      });

      try {
        const res = await axios.get(API.networkHealth);
        const enriched = res.data.sensors.map((s: SensorHealth) => ({
          ...s,
          pm25: pmMap[s.id]?.pm25 ?? 0,
          aqiColor: pmMap[s.id]?.color ?? '#9ca3af',
          aqiCategory: pmMap[s.id]?.category ?? 'Unknown',
        }));
        setData({ ...res.data, sensors: enriched });
      } catch {
        // Build from sensor data
        const sensors = sensorData.map((s: any) => ({
          id: s.id,
          name: s.name,
          status: 'online' as const,
          minutes_since_update: 0,
          data_quality: 100,
          location: s.location,
          pm25: s.pm25,
          aqiColor: pmMap[s.id]?.color ?? '#9ca3af',
          aqiCategory: pmMap[s.id]?.category ?? 'Unknown',
        }));
        setData({
          sensors,
          overall_health: 100,
          total: sensors.length,
          online: sensors.length,
        });
      }
      setLoading(false);
    };
    fetchHealth();
  }, []);

  // Detect and log outages
  useEffect(() => {
    if (!data) return;
    const existing = loadOutageLog();
    const now = new Date().toISOString();
    let updated = false;

    data.sensors.forEach(sensor => {
      if (sensor.status === 'delayed' || sensor.status === 'offline') {
        // Check if we already logged this sensor in the last 30 min
        const recentlyLogged = existing.some(
          e => e.sensor === sensor.name &&
          (Date.now() - new Date(e.timestamp).getTime()) < 30 * 60 * 1000
        );
        if (!recentlyLogged) {
          existing.push({
            sensor: sensor.name,
            status: sensor.status,
            timestamp: now,
            minutesAgo: sensor.minutes_since_update,
          });
          updated = true;
        }
      }
    });

    if (updated) saveOutageLog(existing);
    setOutageLog(loadOutageLog());
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
            <div className="text-muted-foreground">Loading network health...</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!data) return null;

  const healthColor = data.overall_health >= 80 ? '#4ade80' : data.overall_health >= 50 ? '#facc15' : '#f87171';

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Sensor Network Health
              </h1>
              <p className="text-muted-foreground mt-2">
                Monitor the status and reliability of all community sensors
              </p>
            </div>
          </ScrollReveal>

          {/* Overall Health */}
          <ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-8">
              <div className="glass-card rounded-xl p-6 text-center md:col-span-1">
                <div className="text-sm text-muted-foreground mb-2">Network Health</div>
                <div className="text-5xl font-bold" style={{ color: healthColor }}>
                  {data.overall_health}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {data.online} of {data.total} sensors online
                </div>
              </div>

              <div className="glass-card rounded-xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wind className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {data.sensors.length > 0 ? formatPM25(data.sensors.reduce((sum, s) => sum + (s.pm25 || 0), 0) / data.sensors.length) : '0'}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg PM2.5 µg/m³</div>
                </div>
              </div>

              <div className="glass-card rounded-xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Wifi className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-500">
                    {data.sensors.filter(s => s.status === 'online').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Online</div>
                </div>
              </div>

              <div className="glass-card rounded-xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-500">
                    {data.sensors.filter(s => s.status === 'delayed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Delayed</div>
                </div>
              </div>

              <div className="glass-card rounded-xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <WifiOff className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-500">
                    {data.sensors.filter(s => s.status === 'offline').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Offline</div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Per-sensor cards */}
          <ScrollReveal delay={0.1}>
            <h2 className="text-xl font-semibold mb-4">Individual Sensors</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.sensors.map((sensor, i) => {
                const config = statusConfig[sensor.status];
                const StatusIcon = config.icon;
                return (
                  <motion.div
                    key={sensor.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className={`glass-card rounded-xl p-5 ${config.bg}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-sm">{sensor.name}</h3>
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className="h-4 w-4" style={{ color: config.color }} />
                        <span className="text-xs font-medium" style={{ color: config.color }}>
                          {config.label}
                        </span>
                      </div>
                    </div>

                    {/* PM2.5 reading */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold" style={{ color: sensor.aqiColor }}>
                          {sensor.pm25 ? formatPM25(sensor.pm25) : '—'}
                        </span>
                        <span className="text-xs text-muted-foreground">µg/m³</span>
                      </div>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${sensor.aqiColor}20`, color: sensor.aqiColor }}
                      >
                        {sensor.aqiCategory}
                      </span>
                    </div>

                    {/* Data quality bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Data Quality</span>
                        <span>{sensor.data_quality}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${sensor.data_quality}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.3 + i * 0.05 }}
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: sensor.data_quality >= 75 ? '#4ade80' :
                              sensor.data_quality >= 50 ? '#facc15' : '#f87171'
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        Last update: {sensor.minutes_since_update < 1 ? 'Just now' :
                          sensor.minutes_since_update < 60 ? `${sensor.minutes_since_update}m ago` :
                          `${Math.round(sensor.minutes_since_update / 60)}h ago`}
                      </span>
                      {sensor.status !== 'online' && (
                        <span className="text-orange-500 font-medium">Outage detected</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollReveal>

          {/* Recent Outages Log */}
          <ScrollReveal delay={0.2}>
            <div className="mt-10">
              <h2 className="text-xl font-semibold mb-4">Recent Outages (Last 7 Days)</h2>
              {outageLog.length === 0 ? (
                <div className="glass-card rounded-xl p-8 text-center">
                  <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No outages recorded</p>
                  <p className="text-xs text-muted-foreground mt-1">All sensors have been running smoothly</p>
                </div>
              ) : (
                <div className="glass-card rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Sensor</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Status</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">When</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Downtime</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[...outageLog].reverse().map((event, i) => {
                        const ago = Date.now() - new Date(event.timestamp).getTime();
                        const agoStr = ago < 60 * 60 * 1000
                          ? `${Math.round(ago / 60000)}m ago`
                          : ago < 24 * 60 * 60 * 1000
                          ? `${Math.round(ago / 3600000)}h ago`
                          : `${Math.round(ago / 86400000)}d ago`;

                        return (
                          <tr key={i} className="hover:bg-secondary/40 dark:hover:bg-gray-800/40 transition-colors">
                            <td className="py-3 px-4 text-sm font-medium">{event.sensor}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                                event.status === 'offline'
                                  ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}>
                                {event.status === 'offline' ? <WifiOff className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                                {event.status === 'offline' ? 'Offline' : 'Delayed'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">
                              {new Date(event.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                              {new Date(event.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">{agoStr}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </ScrollReveal>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NetworkHealth;
