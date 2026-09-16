import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import useAlertStore from '../../store/alertStore';
import useAuthStore from '../../store/authStore';

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { showAlert } = useAlertStore();
  const { user } = useAuthStore();

  const isAdmin = user?.role === 'admin';
  const rawActions = user?.permissions?.actions || {};
  const currentTabActions = Array.isArray(rawActions) ? rawActions : (rawActions['Reviews'] || []);
  const canDelete = isAdmin || currentTabActions.includes('Delete');
  const canView = isAdmin || currentTabActions.includes('View');

  useEffect(() => {
    fetchReviews();
  }, [page]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reviews/admin/all?page=${page}&limit=10`);
      setReviews(res.data.data || res.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch reviews", error);
      showAlert('error', 'Error', 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      await api.delete(`/reviews/${id}`);
      showAlert('success', 'Review Deleted', 'The review has been removed.');
      fetchReviews();
    } catch (error) {
      console.error(error);
      showAlert('error', 'Error', 'Failed to delete review');
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
          <h1 className="font-headline-md text-3xl text-on-surface uppercase tracking-widest mb-2">Customer Reviews</h1>
          <p className="font-body-md text-secondary">Manage and monitor customer feedback.</p>
        </div>
      </div>

      {!canView ? (
        <div className="bg-surface-container-lowest border border-outline-variant/30 p-16 text-center flex flex-col items-center justify-center luxury-shadow animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center text-error mb-4">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <h2 className="font-title-lg text-xl text-on-surface mb-2">Access Denied</h2>
          <p className="text-secondary max-w-md">You do not have permission to view the Reviews tab.</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-500">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant/30 p-12 text-center flex flex-col items-center justify-center luxury-shadow opacity-70">
          <span className="material-symbols-outlined text-5xl text-outline mb-4">star_rate</span>
          <h3 className="font-headline-sm text-xl text-on-surface mb-2 uppercase tracking-widest">No Reviews Found</h3>
        </div>
      ) : (
        <div className="bg-surface-container-lowest border border-outline-variant/50 luxury-shadow overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/50">
                <th className="p-4 font-label-md text-secondary uppercase tracking-wider">Customer</th>
                <th className="p-4 font-label-md text-secondary uppercase tracking-wider">Service & Staff</th>
                <th className="p-4 font-label-md text-secondary uppercase tracking-wider">Rating</th>
                <th className="p-4 font-label-md text-secondary uppercase tracking-wider">Comment</th>
                <th className="p-4 font-label-md text-secondary uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map(review => (
                <tr key={review._id} className="border-b border-outline-variant/30 hover:bg-surface-container-low/50 transition-colors">
                  <td className="p-4 align-top">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                        {review.customer?.avatar ? (
                          <img src={review.customer.avatar} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined w-full h-full flex items-center justify-center text-gray-500">person</span>
                        )}
                      </div>
                      <div>
                        <p className="font-label-md text-on-surface">{review.customer?.name || 'Unknown'}</p>
                        <p className="text-xs text-secondary">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 align-top">
                    <p className="font-label-md text-on-surface">{review.service?.name || 'Consultation'}</p>
                    {review.staff?.user?.name && (
                      <p className="text-xs text-secondary mt-1">Staff: {review.staff.user.name}</p>
                    )}
                    {review.appointment && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(review.appointment.appointmentDate).toLocaleDateString()} {review.appointment.startTime}
                      </p>
                    )}
                  </td>
                  <td className="p-4 align-top whitespace-nowrap">
                    <div className="flex gap-0.5">{renderStars(review.serviceRating)}</div>
                    {review.staffRating && (
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-xs text-secondary">Staff:</span>
                        <div className="flex gap-0.5">{renderStars(review.staffRating)}</div>
                      </div>
                    )}
                  </td>
                  <td className="p-4 align-top max-w-xs">
                    <p className="text-sm text-gray-700 truncate" title={review.comment}>
                      {review.comment || <span className="text-gray-400 italic">No comment</span>}
                    </p>
                  </td>
                  <td className="p-4 align-top text-right">
                    <div className="flex justify-end gap-2">
                      {canDelete && (
                        <button 
                          onClick={() => handleDelete(review._id)}
                          className="p-1 text-error hover:bg-error/10 rounded transition-colors"
                          title="Delete Review"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-8 gap-4">
          <button 
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page === 1}
            className={`p-2 border ${page === 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-outline hover:border-primary text-secondary hover:text-primary transition-colors'}`}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <span className="font-label-sm uppercase tracking-widest text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button 
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
            className={`p-2 border ${page === totalPages ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-outline hover:border-primary text-secondary hover:text-primary transition-colors'}`}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
