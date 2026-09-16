import { useState, useRef, useEffect } from 'react';

// Reusable Before/After Card Component
const BeforeAfterCard = ({ beforeImg, afterImg, title, category }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(percent);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="group relative overflow-hidden aspect-[3/2] bg-surface-container shadow-sm hover:shadow-xl transition-shadow duration-500">
      <div 
        ref={containerRef}
        className="relative w-full h-full cursor-ew-resize select-none"
        onMouseDown={(e) => { setIsDragging(true); handleMove(e.clientX); }}
        onTouchStart={(e) => { setIsDragging(true); handleMove(e.touches[0].clientX); }}
      >
        {/* After Image (Background) */}
        <img 
          src={afterImg} 
          alt="After"
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Before Image (Foreground, clipped) */}
        <div 
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <img 
            src={beforeImg} 
            alt="Before"
            className="absolute inset-0 w-full h-full object-cover max-w-none"
            style={{ width: '100%', minWidth: containerRef.current?.offsetWidth || '100%' }} // Prevents image squeezing
          />
        </div>

        {/* Slider Handle */}
        <div 
          className="absolute inset-y-0 bg-white w-0.5 z-10 cursor-ew-resize"
          style={{ left: `calc(${sliderPosition}% - 1px)` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-gray-800 text-[20px] rotate-90">unfold_more</span>
          </div>
        </div>
      </div>
      
      {/* Before/After Labels */}
      <div className="absolute bottom-6 left-6 pointer-events-none">
        <div className="bg-black/70 text-white font-label-sm text-xs font-bold tracking-[0.2em] px-4 py-2">
          BEFORE
        </div>
      </div>
      <div className="absolute bottom-6 right-6 pointer-events-none">
        <div className="bg-black/70 text-white font-label-sm text-xs font-bold tracking-[0.2em] px-4 py-2">
          AFTER
        </div>
      </div>
    </div>
  );
};


const GalleryGrid = ({ items = [] }) => {
  if (!items || items.length === 0) {
    return (
      <section className="px-margin-mobile md:px-gutter max-w-container-max-width mx-auto mb-32 text-center text-gray-500 py-10 reveal-on-scroll">
        <p>No gallery items available in this category.</p>
      </section>
    );
  }

  return (
    <section className="px-margin-mobile md:px-gutter max-w-container-max-width mx-auto mb-32 reveal-on-scroll">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        
        {items.map((item) => {
          if (item.beforeImage && item.afterImage) {
            return (
              <BeforeAfterCard 
                key={item._id}
                beforeImg={item.beforeImage}
                afterImg={item.afterImage}
                title={item.title}
                category={item.type.replace('_', ' ')}
              />
            );
          }

          // Fallback to normal image card if not before/after or missing images
          const imgUrl = item.image || item.afterImage || item.beforeImage;
          return (
            <div key={item._id} className="group relative overflow-hidden aspect-[3/2] bg-surface-container cursor-pointer shadow-sm hover:shadow-xl transition-shadow duration-500">
              <img 
                src={imgUrl} 
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8 text-white">
                <span className="font-label-sm text-xs uppercase tracking-[0.2em] mb-2 text-primary-fixed">{item.type.replace('_', ' ')}</span>
                <h3 className="font-headline-sm text-2xl tracking-wide">{item.title}</h3>
              </div>
            </div>
          );
        })}
        
      </div>
    </section>
  );
};

export default GalleryGrid;
