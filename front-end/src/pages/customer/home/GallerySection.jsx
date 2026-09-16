import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import GalleryGrid from '../gallery/GalleryGrid';

const GallerySection = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const res = await api.get('/gallery');
        const allItems = res.data.data || res.data || [];
        setItems(allItems.slice(0, 2));
      } catch (error) {
        console.error("Failed to load gallery:", error);
      }
    };
    fetchGallery();
  }, []);

  const displayItems = items;

  return (
    <section className="py-section-gap-desktop overflow-hidden">
      <div className="max-w-container-max-width mx-auto px-gutter">
        <div className="text-center mb-16">
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary mb-4 block">The Gallery</span>
          <h2 className="font-headline-lg text-headline-lg">The Art of Evolution</h2>
        </div>
        
        <div className="-mx-4 md:-mx-12">
          {/* Reusing the GalleryGrid component logic but only showing 2 items */}
          <GalleryGrid items={displayItems} />
        </div>

        <div className="text-center mt-4">
          <button 
            onClick={() => navigate('/gallery')}
            className="btn btn-outline uppercase tracking-widest text-sm px-10 py-4"
          >
            View Full Gallery
          </button>
        </div>
      </div>
    </section>
  );
};

export default GallerySection;
