import contactHero from '../../../assets/contatckhero.jpeg';

const HeroSection = () => {
  return (
    <section className="relative h-[60vh] md:h-[75vh] flex items-end overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          alt="Contact Hero Background" 
          className="w-full h-full object-cover" 
          src={contactHero}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-background"></div>
      </div>
      <div className="relative z-10 max-w-container-max-width mx-auto px-margin-mobile md:px-gutter pb-section-gap-mobile md:pb-16 w-full reveal-on-scroll">
        <div className="max-w-2xl">
          <span className="font-label-sm text-label-sm uppercase tracking-[0.2em] text-primary mb-4 block">Begin Your Transformation</span>
          <h1 className="font-display-lg text-5xl md:text-display-lg leading-tight mb-6">Contact Us</h1>
          <p className="font-body-lg text-body-lg text-secondary max-w-lg">
            Your journey to refined beauty and serene wellness begins with a single conversation. Connect with our Sri Lankan concierge to tailor your bespoke experience.
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
