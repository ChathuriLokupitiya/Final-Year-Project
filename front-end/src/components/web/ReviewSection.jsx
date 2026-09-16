import { useState } from 'react';
import { Star } from 'lucide-react';
import useAlertStore from '../../store/alertStore';

const ReviewSection = ({ serviceId, serviceName }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Mock existing reviews
  const [reviews] = useState([
    { id: 1, user: 'Sarah J.', rating: 5, date: 'Oct 15, 2026', comment: 'Absolutely loved my experience! The staff was so professional and my hair looks amazing.' },
    { id: 2, user: 'Emily R.', rating: 4, date: 'Oct 10, 2026', comment: 'Great service, highly recommend the deep conditioning treatment. Just wish parking was easier.' },
  ]);

  const { showAlert } = useAlertStore();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) return showAlert('warning', 'Rating Required', 'Please select a rating before submitting.');
    setSubmitted(true);
    // In a real app, this would POST to /api/reviews
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-8">
      <h3 className="text-2xl font-serif text-secondary mb-6">Customer Reviews for {serviceName || 'this Service'}</h3>
      
      {/* Leave a Review Form */}
      {!submitted ? (
        <form onSubmit={handleSubmit} className="mb-10 bg-gray-50 p-6 rounded-xl border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-4">Leave your feedback</h4>
          
          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  size={28}
                  className={(hoverRating || rating) >= star ? 'fill-primary text-primary' : 'text-gray-300'}
                />
              </button>
            ))}
          </div>

          <textarea
            className="form-input w-full min-h-[100px] mb-4"
            placeholder="Tell us about your experience..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
          ></textarea>

          <button type="submit" className="btn btn-primary px-8">Submit Review</button>
        </form>
      ) : (
        <div className="mb-10 bg-green-50 text-green-700 p-6 rounded-xl border border-green-200 text-center">
          <p className="font-semibold text-lg">Thank you for your feedback!</p>
          <p className="text-sm mt-1">Your review helps us maintain our premium standards.</p>
        </div>
      )}

      {/* Display Existing Reviews */}
      <div className="space-y-6">
        {reviews.map((rev) => (
          <div key={rev.id} className="pb-6 border-b border-gray-100 last:border-0 last:pb-0">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-gray-900">{rev.user}</span>
              <span className="text-sm text-gray-500">{rev.date}</span>
            </div>
            <div className="flex gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className={i < rev.rating ? 'fill-primary text-primary' : 'text-gray-200'} />
              ))}
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">{rev.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewSection;
