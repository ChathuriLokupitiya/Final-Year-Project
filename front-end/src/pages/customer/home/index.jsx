import { useEffect } from 'react';

import Navigation from '../../public/Navigation';
import HeroSection from './HeroSection';
import AboutSection from './AboutSection';
import ServicesSection from './ServicesSection';
import ArtisanProfiles from './ArtisanProfiles';
import GallerySection from './GallerySection';
import PricingSection from './PricingSection';
import TestimonialsSection from './TestimonialsSection';
import CTASection from './CTASection';
import Footer from '../../public/Footer';

const CustomerHome = () => {
  useEffect(() => {
    // Simple scroll reveal animation
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="bg-surface text-on-surface font-body-md selection:bg-primary/20 overflow-x-hidden">
      <Navigation />
      <HeroSection />
      <AboutSection />
      <ServicesSection />
      <ArtisanProfiles />
      <GallerySection />
      {/* <PricingSection /> */}
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default CustomerHome;
