import aboutHero from '../../../assets/about.jpg';

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] md:min-h-screen flex items-center pt-20 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          alt="Hero background" 
          className="w-full h-full object-cover brightness-95 scale-105" 
          src={aboutHero}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-surface/80 via-surface/40 to-transparent"></div>
      </div>
      <div className="relative z-10 w-full max-w-container-max-width mx-auto px-margin-mobile md:px-gutter">
        <div className="max-w-2xl reveal-on-scroll active">
          <span className="font-label-sm text-label-sm uppercase tracking-[0.3em] text-primary mb-6 block">Est. 2024</span>
          <h1 className="font-display-lg text-5xl md:text-display-lg mb-8 text-on-background leading-tight">
            The Aura Ethos: <br/>
            <span className="italic font-light">Beauty as Architecture</span>
          </h1>
          <p className="font-body-lg text-base md:text-body-lg text-secondary max-w-xl mb-12 leading-relaxed">
            We believe beauty is not merely a service, but a structural refinement of the self. A curated sanctuary where precision meets poise.
          </p>
          <div className="flex items-center gap-6">
            <div className="w-12 h-[1px] bg-primary"></div>
            <span className="font-label-md text-label-md uppercase tracking-widest text-primary">Scroll to Discover</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
