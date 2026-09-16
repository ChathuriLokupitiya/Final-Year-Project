import { useState, useEffect } from 'react';
import Navigation from '../../public/Navigation';
import Footer from '../../public/Footer';
import api from '../../../services/api';

import HeaderSection from './HeaderSection';
import GalleryFilter from './GalleryFilter';
import GalleryGrid from './GalleryGrid';

const Gallery = () => {
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const res = await api.get('/gallery');
        setItems(res.data.data || []);
      } catch (error) {
        console.error("Failed to load gallery:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGallery();
  }, []);

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
  }, [items, activeCategory]);

  const categories = ['All', ...new Set(items.map(item => item.type).filter(Boolean))];
  
  const filteredItems = activeCategory === 'All' 
    ? items 
    : items.filter(item => item.type === activeCategory);

  return (
    <div className="bg-surface font-body-md text-on-surface overflow-x-hidden selection:bg-primary-fixed selection:text-on-primary-fixed custom-scrollbar">
      <Navigation />
      <main className="min-h-screen pt-20">
        <HeaderSection />
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading gallery...</div>
        ) : (
          <>
            <GalleryFilter 
              categories={categories} 
              activeCategory={activeCategory} 
              setActiveCategory={setActiveCategory} 
            />
            <GalleryGrid items={filteredItems} />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Gallery;
