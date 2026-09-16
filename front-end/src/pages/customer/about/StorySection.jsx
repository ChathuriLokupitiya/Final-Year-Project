const StorySection = () => {
  return (
    <section className="py-24 md:py-section-gap-desktop bg-surface-container-lowest">
      <div className="max-w-container-max-width mx-auto px-margin-mobile md:px-gutter">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 items-center">
          
          <div className="md:col-span-5 reveal-on-scroll">
            <span className="font-label-sm text-label-sm uppercase tracking-[0.2em] text-outline-variant mb-4 block">Our Narrative</span>
            <h2 className="font-headline-lg text-4xl md:text-headline-lg mb-8 leading-tight">
              Founded on the principles of <span className="text-primary italic">Absolute Precision</span>
            </h2>
            <div className="space-y-6 text-secondary font-body-md text-body-md leading-relaxed">
              <p>
                Aura was born from a singular vision: to bridge the gap between high-end architectural design and the art of beauty consultancy. We view each client as a unique structure, requiring dedicated attention to detail and a profound understanding of form.
              </p>
              <p>
                Our journey began in a small studio in Colombo, Sri Lanka, driven by the belief that luxury is found in the quiet moments of transformation. Today, that commitment to excellence remains our north star.
              </p>
            </div>
          </div>
          
          <div className="md:col-span-7 relative reveal-on-scroll">
            <div className="aspect-[4/5] md:aspect-[3/2] overflow-hidden">
              <img 
                className="w-full h-full object-cover transition-transform duration-1000 hover:scale-105" 
                alt="A high-end, minimalist salon workspace" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCws20OL62khgGSUTBoSGB33Pk1sh8UBEff6dPBMk8Z_cz4sk61SJSL9g-YHsLHQWXZJEPuXm1-kaUqWjwePuOf0-DGTek3P0cn-jjdQywZUP3z5UMC0Y42tcPr6aokIriFZB5eRtTB2ibMLbyw77zem1DOJjfRpOCYm9GN-I8RRsBzM2LLzq2Ae1ku4R07yBZB49Xiag57XMzUGHpTOj8Y5LgGRYCWrsfiGNsGs5Ow0GHJvFrnlBCUodSqLLOsRrJmLLxopPIrvHU"
              />
            </div>
            <div className="absolute -bottom-12 -left-12 hidden md:block w-64 h-64 border-[1px] border-outline-variant/30 -z-10"></div>
          </div>
          
        </div>
      </div>
    </section>
  );
};

export default StorySection;
