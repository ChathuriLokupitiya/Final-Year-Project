import { useEffect } from 'react';
import Navigation from '../../public/Navigation';
import Footer from '../../public/Footer';
import HeroSection from './HeroSection';
import ContactSection from './ContactSection';
import FaqSection from './FaqSection';

const Contact = () => {
  useEffect(() => {
    // Simple scroll reveal observer
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
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
    <div className="bg-surface text-on-surface font-body-md overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container custom-scrollbar antialiased">
      <Navigation />
      <main className="min-h-screen pt-20">
        <HeroSection />
        <ContactSection />
        <FaqSection />
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
