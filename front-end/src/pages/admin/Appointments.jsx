import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import useAlertStore from '../../store/alertStore';
import useAuthStore from '../../store/authStore';
import ViewDetailsModal from '../../components/common/ViewDetailsModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AddAppointmentModal from '../../components/admin/AddAppointmentModal';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'no_show', label: 'No show' },
];

const statusBadgeClass = (status) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'confirmed':
      return 'bg-blue-100 text-blue-700';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700';
    case 'in_progress':
      return 'bg-indigo-100 text-indigo-700';
    case 'cancelled':
    case 'no_show':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useAlertStore();
  const { user } = useAuthStore();

  const isAdmin = user?.role === 'admin';
  const rawActions = user?.permissions?.actions || {};
  const currentTabActions = Array.isArray(rawActions) ? rawActions : rawActions['Appointments'] || [];
  const canView = isAdmin || currentTabActions.includes('View');
  const canEdit = isAdmin || currentTabActions.includes('Edit') || currentTabActions.includes('Reschedule');
  const canAdd = isAdmin || currentTabActions.includes('Edit') || currentTabActions.includes('Add');

  const [selectedApt, setSelectedApt] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('services');

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('confirmed');
  const [dateFilter, setDateFilter] = useState('');

  const [editingApt, setEditingApt] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ appointmentDate: '', startTime: '', status: '' });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        limit: 100,
        status: statusFilter,
      };
      if (activeTab === 'consultations') params.type = 'consultation';
      else params.type = 'appointment';
      if (debouncedSearch) params.search = debouncedSearch;
      if (dateFilter) params.date = dateFilter;

      const res = await api.get('/admin/appointments', { params });
      setAppointments(res.data.data || []);
      setTotalItems(res.data.meta?.totalItems ?? (res.data.data || []).length);
    } catch (error) {
      console.error('Failed to load appointments:', error);
      showAlert('error', 'Error', 'Failed to load appointments');
      setAppointments([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, debouncedSearch, dateFilter, showAlert]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const openEditModal = (apt) => {
    setEditingApt(apt);
    const dateStr = new Date(apt.appointmentDate).toISOString().split('T')[0];
    setEditForm({
      appointmentDate: dateStr,
      startTime: apt.startTime,
      status: apt.status || 'pending',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const dateStr = new Date(editingApt.appointmentDate).toISOString().split('T')[0];
      const dateChanged =
        editForm.appointmentDate !== dateStr || editForm.startTime !== editingApt.startTime;
      const statusChanged = editForm.status !== editingApt.status;

      if (dateChanged) {
        await api.put(`/appointments/${editingApt._id}/reschedule`, {
          appointmentDate: editForm.appointmentDate,
          startTime: editForm.startTime,
        });
      }

      if (statusChanged) {
        await api.put(`/appointments/${editingApt._id}/status`, { status: editForm.status });
      }

      showAlert('success', 'Success', 'Appointment updated successfully');
      setIsEditModalOpen(false);
      fetchAppointments();
    } catch (error) {
      showAlert('error', 'Error', error.response?.data?.message || 'Failed to reschedule appointment');
    }
  };

  const statusLabel =
    STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label || statusFilter;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-serif text-secondary font-bold">Manage Appointments</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading
              ? 'Loading…'
              : `${totalItems} appointment${totalItems === 1 ? '' : 's'} found${
                  statusFilter !== 'all' ? ` · ${statusLabel}` : ''
                }`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search name, email, ref…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary text-sm bg-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            title="Filter by appointment date"
            className="w-full sm:w-auto border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white"
          />
          {dateFilter && (
            <button
              type="button"
              onClick={() => setDateFilter('')}
              className="text-sm text-primary hover:underline whitespace-nowrap"
            >
              Clear date
            </button>
          )}
          {canAdd && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-lg hover:opacity-90 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Appointment
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-6 py-3 font-medium text-sm transition-colors relative ${
            activeTab === 'services' ? 'text-primary font-bold' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('services')}
        >
          Service Appointments
          {activeTab === 'services' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm transition-colors relative ${
            activeTab === 'consultations'
              ? 'text-primary font-bold'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('consultations')}
        >
          Consultations
          {activeTab === 'consultations' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Loading appointments..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm">
                  <th className="px-6 py-4 font-medium">Customer</th>
                  <th className="px-6 py-4 font-medium">Service / Consultation</th>
                  <th className="px-6 py-4 font-medium">Date & Time</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.length > 0 ? (
                  appointments.map((apt) => (
                    <tr key={apt._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {canView ? (
                          <button
                            onClick={() => {
                              const viewData = { ...apt };
                              if (apt.type === 'consultation') {
                                viewData.service = 'Consultation';
                                viewData.type = 'Consultation';
                              }
                              if (apt.guestName) {
                                viewData.customer = apt.guestName;
                              }
                              setSelectedApt(viewData);
                              setIsViewModalOpen(true);
                            }}
                            className="text-primary hover:underline font-medium text-left focus:outline-none"
                          >
                            {apt.guestName || apt.customer?.name || 'Unknown'}
                            {apt.customer?.isWalkIn && (
                              <span className="ml-1.5 text-[10px] uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                Walk-in
                              </span>
                            )}
                          </button>
                        ) : (
                          <>
                            {apt.guestName || apt.customer?.name || 'Unknown'}
                            {apt.customer?.isWalkIn && (
                              <span className="ml-1.5 text-[10px] uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                Walk-in
                              </span>
                            )}
                          </>
                        )}
                        {apt.bookingReference && (
                          <div className="text-[11px] text-gray-400 mt-0.5 font-mono">
                            {apt.bookingReference}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900">
                          {apt.type === 'consultation'
                            ? 'Consultation'
                            : apt.service?.name || 'Unknown'}
                        </div>
                        <div className="text-xs mt-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              apt.type === 'consultation'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {apt.type === 'consultation' ? 'Consultation' : 'Service'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(apt.appointmentDate).toLocaleDateString()} at {apt.startTime}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusBadgeClass(
                            apt.status
                          )}`}
                        >
                          {(apt.status || 'pending').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canEdit && (
                          <button
                            type="button"
                            title="Edit"
                            aria-label="Edit"
                            onClick={() => openEditModal(apt)}
                            className="inline-flex items-center justify-center p-1.5 text-primary hover:bg-primary/10 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No appointments found
                      {statusFilter !== 'all' ? ` with status “${statusLabel}”` : ''}.
                      {statusFilter === 'confirmed' && (
                        <span className="block mt-2 text-xs">
                          Tip: unpaid bookings stay <strong>Pending</strong> — switch the status
                          filter to see them.
                        </span>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddAppointmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreated={fetchAppointments}
      />

      <ViewDetailsModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Appointment Details"
        data={selectedApt}
      />

      {isEditModalOpen && editingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-serif font-bold text-gray-800">Edit Appointment</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                  value={editForm.appointmentDate}
                  onChange={(e) => setEditForm({ ...editForm, appointmentDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                  value={editForm.startTime}
                  onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No show</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-sm text-white bg-primary rounded-lg">
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

export default Appointments;
