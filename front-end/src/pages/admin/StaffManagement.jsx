import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import useAlertStore from '../../store/alertStore';
import useAuthStore from '../../store/authStore';
import ViewDetailsModal from '../../components/common/ViewDetailsModal';
import StaffLimitsModal from '../../components/common/StaffLimitsModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import profileImg from '../../assets/profile.jpg';

const StaffManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';


  const [staff, setStaff] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showAlert, showConfirm } = useAlertStore();

  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);
  const [isLeaveHistoryModalOpen, setIsLeaveHistoryModalOpen] = useState(false);
  const [selectedStaffLeaves, setSelectedStaffLeaves] = useState(null);
  
  const [leaveFilter, setLeaveFilter] = useState('pending');
  const [leaveReviewModal, setLeaveReviewModal] = useState({ isOpen: false, staffId: null, leaveId: null, status: null, isUnpaid: false, comment: '' });

  const [allServices, setAllServices] = useState([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedStaffForAssign, setSelectedStaffForAssign] = useState(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  const getTabFromUrl = () => {
    const tab = searchParams.get('tab');
    if (tab === 'leaves') return 'leaves';
    // Let it be internal state if not 'leaves'
    return null;
  };
  
  const urlTab = getTabFromUrl();

  const [activeTab, setActiveTab] = useState(urlTab || 'staff');
  const [allLeaves, setAllLeaves] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);

  const fetchLeaves = async () => {
    setLoadingLeaves(true);
    try {
      const res = await api.get('/admin/staff/leaves');
      setAllLeaves(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingLeaves(false);
    }
  };

  useEffect(() => {
    if (urlTab === 'leaves') {
      setActiveTab('leaves');
      fetchLeaves();
    } else if (activeTab === 'leaves') {
      // fallback to staff if urlTab changed away from leaves
      setActiveTab('staff');
    }
  }, [urlTab]);

  const staffTabs = user?.permissions?.tabs || [];
  const hasTabAccess = (tabName) => isAdmin || staffTabs.includes(tabName);
  
  const getTabName = () => {
    if (activeTab === 'leaves') return 'Staff Leaves';
    return 'Staff';
  };

  const activeTabName = getTabName();
  const hasAccessToActiveTab = hasTabAccess(activeTabName);

  const rawActions = user?.permissions?.actions || {};
  const currentTabActions = Array.isArray(rawActions) ? rawActions : (rawActions[activeTabName] || []);
  
  const canAdd = isAdmin || currentTabActions.includes('Add');
  const canEdit = isAdmin || currentTabActions.includes('Edit');
  const canRemove = isAdmin || currentTabActions.includes('Remove');
  const canView = isAdmin || currentTabActions.includes('View');
  const canAssign = isAdmin || currentTabActions.includes('Assign');

  const [formData, setFormData] = useState({
    id: null,
    name: '',
    email: '',
    password: '',
    phone: '',
      isConsultant: false,
      consultationPrice: '',
      specializations: '', // comma separated
    bio: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get('/staff');
      setStaff(res.data.data || res.data || []);
    } catch (error) {
      console.error("Failed to load staff:", error);
      showAlert('error', 'Error', 'Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await api.get('/admin/services');
      setAllServices(res.data.data || res.data || []);
    } catch (error) {
      console.error("Failed to load services:", error);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchServices();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setFormData({ id: null, name: '', email: '', password: '', phone: '', isConsultant: false, consultationPrice: '', specializations: '', bio: '', maximumLeaves: 20 });
    setIsModalOpen(true);
  };

  const openEditModal = (s) => {
    setIsEditMode(true);
    setFormData({
      id: s._id,
      name: s.user?.name || '',
      email: s.user?.email || '',
      password: '', // Leave blank for edit, not supported in basic update without complex logic, or handled differently
      phone: s.user?.phone || '',
      isConsultant: s.isConsultant || false,
      consultationPrice: s.consultationPrice != null ? s.consultationPrice : '',
      specializations: s.specializations ? s.specializations.join(', ') : '',
      bio: s.bio || '',
      maximumLeaves: s.maximumLeaves || 20
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    const errors = {};

    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.email)) errors.email = 'Invalid email format';

    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
      errors.phone = 'Phone number must be 10 digits';
    }

    if (!isEditMode) {
      if (!formData.password) {
        errors.password = 'Password is required for new staff';
      } else {
        const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passRegex.test(formData.password)) {
          errors.password = 'Password must be at least 8 characters, include an uppercase, lowercase, number, and special character';
        }
      }
    }

    if (formData.isConsultant) {
      if (formData.consultationPrice === '' || formData.consultationPrice == null || Number(formData.consultationPrice) < 0) {
        errors.consultationPrice = 'Consultation price is required for consultants';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      const data = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        isConsultant: formData.isConsultant,
        consultationPrice: formData.isConsultant ? Number(formData.consultationPrice) || 0 : undefined,
        specializations: formData.specializations ? formData.specializations.split(',').map(s => s.trim()) : [],
        bio: formData.bio,
        maximumLeaves: parseInt(formData.maximumLeaves, 10) || 20,
      };

      if (!isEditMode) {
        if (!formData.password) {
          throw new Error('Password is required for new staff');
        }
        data.password = formData.password;
      }

      if (isEditMode) {
        await api.put(`/admin/staff/${formData.id}`, data);
        showAlert('success', 'Success', 'Staff member updated successfully');
      } else {
        await api.post('/admin/staff', data);
        showAlert('success', 'Success', 'Staff member created successfully');
      }

      closeModal();
      fetchStaff();
    } catch (error) {
      console.error(error);
      showAlert('error', 'Error', error.response?.data?.message || error.message || 'Failed to save staff member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    showConfirm(
      "Remove Staff",
      "Are you sure you want to remove this staff member? This will block their account.",
      async () => {
        try {
          await api.delete(`/admin/staff/${id}`);
          showAlert('success', 'Removed', 'Staff member removed successfully');
          fetchStaff();
        } catch (error) {
          showAlert('error', 'Error', 'Failed to remove staff member');
        }
      }
    );
  };

  const openAssignModal = (s) => {
    setSelectedStaffForAssign(s);
    const assignedIds = (s.services || []).map(srv => typeof srv === 'string' ? srv : srv._id);
    setSelectedServiceIds(assignedIds);
    setIsAssignModalOpen(true);
  };

  const handleAssignServiceChange = (serviceId) => {
    setSelectedServiceIds(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId) 
        : [...prev, serviceId]
    );
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/admin/staff/${selectedStaffForAssign._id}/services`, { serviceIds: selectedServiceIds });
      showAlert('success', 'Success', 'Services assigned successfully.');
      setIsAssignModalOpen(false);
      fetchStaff();
    } catch (error) {
      showAlert('error', 'Error', error.response?.data?.message || 'Failed to assign services');
    } finally {
      setSubmitting(false);
    }
  };

  const openLeaveReviewModal = (staffId, leaveId, status, isUnpaid) => {
    setLeaveReviewModal({ isOpen: true, staffId, leaveId, status, isUnpaid, comment: '' });
  };

  const submitLeaveReview = async (e) => {
    e.preventDefault();
    const { staffId, leaveId, status, isUnpaid, comment } = leaveReviewModal;
    try {
      await api.put(`/admin/staff/${staffId}/leave/${leaveId}`, { status, isUnpaid, adminComment: comment });
      showAlert('success', 'Success', `Leave request ${status}.`);
      setLeaveReviewModal({ isOpen: false, staffId: null, leaveId: null, status: null, isUnpaid: false, comment: '' });
      fetchLeaves();
    } catch (error) {
      showAlert('error', 'Error', error.response?.data?.message || `Failed to update leave status`);
    }
  };

  const handleViewStaffLeaveHistory = (staffId, staffName) => {
    const leaves = allLeaves.filter(l => l.staffId === staffId);
    setSelectedStaffLeaves({ name: staffName, leaves });
    setIsLeaveHistoryModalOpen(true);
  };

  const filteredStaff = staff.filter((s) => {
    // Filter by tab
    const isTabMatch = activeTab === 'consultants' ? s.isConsultant : !s.isConsultant;
    if (!isTabMatch) return false;

    // Filter by search query
    const name = s.user?.name || '';
    const email = s.user?.email || '';
    const query = searchQuery.toLowerCase();
    return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
  });

  const filteredLeaves = allLeaves.filter(leave => {
    if (leaveFilter !== 'all' && leave.status !== leaveFilter) return false;
    
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    
    const name = leave.staffName || '';
    const email = leave.staffEmail || '';
    return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-serif text-secondary font-bold">
          {activeTab === 'leaves' ? 'Staff Leaves Management' : 'Manage Staff'}
        </h1>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {hasAccessToActiveTab && (
            <div className="relative flex-1 sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
              <input 
                type="text" 
                placeholder="Search by name or email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
            </div>
          )}
          {hasAccessToActiveTab && activeTab === 'leaves' && (
             <div className="relative shrink-0">
               <select 
                 value={leaveFilter}
                 onChange={(e) => setLeaveFilter(e.target.value)}
                 className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white cursor-pointer"
               >
                 <option value="pending">Pending</option>
                 <option value="approved">Approved</option>
                 <option value="rejected">Rejected</option>
                 <option value="all">All</option>
               </select>
               <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[20px]">
                 expand_more
               </span>
             </div>
          )}
          {hasAccessToActiveTab && activeTab !== 'leaves' && canAdd && (
            <button onClick={openAddModal} className="btn btn-primary whitespace-nowrap shrink-0 min-w-[140px]">Add New Staff</button>
          )}
          {hasAccessToActiveTab && activeTab !== 'leaves' && isAdmin && (
            <button 
              onClick={() => setIsLimitsModalOpen(true)}
              className="btn btn-primary whitespace-nowrap shrink-0 min-w-[140px]"
            >
              Staff Limits
            </button>
          )}
        </div>
      </div>

      {hasAccessToActiveTab && activeTab !== 'leaves' && (
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'staff' ? 'text-primary font-bold' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('staff')}
          >
            Staff Members
            {activeTab === 'staff' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></span>
            )}
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'consultants' ? 'text-primary font-bold' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('consultants')}
          >
            Consultants
            {activeTab === 'consultants' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></span>
            )}
          </button>
        </div>
      )}

      {!hasAccessToActiveTab ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-16 text-center text-gray-500 flex flex-col items-center justify-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-4">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <h2 className="text-xl font-medium text-gray-800 mb-2">Access Denied</h2>
          <p className="max-w-md mx-auto">You do not have permission to view the {getTabName()} tab.</p>
        </div>
      ) : activeTab === 'leaves' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loadingLeaves ? (
            <LoadingSpinner text="Loading leave requests..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm">
                    <th className="px-6 py-4 font-medium">Staff</th>
                    <th className="px-6 py-4 font-medium">Dates</th>
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium">Days</th>
                    <th className="px-6 py-4 font-medium">Reason</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLeaves.length > 0 ? (
                    filteredLeaves.map((leave) => (
                      <tr key={leave._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 mb-0.5">
                            <button 
                              onClick={() => handleViewStaffLeaveHistory(leave.staffId, leave.staffName)}
                              className="font-medium text-primary hover:underline text-left focus:outline-none leading-none"
                            >
                              {leave.staffName}
                            </button>
                            {leave.isConsultant && (
                              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded uppercase tracking-wider leading-none">
                                Consultant
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{leave.staffEmail}</div>
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${leave.isUnpaid ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                            {leave.isUnpaid ? 'Unpaid' : 'Paid'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">{leave.days}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={leave.reason}>{leave.reason}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider
                            ${leave.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                            ${leave.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                            ${leave.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                          `}>
                            {leave.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {leave.status === 'pending' && (
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => openLeaveReviewModal(leave.staffId, leave._id, 'approved', leave.isUnpaid)} className="text-green-600 hover:bg-green-50 px-3 py-1 rounded-md text-sm border border-green-200">Approve</button>
                              <button onClick={() => openLeaveReviewModal(leave.staffId, leave._id, 'rejected', leave.isUnpaid)} className="text-red-600 hover:bg-red-50 px-3 py-1 rounded-md text-sm border border-red-200">Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                        No leave requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <LoadingSpinner text="Loading staff..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm">
                    <th className="px-6 py-4 font-medium">Name</th>
                    <th className="px-6 py-4 font-medium">Email</th>
                    <th className="px-6 py-4 font-medium">Specialization</th>
                    <th className="px-6 py-4 font-medium">Assigned Services</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                        {s.profileImages && s.profileImages[0] ? (
                          <img src={s.profileImages[0]} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <img src={s.user?.avatar || profileImg} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                        )}
                        {canView ? (
                          <button 
                            onClick={() => { setSelectedStaff(s); setIsViewModalOpen(true); }}
                            className="text-primary hover:underline font-medium text-left focus:outline-none"
                          >
                            {s.user?.name || 'Unknown'}
                          </button>
                        ) : (
                          s.user?.name || 'Unknown'
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500">{s.user?.email || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">{s.specializations?.join(', ') || 'General'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {s.services && s.services.length > 0 ? (
                            s.services.map(srv => (
                              <span key={srv._id || srv} className="bg-purple-50 text-purple-700 border border-purple-100 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
                                {srv.name || 'Service'}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs italic">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${s.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {s.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          {canAssign && (
                            <button
                              type="button"
                              title="Assign"
                              aria-label="Assign"
                              onClick={() => openAssignModal(s)}
                              className="inline-flex items-center justify-center p-1.5 text-primary hover:bg-primary/10 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[20px]">person_add</span>
                            </button>
                          )}
                          {canEdit && (
                            <button
                              type="button"
                              title="Edit"
                              aria-label="Edit"
                              onClick={() => openEditModal(s)}
                              className="inline-flex items-center justify-center p-1.5 text-primary hover:bg-primary/10 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[20px]">edit</span>
                            </button>
                          )}
                          {canRemove && (
                            <button
                              type="button"
                              title="Remove"
                              aria-label="Remove"
                              onClick={() => handleDelete(s._id)}
                              className="inline-flex items-center justify-center p-1.5 text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      {searchQuery ? "No staff members match your search." : "No staff members found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg p-6 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif text-secondary">{isEditMode ? 'Edit Staff Member' : 'Add New Staff Member'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name} 
                  onChange={handleInputChange}
                  required 
                  className={`w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3 ${formErrors.name ? 'border-red-500' : ''}`} 
                />
                {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email} 
                  onChange={handleInputChange}
                  required 
                  disabled={isEditMode}
                  className={`w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3 ${isEditMode ? 'bg-gray-100 text-gray-500' : ''} ${formErrors.email ? 'border-red-500' : ''}`} 
                />
                {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
              </div>

              {!isEditMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input 
                    type="password" 
                    name="password"
                    value={formData.password} 
                    onChange={handleInputChange}
                    required={!isEditMode}
                    placeholder="Must contain uppercase, lowercase, number, and special character"
                    className={`w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3 ${formErrors.password ? 'border-red-500' : ''}`} 
                  />
                  {formErrors.password ? (
                    <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">e.g., Salon@2026!</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  name="phone"
                  value={formData.phone} 
                  onChange={handleInputChange}
                  className={`w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3 ${formErrors.phone ? 'border-red-500' : ''}`} 
                />
                {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specializations (comma separated)</label>
                <input 
                  type="text" 
                  name="specializations"
                  value={formData.specializations} 
                  onChange={handleInputChange}
                  placeholder="e.g. Hair Coloring, Bridal Makeup"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea 
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3"
                  placeholder="Tell us a bit about this staff member..."
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Leaves / Year</label>
                <input 
                  type="number" 
                  name="maximumLeaves"
                  value={formData.maximumLeaves} 
                  onChange={handleInputChange}
                  min="0"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3" 
                />
              </div>

              <div className="flex items-center gap-2 mt-2 p-3 bg-blue-50 border border-blue-100 rounded-md">
                <input 
                  type="checkbox" 
                  id="isConsultant"
                  name="isConsultant"
                  checked={formData.isConsultant}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="isConsultant" className="text-sm font-medium text-blue-900 select-none">
                  Mark as Consultant (Displays on Consultancy page)
                </label>
              </div>

              {formData.isConsultant && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Consultation price (LKR) *
                  </label>
                  <input
                    type="number"
                    name="consultationPrice"
                    value={formData.consultationPrice}
                    onChange={handleInputChange}
                    min="0"
                    step="1"
                    required={formData.isConsultant}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3"
                    placeholder="e.g. 2500"
                  />
                  {formErrors.consultationPrice && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.consultationPrice}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Shown to customers and used for walk-in consultation bookings.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary flex items-center justify-center min-w-[120px]">
                  {submitting ? <span className="material-symbols-outlined animate-spin mr-2">autorenew</span> : null}
                  {submitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Add Staff')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ViewDetailsModal 
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Staff Details"
        data={selectedStaff ? {
          Name: selectedStaff.user?.name,
          Email: selectedStaff.user?.email,
          Phone: selectedStaff.user?.phone,
          Role: selectedStaff.isConsultant ? 'Consultant' : 'Staff',
          'Consultation Price': selectedStaff.isConsultant
            ? (selectedStaff.consultationPrice != null
                ? `LKR ${Number(selectedStaff.consultationPrice).toLocaleString()}`
                : 'Not set')
            : 'N/A',
          Specializations: selectedStaff.specializations?.join(', '),
          Bio: selectedStaff.bio,
          'Average Rating': selectedStaff.averageRating ? `${selectedStaff.averageRating} (${selectedStaff.totalReviews} reviews)` : 'No ratings yet',
          Services: selectedStaff.services?.map(s => s.name || s).join(', '),
          'Assignment History': (selectedStaff.assignmentHistory || []).map(h => 
            `${h.action === 'assigned' ? 'Assigned' : 'Removed'} ${h.service?.name || 'Service'} on ${new Date(h.date).toLocaleDateString()}`
          )
        } : null}
      />

      {/* Assign Services Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-serif text-secondary">Assign Services</h2>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Select the services that <strong>{selectedStaffForAssign?.user?.name}</strong> can perform. Uncheck to remove.
            </p>
            
            <form onSubmit={handleAssignSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto pr-2 space-y-2 flex-1 mb-6 border border-gray-100 p-3 rounded-lg bg-gray-50">
                {allServices.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No active services found.</p>
                ) : (
                  allServices.map(service => {
                    const isInactive = service.isActive === false;
                    return (
                      <label key={service._id} className={`flex items-center gap-3 p-2 bg-white rounded shadow-sm border border-gray-100 transition-colors ${isInactive ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}`}>
                        <input 
                          type="checkbox" 
                          checked={selectedServiceIds.includes(service._id)}
                          onChange={() => !isInactive && handleAssignServiceChange(service._id)}
                          disabled={isInactive}
                          className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary disabled:opacity-50"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-800">{service.name}</p>
                            {isInactive && (
                              <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium border border-red-100">Inactive</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">{service.category?.name || service.category || 'General'}</p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
              
              <div className="flex justify-end gap-3 mt-auto pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsAssignModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary flex items-center justify-center min-w-[100px]">
                  {submitting ? <span className="material-symbols-outlined animate-spin mr-2">autorenew</span> : null}
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave History Modal */}
      {isLeaveHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-3xl p-6 rounded-xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif text-secondary">Leave History: {selectedStaffLeaves?.name}</h2>
              <button onClick={() => setIsLeaveHistoryModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-4 flex-1">
               {selectedStaffLeaves?.leaves?.length === 0 ? (
                 <p className="text-center text-gray-500 py-4">No leave history found.</p>
               ) : (
                 <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-sm">
                        <th className="px-4 py-3 font-medium">Dates</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Days</th>
                        <th className="px-4 py-3 font-medium">Reason</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedStaffLeaves.leaves.map(leave => (
                        <tr key={leave._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${leave.isUnpaid ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                              {leave.isUnpaid ? 'Unpaid' : 'Paid'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{leave.days}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={leave.reason}>{leave.reason}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider
                              ${leave.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                              ${leave.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                              ${leave.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                            `}>
                              {leave.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               )}
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setIsLeaveHistoryModalOpen(false)} className="btn btn-primary px-6 py-2">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Review Modal */}
      {leaveReviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-serif text-secondary capitalize">{leaveReviewModal.status} Leave Request</h2>
              <button onClick={() => setLeaveReviewModal({ ...leaveReviewModal, isOpen: false })} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={submitLeaveReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comment (Optional)</label>
                <textarea 
                  value={leaveReviewModal.comment}
                  onChange={(e) => setLeaveReviewModal({ ...leaveReviewModal, comment: e.target.value })}
                  placeholder="Add a note for the staff member..."
                  rows="3"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setLeaveReviewModal({ ...leaveReviewModal, isOpen: false })} className="btn btn-secondary px-4 py-2">
                  Cancel
                </button>
                <button type="submit" className={`btn px-4 py-2 text-white ${leaveReviewModal.status === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                  Confirm {leaveReviewModal.status}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <StaffLimitsModal 
        isOpen={isLimitsModalOpen}
        onClose={() => setIsLimitsModalOpen(false)}
      />
    </div>
  );
};

export default StaffManagement;
