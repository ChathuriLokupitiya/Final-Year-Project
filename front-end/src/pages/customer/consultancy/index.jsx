import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../../public/Navigation';
import Footer from '../../public/Footer';
import api from '../../../services/api';

import HeroSection from './HeroSection';
import ExpertShowcase from './ExpertShowcase';
import CTASection from './CTASection';
import OfferBadge from '../../../components/common/OfferBadge';
import { formatLkr, hasDiscount } from '../../../utils/pricing';

const Consultancy = () => {
  const navigate = useNavigate();
  const [consultants, setConsultants] = useState([]);
  const [promoConsults, setPromoConsults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConsultants = async () => {
      try {
        const [staffRes, promoRes] = await Promise.all([
          api.get('/staff'),
          api.get('/services?isConsultation=true&onSale=true&limit=6'),
        ]);
        const staff = staffRes.data.data || staffRes.data || [];
        setConsultants(staff.filter((s) => s.isConsultant));
        setPromoConsults(promoRes.data.data || []);
      } catch (error) {
        console.error('Failed to load consultants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConsultants();
  }, []);

  useEffect(() => {
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('active');
      });
    }, observerOptions);

    document.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [consultants, promoConsults]);

  return (
    <div className="bg-background text-on-surface font-body-md overflow-x-hidden selection:bg-primary-fixed selection:text-on-primary-fixed">
      <Navigation />
      <main className="min-h-screen pt-20">
        <HeroSection />
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading experts...</div>
        ) : (
          <ExpertShowcase consultants={consultants} />
        )}

        {promoConsults.length > 0 && (
          <section className="py-20 px-gutter max-w-container-max-width mx-auto reveal-on-scroll">
            <div className="text-center mb-12">
              <span className="font-label-sm uppercase tracking-widest text-primary mb-3 block">
                Special Offers
              </span>
              <h2 className="font-headline-md text-on-surface">Consultation Promotions</h2>
              <p className="text-sm text-on-surface-variant mt-2">
                Book a discounted consultation while these offers are active.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {promoConsults.map((service) => (
                <button
                  key={service._id}
                  type="button"
                  onClick={() => navigate(`/services/${service._id}`)}
                  className="text-left bg-surface border border-outline-variant/40 overflow-hidden hover:border-primary transition-colors"
                >
                  <div className="relative aspect-[16/10] bg-surface-container">
                    {service.images?.[0] ? (
                      <img
                        src={service.images[0]}
                        alt={service.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary/40">
                        <span className="material-symbols-outlined text-4xl">psychology</span>
                      </div>
                    )}
                    <OfferBadge service={service} />
                  </div>
                  <div className="p-6">
                    <h3 className="font-serif text-xl text-secondary mb-2">{service.name}</h3>
                    <p className="text-sm text-on-surface-variant line-clamp-2 mb-4">
                      {service.description}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-primary font-serif text-lg">
                        {formatLkr(service.discountPrice ?? service.price)}
                      </span>
                      {hasDiscount(service) && (
                        <span className="text-xs text-gray-400 line-through">
                          {formatLkr(service.price)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Consultancy;
