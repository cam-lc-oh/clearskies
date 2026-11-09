import React, { useState, useEffect, useRef } from 'react';
import {
  Wind,
  Thermometer,
  CloudRain,
  AlertCircle,
} from 'lucide-react';
import axios from 'axios';
import { formatPM25 } from '@/utils/aqiUtils';
import { API } from '@/config/api';
import AQIChart from './AQIChart';
import DataTable from './DataTable';
import DataCard from '@/components/ui/DataCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocation, useSearchParams } from 'react-router-dom';
import AQIGauge from './AQIGauge';
import SensorCompare from './SensorCompare';
import HeatmapCalendar from './HeatmapCalendar';
import ExportButton from './ExportButton';


const DashboardPage = () => {

  const dataTableRef = useRef<HTMLDivElement | null>(null);


  type SensorInfo = {
    id: string;
    name: string;
  };

  //Fetches sensor names for the dropdown for the AQIChart
  const [searchParams] = useSearchParams();
const sensorIdFromQuery = searchParams.get('sensorId');
  const [sensors, setSensors] = useState<SensorInfo[]>([]);
  const [selectedSensorId, setSelectedSensorId] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // SimpleAQ returns data for these metrics today. NO2/O3/SO2 are left out
  // because their endpoints return empty arrays on CAM-LC's devices; once
  // SimpleAQ ships them, add back here.
  const metricOptions = [
    "pm2.5", "pm1", "pm10", "pm4",
    "temperature", "humidity", "pressure",
    "voc", "nox",
  ] as const;

  type MetricOption = typeof metricOptions[number];

  const [selectedMetric, setSelectedMetric] = useState<MetricOption>("pm2.5");



useEffect(() => {
  const fetchSensorNames = async () => {
    try {
      const response = await axios.get(API.sensors);
      const sensors: SensorInfo[] = response.data.map((sensor: any) => ({
        id: sensor.id,
        name: sensor.name,
      }));
      setSensors(sensors);
      if (sensors.length > 0) {
        setSelectedSensorId(sensorIdFromQuery || sensors[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch sensor names:', error);
    }
  };

  fetchSensorNames();
}, [sensorIdFromQuery]);



  //Allows routing to specific parts of this page using id hashing
  const location = useLocation();
  useEffect(() => {
    const hash = location.hash;
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [location]);

  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [realSensors, setRealSensors] = useState<any[]>([]);

useEffect(() => {
  const fetchMainData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(API.sensors);
      setRealSensors(response.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch sensors'));
    } finally {
      setIsLoading(false);
    }
  };

  fetchMainData();
}, []);

  if (error) {
    return (
      <div className="py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center text-red-500">
            <h2 className="text-xl font-semibold">Error loading data</h2>
            <p className="mt-2">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || realSensors.length === 0) {
    return (
      <div className="py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-8">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Skeleton className="lg:col-span-2 h-[400px]" />
            <div className="space-y-5">
              <Skeleton className="h-[300px]" />
              <Skeleton className="h-[200px]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = {
    averagePM25: realSensors.reduce((sum, s) => sum + s.pm25, 0) / realSensors.length,
    maxPM25: Math.max(...realSensors.map(s => s.pm25)),
    minPM25: Math.min(...realSensors.map(s => s.pm25)),
  };

  const avgAQI = Math.round(realSensors.reduce((sum: number, s: any) => sum + (s.aqi || 0), 0) / realSensors.length);
  const avgCategory = stats.averagePM25 <= 12 ? 'Good' : stats.averagePM25 <= 35.4 ? 'Moderate' : stats.averagePM25 <= 55.4 ? 'Unhealthy for Sensitive' : 'Unhealthy';
  const avgColor = stats.averagePM25 <= 12 ? '#4ade80' : stats.averagePM25 <= 35.4 ? '#facc15' : stats.averagePM25 <= 55.4 ? '#fb923c' : '#f87171';

  const highestSensors = [...realSensors]
    .sort((a, b) => b.pm25 - a.pm25)
    .slice(0, 3)
    .map(sensor => ({
      name: sensor.name,
      value: sensor.pm25,
      category: sensor.aqiCategory?.category || 'Unknown',
      color: sensor.aqiCategory?.color || '#000',
    }));

  return (
    
    <div className="py-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Air Quality Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor air quality metrics and trends across the community
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
          <div className="glass-card rounded-xl p-4 flex items-center justify-center sm:col-span-1">
            <AQIGauge aqi={avgAQI} category={avgCategory} color={avgColor} size={140} />
          </div>
          <DataCard
            title="Current Average PM2.5"
            value={`${formatPM25(stats.averagePM25)} µg/m³`}
            icon={<Wind className="h-5 w-5 text-primary" />}
            description="Mean value across all stations"
          />
          <DataCard
            title="Maximum PM2.5"
            value={`${formatPM25(stats.maxPM25)} µg/m³`}
            icon={<AlertCircle className="h-5 w-5 text-primary" />}
            description="Highest reading in the network"
          />
          <DataCard
            title="Average Temperature"
            value={`${(realSensors.reduce((sum, s) => sum + s.temperature, 0) / realSensors.length).toFixed(1)} °C`}
            icon={<Thermometer className="h-5 w-5 text-primary" />}
            description="Mean temperature across stations"
          />
          <DataCard
            title="Average Humidity"
            value={`${Math.round(realSensors.reduce((sum, s) => sum + s.humidity, 0) / realSensors.length)}%`}
            icon={<CloudRain className="h-5 w-5 text-primary" />}
            description="Mean humidity across stations"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-10">
          <div id="charts" className="lg:col-span-3 glass-card rounded-lg p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
              <div className="flex flex-col space-y-2">
                <h3 className="text-lg font-medium">Air Quality Trend</h3>
                <Tabs defaultValue="24h" value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
                  <TabsList className="w-fit">
                    <TabsTrigger value="24h" className="text-xs">24h</TabsTrigger>
                    <TabsTrigger value="7d" className="text-xs">7 Days</TabsTrigger>
                    <TabsTrigger value="30d" className="text-xs">30 Days</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Sensor</label>
                  <select
                    value={selectedSensorId}
                    onChange={(e) => setSelectedSensorId(e.target.value)}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                  >
                    {sensors.map((sensor) => (
                      <option key={sensor.id} value={sensor.id}>
                        {sensor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Metric</label>
                  <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value as typeof metricOptions[number])}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                  >
                    {metricOptions.map((metric) => (
                      <option key={metric} value={metric}>
                        {metric.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <ExportButton sensorId={selectedSensorId} timeRange={timeRange} />
                </div>
              </div>

            </div>

            <div className="mt-6">
              {lastUpdated && (
                <p className="text-xs text-muted-foreground mb-2">
                  Graph last updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}

              <AQIChart
                type="line"
                timeRange={timeRange}
                sensorId={selectedSensorId}
                selectedMetric={selectedMetric}
                height={350}
                onDataLoaded={() => setLastUpdated(new Date())}
              />

              <div className="flex justify-end mt-2">
                <button
                  onClick={() => dataTableRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View Full Table ↓
                </button>
              </div>

              <div className="mt-6">
                <HeatmapCalendar sensorId={selectedSensorId} />
              </div>


              
            </div>


          </div>
          

          <div className="space-y-5 lg:col-span-1">

            

            <div className="glass-card rounded-lg p-5">
              <div className="mb-4">
                <div className="text-lg font-medium mb-1">Pollution Hotspots</div>
                <div className="text-sm text-muted-foreground">Highest PM2.5 readings</div>
              </div>
              <div className="space-y-4">
                {highestSensors.map((sensor, index) => (
                  <div key={index} className="flex items-center">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
                      style={{ backgroundColor: sensor.color }}
                    >
                      {index + 1}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="font-medium text-sm">{sensor.name}</div>
                      <div className="text-xs text-muted-foreground">{formatPM25(sensor.value)} µg/m³</div>
                    </div>
                    <div
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${sensor.color}15`, color: sensor.color }}
                    >
                      {sensor.category}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        <div className="mb-10">
          <SensorCompare />
        </div>


                <p className="text-xs text-muted-foreground text-center italic mb-8">
  Disclaimer: Air quality data is collected from community-deployed sensors for informational purposes. These sensors are not certified regulatory monitors and may vary in accuracy.
</p>

        <div ref={dataTableRef} id="allSensors">
  <DataTable />
</div>

        
      </div>
    </div>
  );
};

export default DashboardPage;