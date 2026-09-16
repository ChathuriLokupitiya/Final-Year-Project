import { useState, useEffect } from 'react';
import Navigation from '../../public/Navigation';
import Footer from '../../public/Footer';
import api from '../../../services/api';

import HeaderSection from './HeaderSection';
import FilterTabs from './FilterTabs';
import ServiceGrid from './ServiceGrid';
import ArtisanSection from './ArtisanSection';
import GuidelinesSection from './GuidelinesSection';

const Services = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesRes, categoriesRes] = await Promise.all([
          api.get('/services'),
          api.get('/services/categories')
        ]);
        setServices(servicesRes.data.data || []);
        setCategories(['All', ...(categoriesRes.data.data || []).map(c => c.name)]);
      } catch (error) {
        console.error("Failed to load services data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    // Simple scroll reveal animation matching the home page
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

    document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [services, activeCategory]); // Re-run when rendering changes

  const filteredServices = activeCategory === 'All' 
    ? services 
    : services.filter(s => s.category?.name === activeCategory || s.category === activeCategory);
  console.log(services);
  return (
    <div className="bg-surface text-on-surface font-body-md overflow-x-hidden">
      <Navigation />
      <main className="min-h-screen pt-20">
        <HeaderSection />
        {!loading && (
          <>
            <FilterTabs 
              categories={categories} 
              activeCategory={activeCategory} 
              setActiveCategory={setActiveCategory} 
            />
            <ServiceGrid services={filteredServices} />
          </>
        )}
        {loading && <div className="text-center py-20 text-gray-500">Loading services...</div>}
        <ArtisanSection />
        <GuidelinesSection />
      </main>
      <Footer />
    </div>
  );
};

export default Services;
