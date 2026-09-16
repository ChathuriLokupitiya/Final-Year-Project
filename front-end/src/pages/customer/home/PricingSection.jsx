const PricingSection = () => {
  return (
    <section className="py-section-gap-desktop bg-surface-container-low">
      <div className="max-w-container-max-width mx-auto px-gutter">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-4">
            <h2 className="font-headline-lg text-headline-lg mb-6">Simple Pricing <br />Transparent Service</h2>
            <p className="text-on-surface-variant font-body-md mb-10">We believe in clarity and value. Our pricing reflects the level of expertise and premium materials used in every ritual.</p>
            <div className="p-8 bg-surface border border-outline-variant/30 luxury-shadow">
              <span className="font-label-sm text-label-sm uppercase text-primary mb-2 block">New Client Offer</span>
              <h4 className="font-headline-sm text-headline-sm mb-4">Exclusive 20% Off</h4>
              <p className="text-on-surface-variant text-sm mb-6">On your first visit to our boutique. Experience the Aura difference at a special welcome price.</p>
              <button className="w-full py-4 bg-on-surface text-surface font-label-md uppercase tracking-widest hover:bg-primary transition-colors">Claim Privilege</button>
            </div>
          </div>
          <div className="lg:col-span-8">
            <div className="space-y-2">
              <div className="flex justify-between items-end py-6 border-b border-outline-variant/30 group">
                <div>
                  <h5 className="font-headline-sm text-headline-sm group-hover:text-primary transition-colors">Bespoke Haircut</h5>
                  <p className="text-on-surface-variant text-sm italic">Styling consultation included</p>
                </div>
                <span className="font-headline-sm text-headline-sm">LKR 110+</span>
              </div>
              <div className="flex justify-between items-end py-6 border-b border-outline-variant/30 group">
                <div>
                  <h5 className="font-headline-sm text-headline-sm group-hover:text-primary transition-colors">Global Color</h5>
                  <p className="text-on-surface-variant text-sm italic">Ammonia-free organic pigment</p>
                </div>
                <span className="font-headline-sm text-headline-sm">LKR 155+</span>
              </div>
              <div className="flex justify-between items-end py-6 border-b border-outline-variant/30 group">
                <div>
                  <h5 className="font-headline-sm text-headline-sm group-hover:text-primary transition-colors">Balayage Artistry</h5>
                  <p className="text-on-surface-variant text-sm italic">Hand-painted dimension</p>
                </div>
                <span className="font-headline-sm text-headline-sm">LKR 240+</span>
              </div>
              <div className="flex justify-between items-end py-6 border-b border-outline-variant/30 group">
                <div>
                  <h5 className="font-headline-sm text-headline-sm group-hover:text-primary transition-colors">Cellular Face Therapy</h5>
                  <p className="text-on-surface-variant text-sm italic">90 minute intensive ritual</p>
                </div>
                <span className="font-headline-sm text-headline-sm">LKR 210+</span>
              </div>
              <div className="flex justify-between items-end py-6 border-b border-outline-variant/30 group">
                <div>
                  <h5 className="font-headline-sm text-headline-sm group-hover:text-primary transition-colors">The Royal Mani-Pedi</h5>
                  <p className="text-on-surface-variant text-sm italic">Paraffin mask and massage</p>
                </div>
                <span className="font-headline-sm text-headline-sm">LKR 125+</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
