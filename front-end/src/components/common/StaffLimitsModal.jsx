import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import useAlertStore from '../../store/alertStore';

const StaffLimitsModal = ({ isOpen, onClose }) => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showAlert } = useAlertStore();

  useEffect(() => {
    if (isOpen) {
      fetchStaff();
    }
  }, [isOpen]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get('/staff');
      setStaffList(res.data.data || res.data || []);
    } catch (error) {
      showAlert('error', 'Error', 'Failed to fetch staff list.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLimit = async (staffId, field, value) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) return;

    setSaving(true);
    try {
      await api.put(`/admin/staff/${staffId}/limits`, { [field]: numValue });
      setStaffList(staffList.map(s => 
        s._id === staffId ? { ...s, [field]: numValue } : s
      ));
      showAlert('success', 'Updated', 'Staff daily limit updated successfully.');
    } catch (error) {
      showAlert('error', 'Error', 'Failed to update limit.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface w-full max-w-4xl p-8 rounded-xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 className="text-2xl font-serif text-secondary mb-6">Staff Daily Appointment Limits</h2>
        
        {loading ? (
          <p className="text-center text-gray-500 py-10">Loading staff...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm">
                  <th className="px-6 py-4 font-medium">Staff Member</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium text-center">Max Consultations / Day</th>
                  <th className="px-6 py-4 font-medium text-center">Max Services / Day</th>
                  <th className="px-6 py-4 font-medium text-center">Max Leaves</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staffList.map((staff) => (
                  <tr key={staff._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{staff.user?.name}</div>
                      <div className="text-xs text-gray-500">{staff.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 capitalize text-sm">
                      {staff.isConsultant ? 'Consultant' : 'Stylist'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {staff.isConsultant ? (
                        <input 
                          type="number" 
                          min="0"
                          className="w-20 text-center border-gray-300 rounded-md p-1"
                          defaultValue={staff.maxConsultationsPerDay ?? 4}
                          onBlur={(e) => handleUpdateLimit(staff._id, 'maxConsultationsPerDay', e.target.value)}
                          disabled={saving}
                        />
                      ) : (
                        <span className="text-gray-400 italic">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="number" 
                        min="0"
                        className="w-20 text-center border-gray-300 rounded-md p-1"
                        defaultValue={staff.maxServiceAppointmentsPerDay ?? 10}
                        onBlur={(e) => handleUpdateLimit(staff._id, 'maxServiceAppointmentsPerDay', e.target.value)}
                        disabled={saving}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="number" 
                        min="0"
                        className="w-20 text-center border-gray-300 rounded-md p-1"
                        defaultValue={staff.maximumLeaves ?? 20}
                        onBlur={(e) => handleUpdateLimit(staff._id, 'maximumLeaves', e.target.value)}
                        disabled={saving}
                      />
                    </td>
                  </tr>
                ))}
                {staffList.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-gray-500">No staff found.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className="mt-4 text-xs text-gray-500 italic text-center">
              * Changes are saved automatically when you click outside the input field.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffLimitsModal;
