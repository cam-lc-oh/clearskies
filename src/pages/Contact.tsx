import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer'




const Contact = () => {

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);

    const res = await fetch('https://formspree.io/f/manjdble', {
      method: 'POST',
      body: data,
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      setSubmitted(true);
      form.reset();
      // Optional redirect back to the same contact page
    }
  };

  return (
    <>
      <Header />

      {/* Icon Info Section */}
      <section className="pt-24 pb-10 px-6 md:px-24 text-center bg-gradient-to-b from-white to-secondary/30 dark:from-gray-900 dark:to-gray-800/30">
        <div className="grid md:grid-cols-3 gap-10 text-center">
          {[
            {
              title: 'Report a Problem',
              desc: 'Tell us if something isn’t working quite right.',
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ),
            },
            {
              title: 'Become a Sensor Host',
              desc: 'Help monitor air quality by hosting a sensor in your community.',
              icon: (
                <path d="M12 3v3m6.364 1.636l-2.121 2.121M21 12h-3M17.364 17.364l-2.121-2.121M12 21v-3M6.636 17.364l2.121-2.121M3 12h3M6.636 6.636l2.121 2.121" />
              ),
            },
            {
              title: 'Give Us Feedback',
              desc: 'Share your thoughts and suggestions to help us improve.',
              icon: (
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              ),
            },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-card text-primary shadow-md flex items-center justify-center transition hover:scale-105">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  {item.icon}
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-primary">{item.title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

  {/* Contact Form Section */}
<section className="bg-gradient-to-b from-secondary/30 to-white dark:from-gray-800/30 dark:to-gray-900 px-6 md:px-20 py-20">
  <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-14 items-start">

    {/* Left Column */}
    <div className="text-left">
      <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent mb-4">
        Contact Us
      </h2>
      <p className="text-base text-gray-700 dark:text-gray-300 max-w-md leading-relaxed">
        Reach out with your ideas, feedback, or issues. We're excited to hear from you and improve ClearSkies together.
      </p>
    </div>

    {/* Right Column: Soft Blue Morphic Form */}
    <form
  onSubmit={handleSubmit}
  className="relative z-10 bg-card/80 backdrop-blur-xl border border-border shadow-[0_8px_40px_rgba(0,0,0,0.1)] rounded-3xl px-10 py-10 space-y-6 w-full transition hover:shadow-[0_10px_60px_rgba(0,0,0,0.15)]"
>

      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 to-white/10 dark:from-gray-700/20 dark:via-gray-800/10 dark:to-transparent rounded-3xl pointer-events-none" />

      <div className="grid md:grid-cols-2 gap-4 relative z-10">
        <input
          type="text"
          name="First Name"
          required
          placeholder="First Name"
          className="p-4 bg-background/60 border border-border rounded-lg w-full text-sm text-foreground placeholder:text-muted-foreground shadow-inner backdrop-blur focus:ring-2 focus:ring-primary/40 focus:outline-none"
        />
        <input
          type="text"
          name="Last Name"
          placeholder="Last Name"
          className="p-4 bg-background/60 border border-border rounded-lg w-full text-sm text-foreground placeholder:text-muted-foreground shadow-inner backdrop-blur focus:ring-2 focus:ring-primary/40 focus:outline-none"
        />
      </div>

      <input
        type="email"
        name="Email"
        required
        placeholder="Email Address"
        className="p-4 bg-background/60 border border-border rounded-lg w-full text-sm text-foreground placeholder:text-muted-foreground shadow-inner backdrop-blur focus:ring-2 focus:ring-primary/40 focus:outline-none"
      />

      <textarea
        name="Message"
        required
        placeholder="Your message..."
        className="p-4 bg-background/60 border border-border rounded-lg w-full h-36 text-sm text-foreground placeholder:text-muted-foreground resize-none shadow-inner backdrop-blur focus:ring-2 focus:ring-primary/40 focus:outline-none"
      />

      <button
        type="submit"
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
      >
        Submit
      </button>

      {submitted && (
  <p className="text-green-600 text-sm font-medium pt-2">
    Thank you! We received your message.
  </p>
)}

    </form>
    
  </div>
</section>

<Footer/>


    </>
  );
};

export default Contact;
