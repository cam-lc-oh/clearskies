import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Wind, Flame, Beaker, Gauge, Thermometer, Droplets } from 'lucide-react';

type Entry = {
  icon: React.ReactNode;
  term: string;
  unit?: string;
  short: string;
  body: React.ReactNode;
  categoryColor?: string;
};

const entries: Entry[] = [
  {
    icon: <Wind className="h-5 w-5" />,
    term: 'PM2.5',
    unit: 'µg/m³',
    short: 'Fine particles. The pollutant our map colors are based on.',
    body: (
      <>
        <p>
          PM2.5 is particulate matter smaller than 2.5 microns, about 30 times
          thinner than a human hair. Because it is small enough to reach deep
          into the lungs and cross into the bloodstream, it is the pollutant
          health agencies track most closely.
        </p>
        <p>
          Common local sources include vehicle exhaust, wood smoke, construction
          dust, and industrial combustion. Our sensor network uses PM2.5 to
          compute the AQI you see on the map.
        </p>
      </>
    ),
  },
  {
    icon: <Wind className="h-5 w-5" />,
    term: 'PM1',
    unit: 'µg/m³',
    short: 'Ultrafine particles, even smaller than PM2.5.',
    body: (
      <>
        <p>
          PM1 covers particles under 1 micron. They travel farthest into the
          respiratory system and are increasingly tracked in research, though
          they are not yet part of the official US AQI calculation.
        </p>
        <p>
          A PM1 reading that stays close to the PM2.5 number means most of the
          particulate load in the air is ultrafine, often a sign of combustion
          or vehicle sources nearby.
        </p>
      </>
    ),
  },
  {
    icon: <Wind className="h-5 w-5" />,
    term: 'PM10',
    unit: 'µg/m³',
    short: 'Coarse particles including road dust and pollen.',
    body: (
      <>
        <p>
          PM10 is particulate matter up to 10 microns. It includes everything
          PM2.5 does, plus larger pieces like windblown dust, pollen, and mold
          spores. PM10 is less dangerous per microgram than PM2.5 but still
          contributes to asthma and allergy symptoms.
        </p>
      </>
    ),
  },
  {
    icon: <Beaker className="h-5 w-5" />,
    term: 'VOC Index',
    unit: '0 – 500 (index)',
    short: 'A proprietary score for volatile organic compounds.',
    body: (
      <>
        <p>
          The VOC Index is produced by the Sensirion gas sensor inside each
          SimpleAQ monitor. It is not a concentration in ppm; it is a relative
          score on a 0 – 500 scale, where <strong>100 is the baseline the
          sensor has observed at that location over the last 24 hours.</strong>
        </p>
        <p>
          Values much above 100 indicate a VOC spike (cleaning products,
          cooking, solvents, gasoline fumes, nearby industrial activity).
          Because the baseline shifts with each location, VOC Index is best
          used for spotting changes over time, not for comparing two addresses
          absolute-to-absolute.
        </p>
      </>
    ),
  },
  {
    icon: <Flame className="h-5 w-5" />,
    term: 'NOx Index',
    unit: '0 – 500 (index)',
    short: 'A proprietary score for nitrogen-oxide gases.',
    body: (
      <>
        <p>
          The NOx Index tracks nitrogen oxides (NO and NO₂), which come mostly
          from vehicle exhaust, natural gas combustion, and power generation.
          Like the VOC Index it is on a 0 – 500 proprietary scale with 100 as
          the local 24-hour baseline, not a regulatory concentration.
        </p>
        <p>
          Elevated NOx Index values near roads or data centers suggest
          combustion sources are contributing to the local air mix.
        </p>
      </>
    ),
  },
  {
    icon: <Gauge className="h-5 w-5" />,
    term: 'AQI',
    unit: '0 – 500',
    short: 'US EPA’s single-number health index, derived from PM2.5.',
    body: (
      <>
        <p>
          The Air Quality Index translates a PM2.5 concentration into a
          single number from 0 to 500, grouped into six color-coded
          categories. Our dashboard uses the <strong>2024 US EPA
          breakpoints</strong>:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li><span className="font-semibold text-aqi-good">Good</span> (0 – 50): PM2.5 under 9.0 µg/m³</li>
          <li><span className="font-semibold text-aqi-moderate">Moderate</span> (51 – 100): 9.1 – 35.4</li>
          <li><span className="font-semibold" style={{ color: '#fb923c' }}>Unhealthy for Sensitive Groups</span> (101 – 150): 35.5 – 55.4</li>
          <li><span className="font-semibold text-aqi-unhealthy">Unhealthy</span> (151 – 200): 55.5 – 125.4</li>
          <li><span className="font-semibold" style={{ color: '#c084fc' }}>Very Unhealthy</span> (201 – 300): 125.5 – 225.4</li>
          <li><span className="font-semibold" style={{ color: '#7f1d1d' }}>Hazardous</span> (301 – 500): above 225.5</li>
        </ul>
      </>
    ),
  },
  {
    icon: <Thermometer className="h-5 w-5" />,
    term: 'Temperature',
    unit: '°C',
    short: 'Ambient air temperature at the sensor.',
    body: (
      <p>
        Reported in Celsius. Temperature affects how pollutants disperse and is
        useful context when comparing readings across the day or across
        locations with different sun exposure.
      </p>
    ),
  },
  {
    icon: <Droplets className="h-5 w-5" />,
    term: 'Humidity',
    unit: '%',
    short: 'Relative humidity, 0 to 100 percent.',
    body: (
      <p>
        Low-cost PM sensors can over-read in very humid conditions (fog, rain)
        because water droplets scatter light similarly to particulates. If the
        PM numbers spike while humidity is above 80 percent, treat the reading
        as an upper bound.
      </p>
    ),
  },
  {
    icon: <Gauge className="h-5 w-5" />,
    term: 'Pressure',
    unit: 'hPa',
    short: 'Atmospheric pressure.',
    body: (
      <p>
        Measured in hectopascals. Pressure is mostly useful for correlating
        weather changes with air-quality shifts, for example low-pressure
        systems trapping pollution near the ground.
      </p>
    ),
  },
];

