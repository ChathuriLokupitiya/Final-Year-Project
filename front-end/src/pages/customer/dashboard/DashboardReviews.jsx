import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import useAlertStore from '../../../store/alertStore';

const DashboardReviews = () => {
  const { showAlert } = useAlertStore();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState({ isOpen: false, review: null, serviceRating: 5, staffRating: 5, comment: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await api.get('/reviews/my');
      setReviews(res.data.data || []);
    } catch (error) {
      console.error("Failed to fetch reviews", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      await api.delete(`/reviews/${id}`);
      showAlert('success', 'Review Deleted', 'Your review has been removed.');
      fetchReviews();
    } catch (error) {
      console.error(error);
      showAlert('error', 'Error', 'Failed to delete review');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        serviceRating: editModal.serviceRating,
        comment: editModal.comment
      };
      if (editModal.review?.staff) {
        payload.staffRating = editModal.staffRating;
      }
      await api.put(`/reviews/${editModal.review._id}`, payload);
      showAlert('success', 'Review Updated', 'Your review has been successfully updated.');
      setEditModal({ ...editModal, isOpen: false });
      fetchReviews();
    } catch (error) {
      console.error(error);
      showAlert('error', 'Error', 'Failed to update review');
    }
  };

  const renderStars = (rating) => {
    return Array(5).fill(0).map((_, i) => (
      <span key={i} className={`material-symbols-outlined text-sm ${i < rating ? 'text-yellow-400' : 'text-gray-200'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
        star
      </span>
    ));
  };
  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-8 border-b border-outline-variant/30 pb-4">
        <div>
          <h1 className="font-headline-md text-3xl text-on-surface uppercase tracking-widest mb-2">My Reviews</h1>
          <p className="font-body-md text-secondary">Share your experiences and read feedback from your past visits.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading your reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant/30 p-12 text-center flex flex-col items-center justify-center luxury-shadow opacity-70">
          <span className="material-symbols-outlined text-5xl text-outline mb-4">star_rate</span>
          <h3 className="font-headline-sm text-xl text-on-surface mb-2 uppercase tracking-widest">No Reviews Yet</h3>
          <p className="font-body-md text-secondary max-w-md">You haven't written any reviews yet. After your next appointment, share your thoughts to help us maintain our standard of excellence.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(review => (
            <div key={review._id} className="bg-white border border-outline-variant/50 p-6 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-headline-sm text-lg mb-1">{review.service?.name || 'Consultation'}</h4>
                  {review.staff?.user?.name && (
                    <p className="text-sm text-gray-500">Stylist: {review.staff.user.name}</p>
                  )}
                  {review.appointment && (
                    <p className="text-xs text-gray-400 mt-1">
                      <span className="material-symbols-outlined text-[14px] align-text-bottom mr-1">calendar_today</span>
                      {new Date(review.appointment.appointmentDate).toDateString()} at {review.appointment.startTime}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex gap-0.5">{renderStars(review.serviceRating)}</div>
                  <span className="text-xs text-gray-400 mt-1">Reviewed: {new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              {review.comment && (
                <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
                  <p className="text-gray-700 italic text-sm">"{review.comment}"</p>
                </div>
              )}
              
              <div className="mt-auto pt-4 flex justify-between items-center border-t border-outline-variant/30">
                {!review.isApproved ? (
                  <span className="inline-block px-2 py-1 bg-yellow-50 text-yellow-700 text-xs font-medium rounded">Pending Approval</span>
                ) : (
                  <div></div>
                )}
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setEditModal({ 
                      isOpen: true, 
                      review, 
                      serviceRating: review.serviceRating, 
                      staffRating: review.staffRating || 5, 
                      comment: review.comment || '' 
                    })}
                    className="text-gray-500 hover:text-primary transition-colors text-sm font-semibold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span> Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(review._id)}
                    className="text-gray-500 hover:text-red-500 transition-colors text-sm font-semibold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {reviews.length > itemsPerPage && (
        <div className="flex justify-center items-center mt-8 gap-4">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`p-2 border ${currentPage === 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-outline hover:border-primary text-secondary hover:text-primary transition-colors'}`}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <span className="font-label-sm uppercase tracking-widest text-gray-500">
            Page {currentPage} of {Math.ceil(reviews.length / itemsPerPage)}
          </span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(reviews.length / itemsPerPage), prev + 1))}
            disabled={currentPage === Math.ceil(reviews.length / itemsPerPage)}
            className={`p-2 border ${currentPage === Math.ceil(reviews.length / itemsPerPage) ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-outline hover:border-primary text-secondary hover:text-primary transition-colors'}`}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      )}

      {/* Edit Review Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-serif text-secondary">Edit Review</h2>
              <button onClick={() => setEditModal({ ...editModal, isOpen: false })} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditModal({ ...editModal, serviceRating: star })}
                      className={`material-symbols-outlined text-3xl focus:outline-none transition-colors ${editModal.serviceRating >= star ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </button>
                  ))}
                </div>
              </div>
              {editModal.review?.staff && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Staff Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setEditModal({ ...editModal, staffRating: star })}
                        className={`material-symbols-outlined text-3xl focus:outline-none transition-colors ${editModal.staffRating >= star ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                <textarea 
                  value={editModal.comment}
                  onChange={(e) => setEditModal({ ...editModal, comment: e.target.value })}
                  placeholder="Share your experience..."
                  rows="3"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  maxLength={1000}
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setEditModal({ ...editModal, isOpen: false })} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                  Cancel
                </button>
                <button type="submit" className="bg-primary text-white px-6 py-2 rounded-md hover:bg-opacity-90">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardReviews;
