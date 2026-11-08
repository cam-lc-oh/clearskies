import React from 'react';
import AQMap from '@/components/AQMap';
import { ArrowUpRight } from 'lucide-react';
import { useSensors } from '@/hooks/useSensors';

const CAM_COLORS = {
  bg: '#0a0a0a',
  olive: '#7a9c1f',
  gold: '#eab308',
  goldHover: '#f5c226',
  text: '#ffffff',
};

const EmbedMap = () => {
  const { isLoading, error } = useSensors();

  const dashboardOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const dashboardHref = `${dashboardOrigin}/dashboard`;

  if (error) {
    return (
      <div
        className="w-screen h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: CAM_COLORS.bg, color: CAM_COLORS.text }}
      >
        <div className="text-center">
          <h2 className="text-lg font-semibold" style={{ color: CAM_COLORS.gold }}>
            Could not load the air quality map
          </h2>
          <p className="mt-2 text-sm opacity-80">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-screen h-screen relative overflow-hidden"
      style={{ backgroundColor: CAM_COLORS.bg }}
    >
      {isLoading && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-3"
          style={{ backgroundColor: CAM_COLORS.bg }}
        >
          <div
            className="h-10 w-10 rounded-full border-4 animate-spin"
            style={{
              borderColor: `${CAM_COLORS.olive}33`,
              borderTopColor: CAM_COLORS.gold,
            }}
          />
          <div className="text-xs uppercase tracking-widest" style={{ color: CAM_COLORS.olive }}>
            Loading air quality data
          </div>
        </div>
      )}

      <div className="absolute inset-0">
        <AQMap />
      </div>

      <a
        href={dashboardHref}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 right-4 z-[500] inline-flex items-center gap-2 font-semibold text-sm uppercase tracking-wide px-5 py-3 rounded-sm shadow-lg transition-all hover:-translate-y-0.5"
        style={{
          backgroundColor: CAM_COLORS.gold,
          color: CAM_COLORS.bg,
          letterSpacing: '0.06em',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = CAM_COLORS.goldHover;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = CAM_COLORS.gold;
        }}
      >
        <span>View Full Dashboard</span>
        <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
      </a>
    </div>
  );
};

export default EmbedMap;
