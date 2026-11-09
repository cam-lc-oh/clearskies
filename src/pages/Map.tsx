import React from 'react';
import Header from '@/components/Header';
import AQMap from '@/components/AQMap';
import { formatPM25 } from '@/utils/aqiUtils';
import { Users, AlertCircle, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer'
import { useSensors } from '@/hooks/useSensors';



const Map = () => {
  const { data: realSensors = [], isLoading, error } = useSensors();

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-secondary/20 dark:from-gray-900 dark:to-gray-800/20">
        <Header />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 text-center text-red-500">
            <h2 className="text-xl font-semibold">Error loading map data</h2>
            <p className="mt-2">{error.message}</p>
          </div>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-secondary/20 dark:from-gray-900 dark:to-gray-800/20">
        <Header />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-4" />
            <div className="h-5 w-72 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
            <div className="grid grid-cols-5 gap-4 mb-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
              ))}
            </div>
            <div className="h-[700px] bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  // Count sensors by category
  const sensorCounts = {
    good: realSensors.filter(s => s.aqiCategory?.category === 'Good').length,
    moderate: realSensors.filter(s => s.aqiCategory?.category === 'Moderate').length,
    unhealthyForSensitive: realSensors.filter(s => s.aqiCategory?.category === 'Unhealthy for Sensitive Groups').length,
    unhealthy: realSensors.filter(s => s.aqiCategory?.category === 'Unhealthy').length,
    hazardous: realSensors.filter(s => s.aqiCategory?.category === 'Hazardous').length,
  };

  // Find areas with highest pollution
  const highestPollution = [...realSensors]
    .sort((a, b) => b.pm25 - a.pm25)
    .slice(0, 3)
    .map(sensor => ({
      name: sensor.name,
      value: sensor.pm25,
      color: sensor.aqiCategory?.color
    }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-secondary/20 dark:from-gray-900 dark:to-gray-800/20">
      <Header />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Air Quality Map
              </h1>
              <p className="text-muted-foreground mt-2">
                Explore real-time air quality readings from sensors across the community
              </p>
            </div>


          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="glass-card p-4 rounded-xl bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-900/20 shadow-md border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Good Quality</div>
                  <div className="text-2xl font-semibold text-aqi-good">{sensorCounts.good}</div>
                </div>
                <div className="h-8 w-8 rounded-full bg-aqi-good/10 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full bg-aqi-good"></div>
                </div>
              </div>
            </div>

            <div className="glass-card p-4 rounded-xl bg-gradient-to-br from-white to-yellow-50 dark:from-gray-800 dark:to-yellow-900/20 shadow-md border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Moderate Quality</div>
                  <div className="text-2xl font-semibold text-aqi-moderate">{sensorCounts.moderate}</div>
                </div>
                <div className="h-8 w-8 rounded-full bg-aqi-moderate/10 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full bg-aqi-moderate"></div>
                </div>
              </div>
            </div>

            <div className="glass-card p-4 rounded-xl bg-gradient-to-br from-white to-orange-100 dark:from-gray-800 dark:to-orange-900/20 shadow-md border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Unhealthy for Sensitive</div>
                  <div className="text-2xl font-semibold text-orange-400">{sensorCounts.unhealthyForSensitive}</div>
                </div>
                <div className="h-8 w-8 rounded-full bg-aqi-unhealthy/10 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full bg-orange-400"></div> 

                </div>
              </div>
            </div>

            <div className="glass-card p-4 rounded-xl bg-gradient-to-br from-white to-red-50 dark:from-gray-800 dark:to-red-900/20 shadow-md border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Unhealthy</div>
                  <div className="text-2xl font-semibold text-aqi-unhealthy">{sensorCounts.unhealthy}</div>
                </div>
                <div className="h-8 w-8 rounded-full bg-aqi-unhealthy/10 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full bg-aqi-unhealthy"></div>
                </div>
              </div>
            </div>

            <div className="glass-card p-4 rounded-xl bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-900/20 shadow-md border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Hazardous</div>
                  <div className="text-2xl font-semibold text-aqi-hazardous">{sensorCounts.hazardous}</div>
                </div>
                <div className="h-8 w-8 rounded-full bg-aqi-hazardous/10 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full bg-aqi-hazardous"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-3 relative">
              <div className="h-[700px] glass-card rounded-xl shadow-lg overflow-hidden border border-white/20">
                <AQMap />
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-card p-5 rounded-xl shadow-md border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg font-medium">Hotspots</div>
                  <AlertCircle className="h-5 w-5 text-aqi-unhealthy" />
                </div>

                <div className="space-y-4">
                  {highestPollution.map((area, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: area.color }}
                      >
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{area.name}</div>
                        <div className="text-xs text-muted-foreground">{formatPM25(area.value)} µg/m³</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t">
                <Link to="/dashboard#allSensors" className="w-full">
                <Button variant="outline" size="sm" className="w-full">
                  <span>View All</span>
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
                </Link>
                </div>
              </div>

              <div className="glass-card p-5 rounded-xl shadow-md border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg font-medium">Community</div>
                  <Users className="h-5 w-5 text-primary" />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Active Sensors</span>
                    <span className="font-medium">{realSensors.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Community Contributors</span>
                    <span className="font-medium">{new Set(realSensors.map((s: any) => `${s.location.lat.toFixed(2)},${s.location.lng.toFixed(2)}`)).size}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Data Points Today</span>
                    <span className="font-medium">{realSensors.length * 6 * new Date().getHours()}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t space-y-2">
                  <Link to="https://www.facebook.com/groups/904509544135710/" className="block w-full">
                  <Button variant="outline" size="sm" className="w-full "> Join Community </Button>
                  </Link>

                  <Link to="/contact" className="block w-full ">
                  <Button size="sm" className="w-full">Host a Sensor</Button>
                  </Link>
                  
                </div>
              </div>

              {/* <div className="glass-card p-5 rounded-xl shadow-md border border-white/20 bg-gradient-to-br from-primary/5 to-blue-400/10">
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-2">Become a Sensor Host</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Help improve air quality monitoring in your neighborhood by hosting a sensor.
                  </p>
                  <Button size="sm" className="w-full">Learn More</Button>
                </div>
              </div> */}
            </div>
          </div>
        </div>
      </main>
      <div><Footer/></div>
    </div>
  );
};

export default Map;