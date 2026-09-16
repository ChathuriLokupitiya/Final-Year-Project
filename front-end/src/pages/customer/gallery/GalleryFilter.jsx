const GalleryFilter = ({ categories, activeCategory, setActiveCategory }) => {
  return (
    <section className="px-margin-mobile md:px-gutter max-w-container-max-width mx-auto mb-16 relative z-20 overflow-x-auto no-scrollbar reveal-on-scroll">
      <div className="flex justify-start md:justify-center items-center gap-8 border-b border-outline-variant/30 pb-4 min-w-max">
        {categories.map((cat) => {
          const displayCat = cat.replace('_', ' ');
          return (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`font-label-sm text-label-sm uppercase tracking-[0.2em] transition-colors pb-4 capitalize ${
                activeCategory === cat 
                  ? 'text-primary border-b-2 border-primary -mb-[18px]' 
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {displayCat}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default GalleryFilter;
