import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import ImageSlider from '../../../components/common/ImageSlider';
import OfferBadge from '../../../components/common/OfferBadge';
import { formatLkr, hasDiscount } from '../../../utils/pricing';

const ServicesSection = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [deals, setDeals] = useState([]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const [featuredRes, dealsRes] = await Promise.all([
          api.get('/services?limit=3'),
          api.get('/services?onSale=true&limit=6'),
        ]);
        setServices(featuredRes.data.data || featuredRes.data || []);
        setDeals(dealsRes.data.data || dealsRes.data || []);
      } catch (error) {
        console.error('Failed to load services:', error);
      }
    };
    fetchServices();
  }, []);

  const dealServices = deals.filter((s) => !s.isConsultation).slice(0, 3);
  const dealConsults = deals.filter((s) => s.isConsultation).slice(0, 3);

  const renderCard = (service, idx) => (
    <div
      key={service._id || idx}
      className="group bg-surface-container-low hover:bg-surface transition-all duration-500 luxury-shadow flex flex-col items-center text-center overflow-hidden"
    >
      <div className="w-full aspect-[4/3] overflow-hidden relative mb-8">
        {service.images && service.images.length > 0 ? (
          <ImageSlider images={service.images} alt={service.name} />
        ) : (
          <div className="w-full h-full bg-surface-container-lowest flex items-center justify-center">
            <span className="material-symbols-outlined text-primary scale-150 opacity-50">
              {service.isConsultation ? 'psychology' : 'spa'}
            </span>
          </div>
        )}
        <OfferBadge service={service} size="lg" />
        {service.isConsultation && (
          <div className="absolute top-3 left-3 z-40 bg-white/95 text-secondary px-2.5 py-1 text-[10px] uppercase tracking-widest shadow-sm pointer-events-none">
            Consult
          </div>
        )}
      </div>
      <div className="px-8 pb-8 flex flex-col items-center flex-grow">
        <h3 className="font-headline-sm text-headline-sm mb-4">{service.name}</h3>
        <p className="text-on-surface-variant mb-6 font-body-md line-clamp-3">{service.description}</p>
        {hasDiscount(service) ? (
          <div className="mb-8">
            <span className="font-headline-sm text-primary">{formatLkr(service.discountPrice)}</span>
            <span className="ml-2 text-sm text-on-surface-variant line-through">
              {formatLkr(service.price)}
            </span>
          </div>
        ) : (
          <span className="font-headline-sm text-headline-sm text-primary mb-8">
            {formatLkr(service.price)}
          </span>
        )}
        <button
          onClick={() => navigate(service._id ? `/services/${service._id}` : '/services')}
          className="mt-auto font-label-md text-label-md uppercase tracking-widest text-on-surface border-b border-outline-variant hover:border-primary transition-all"
        >
          {service.isConsultation ? 'Book Consultation' : 'Select Ritual'}
        </button>
      </div>
    </div>
  );

  return (
    <section id="services-section" className="py-section-gap-desktop">
      <div className="max-w-container-max-width mx-auto px-gutter">
        <div className="text-center mb-16">
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary mb-4 block">
            The Anthology
          </span>
          <h2 className="font-headline-lg text-headline-lg mb-4">Services Tailored Just for You</h2>
          <div className="w-12 h-[1px] bg-primary mx-auto" />
        </div>

        {services.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {services.map((service, idx) => renderCard(service, idx))}
          </div>
        ) : (
          <div className="text-center text-on-surface-variant py-10 mb-12">
            No services currently available.
          </div>
        )}

        {(dealServices.length > 0 || dealConsults.length > 0) && (
          <div className="mt-20 pt-16 border-t border-outline-variant/40">
            <div className="text-center mb-12">
              <span className="font-label-sm uppercase tracking-widest text-primary mb-3 block">
                Limited Offers
              </span>
              <h3 className="font-headline-md text-on-surface">On Sale Now</h3>
              <p className="text-sm text-on-surface-variant mt-2">
                Discounted services and consultations book while the offer lasts.
              </p>
            </div>

            {dealServices.length > 0 && (
              <div className="mb-12">
                <h4 className="font-label-md uppercase tracking-widest text-on-surface-variant mb-6">
                  Service Deals
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {dealServices.map((s, i) => renderCard(s, `svc-${i}`))}
                </div>
              </div>
            )}

            {dealConsults.length > 0 && (
              <div>
                <h4 className="font-label-md uppercase tracking-widest text-on-surface-variant mb-6">
                  Consultation Deals
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {dealConsults.map((s, i) => renderCard(s, `con-${i}`))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-center mt-12">
          <button
            onClick={() => navigate('/services')}
            className="btn btn-outline uppercase tracking-widest text-sm px-10 py-4"
          >
            View All Services
          </button>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
