const AboutSection = () => {
  return (
    <section className="py-section-gap-desktop bg-surface-container-lowest">
      <div className="max-w-container-max-width mx-auto px-gutter">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 items-center">
          <div className="md:col-span-5 reveal-on-scroll">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary mb-4 block">Our Philosophy</span>
            <h2 className="font-headline-lg text-headline-lg mb-8">More Than a Service. It’s an Experience.</h2>
            <div className="space-y-6 text-on-surface-variant">
              <p className="font-body-lg text-body-lg">At Aura, we believe beauty is an intimate dialogue between precision and personality. Our practitioners don’t just perform rituals; they curate transformations tailored to your unique anatomy and spirit.</p>
              <div className="pt-6 space-y-4">
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <p className="font-label-md text-label-md uppercase tracking-wide">Artisan Precision</p>
                </div>
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <p className="font-label-md text-label-md uppercase tracking-wide">Botanical Formulations</p>
                </div>
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <p className="font-label-md text-label-md uppercase tracking-wide">Sanctuary Setting</p>
                </div>
              </div>
            </div>
          </div>
          <div className="md:col-span-7 reveal-on-scroll">
            <div className="relative aspect-[4/5] overflow-hidden luxury-shadow">
              <img alt="Luxury facial treatment" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmWdeZtxTKxUH4voU0HBOm9kMxgJ2Gg8hYx1_kuw4S0w4cvJSkm4oH17zWebklidhIxRMmdxQlPAFrJNvrtRyZ81b6rLOg7lVAt7IdYejsGmvemVD5u22J6UKh8VG2DFXfkAfgJ4M4KbRB8J_okTzezm5wvWBs3QzRadxqbRXFqOh4g_nw_bEuuJQC9qX5uLc4QMBNWAmhZV9E7AZieuVHtCGniqj81MRRudWCA5hg1kw-dkX2UfB5yinQHJ4VIglaq6ba603v7_A" />
              <div className="absolute bottom-8 right-8 bg-surface p-8 max-w-xs luxury-shadow hidden lg:block">
                <p className="font-headline-sm text-headline-sm italic mb-2">"True beauty begins the moment you decide to be yourself."</p>
                <span className="font-label-sm text-label-sm uppercase text-primary">— Amaya P., Founder</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
