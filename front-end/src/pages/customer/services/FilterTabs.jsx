const FilterTabs = ({ categories, activeCategory, setActiveCategory }) => {
  return (
    <section className="px-margin-mobile md:px-gutter max-w-container-max-width mx-auto -mt-8 mb-16 relative z-20 overflow-x-auto no-scrollbar reveal-on-scroll">
      <div className="flex justify-start md:justify-center items-center gap-8 border-b border-outline-variant/30 pb-4 min-w-max">
        {categories.map((cat) => (
          <button 
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`font-label-sm text-label-sm uppercase tracking-[0.2em] transition-colors pb-4 ${
              activeCategory === cat 
                ? 'text-primary border-b-2 border-primary -mb-[18px]' 
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </section>
  );
};

export default FilterTabs;
