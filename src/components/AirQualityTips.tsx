
import React from 'react';
import { Leaf, Wind, Home, SkullIcon, Bike, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TipCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const TipCard: React.FC<TipCardProps> = ({ icon, title, description, color }) => {
  return (
    <div className="glass-card p-6 rounded-xl hover:scale-[1.02] transition-all duration-300">
      <div className={`p-3 rounded-lg inline-flex mb-4`} style={{ backgroundColor: `${color}20`, color }}>
        {icon}
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
};

const AirQualityTips = () => {
  const tips = [
    {
      icon: <Leaf className="h-6 w-6" />,
      title: "Plant Air-Filtering Plants",
      description: "Indoor plants like Snake Plant, Peace Lily, and Spider Plant naturally filter air pollutants.",
      color: "#4ade80"
    },
    {
      icon: <Wind className="h-6 w-6" />,
      title: "Check Air Quality Daily",
      description: "Use our dashboard to track air quality before outdoor activities, especially if you have respiratory issues.",
      color: "#60a5fa"
    },
    {
      icon: <Home className="h-6 w-6" />,
      title: "Improve Indoor Air",
      description: "Use air purifiers with HEPA filters and maintain good ventilation in your home.",
      color: "#f97316"
    },
    {
      icon: <SkullIcon className="h-6 w-6" />,
      title: "Avoid High Pollution Times",
      description: "Limit outdoor exercise during high pollution periods, typically rush hour traffic times.",
      color: "#ef4444"
    },
    {
      icon: <Bike className="h-6 w-6" />,
      title: "Choose Active Transport",
      description: "When possible, walk or cycle instead of driving to reduce your contribution to air pollution.",
      color: "#8b5cf6"
    },
    {
      icon: <Car className="h-6 w-6" />,
      title: "Maintain Your Vehicle",
      description: "Regular car maintenance ensures your vehicle emits fewer pollutants into the atmosphere.",
      color: "#ec4899"
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-white to-secondary/30 dark:from-gray-900 dark:to-gray-800/30">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Air Quality Tips
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Practical advice to help you and your community breathe cleaner air and stay healthy.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tips.map((tip, index) => (
            <TipCard key={index} {...tip} />
          ))}
        </div>
      </div>
          <br></br>
          <hr></hr>
    </section>
  );
};

export default AirQualityTips;
