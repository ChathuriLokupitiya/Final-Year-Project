import { useNavigate } from 'react-router-dom';

const CTASection = () => {
  const navigate = useNavigate();
  return (
    <section className="py-32 bg-primary relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div 
          className="absolute inset-0" 
          style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        ></div>
      </div>
      <div className="relative z-10 max-w-container-max-width mx-auto px-margin-mobile md:px-gutter text-center reveal-on-scroll">
        <h2 className="font-headline-lg text-4xl md:text-headline-lg text-on-primary mb-8">
          Experience the Aura Difference
        </h2>
        <p className="text-primary-fixed-dim font-body-lg text-base md:text-body-lg mb-12 max-w-xl mx-auto">
          Step into a world where beauty is treated with the reverence of fine art. Your personalized consultation awaits.
        </p>
        <button 
          onClick={() => navigate('/consultancy')}
          className="bg-surface text-primary px-12 py-5 font-label-md text-label-md uppercase tracking-[0.2em] hover:bg-primary-fixed-dim hover:text-on-primary transition-all duration-300 shadow-xl group"
        >
          Book a Consultation
          <span className="inline-block transition-transform duration-300 group-hover:translate-x-2 ml-4">→</span>
        </button>
      </div>
    </section>
  );
};

export default CTASection;
