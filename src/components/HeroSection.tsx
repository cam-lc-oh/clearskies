import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API } from '@/config/api';
import { ArrowRight, Wind, Thermometer, CloudRain, Activity } from 'lucide-react';
import { useSensors } from '@/hooks/useSensors';
import { Button } from '@/components/ui/button';
import { formatPM25 } from '@/utils/aqiUtils';
import { calculateStatistics } from '@/utils/dummyData';
import DataCard from '@/components/ui/DataCard';
import ParticleCanvas from '@/components/ParticleCanvas';
import BreathabilityGauge from '@/components/BreathabilityGauge';
import AnimatedCounter from '@/components/AnimatedCounter';
import ScrollReveal from '@/components/ScrollReveal';

// If breathability API fails, compute locally
const computeLocalBreathability = (sensors: any[]) => {
  if (!sensors.length) return { score: 0, label: 'No data', description: 'No sensors available' };
  const avgPm25 = sensors.reduce((sum: number, s: any) => sum + s.pm25, 0) / sensors.length;
  const avgTemp = sensors.reduce((sum: number, s: any) => sum + s.temperature, 0) / sensors.length;
  const avgHumidity = sensors.reduce((sum: number, s: any) => sum + s.humidity, 0) / sensors.length;

  const pm25Score = Math.max(0, 100 - (avgPm25 / 50) * 100);
  const tempScore = Math.max(0, 100 - Math.abs(avgTemp - 21) * 5);
  const humidityScore = Math.max(0, 100 - Math.abs(avgHumidity - 45) * 2);

  const score = Math.round(Math.max(0, Math.min(100, pm25Score * 0.6 + tempScore * 0.2 + humidityScore * 0.2)));

  let label: string, description: string;
  if (score >= 80) { label = 'Excellent'; description = 'Perfect conditions for outdoor activities'; }
  else if (score >= 60) { label = 'Good'; description = 'Great day to be outside'; }
  else if (score >= 40) { label = 'Fair'; description = 'Consider limiting prolonged outdoor exertion'; }
  else if (score >= 20) { label = 'Poor'; description = 'Sensitive groups should stay indoors'; }
  else { label = 'Very Poor'; description = 'Everyone should limit outdoor exposure'; }

  return { score, label, description };
};

const getAQIStatusMessage = (aqi: number): string => {
  if (aqi <= 50) return 'Air quality is Good right now. Great day for a run!';
  if (aqi <= 100) return 'Air quality is Moderate. Enjoy your day with light precautions.';
  if (aqi <= 150) return 'Air quality is Unhealthy for Sensitive Groups. Take it easy outdoors.';
  if (aqi <= 200) return 'Air quality is Unhealthy. Consider staying indoors.';
  if (aqi <= 300) return 'Air quality is Very Unhealthy. Avoid outdoor activities.';
  return 'Air quality is Hazardous. Stay indoors and keep windows closed.';
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.1 + i * 0.1,
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1],
    },
  }),
};

