
import React from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import AQSummary from '@/components/AQSummary';
import AQMap from '@/components/AQMap';
import AirQualityTips from '@/components/AirQualityTips';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart2, Users, Globe, Bell } from 'lucide-react';
import EmailSubscription from '@/components/dashboard/EmailSubscription';
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal';
import StreakCounter from '@/components/StreakCounter';
import BestTimeTimeline from '@/components/BestTimeTimeline';


const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <div id = "email"></div>
        <HeroSection />
        {/* Email alerts hidden until Firebase + Pipedream are configured. To re-enable, uncomment the line below. */}
        {/* <EmailSubscription /> */}

        {/* Best Time section */}
        <section className="py-12 bg-gradient-to-b from-background to-primary/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 max-w-2xl">
            <ScrollReveal>
              <BestTimeTimeline />
            </ScrollReveal>
          </div>
        </section>

        {/* Features section */}
        <ScrollReveal>
        <section id = "guide" className="py-16 bg-gradient-to-b from-white to-secondary/30 dark:from-gray-900 dark:to-gray-800/30">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-semibold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Breathe Better with ClearSkies
              </h2>
              <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
                Our platform provides comprehensive air quality monitoring and analytics
                to help communities breathe cleaner air.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: <BarChart2 className="h-10 w-10 text-primary" />,
                  title: "Real-time Monitoring",
                  description: "Access live air quality data from sensors across your community."
                },
                {
                  icon: <Users className="h-10 w-10 text-primary" />,
                  title: "Community Insights",
                  description: "See how air quality affects different neighborhoods and areas."
                },
                {
                  icon: <Bell className="h-10 w-10 text-primary" />,
                  title: "Personalized Alerts",
                  description: "Get notified when air quality changes in your area of interest."
                },
                {
                  icon: <Globe className="h-10 w-10 text-primary" />,
                  title: "Environmental Impact",
                  description: "Understand how air quality relates to broader environmental trends."
                }
              ].map((feature, index) => (
                <div
                  key={index}
                  className="glass-card p-6 rounded-xl hover:scale-[1.01] transition-all duration-300"
                >
                  <div className="mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        </ScrollReveal>
        
        <ScrollReveal delay={0.1}>
        <AQSummary />
        </ScrollReveal>
        
        <ScrollReveal delay={0.1}>
        <section className="py-16 bg-white dark:bg-gray-900 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-semibold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Community Air Quality Map
              </h2>
              <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
                Explore air quality readings from sensors across the community with our interactive map.
              </p>
              <div className="mt-6">
                <Link to="/map">
                  <Button size="lg" className="rounded-full group">
                    View Full Map
                    <ArrowRight className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative w-full h-[500px] rounded-xl shadow-lg overflow-hidden border border-white/20">
              <AQMap />
            </div>
          </div>
        </section>
        </ScrollReveal>
        <div id = "aqt"></div>
        <ScrollReveal delay={0.1}>
        <AirQualityTips/>
        </ScrollReveal>
      </main>
      <Footer/>
    </div>
  );
};

export default Index;
