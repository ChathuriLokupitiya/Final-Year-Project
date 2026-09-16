import { useState, useRef, useEffect } from 'react';
import BookingWizard from '../../../components/web/BookingWizard';
import userService from '../../../services/userService';
import useAuthStore from '../../../store/authStore';

const ExpertShowcase = ({ consultants = [] }) => {
  const [selectedExpertId, setSelectedExpertId] = useState(null);
  const [fadeState, setFadeState] = useState('fade-in');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const [savedConsultants, setSavedConsultants] = useState(new Set());

  useEffect(() => {
    if (isAuthenticated) {
      userService.getWishlist().then(res => {
        const wishlist = res.data.data;
        if (wishlist && wishlist.consulton) {
          setSavedConsultants(new Set(wishlist.consulton.map(c => typeof c === 'object' ? c._id : c)));
        }
      }).catch(err => console.error("Failed to load wishlist", err));
    }
  }, [isAuthenticated]);

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      alert("Please log in to add to wishlist");
      return;
    }
    try {
      await userService.toggleWishlistConsulton(selectedExpertId);
      setSavedConsultants(prev => {
        const newSet = new Set(prev);
        if (newSet.has(selectedExpertId)) {
          newSet.delete(selectedExpertId);
        } else {
          newSet.add(selectedExpertId);
        }
        return newSet;
      });
    } catch (err) {
      console.error(err);
      alert("Failed to update wishlist");
    }
  };

  useEffect(() => {
    if (consultants.length > 0 && !selectedExpertId) {
      setSelectedExpertId(consultants[0]._id);
    }
  }, [consultants, selectedExpertId]);

  const handleSelectExpert = (id) => {
    if (id === selectedExpertId) return;

    setFadeState('fade-out');
    setTimeout(() => {
      setSelectedExpertId(id);
      setFadeState('fade-in');
    }, 300);
  };

  if (!consultants || consultants.length === 0) {
    return (
      <section className="max-w-container-max-width mx-auto px-margin-mobile md:px-gutter mb-16 text-center text-gray-500 py-20 reveal-on-scroll">
        <p className="font-body-lg">No consultants available at the moment.</p>
      </section>
    );
  }

  const selectedExpert = consultants.find(c => c._id === selectedExpertId) || consultants[0];

  return (
    <>
      <section className="max-w-container-max-width mx-auto px-margin-mobile md:px-gutter py-section-gap-desktop reveal-on-scroll">
        <div className="bg-surface-container-low/30 border border-outline-variant/20 p-6 md:p-12 lg:p-16 relative overflow-hidden luxury-shadow">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            
            {/* Left: Large Image Profile */}
            <div className="lg:col-span-5 relative group">
              <div className={`relative z-10 border border-outline-variant/30 shadow-2xl aspect-[3/4] overflow-hidden transition-all duration-500 ${fadeState === 'fade-out' ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
                <img 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                  src={selectedExpert.profileImages?.[0] || selectedExpert.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedExpert.user?.name || 'Expert')}&background=random`} 
                  onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedExpert.user?.name || 'Expert')}&background=random`; }}
                  alt={selectedExpert.user?.name} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80"></div>
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="font-label-sm text-label-sm text-primary uppercase tracking-[0.2em] mb-1">
                    {selectedExpert.specializations?.[0] || 'Master Artisan'}
                  </p>
                  <h3 className="font-display-sm text-3xl text-white">{selectedExpert.user?.name}</h3>
                </div>
              </div>
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-primary/10 -z-0 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-6 -right-6 w-48 h-48 border border-primary/20 -z-0"></div>
            </div>

            {/* Right: Details & Thumbnails */}
            <div className="lg:col-span-7 flex flex-col justify-center h-full">
              <div className={`transition-all duration-500 ${fadeState === 'fade-out' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                <div className="mb-8">
                  <span className="font-label-md text-label-md uppercase text-primary mb-6 flex items-center gap-3 tracking-widest">
                    <span className="w-8 h-[1px] bg-primary"></span>
                    The Artisan Profile
                  </span>
                  <h2 className="font-headline-lg text-4xl md:text-5xl mb-6 leading-tight">{selectedExpert.user?.name}</h2>
                  
                  <div className="flex flex-wrap gap-3 mb-8">
                    {selectedExpert.specializations?.map((spec, idx) => (
                      <span key={idx} className="bg-surface-container-highest text-on-surface px-5 py-2 font-label-sm text-label-sm uppercase tracking-widest border border-outline-variant/30">
                        {spec}
                      </span>
                    ))}
                    {selectedExpert.experience > 0 && (
                      <span className="bg-primary/5 text-primary px-5 py-2 font-label-sm text-label-sm uppercase tracking-widest border border-primary/20">
                        {selectedExpert.experience} Years Experience
                      </span>
                    )}
                  </div>
                  
                  <p className="font-body-lg text-lg text-on-surface-variant leading-relaxed mb-6 md:pr-12 whitespace-pre-line">
                    {selectedExpert.bio || "A highly skilled consultant ready to help you achieve your desired look. Combining modern techniques with artistic vision, ensuring every client leaves feeling their absolute best."}
                  </p>

                  {selectedExpert.consultationPrice != null && (
                    <p className="font-headline-sm text-2xl text-primary mb-8">
                      Consultation from LKR {Number(selectedExpert.consultationPrice).toLocaleString('en-LK')}
                    </p>
                  )}
                  
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setIsWizardOpen(true)}
                      className="group relative bg-on-surface text-surface px-10 py-5 font-label-md text-label-md uppercase tracking-[0.2em] hover:bg-primary transition-all overflow-hidden flex-grow"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        Book Consultation
                        <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">arrow_forward</span>
                      </span>
                    </button>
                    
                    <button 
                      onClick={handleToggleWishlist}
                      className={`transition-colors p-5 flex items-center justify-center border ${savedConsultants.has(selectedExpertId) ? 'border-primary text-primary bg-primary/5' : 'border-outline-variant/30 text-gray-400 hover:text-primary hover:border-primary'}`}
                      title={savedConsultants.has(selectedExpertId) ? "Remove from Wishlist" : "Add to Wishlist"}
                    >
                      <span 
                        className="material-symbols-outlined text-3xl"
                        style={{ fontVariationSettings: savedConsultants.has(selectedExpertId) ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        favorite
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Thumbnails to switch consultants */}
              {consultants.length > 1 && (
                <div className="mt-auto pt-12 border-t border-outline-variant/20">
                  <p className="font-label-sm text-label-sm uppercase tracking-widest text-secondary mb-6">Discover Other Artisans</p>
                  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {consultants.map(expert => {
                      const isSelected = selectedExpertId === expert._id;
                      return (
                        <div 
                          key={expert._id}
                          onClick={() => handleSelectExpert(expert._id)}
                          className={`relative flex-shrink-0 w-20 h-28 cursor-pointer overflow-hidden transition-all duration-300 ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : 'opacity-60 hover:opacity-100 grayscale hover:grayscale-0'}`}
                        >
                          <img 
                            className="w-full h-full object-cover" 
                            src={expert.profileImages?.[0] || expert.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(expert.user?.name || 'Expert')}&background=random`} 
                            onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(expert.user?.name || 'Expert')}&background=random`; }}
                            alt={expert.user?.name} 
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/20"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {isWizardOpen && (
        <BookingWizard 
          consultant={selectedExpert}
          onClose={() => setIsWizardOpen(false)}
        />
      )}
    </>
  );
};

export default ExpertShowcase;
