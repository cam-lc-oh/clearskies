import React, { useEffect, useState } from 'react';
import { API } from '@/config/api';
import { ArrowUpRight, Radio } from 'lucide-react';

type EpaRow = {
  city: string;
  state: string;
  lat: number;
  lng: number;
  aqi: number;
  category: string | null;
  obs_time: string | null;
  obs_date: string | null;
  tz: string | null;
  source: string | null;
  distance_km: number;
};

type CamLcRow = {
  sensor_count: number;
  avg_pm25: number;
  avg_aqi: number;
  avg_category: string;
  avg_color: string;
};

type Response = {
  epa: EpaRow | null;
  cam_lc: CamLcRow | null;
  note: string;
};

const categoryColor = (cat?: string | null): string => {
  switch (cat) {
    case 'Good': return '#4ade80';
    case 'Moderate': return '#facc15';
    case 'Unhealthy for Sensitive Groups':
    case 'Unhealthy for Sensitive': return '#fb923c';
    case 'Unhealthy': return '#f87171';
    case 'Very Unhealthy': return '#c084fc';
    case 'Hazardous': return '#7f1d1d';
    default: return '#9ca3af';
  }
};

const EPAComparison: React.FC = () => {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(API.epaComparison);
        if (!r.ok) throw new Error('fetch failed');
        const j = (await r.json()) as Response;
        if (alive) setData(j);
      } catch {
        if (alive) setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm animate-pulse">
        <div className="h-4 w-48 bg-muted rounded mb-3" />
        <div className="h-16 bg-muted rounded" />
      </div>
    );
  }

  if (!data || (!data.epa && !data.cam_lc)) return null;

  const epaColor = categoryColor(data.epa?.category);
  const camColor = data.cam_lc?.avg_color || categoryColor(data.cam_lc?.avg_category);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary mb-1">
            Network vs regulatory baseline
          </div>
          <h3 className="text-lg font-semibold">How does CAM-LC compare to EPA?</h3>
        </div>
        <a
          href="https://www.airnow.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          AirNow <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* CAM-LC side */}
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center gap-2 mb-1">
            <Radio className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              CAM-LC network average
            </span>
          </div>
          {data.cam_lc ? (
            <>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="text-4xl font-bold" style={{ color: camColor }}>
                  {data.cam_lc.avg_aqi}
                </div>
                <div className="text-xs text-muted-foreground">AQI</div>
              </div>
              <div
                className="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ backgroundColor: `${camColor}22`, color: camColor }}
              >
                {data.cam_lc.avg_category}
              </div>
              <div className="text-[11px] text-muted-foreground mt-2">
                Averaged across {data.cam_lc.sensor_count} community sensors,
                PM2.5 = {data.cam_lc.avg_pm25} µg/m³.
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground mt-2">No current readings.</div>
          )}
        </div>

        {/* EPA side */}
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center gap-2 mb-1">
            <Radio className="h-3.5 w-3.5" style={{ color: epaColor }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: epaColor }}>
              Nearest EPA monitor
            </span>
          </div>
          {data.epa ? (
            <>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="text-4xl font-bold" style={{ color: epaColor }}>
                  {data.epa.aqi}
                </div>
                <div className="text-xs text-muted-foreground">AQI</div>
              </div>
              <div
                className="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ backgroundColor: `${epaColor}22`, color: epaColor }}
              >
                {data.epa.category || 'N/A'}
              </div>
              <div className="text-[11px] text-muted-foreground mt-2">
                {data.epa.city}, {data.epa.state} &middot; {data.epa.distance_km} km away
                {data.epa.obs_time ? ` · ${data.epa.obs_time} ${data.epa.tz || ''}` : ''}
                {data.epa.source ? ` · ${data.epa.source}` : ''}
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground mt-2">Not reachable right now.</div>
          )}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
        {data.note}
      </p>
    </div>
  );
};

export default EPAComparison;
