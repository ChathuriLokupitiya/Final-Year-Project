import { Link } from 'react-router-dom';
import loginImage from '../../../assets/login.jpg';

const FaqSection = () => {
  return (
    <section className="bg-surface-container-low py-section-gap-desktop">
      <div className="max-w-container-max-width mx-auto px-margin-mobile md:px-gutter">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          
          <div className="order-2 lg:order-1 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* FAQ Block 1 */}
            <div className="bg-white p-10 border border-outline-variant/10 hover:border-primary/30 transition-all duration-300 group shadow-sm hover:shadow-md reveal-on-scroll">
              <h4 className="font-headline-sm text-2xl md:text-headline-sm mb-4">Bespoke Consultations</h4>
              <p className="font-body-md text-body-md text-secondary mb-6 leading-relaxed">
                Each journey begins with a private 30-minute analysis to understand your unique aesthetic identity.
              </p>
              <Link to="/consultancy" className="font-label-sm text-label-sm uppercase tracking-widest text-primary flex items-center group-hover:translate-x-2 transition-transform">
                Learn More <span className="material-symbols-outlined text-sm ml-2">arrow_forward</span>
              </Link>
            </div>
            
            {/* FAQ Block 2 */}
            <div className="bg-white p-10 border border-outline-variant/10 hover:border-primary/30 transition-all duration-300 group shadow-sm hover:shadow-md reveal-on-scroll delay-100">
              <h4 className="font-headline-sm text-2xl md:text-headline-sm mb-4">Ritual Etiquette</h4>
              <p className="font-body-md text-body-md text-secondary mb-6 leading-relaxed">
                We invite guests to arrive 15 minutes early to settle into our Serenity Lounge with a curated infusion.
              </p>
              <Link to="/about" className="font-label-sm text-label-sm uppercase tracking-widest text-primary flex items-center group-hover:translate-x-2 transition-transform">
                View Guide <span className="material-symbols-outlined text-sm ml-2">arrow_forward</span>
              </Link>
            </div>
            
            {/* FAQ Block 3 */}
            <div className="bg-white p-10 border border-outline-variant/10 hover:border-primary/30 transition-all duration-300 group shadow-sm hover:shadow-md reveal-on-scroll delay-200">
              <h4 className="font-headline-sm text-2xl md:text-headline-sm mb-4">Cancellations</h4>
              <p className="font-body-md text-body-md text-secondary mb-6 leading-relaxed">
                We require 48 hours' notice for any rescheduling to ensure our specialists' time is respected.
              </p>
              <a href="#" className="font-label-sm text-label-sm uppercase tracking-widest text-primary flex items-center group-hover:translate-x-2 transition-transform">
                Policy <span className="material-symbols-outlined text-sm ml-2">arrow_forward</span>
              </a>
            </div>
            
            {/* FAQ Block 4 */}
            <div className="bg-white p-10 border border-outline-variant/10 hover:border-primary/30 transition-all duration-300 group shadow-sm hover:shadow-md reveal-on-scroll delay-300">
              <h4 className="font-headline-sm text-2xl md:text-headline-sm mb-4">Privacy</h4>
              <p className="font-body-md text-body-md text-secondary mb-6 leading-relaxed">
                Aura provides discreet rear entrance access and private suites for high-profile clientele upon request.
              </p>
              <a href="#" className="font-label-sm text-label-sm uppercase tracking-widest text-primary flex items-center group-hover:translate-x-2 transition-transform">
                Inquire <span className="material-symbols-outlined text-sm ml-2">arrow_forward</span>
              </a>
            </div>
          </div>
          
          <div className="order-1 lg:order-2 space-y-8 reveal-on-scroll">
            <div className="aspect-[4/5] relative overflow-hidden group">
              <img 
                alt="Secondary Visual" 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                src={loginImage}
              />
            </div>
            <div className="pl-8 border-l border-primary/40">
              <p className="font-headline-sm text-2xl md:text-headline-sm italic text-primary">"Beauty is not an appointment; it is a ritual of self-reclamation."</p>
              <p className="font-label-sm text-label-sm uppercase tracking-widest text-secondary mt-4">— Amaya Perera, Creative Director</p>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
