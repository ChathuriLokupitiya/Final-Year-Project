import galleryHero from '../../../assets/galleyhero.jpeg';

const AestheticSection = () => {
  return (
    <section className="py-24 md:py-section-gap-desktop bg-surface-container-low overflow-hidden">
      <div className="max-w-container-max-width mx-auto px-margin-mobile md:px-gutter">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-4 reveal-on-scroll">
            <h2 className="font-headline-lg text-4xl md:text-headline-lg mb-8">Curated <br/> Environments</h2>
            <p className="text-secondary font-body-md text-body-md leading-relaxed mb-8">
              Every curve, material, and light source within Aura has been selected to evoke a sense of architectural harmony. We believe the environment is an essential part of the transformation process.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-4 text-primary font-label-md text-label-md uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-primary-container"></span> Natural Limestone Textures
              </li>
              <li className="flex items-center gap-4 text-primary font-label-md text-label-md uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-primary-container"></span> Ambient Light Engineering
              </li>
              <li className="flex items-center gap-4 text-primary font-label-md text-label-md uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-primary-container"></span> Bespoke Interior Elements
              </li>
            </ul>
          </div>
          
          <div className="lg:col-span-8 reveal-on-scroll">
            <div className="relative group">
              <img 
                alt="Salon architecture" 
                className="w-full aspect-video object-cover shadow-2xl transition-transform duration-1000 group-hover:scale-105" 
                src={galleryHero}
              />
              <div className="absolute -top-6 -right-6 p-8 bg-surface-container-lowest hidden md:block shadow-sm">
                <p className="font-label-sm text-label-sm uppercase tracking-widest text-secondary">Spatial Design — v.1</p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
};

export default AestheticSection;