const HeroSection = () => {
  const { data: realSensors = [], isLoading, error } = useSensors();
  const [breathability, setBreathability] = useState<{ score: number; label: string; description: string } | null>(null);

  // Fetch breathability score (with local fallback)
  useEffect(() => {
    const fetchBreathability = async () => {
      try {
        const response = await axios.get(API.breathability);
        setBreathability(response.data);
      } catch {
        // API might not be available; compute locally once sensors load
        if (realSensors.length > 0) {
          setBreathability(computeLocalBreathability(realSensors));
        }
      }
    };

    if (realSensors.length > 0) {
      fetchBreathability();
    }
  }, [realSensors]);

  if (error) {
    return (
      <div className="py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center text-red-500">
            <h2 className="text-xl font-semibold">Error loading hero section data</h2>
            <p className="mt-2">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !realSensors.length) {
    return (
      <div className="relative pb-12 pt-28 md:pb-16 md:pt-32 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none -z-10 opacity-30 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="md:flex md:justify-between md:gap-12 items-start">
            <div className="md:flex-1 space-y-6 md:max-w-[50%]">
              <div className="space-y-4">
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="h-12 w-80 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                <div className="h-12 w-72 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                <div className="h-20 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              </div>
              <div className="flex gap-3">
                <div className="h-11 w-40 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="h-11 w-32 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              </div>
            </div>
            <div className="md:flex-1 mt-12 md:mt-0 flex flex-col items-center gap-5">
              <div className="w-52 h-52 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              <div className="grid grid-cols-2 gap-4 w-full">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = calculateStatistics(realSensors);
  const avgAQI = Math.round(
    realSensors.reduce((sum: number, sensor: any) => sum + (sensor.aqi || 0), 0) / realSensors.length
  );

  const goodCount = realSensors.filter((s: any) => s.aqiCategory?.category === 'Good').length;
  const percentage = Math.round((goodCount / realSensors.length) * 100);

  // Use local fallback if breathability hasn't loaded yet
  const gaugeData = breathability || computeLocalBreathability(realSensors);

  return (
    <div className="relative pb-12 pt-28 md:pb-16 md:pt-32 overflow-hidden">
      {/* Particle canvas background */}
      <ParticleCanvas aqi={avgAQI} className="-z-10" />

      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none -z-10 opacity-30 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="md:flex md:justify-between md:gap-12 items-start">
          {/* Left side */}
          <div className="md:flex-1 space-y-6 md:max-w-[50%]">
            <ScrollReveal>
              <div className="space-y-4 max-w-xl">
                <span className="inline-flex items-center px-3 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium">
                  Real-time air quality monitoring
                </span>

                <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight sm:leading-tight">
                  Breathe with confidence.
                  <span className="text-primary block mt-1">Know your air.</span>
                </h1>

                <p className="text-lg text-muted-foreground">
                  ClearSkies Community AQ provides real-time air quality monitoring for your community,
                  helping you make informed decisions about outdoor activities and health protection.
                </p>
                <p className="text-sm text-muted-foreground">
                  Currently serving residents of <span className="font-medium text-primary">Licking County, Ohio</span> with real-time data from community-installed sensors.
                </p>

              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <div className="flex flex-wrap gap-3 sm:gap-4">
                <Button asChild size="lg" className="rounded-full px-6 group">
                  <Link to="/dashboard">
                    View Dashboard
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>

                <Button asChild variant="outline" size="lg" className="rounded-full px-6 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
                  <Link to="/map">Explore Map</Link>
                </Button>
              </div>
            </ScrollReveal>
          </div>

          {/* Right side */}
          <div className="md:flex-1 mt-12 md:mt-0 flex flex-col items-center gap-5">
            {/* Breathability Gauge */}
            <ScrollReveal delay={0.1}>
              <BreathabilityGauge
                score={gaugeData.score}
                label={gaugeData.label}
                description={gaugeData.description}
              />
            </ScrollReveal>

            {/* 2x2 stat cards grid */}
            <div className="grid grid-cols-2 gap-4 w-full">
              <motion.div
                custom={0}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <DataCard
                  title="Average PM2.5"
                  value={
                    <AnimatedCounter
                      value={parseFloat(formatPM25(stats.averagePM25))}
                      suffix=" µg/m³"
                      decimals={1}
                    />
                  }
                  icon={<Wind className="h-5 w-5 text-primary" />}
                  description="Across all monitoring stations"
                />
              </motion.div>

              <motion.div
                custom={1}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <DataCard
                  title="Current AQI"
                  value={
                    <AnimatedCounter value={avgAQI} />
                  }
                  icon={<Thermometer className="h-5 w-5 text-primary" />}
                  description="Air Quality Index (average)"
                />
              </motion.div>

              <motion.div
                custom={2}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <DataCard
                  title="Clean Air Zones"
                  value={
                    <AnimatedCounter value={percentage} suffix="%" />
                  }
                  icon={<CloudRain className="h-5 w-5 text-primary" />}
                  description={`${goodCount} of ${realSensors.length} sensors reporting good air conditions`}
                />
              </motion.div>

              <motion.div
                custom={3}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <DataCard
                  title="Live Sensors"
                  value={
                    <AnimatedCounter value={realSensors.length} />
                  }
                  icon={<Activity className="h-5 w-5 text-primary" />}
                  description="Monitoring stations online"
                />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
