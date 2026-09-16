import { useState, useEffect } from 'react';
import api from '../../../services/api';

const TestimonialsSection = () => {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await api.get('/reviews?limit=3');
        setReviews(res.data.data || res.data || []);
      } catch (error) {
        console.error("Failed to load reviews:", error);
      }
    };
    fetchReviews();
  }, []);

  const displayReviews = reviews;

  return (
    <section className="py-section-gap-desktop">
      <div className="max-w-container-max-width mx-auto px-gutter">
        <div className="text-center mb-16">
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary mb-4 block">Kind Words</span>
          <h2 className="font-headline-lg text-headline-lg">Trusted by Our Clients</h2>
        </div>
        {displayReviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {displayReviews.map((review, idx) => (
              <div key={review._id || idx} className="p-10 bg-surface-container-lowest luxury-shadow border border-outline-variant/10 text-center flex flex-col items-center">
                <div className="flex gap-1 text-primary mb-6">
                  {[...Array(review.serviceRating || 5)].map((_, i) => (
                    <span key={i} className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  ))}
                </div>
                <p className="font-headline-sm text-headline-sm italic mb-8 leading-relaxed line-clamp-4">"{review.comment}"</p>
                <div className="mt-auto">
                  <img 
                    alt={review.customer?.firstName} 
                    className="w-12 h-12 rounded-full mx-auto mb-3 object-cover" 
                    src={review.customer?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent((review.customer?.firstName || 'A') + ' ' + (review.customer?.lastName || ''))}&background=random`}
                    onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent((review.customer?.firstName || 'A') + ' ' + (review.customer?.lastName || ''))}&background=random`; }}
                  />
                  <h6 className="font-label-md text-label-md uppercase tracking-widest">{review.customer?.firstName} {review.customer?.lastName}</h6>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-on-surface-variant py-10">
            No reviews currently available.
          </div>
        )}
      </div>
    </section>
  );
};

export default TestimonialsSection;
