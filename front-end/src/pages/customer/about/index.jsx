import { useEffect } from 'react';
import Navigation from '../../public/Navigation';
import Footer from '../../public/Footer';

import HeroSection from './HeroSection';
import StorySection from './StorySection';
import PillarsSection from './PillarsSection';
import AestheticSection from './AestheticSection';
import CommitmentSection from './CommitmentSection';
import CTASection from './CTASection';

const AboutUs = () => {
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
    <div className="bg-surface font-body-md text-on-surface overflow-x-hidden selection:bg-primary-fixed selection:text-on-primary-fixed custom-scrollbar">
      <Navigation />
      <main>
        <HeroSection />
        <StorySection />
        <PillarsSection />
        <AestheticSection />
        <CommitmentSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default AboutUs;
