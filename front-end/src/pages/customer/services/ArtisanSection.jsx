import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';

const ArtisanSection = () => {
  const navigate = useNavigate();
  const [artisans, setArtisans] = useState([]);

  useEffect(() => {
    const fetchArtisans = async () => {
      try {
        const res = await api.get('/staff');
        const staff = res.data.data || res.data || [];
        const consultants = staff.filter(s => s.isConsultant).slice(0, 2); // Show top 2
        setArtisans(consultants);
      } catch (error) {
        console.error("Failed to load artisans:", error);
      }
    };
    fetchArtisans();
  }, []);
  return (
    <section className="bg-surface-container-low py-32 reveal-on-scroll">
      <div className="px-margin-mobile md:px-gutter max-w-container-max-width mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-baseline mb-20 gap-8">
          <h2 className="font-display-lg text-4xl md:text-display-lg">The Hands of Aura</h2>
          <p className="font-body-lg text-base md:text-body-lg text-on-surface-variant max-w-md">
            Our master practitioners are more than technicians; they are the architects of your transformation.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {artisans.map((artisan, index) => (
            <div key={artisan._id || index} className={`flex flex-col md:flex-row items-center gap-8 md:gap-12 group ${index % 2 !== 0 ? 'md:mt-32' : ''}`}>
              <div className="w-full md:w-1/2 aspect-[3/4] overflow-hidden">
                <img 
                  alt={artisan.user?.name} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" 
                  src={artisan.profileImages?.[0] || artisan.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(artisan.user?.name || 'A')}&background=random`} 
                  onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(artisan.user?.name || 'A')}&background=random`; }}
                />
              </div>
              <div className="w-full md:w-1/2">
                <span className="font-label-md text-label-md uppercase tracking-[0.3em] text-primary-container mb-4 block">
                  {artisan.specializations?.[0] || 'Consultant'}
                </span>
                <h4 className="font-headline-md text-headline-md mb-6">{artisan.user?.name}</h4>
                <p className="font-body-md text-on-surface-variant mb-8 leading-relaxed italic line-clamp-4">
                  "{artisan.bio || "Dedicated to providing an exceptional and transformative experience tailored specifically to your unique aesthetic identity."}"
                </p>
                <button 
                  onClick={() => navigate('/consultancy')}
                  className="inline-flex items-center gap-2 font-label-md text-label-md uppercase tracking-widest text-primary hover:gap-4 transition-all"
                >
                  View Profile <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ArtisanSection;
