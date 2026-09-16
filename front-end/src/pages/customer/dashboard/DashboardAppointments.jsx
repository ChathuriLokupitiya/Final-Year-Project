import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import appointmentService from '../../../services/appointmentService';
import api from '../../../services/api';
import useAlertStore from '../../../store/alertStore';

const DashboardAppointments = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlertStore();
  const [appointments, setAppointments] = useState([]);
  const [reviewedAppointmentIds, setReviewedAppointmentIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState({ isOpen: false, apt: null, serviceRating: 0, staffRating: 0, comment: '' });
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, apt: null });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const handleDownloadReceipt = (apt) => {
    if (!apt) return;
    import('../../../utils/receiptGenerator').then(({ downloadProfessionalReceipt }) => {
      downloadProfessionalReceipt(
        apt, 
        apt.service?.name || 'Consultation', 
        apt.totalAmount || '0.00'
      );
    });
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const [aptRes, reviewRes] = await Promise.all([
        appointmentService.getMyAppointments(),
        api.get('/reviews/my')
      ]);
      setAppointments(aptRes.data.data || aptRes.data || []);
      
      const reviews = reviewRes.data.data || [];
      const reviewedIds = new Set(reviews.map(r => r.appointment));
      setReviewedAppointmentIds(reviewedIds);
    } catch (error) {
      console.error("Failed to fetch appointments", error);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (reviewModal.serviceRating === 0 || (reviewModal.apt?.staff && reviewModal.staffRating === 0)) {
      showAlert('error', 'Rating Required', 'Please select a star rating before submitting.');
      return;
    }
    try {
      const payload = {
        appointmentId: reviewModal.apt._id,
        serviceRating: reviewModal.serviceRating,
        comment: reviewModal.comment
      };
      if (reviewModal.apt?.staff) {
        payload.staffRating = reviewModal.staffRating;
      }
      await api.post('/reviews', payload);
      showAlert('success', 'Review Submitted', 'Thank you for your feedback!');
      setReviewModal({ ...reviewModal, isOpen: false });
      setReviewedAppointmentIds(prev => new Set(prev).add(reviewModal.apt._id));
    } catch (error) {
      console.error(error);
      showAlert('error', 'Error', error.response?.data?.message || 'Failed to submit review');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-8 border-b border-outline-variant/30 pb-4">
        <div>
          <h1 className="font-headline-md text-3xl text-on-surface uppercase tracking-widest mb-2">Appointments</h1>
          <p className="font-body-md text-secondary">View and manage your upcoming and past salon visits.</p>
        </div>
        <button onClick={() => navigate('/services')} className="bg-on-surface text-surface px-6 py-2 font-label-md uppercase tracking-widest hover:bg-primary transition-colors luxury-shadow">
          Book New
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading your appointments...</div>
      ) : appointments.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant/30 p-12 text-center flex flex-col items-center justify-center luxury-shadow opacity-70">
          <span className="material-symbols-outlined text-5xl text-outline mb-4">calendar_month</span>
          <h3 className="font-headline-sm text-xl text-on-surface mb-2 uppercase tracking-widest">No Appointments Found</h3>
          <p className="font-body-md text-secondary max-w-md">You haven't scheduled any visits yet. Book your next visit to continue your beauty journey.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {appointments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(apt => (
            <div 
              key={apt._id} 
              onClick={() => setDetailsModal({ isOpen: true, apt })}
              className="bg-white border border-outline-variant/50 p-6 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4 cursor-pointer hover:border-primary/50 transition-colors"
            >
              <div>
                <h4 className="font-headline-sm text-lg mb-1">{apt.service?.name || 'Consultation'}</h4>
                <p className="text-gray-500 text-sm mb-2">
                  <span className="material-symbols-outlined text-sm align-middle mr-1">calendar_today</span>
                  {new Date(apt.appointmentDate).toDateString()} at {apt.startTime}
                </p>
                {apt.staff?.user?.name && (
                  <p className="text-gray-500 text-sm">
                    <span className="material-symbols-outlined text-sm align-middle mr-1">person</span>
                    {apt.staff.user.name}
                  </p>
                )}
              </div>
              
              <div className="flex flex-col items-end gap-3">
                <span className={`px-3 py-1 text-xs uppercase tracking-wider font-semibold rounded-full ${getStatusColor(apt.status)}`}>
                  {apt.status}
                </span>
                <p className="font-serif font-semibold text-lg">LKR {apt.totalAmount}</p>
                {apt.status === 'completed' && !reviewedAppointmentIds.has(apt._id) && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setReviewModal({ isOpen: true, apt, serviceRating: 0, staffRating: 0, comment: '' }); }}
                    className="text-primary text-sm font-semibold hover:underline"
                  >
                    Leave Review
                  </button>
                )}

                {apt.status === 'completed' && reviewedAppointmentIds.has(apt._id) && (
                  <span className="text-gray-500 text-sm font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Reviewed
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {appointments.length > itemsPerPage && (
        <div className="flex justify-center items-center mt-8 gap-4">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`p-2 border ${currentPage === 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-outline hover:border-primary text-secondary hover:text-primary transition-colors'}`}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <span className="font-label-sm uppercase tracking-widest text-gray-500">
            Page {currentPage} of {Math.ceil(appointments.length / itemsPerPage)}
          </span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(appointments.length / itemsPerPage), prev + 1))}
            disabled={currentPage === Math.ceil(appointments.length / itemsPerPage)}
            className={`p-2 border ${currentPage === Math.ceil(appointments.length / itemsPerPage) ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-outline hover:border-primary text-secondary hover:text-primary transition-colors'}`}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-serif text-secondary">Leave a Review</h2>
              <button onClick={() => setReviewModal({ ...reviewModal, isOpen: false })} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={submitReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewModal({ ...reviewModal, serviceRating: star })}
                      className={`material-symbols-outlined text-3xl focus:outline-none transition-colors ${reviewModal.serviceRating >= star ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </button>
                  ))}
                </div>
              </div>
              {reviewModal.apt?.staff && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Staff Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewModal({ ...reviewModal, staffRating: star })}
                        className={`material-symbols-outlined text-3xl focus:outline-none transition-colors ${reviewModal.staffRating >= star ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`}
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
                  value={reviewModal.comment}
                  onChange={(e) => setReviewModal({ ...reviewModal, comment: e.target.value })}
                  placeholder="Share your experience..."
                  rows="3"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  maxLength={1000}
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setReviewModal({ ...reviewModal, isOpen: false })} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                  Cancel
                </button>
                <button type="submit" className="bg-primary text-white px-6 py-2 rounded-md hover:bg-opacity-90">
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailsModal.isOpen && detailsModal.apt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4 border-gray-100">
              <h2 className="text-xl font-serif text-secondary">Appointment Details</h2>
              <button onClick={() => setDetailsModal({ isOpen: false, apt: null })} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Service</p>
                <p className="font-medium text-gray-800">{detailsModal.apt.service?.name || 'Consultation'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Appointment Date & Time</p>
                <p className="font-medium text-gray-800">{new Date(detailsModal.apt.appointmentDate).toDateString()} at {detailsModal.apt.startTime}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Booked On</p>
                <p className="font-medium text-gray-800">
                  {new Date(detailsModal.apt.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium text-gray-800 capitalize">{detailsModal.apt.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="font-medium text-gray-800">LKR {detailsModal.apt.totalAmount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Reference Number</p>
                <p className="font-medium text-gray-800">{detailsModal.apt.bookingReference || 'N/A'}</p>
              </div>
              {detailsModal.apt.staff && (
                <div>
                  <p className="text-sm text-gray-500">Assigned Staff</p>
                  <p className="font-medium text-gray-800">{detailsModal.apt.staff.user?.name || detailsModal.apt.staff.name || 'Unknown'}</p>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => handleDownloadReceipt(detailsModal.apt)}
                className="w-full border border-primary text-primary px-4 py-3 rounded font-label-sm uppercase tracking-widest hover:bg-primary/5 flex items-center justify-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Download Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAppointments;
