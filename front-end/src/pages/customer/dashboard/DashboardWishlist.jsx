import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import userService from '../../../services/userService';

const DashboardWishlist = () => {
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState({ services: [], consulton: [] });
  const [loading, setLoading] = useState(true);
  
  const [servicesPage, setServicesPage] = useState(1);
  const [consultantsPage, setConsultantsPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const res = await userService.getWishlist();
      setWishlist(res.data.data || { services: [], consulton: [] });
    } catch (error) {
      console.error("Failed to fetch wishlist", error);
    } finally {
      setLoading(false);
    }
  };

  const hasItems = wishlist.services?.length > 0 || wishlist.consulton?.length > 0;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-8 border-b border-outline-variant/30 pb-4">
        <div>
          <h1 className="font-headline-md text-3xl text-on-surface uppercase tracking-widest mb-2">My Wishlist</h1>
          <p className="font-body-md text-secondary">Saved services, specialists, and bespoke treatments.</p>
        </div>
        <button onClick={() => navigate('/services')} className="bg-on-surface text-surface px-6 py-2 font-label-md uppercase tracking-widest hover:bg-primary transition-colors luxury-shadow">
          Explore Services
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading wishlist...</div>
      ) : !hasItems ? (
        <div className="bg-surface-container-lowest border border-outline-variant/30 p-12 text-center flex flex-col items-center justify-center luxury-shadow opacity-70">
          <span className="material-symbols-outlined text-5xl text-outline mb-4">favorite</span>
          <h3 className="font-headline-sm text-xl text-on-surface mb-2 uppercase tracking-widest">Your Wishlist is Empty</h3>
          <p className="font-body-md text-secondary max-w-md">You haven't saved any items to your wishlist yet. Browse our curated services and click the heart icon to save your favorites for later.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {wishlist.services?.length > 0 && (
            <div className="mb-12">
              <h3 className="font-headline-sm text-xl mb-6 border-b border-outline-variant/30 pb-4 text-secondary uppercase tracking-widest">Saved Services</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
                {wishlist.services.slice((servicesPage - 1) * itemsPerPage, servicesPage * itemsPerPage).map((service) => (
                  <div key={service._id} className="group cursor-pointer flex flex-col h-full bg-surface-container-lowest luxury-shadow border border-outline-variant/30 transition-all hover:border-primary/50" onClick={() => navigate(`/services/${service._id}`)}>
                    <div className="relative overflow-hidden aspect-[3/2] bg-surface-container">
                      {service.images && service.images.length > 0 ? (
                        <img 
                          alt={service.name} 
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" 
                          src={service.images[0]}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">
                          <span className="material-symbols-outlined text-4xl">image</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6 flex-grow flex flex-col">
                      <div className="text-[11px] uppercase tracking-widest text-gray-500 mb-2">
                        {service.duration} MINS — {service.category?.name || service.category || 'GENERAL'}
                      </div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-serif text-xl text-secondary pr-4 leading-tight">{service.name}</h4>
                        <span 
                          className="material-symbols-outlined text-primary flex-shrink-0 text-[22px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          favorite
                        </span>
                      </div>
                      <p className="font-serif text-lg text-primary mb-6">LKR {service.price?.toFixed(0)}</p>
                      
                      <div className="mt-auto pt-4 border-t border-outline-variant/20 flex justify-between items-center">
                        <span className="text-xs uppercase tracking-widest text-on-surface group-hover:text-primary transition-colors">Book Now</span>
                        <span className="material-symbols-outlined text-on-surface group-hover:text-primary transition-colors">arrow_forward</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {wishlist.services.length > itemsPerPage && (
                <div className="flex justify-center items-center mt-8 gap-4">
                  <button 
                    onClick={() => setServicesPage(prev => Math.max(1, prev - 1))}
                    disabled={servicesPage === 1}
                    className={`p-2 border ${servicesPage === 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-outline hover:border-primary text-secondary hover:text-primary transition-colors'}`}
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <span className="font-label-sm uppercase tracking-widest text-gray-500">
                    Page {servicesPage} of {Math.ceil(wishlist.services.length / itemsPerPage)}
                  </span>
                  <button 
                    onClick={() => setServicesPage(prev => Math.min(Math.ceil(wishlist.services.length / itemsPerPage), prev + 1))}
                    disabled={servicesPage === Math.ceil(wishlist.services.length / itemsPerPage)}
                    className={`p-2 border ${servicesPage === Math.ceil(wishlist.services.length / itemsPerPage) ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-outline hover:border-primary text-secondary hover:text-primary transition-colors'}`}
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              )}
            </div>
          )}
          
          {wishlist.consulton?.length > 0 && (
            <div>
              <h3 className="font-headline-sm text-xl mb-6 border-b border-outline-variant/30 pb-4 text-secondary uppercase tracking-widest">Saved Consultants</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.consulton.slice((consultantsPage - 1) * itemsPerPage, consultantsPage * itemsPerPage).map((staffMember) => (
                  <div key={staffMember._id} className="bg-surface-container-lowest p-6 border border-outline-variant/30 luxury-shadow flex items-center gap-6 cursor-pointer hover:border-primary/50 transition-all group" onClick={() => navigate(`/consultants/${staffMember._id}`)}>
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex-shrink-0 overflow-hidden border-2 border-transparent group-hover:border-primary transition-colors">
                      {staffMember.user?.avatar ? (
                        <img src={staffMember.user.avatar} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined w-full h-full flex items-center justify-center text-gray-500 text-3xl">person</span>
                      )}
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-serif text-xl text-secondary mb-1">{staffMember.user?.name}</h4>
                      <p className="text-primary text-xs uppercase tracking-widest font-medium mb-2">{staffMember.role}</p>
                      <span className="text-xs text-gray-500 flex items-center gap-1 group-hover:text-primary transition-colors">
                        View Profile <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {wishlist.consulton.length > itemsPerPage && (
                <div className="flex justify-center items-center mt-8 gap-4">
                  <button 
                    onClick={() => setConsultantsPage(prev => Math.max(1, prev - 1))}
                    disabled={consultantsPage === 1}
                    className={`p-2 border ${consultantsPage === 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-outline hover:border-primary text-secondary hover:text-primary transition-colors'}`}
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <span className="font-label-sm uppercase tracking-widest text-gray-500">
                    Page {consultantsPage} of {Math.ceil(wishlist.consulton.length / itemsPerPage)}
                  </span>
                  <button 
                    onClick={() => setConsultantsPage(prev => Math.min(Math.ceil(wishlist.consulton.length / itemsPerPage), prev + 1))}
                    disabled={consultantsPage === Math.ceil(wishlist.consulton.length / itemsPerPage)}
                    className={`p-2 border ${consultantsPage === Math.ceil(wishlist.consulton.length / itemsPerPage) ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-outline hover:border-primary text-secondary hover:text-primary transition-colors'}`}
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardWishlist;
