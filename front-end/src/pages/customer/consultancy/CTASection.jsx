const CTASection = () => {
  return (
    <section className="max-w-container-max-width mx-auto px-margin-mobile md:px-gutter py-16 md:py-section-gap-mobile reveal-on-scroll">
      <div className="bg-primary p-12 md:p-24 text-center text-on-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="w-full h-full bg-[radial-gradient(circle_at_center,#ffffff,transparent)] scale-150"></div>
        </div>
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="font-headline-lg text-4xl md:text-headline-lg mb-6">Begin Your Aura Journey</h2>
          <p className="font-body-lg text-base md:text-body-lg mb-12 opacity-90">
            Experience the transformative power of master artistry. Book a personal consultation with your chosen expert today.
          </p>
          <button className="bg-surface text-on-surface hover:bg-primary-fixed-dim transition-colors px-12 py-5 font-label-md text-label-md uppercase tracking-[0.2em] font-bold">
            Start Your Ritual
          </button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