const LearnPage: React.FC = () => {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background text-foreground">
        <section className="max-w-5xl mx-auto px-6 lg:px-8 pt-28 pb-10">
          <div className="text-xs uppercase tracking-widest text-primary mb-3">
            Reading the dashboard
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            What the numbers actually mean
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            A short guide to every measurement shown on the Community Air
            Monitoring - Licking County dashboard: what each term is, what units
            it uses, and how to interpret an unusual reading.
          </p>
        </section>

        <section className="max-w-5xl mx-auto px-6 lg:px-8 pb-16">
          <div className="grid gap-4 md:grid-cols-2">
            {entries.map((e) => (
              <article
                key={e.term}
                className="rounded-xl border border-border bg-card p-6 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    {e.icon}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-lg font-semibold">{e.term}</h2>
                    {e.unit && (
                      <span className="text-xs text-muted-foreground">
                        {e.unit}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm font-medium mb-3">{e.short}</p>
                <div className="text-sm leading-relaxed text-muted-foreground space-y-3">
                  {e.body}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 lg:px-8 pb-24">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-2">Where the data comes from</h2>
            <div className="text-sm leading-relaxed text-muted-foreground space-y-3">
              <p>
                Every reading on this dashboard is pulled live from the
                SimpleAQ monitors hosted around Licking County by Community
                Air Monitoring volunteers. These are low-cost sensors built
                on open hardware, not the EPA’s regulatory-grade monitors.
              </p>
              <p>
                That tradeoff is intentional: dense coverage from many
                community-owned sensors shows local variation (near a
                highway, near a fire station, downwind of a data center)
                that a single official monitor miles away cannot. Expect
                readings to be within roughly 15 to 25 percent of a nearby
                regulatory monitor under normal conditions, less accurate
                at temperature and humidity extremes.
              </p>
              <p>
                If you want to host a sensor, join the volunteer team, or
                request data for a specific project, visit the{' '}
                <a
                  href="https://www.communityairmonitoring.org/get-involved"
                  className="text-primary underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Community Air Monitoring site
                </a>
                .
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90"
              >
                Back to dashboard
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <a
                href="https://www.airnow.gov/aqi/aqi-basics/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-border text-sm font-semibold px-4 py-2 rounded-lg hover:bg-muted"
              >
                EPA AirNow: AQI basics
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default LearnPage;
