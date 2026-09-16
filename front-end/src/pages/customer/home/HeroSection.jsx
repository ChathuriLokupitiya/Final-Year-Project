import { useNavigate, Link } from 'react-router-dom';
import homeHero from '../../../assets/homeHero.png';

const HeroSection = () => {
  const navigate = useNavigate();
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${homeHero})` }}></div>
        <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/60 to-transparent"></div>
      </div>
      <div className="relative z-10 max-w-container-max-width mx-auto px-gutter w-full">
        <div className="max-w-2xl">
          <span className="font-label-sm text-label-sm uppercase tracking-[0.2em] text-primary mb-6 block">Refining Your Inner Light</span>
          <h1 className="font-display-lg text-4xl md:text-display-lg mb-6 md:mb-8 leading-tight">Where Elegance <br /><span className="italic font-normal">Meets Transformation</span></h1>
          <p className="font-body-lg text-base md:text-body-lg text-on-surface-variant mb-10 md:mb-12 max-w-lg">Experience a sanctuary of bespoke beauty, where master artistry and holistic care converge to reveal your most radiant self.</p>
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center w-full">
            <button 
              onClick={() => navigate('/services')}
              className="w-full sm:w-auto bg-on-surface text-surface px-10 py-5 font-label-md uppercase tracking-widest hover:bg-primary transition-colors shadow-lg"
            >
              Book Appointment
            </button>
            <button 
              onClick={() => {
                document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="group flex items-center justify-center w-full sm:w-auto gap-3 font-label-md text-label-md uppercase tracking-widest text-primary"
            >
              Explore Rituals 
              <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
