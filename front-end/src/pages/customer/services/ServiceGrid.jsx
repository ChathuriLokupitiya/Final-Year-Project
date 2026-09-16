import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import userService from '../../../services/userService';
import useAuthStore from '../../../store/authStore';
import ImageSlider from '../../../components/common/ImageSlider';
import OfferBadge, { OfferPrice } from '../../../components/common/OfferBadge';
import { hasDiscount } from '../../../utils/pricing';

const ServiceGrid = ({ services }) => {
  const navigate = useNavigate();
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const fetchWishlist = async () => {
      if (!isAuthenticated) return;
      try {
        const res = await userService.getWishlist();
        if (res.data.data) {
          const ids = new Set(res.data.data.services.map((s) => s._id));
          setWishlistIds(ids);
        }
      } catch {
        // Ignore if not logged in
      }
    };
    fetchWishlist();
  }, [isAuthenticated]);

  const toggleWishlist = async (e, serviceId) => {
    e.stopPropagation();
    try {
      await userService.toggleWishlistService(serviceId);
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (next.has(serviceId)) next.delete(serviceId);
        else next.add(serviceId);
        return next;
      });
    } catch {
      alert('Please log in to add to wishlist');
    }
  };

  if (!services || services.length === 0) {
    return (
      <section className="px-margin-mobile md:px-gutter max-w-container-max-width mx-auto mb-32 text-center text-gray-500 py-10 reveal-on-scroll">
        <p>No services available in this category.</p>
      </section>
    );
  }

  return (
    <section className="px-margin-mobile md:px-gutter max-w-[1600px] mx-auto mb-32 reveal-on-scroll">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
        {services.map((service) => (
          <div
            key={service._id}
            className="group service-card cursor-pointer flex flex-col h-full"
            onClick={() => navigate(`/services/${service._id}`)}
          >
            <div className="relative overflow-hidden mb-4 aspect-[3/2] bg-surface-container">
              <ImageSlider
                images={service.images}
                alt={service.name}
                className="w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <OfferBadge service={service} />
              {service.isConsultation && (
                <div className="absolute top-3 left-3 z-40 bg-white/95 text-secondary px-2.5 py-1 text-[10px] uppercase tracking-widest shadow-sm pointer-events-none">
                  Consultation
                </div>
              )}
            </div>

            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-2 pr-4 min-w-0">
                <h3 className="font-serif text-lg text-secondary leading-tight truncate">
                  {service.name}
                </h3>
                <button
                  onClick={(e) => toggleWishlist(e, service._id)}
                  className="text-primary hover:text-primary-fixed-dim transition-colors focus:outline-none flex items-center justify-center shrink-0"
                  title={wishlistIds.has(service._id) ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <span
                    className="material-symbols-outlined text-xl"
                    style={wishlistIds.has(service._id) ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    favorite
                  </span>
                </button>
              </div>
              <OfferPrice service={service} />
            </div>

            <div className="text-[11px] uppercase tracking-widest text-gray-500 mb-4 flex justify-between items-center">
              <span>
                {service.duration} MINS — {service.category?.name || service.category || 'GENERAL'}
              </span>
              {service.averageRating > 0 && (
                <span className="flex items-center gap-1 text-yellow-500 font-bold normal-case">
                  <span
                    className="material-symbols-outlined text-[14px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                  {service.averageRating} ({service.totalReviews})
                </span>
              )}
            </div>

            <div className="mb-6 flex-grow">
              <p className="text-sm text-gray-600 line-clamp-3">{service.description}</p>
            </div>

            <button className="mt-auto self-start font-label-md text-label-md uppercase tracking-widest text-on-surface border-b border-outline-variant group-hover:border-primary transition-all pb-1">
              {service.isConsultation ? 'Book Consult' : 'Book Ritual'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ServiceGrid;
