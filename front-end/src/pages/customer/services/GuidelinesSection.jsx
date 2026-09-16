const GuidelinesSection = () => {
  return (
    <section className="py-32 px-margin-mobile md:px-gutter max-w-container-max-width mx-auto reveal-on-scroll">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 items-start">
        <div className="lg:col-span-1">
          <h2 className="font-headline-lg text-4xl md:text-headline-lg mb-8">The Aura Protocol</h2>
          <p className="font-body-lg text-base md:text-body-lg text-on-surface-variant mb-8">
            To preserve the serenity of our environment, we kindly ask our guests to observe our collection guidelines.
          </p>
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-12">
          
          <div className="p-8 border border-outline-variant hover:border-primary-container transition-colors duration-500">
            <div className="flex items-center gap-4 mb-6">
              <span className="material-symbols-outlined text-primary text-3xl">event_busy</span>
              <h5 className="font-headline-sm text-headline-sm">Cancellations</h5>
            </div>
            <p className="font-body-md text-on-surface-variant leading-relaxed">
              We require a 24-hour notice for all cancellations. Late cancellations or no-shows will incur a 50% service fee as we reserve our space exclusively for you.
            </p>
          </div>
          
          <div className="p-8 border border-outline-variant hover:border-primary-container transition-colors duration-500">
            <div className="flex items-center gap-4 mb-6">
              <span className="material-symbols-outlined text-primary text-3xl">nest_clock_farsight_analog</span>
              <h5 className="font-headline-sm text-headline-sm">Arrival Etiquette</h5>
            </div>
            <p className="font-body-md text-on-surface-variant leading-relaxed">
              Please arrive 15 minutes prior to your appointment to enjoy our sensory welcome ritual and ensure a seamless transition into your treatment.
            </p>
          </div>
          
          <div className="p-8 border border-outline-variant hover:border-primary-container transition-colors duration-500">
            <div className="flex items-center gap-4 mb-6">
              <span className="material-symbols-outlined text-primary text-3xl">vibration</span>
              <h5 className="font-headline-sm text-headline-sm">Serene Environment</h5>
            </div>
            <p className="font-body-md text-on-surface-variant leading-relaxed">
              To maintain a peaceful atmosphere for all guests, we request that all cellular devices be silenced during your visit to the Aura studio.
            </p>
          </div>
          
          <div className="p-8 border border-outline-variant hover:border-primary-container transition-colors duration-500">
            <div className="flex items-center gap-4 mb-6">
              <span className="material-symbols-outlined text-primary text-3xl">medical_services</span>
              <h5 className="font-headline-sm text-headline-sm">Health &amp; Wellness</h5>
            </div>
            <p className="font-body-md text-on-surface-variant leading-relaxed">
              Please inform your artisan of any health conditions, allergies, or medications before your treatment begins for a safe experience.
            </p>
          </div>
          
        </div>
      </div>
    </section>
  );
};

export default GuidelinesSection;
