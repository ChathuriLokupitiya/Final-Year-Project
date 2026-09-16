import { useState, useEffect } from 'react';
import useAuthStore from '../../store/authStore';
import useAlertStore from '../../store/alertStore';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const StaffLeave = () => {
  const { user } = useAuthStore();
  const { showAlert } = useAlertStore();

  const [staffData, setStaffData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    leaveType: 'paid'
  });
  const [submitting, setSubmitting] = useState(false);

  // Edit State
  const [editingLeave, setEditingLeave] = useState(null);
  const [editFormData, setEditFormData] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchStaffProfile = async () => {
    try {
      const res = await api.get('/staff/me/profile');
      setStaffData(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffProfile();
  }, []);

  const handleInputChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (end < start) return 0;
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    const days = calculateDays();
    if (days <= 0) {
      return showAlert('error', 'Error', 'End date must be after start date.');
    }
    
    setSubmitting(true);
    try {
      await api.post('/staff/me/leave', formData);
      showAlert('success', 'Success', 'Leave request submitted.');
      setFormData({ startDate: '', endDate: '', reason: '', leaveType: 'paid' });
      fetchStaffProfile();
    } catch (error) {
      showAlert('error', 'Error', error.response?.data?.message || 'Failed to submit leave.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (leave) => {
    setEditingLeave(leave);
    setEditFormData({
      startDate: new Date(leave.startDate).toISOString().split('T')[0],
      endDate: new Date(leave.endDate).toISOString().split('T')[0],
      reason: leave.reason
    });
    setIsEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    setEditFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUpdateLeave = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/staff/me/leave/${editingLeave._id}`, {
        ...editFormData,
        isUnpaid: editingLeave.isUnpaid
      });
      showAlert('success', 'Success', 'Leave request updated.');
      setIsEditModalOpen(false);
      setEditingLeave(null);
      fetchStaffProfile();
    } catch (error) {
      showAlert('error', 'Error', error.response?.data?.message || 'Failed to update leave.');
    }
  };

  const handleDeleteLeave = async (leave) => {
    if (!window.confirm('Are you sure you want to delete this leave request?')) return;
    try {
      await api.delete(`/staff/me/leave/${leave._id}?isUnpaid=${leave.isUnpaid}`);
      showAlert('success', 'Success', 'Leave request deleted.');
      fetchStaffProfile();
    } catch (error) {
      showAlert('error', 'Error', error.response?.data?.message || 'Failed to delete leave.');
    }
  };

  if (loading) return <LoadingSpinner text="Loading your leaves..." />;

  const leaves = staffData?.leaveRequests || [];
  const maximumLeaves = staffData?.maximumLeaves || 0;
  const leavesTaken = staffData?.leavesTaken || 0;
  const availableLeaves = maximumLeaves - leavesTaken;

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">My Leaves</h1>
        <p className="text-gray-500">Manage your leave applications and view your balance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <span className="text-gray-500 font-medium mb-2">Total Leaves Allowed</span>
          <span className="text-3xl font-bold text-gray-800">{maximumLeaves}</span>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <span className="text-gray-500 font-medium mb-2">Leaves Taken</span>
          <span className="text-3xl font-bold text-orange-500">{leavesTaken}</span>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <span className="text-gray-500 font-medium mb-2">Leaves Available</span>
          <span className="text-3xl font-bold text-green-500">{availableLeaves}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Leave Application Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Apply for Leave</h2>
            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input 
                  type="date" 
                  name="startDate" 
                  value={formData.startDate} 
                  onChange={handleInputChange} 
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input 
                  type="date" 
                  name="endDate" 
                  value={formData.endDate} 
                  onChange={handleInputChange} 
                  required
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                <select
                  name="leaveType"
                  value={formData.leaveType}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                >
                  <option value="paid">Paid Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea 
                  name="reason" 
                  value={formData.reason} 
                  onChange={handleInputChange} 
                  required
                  rows="3"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                ></textarea>
              </div>
              
              <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm">
                You are applying for <strong>{calculateDays()}</strong> days of {formData.leaveType} leave.
              </div>

              <button 
                type="submit" 
                disabled={submitting || calculateDays() <= 0 || (formData.leaveType === 'paid' && calculateDays() > availableLeaves)}
                className="w-full btn btn-primary flex items-center justify-center disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Leave Request'}
              </button>
            </form>
          </div>
        </div>

        {/* Leave History Table */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Leave History</h2>
            {leaves.length === 0 ? (
              <p className="text-gray-500 text-center py-10">No leave requests found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-3 px-4 font-semibold text-gray-600 text-sm">Dates</th>
                      <th className="py-3 px-4 font-semibold text-gray-600 text-sm">Type</th>
                      <th className="py-3 px-4 font-semibold text-gray-600 text-sm">Days</th>
                      <th className="py-3 px-4 font-semibold text-gray-600 text-sm">Reason</th>
                      <th className="py-3 px-4 font-semibold text-gray-600 text-sm">Status</th>
                      <th className="py-3 px-4 font-semibold text-gray-600 text-sm text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leaves.map((leave) => (
                      <tr key={leave._id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm whitespace-nowrap">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${leave.isUnpaid ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                            {leave.isUnpaid ? 'Unpaid' : 'Paid'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">{leave.days}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 max-w-[150px] truncate" title={leave.reason}>{leave.reason}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider inline-block w-max
                              ${leave.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                              ${leave.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                              ${leave.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                            `}>
                              {leave.status}
                            </span>
                            {leave.adminComment && (
                              <span className="text-xs text-gray-500 italic max-w-[150px] truncate" title={leave.adminComment}>
                                Note: {leave.adminComment}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {leave.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleEditClick(leave)} className="text-blue-500 hover:text-blue-700" title="Edit">
                                <span className="material-symbols-outlined text-sm">edit</span>
                              </button>
                              <button onClick={() => handleDeleteLeave(leave)} className="text-red-500 hover:text-red-700" title="Delete">
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-xl flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-serif text-secondary">Edit Leave Request</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleUpdateLeave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input 
                  type="date" 
                  name="startDate" 
                  value={editFormData.startDate} 
                  onChange={handleEditChange} 
                  required
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input 
                  type="date" 
                  name="endDate" 
                  value={editFormData.endDate} 
                  onChange={handleEditChange} 
                  required
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea 
                  name="reason" 
                  value={editFormData.reason} 
                  onChange={handleEditChange} 
                  required
                  rows="3"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary px-4 py-2">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary px-4 py-2">
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

export default StaffLeave;
