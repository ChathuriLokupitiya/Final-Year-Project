const PillarsSection = () => {
  return (
    <section className="py-24 md:py-section-gap-desktop bg-surface">
      <div className="max-w-container-max-width mx-auto px-margin-mobile md:px-gutter">
        <div className="text-center max-w-2xl mx-auto mb-20 reveal-on-scroll">
          <h2 className="font-headline-lg text-4xl md:text-headline-lg mb-4">The Foundation</h2>
          <p className="text-secondary font-body-md text-body-md">
            Three pillars that define our approach to elite beauty consultancy.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Pillar 1 */}
          <div className="group p-12 bg-surface-container-low hover:bg-surface-container transition-all duration-500 reveal-on-scroll" style={{ transitionDelay: '100ms' }}>
            <span className="material-symbols-outlined text-4xl text-primary mb-8">content_cut</span>
            <h3 className="font-headline-sm text-headline-sm mb-6">Artisanship</h3>
            <p className="text-secondary font-body-md text-body-md leading-relaxed">
              Beyond skill, we practice a craft. Our artisans are trained in the specific geometry of beauty, ensuring every service is a masterpiece of execution.
            </p>
            <div className="mt-8 h-[1px] w-0 group-hover:w-full bg-primary transition-all duration-700"></div>
          </div>
          
          {/* Pillar 2 */}
          <div className="group p-12 bg-surface-container-low hover:bg-surface-container transition-all duration-500 reveal-on-scroll" style={{ transitionDelay: '200ms' }}>
            <span className="material-symbols-outlined text-4xl text-primary mb-8">auto_awesome</span>
            <h3 className="font-headline-sm text-headline-sm mb-6">Innovation</h3>
            <p className="text-secondary font-body-md text-body-md leading-relaxed">
              We integrate cutting-edge skincare science with timeless techniques, creating a refined evolution of traditional beauty standards.
            </p>
            <div className="mt-8 h-[1px] w-0 group-hover:w-full bg-primary transition-all duration-700"></div>
          </div>
          
          {/* Pillar 3 */}
          <div className="group p-12 bg-surface-container-low hover:bg-surface-container transition-all duration-500 reveal-on-scroll" style={{ transitionDelay: '300ms' }}>
            <span className="material-symbols-outlined text-4xl text-primary mb-8">spa</span>
            <h3 className="font-headline-sm text-headline-sm mb-6">Sanctuary</h3>
            <p className="text-secondary font-body-md text-body-md leading-relaxed">
              Space is the ultimate luxury. Our salon is designed as a neutral canvas, allowing for total mental clarity and sensory restoration.
            </p>
            <div className="mt-8 h-[1px] w-0 group-hover:w-full bg-primary transition-all duration-700"></div>
          </div>
          
        </div>
      </div>
    </section>
  );
};

export default PillarsSection;
