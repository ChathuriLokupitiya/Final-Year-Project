const CommitmentSection = () => {
  return (
    <section className="py-24 md:py-section-gap-desktop bg-surface-container-highest">
      <div className="max-w-3xl mx-auto px-margin-mobile text-center reveal-on-scroll">
        <span 
          className="material-symbols-outlined text-primary-container text-5xl mb-12" 
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          format_quote
        </span>
        <blockquote className="font-headline-lg text-3xl md:text-headline-lg italic text-on-surface leading-snug mb-12">
          "Our commitment is to the refined evolution of every individual who enters our doors. We don't just change appearances; we enhance the inherent architecture of personal identity."
        </blockquote>
        <div className="flex flex-col items-center gap-2">
          <span className="font-label-md text-label-md uppercase tracking-[0.4em] text-primary">Amaya Perera</span>
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary">Founder &amp; Lead Architect of Beauty</span>
        </div>
      </div>
    </section>
  );
};

export default CommitmentSection;
