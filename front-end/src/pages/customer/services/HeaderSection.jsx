import serviceHero from '../../../assets/servicehero.jpg';

const HeaderSection = () => {
  return (
    <section className="relative h-[60vh] md:h-[75vh] flex items-end overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          alt="Services Hero Background" 
          className="w-full h-full object-cover" 
          src={serviceHero}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-background"></div>
      </div>
      <div className="relative z-10 max-w-container-max-width mx-auto px-margin-mobile md:px-gutter pb-section-gap-mobile md:pb-16 w-full reveal-on-scroll">
        <div className="max-w-2xl">
          <span className="font-label-sm text-label-sm uppercase tracking-[0.2em] text-primary mb-4 block">The Aura Collection</span>
          <h1 className="font-display-lg text-5xl md:text-display-lg leading-tight mb-6">Our Services</h1>
          <p className="font-body-lg text-body-lg text-secondary max-w-lg">
            A curated symphony of sensory experiences designed to harmonize your inner essence with external radiance. Our holistic approach converges architectural precision with editorial grace.
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeaderSection;
