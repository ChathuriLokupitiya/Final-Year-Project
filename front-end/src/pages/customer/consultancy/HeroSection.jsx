import consultationHero from '../../../assets/consultonhero.jpeg';

const HeroSection = () => {
  return (
    <section className="relative h-[60vh] md:h-[75vh] flex items-end overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          alt="Consultancy Hero Background" 
          className="w-full h-full object-cover" 
          src={consultationHero}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-background"></div>
      </div>
      <div className="relative z-10 max-w-container-max-width mx-auto px-margin-mobile md:px-gutter pb-section-gap-mobile md:pb-16 w-full reveal-on-scroll">
        <div className="flex flex-col md:flex-row items-end gap-gutter">
          <div className="md:w-7/12">
            <span className="font-label-sm text-label-sm uppercase tracking-[0.2em] text-primary mb-4 block">Our Collective</span>
            <h1 className="font-display-lg text-5xl md:text-display-lg leading-tight mb-6">The Masters of Aura</h1>
            <p className="font-body-lg text-body-lg text-secondary max-w-xl leading-relaxed">
              A curated circle of visionaries dedicated to the art of self-transformation. Our experts don't just provide services; they craft rituals that honor your individual essence.
            </p>
          </div>
          <div className="md:w-5/12 hidden md:block border-l border-outline-variant/30 pl-gutter">
            <p className="font-body-md text-body-md italic text-on-surface-variant leading-relaxed">
              "Elegance is the only beauty that never fades. We curate the atmosphere for your timeless evolution."
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
