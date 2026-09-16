import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';

const ArtisanProfiles = () => {
  const navigate = useNavigate();
  const [artisans, setArtisans] = useState([]);

  useEffect(() => {
    const fetchArtisans = async () => {
      try {
        const res = await api.get('/staff');
        const staff = res.data.data || res.data || [];
        const consultants = staff.filter(s => s.isConsultant).slice(0, 4);
        setArtisans(consultants);
      } catch (error) {
        console.error("Failed to load artisans:", error);
      }
    };
    fetchArtisans();
  }, []);

  const displayArtisans = artisans;

  return (
    <section className="py-section-gap-desktop bg-surface-bright">
      <div className="max-w-container-max-width mx-auto px-gutter">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary mb-4 block">Meet the Masters</span>
            <h2 className="font-headline-lg text-headline-lg">The Hands of Aura</h2>
          </div>
          <button 
            onClick={() => navigate('/consultancy')}
            className="font-label-md text-label-md uppercase tracking-widest px-8 py-3 border border-on-surface hover:bg-on-surface hover:text-surface transition-all"
          >
            View All Artisans
          </button>
        </div>
        {displayArtisans.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {displayArtisans.map((artisan, idx) => (
              <div key={artisan._id || idx} className="group">
                <div className="aspect-[3/4] overflow-hidden mb-6 relative">
                  <img 
                    alt={artisan.user?.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    src={artisan.profileImages?.[0] || artisan.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(artisan.user?.name || 'A')}&background=random`} 
                    onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(artisan.user?.name || 'A')}&background=random`; }}
                  />
                  <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <h4 className="font-headline-sm text-headline-sm mb-1">{artisan.user?.name}</h4>
                <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">{artisan.specializations?.[0] || 'Consultant'}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-on-surface-variant py-10">
            No artisans currently available.
          </div>
        )}
      </div>
    </section>
  );
};

export default ArtisanProfiles;
