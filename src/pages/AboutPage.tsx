import React from "react";
import Header from '@/components/Header';
import Footer from '@/components/Footer'



interface Developer {
  name: string;
  role: string;
  img: string;
  linkedin: string;
}

const developers: Developer[] = [
  {
    name: "Aniket Chaudhari",
    role: "Backend Developer & Server Systems Engineer",
    img: "/images/IMG_3962.jpeg",
    linkedin: "https://www.linkedin.com/in/aniket-chaudhari-12238833a/",
  },
  {
    name: "Gowrish Rajagopal",
    role: "Lead System Architect & Integration Engineer",
    img: "/images/IMG_5048.jpeg",
    linkedin: "https://www.linkedin.com/in/gowrishrajagopal/",
  },
  {
    name: "Yasharth Pandey",
    role: "Frontend Developer & Pipeline Engineer",
    img: "/images/IMG_9273.jpeg",
    linkedin: "https://www.linkedin.com/in/yasharth-pandey/",
  },
];

const AboutPage: React.FC = () => {
  return (
    <>
    <Header/>

    <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Section 1: Mission */}
      <section className="min-h-screen flex flex-col md:flex-row items-center justify-center px-6 py-16 bg-white dark:bg-gray-900">
        <div className="md:w-1/2">
          <div className = "w-full">
            <img
            src="/images/lickinggg.jpg"
            alt="Community Sensor"
            className="rounded-2xl w-full max-w-[600px] max-h-[400px] object-contain"
          />
          </div>
          
        </div>
        <div className="md:w-1/2 md:pl-12 mt-8 md:mt-0">
          <h2 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-6">
            Our Mission
          </h2>
          <p className="text-xl leading-relaxed text-gray-700 dark:text-gray-300">
            <strong>Clean air is a basic right.</strong>
            <br />
            
This project is a community-driven initiative to monitor and improve air quality in Licking County using affordable, open-source technology. We aim to make environmental data accessible to all — empowering residents to host sensors, view real-time data, and make informed decisions based on local air conditions.
          </p>
        </div>
      </section>

      {/* Section 2: Devices */}
      <section className="min-h-screen flex flex-col-reverse md:flex-row items-center justify-center px-6 py-16 bg-gradient-to-b from-secondary/30 to-white dark:from-gray-800 dark:to-gray-900 gap-x-20">
        <div className="md:w-1/2 md:pr-12 mt-8 md:mt-0">
          <h2 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-6">
  The Devices
</h2>
<p className="text-xl leading-relaxed text-gray-700 dark:text-gray-300">
  <strong>Built for communities. Trusted by science.</strong>
  <br />
  The air quality data on this site is powered by SimpleAQ sensors — low-cost, open-source devices
  that measure not only PM2.5, but also key environmental metrics like 
  temperature, humidity, and atmospheric pressure. These laser-based particle sensors
  transmit data over Wi-Fi in real time, allowing neighborhoods to participate in grassroots environmental monitoring.
  Designed for simplicity and reliability, SimpleAQ devices make it possible for anyone to contribute to
  data-driven decision-making. Learn more at{" "}
  <a
    href="https://simpleaq.org/blog/what_is_simpleaq"
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary underline"
  >
    simpleaq.org
  </a>.
</p>
</div>
        <div className="md:w-1/2">
            <div className = "w-full">
            <img
                src="/images/sensor for now.jpg"
                alt="SimpleAQ Device"
                className=" rounded-2xl w-full max-w-[600px] max-h-[400px] object-contain"
            />
            </div>
          
        </div>
      </section>

      {/* Section 3: Developer Team */}
<section className="px-6 pt-16 pb-8 bg-white dark:bg-gray-900 text-center">
        <h2 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-12">
          Meet the Developers
        </h2>
        <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
  Our team of undergraduate developers came together to build this platform with a shared passion for open data, community impact, and environmental justice.
</p>

        <div className="flex flex-col md:flex-row justify-center items-center gap-10">
          {developers.map((dev, index) => (
            <div
              key={index}
              className="glass-card rounded-xl shadow-lg p-6 max-w-xs hover:scale-105 transform transition duration-300"
            >
              <a
              href={dev.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="block max-w-xs"
              >
              <div className="p-6">
                <img
                  src={dev.img}
                  alt={dev.name}
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="text-xl font-semibold text-center">{dev.name}</h3>
                <p className="text-sm text-muted-foreground text-center">{dev.role}</p>
              </div>
              </a>
            </div>
          ))}
        </div>
      </section>
<Footer/>

    </div>
    </>
  );
};

export default AboutPage;
