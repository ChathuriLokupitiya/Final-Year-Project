import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import useAlertStore from '../../store/alertStore';
import useAuthStore from '../../store/authStore';
import ViewDetailsModal from '../../components/common/ViewDetailsModal';
import CustomerBlockTimelineModal from '../../components/common/CustomerBlockTimelineModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const CustomerManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';


  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [timelineCustomer, setTimelineCustomer] = useState(null);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  const getTabFromUrl = () => {
    const tab = searchParams.get('tab');
    if (tab === 'blocked') return 'blockHistory';
    if (tab === 'messages') return 'messages';
    return 'customers';
  };
  
  const tabParam = getTabFromUrl();

  const [activeTab, setActiveTab] = useState(tabParam);

  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  const staffTabs = user?.permissions?.tabs || [];
  const hasTabAccess = (tabName) => isAdmin || staffTabs.includes(tabName);
  
  const getTabName = () => {
    if (activeTab === 'blockHistory') return 'Block history';
    if (activeTab === 'messages') return 'Customer messages';
    return 'Customers';
  };

  const activeTabName = getTabName();
  const hasAccessToActiveTab = hasTabAccess(activeTabName);

  const rawActions = user?.permissions?.actions || {};
  const currentTabActions = Array.isArray(rawActions) ? rawActions : (rawActions[activeTabName] || []);
  
  const canEdit = isAdmin || currentTabActions.includes('Edit');
  const canView = isAdmin || currentTabActions.includes('View');
  const canAdd = isAdmin || currentTabActions.includes('Add');
  const canBlock = isAdmin || currentTabActions.includes('Block');
  const canReply = isAdmin || currentTabActions.includes('Reply');

  const [customers, setCustomers] = useState([]);
  const [blockHistory, setBlockHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { showAlert, showConfirm, showPrompt } = useAlertStore();

  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageFilter, setMessageFilter] = useState('unread');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/customers');
      setCustomers(res.data.data || res.data || []);
    } catch (error) {
      console.error("Failed to load customers:", error);
      showAlert('error', 'Error', 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/block-history');
      setBlockHistory(res.data.data || res.data || []);
    } catch (error) {
      console.error("Failed to load block history:", error);
      showAlert('error', 'Error', 'Failed to load block history');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inquiries');
      setMessages(res.data.data || res.data || []);
    } catch (error) {
      console.error("Failed to load messages:", error);
      showAlert('error', 'Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
      await api.post('/admin/customers', data);
      showAlert('success', 'Success', 'Customer added successfully');
      setIsAddModalOpen(false);
      fetchCustomers();
    } catch (error) {
      showAlert('error', 'Error', error.response?.data?.message || 'Failed to add customer');
    }
  };

  const handleEditCustomer = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
      await api.put(`/admin/customers/${editingCustomer._id}`, data);
      showAlert('success', 'Success', 'Customer updated successfully');
      setIsEditModalOpen(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (error) {
      showAlert('error', 'Error', error.response?.data?.message || 'Failed to update customer');
    }
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setIsEditModalOpen(true);
  };

  useEffect(() => {
    if (activeTab === 'customers') {
      fetchCustomers();
    } else if (activeTab === 'blockHistory') {
      fetchBlockHistory();
    } else if (activeTab === 'messages') {
      fetchMessages();
    }
  }, [activeTab]);

  const handleToggleBlock = (customer) => {
    if (customer.isWalkIn) {
      showAlert('error', 'Not allowed', 'Walk-in customer cannot be blocked. It is used for desk bookings.');
      return;
    }
    const actionStr = customer.isBlocked ? 'unblock' : 'block';
    showPrompt(
      `${customer.isBlocked ? 'Unblock' : 'Block'} Customer`,
      `Please provide a reason to ${actionStr} ${customer.name || 'this customer'}:`,
      async (reason) => {
        try {
          await api.put(`/admin/customers/${customer._id}/block`, {
            isBlocked: !customer.isBlocked,
            reason
          });
          showAlert('success', 'Success', `Customer ${actionStr}ed successfully`);
          fetchCustomers();
        } catch (error) {
          showAlert(
            'error',
            'Error',
            error.response?.data?.message || `Failed to ${actionStr} customer`
          );
        }
      }
    );
  };

  const handleUpdateMessageStatus = async (id, status) => {
    try {
      await api.patch(`/inquiries/${id}/status`, { status });
      showAlert('success', 'Success', `Message marked as ${status}`);
      fetchMessages();
      if (selectedMessage && selectedMessage._id === id) {
        setSelectedMessage({ ...selectedMessage, status });
      }
    } catch (error) {
      showAlert('error', 'Error', 'Failed to update message status');
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const name = c.name || '';
    const email = c.email || '';
    const query = searchQuery.toLowerCase();
    return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
  });

  const filteredHistory = blockHistory.filter((h) => {
    const customerName = h.customer?.name || '';
    const customerEmail = h.customer?.email || '';
    const adminName = h.admin?.name || '';
    const query = searchQuery.toLowerCase();
    return customerName.toLowerCase().includes(query) || 
           customerEmail.toLowerCase().includes(query) ||
           adminName.toLowerCase().includes(query);
  });

  const filteredMessages = messages.filter((m) => {
    const name = m.name || '';
    const email = m.email || '';
    const query = searchQuery.toLowerCase();
    const matchesSearch = name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
    
    let matchesStatus = true;
    if (messageFilter === 'not_replied') {
      matchesStatus = m.status !== 'replied';
    } else if (messageFilter !== 'all') {
      matchesStatus = m.status === messageFilter;
    }
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-serif text-secondary font-bold">
          {activeTab === 'blockHistory' ? 'Block history' : activeTab === 'messages' ? 'Customer messages' : 'Customers management'}
        </h1>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {hasAccessToActiveTab && activeTab === 'messages' && (
            <select
              value={messageFilter}
              onChange={(e) => setMessageFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white"
            >
              <option value="all">All Messages</option>
              <option value="not_replied">Not Replied</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
              <option value="replied">Replied</option>
            </select>
          )}
          {hasAccessToActiveTab && activeTab === 'customers' && canAdd && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-primary text-on-primary px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Add Customer
            </button>
          )}
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
        </div>
      </div>

      {!hasAccessToActiveTab ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-16 text-center text-gray-500 flex flex-col items-center justify-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-4">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <h2 className="text-xl font-medium text-gray-800 mb-2">Access Denied</h2>
          <p className="max-w-md mx-auto">You do not have permission to view the {getTabName()} tab.</p>
        </div>
      ) : activeTab === 'messages' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
          {loading ? (
            <LoadingSpinner text="Loading messages..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm">
                    <th className="px-6 py-4 font-medium">Name</th>
                    <th className="px-6 py-4 font-medium">Email</th>
                    <th className="px-6 py-4 font-medium">Service Interest</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMessages.length > 0 ? (
                    filteredMessages.map((m) => (
                      <tr key={m._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          <button
                            onClick={() => {
                              setSelectedMessage(m);
                              setIsMessageModalOpen(true);
                              if (m.status === 'unread') {
                                handleUpdateMessageStatus(m._id, 'read');
                              }
                            }}
                            className="text-primary hover:underline font-medium text-left focus:outline-none"
                          >
                            {m.name}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{m.email}</td>
                        <td className="px-6 py-4 text-gray-500">{m.serviceInterest}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${m.status === 'unread' ? 'bg-red-100 text-red-700' : m.status === 'read' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                            {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        {searchQuery ? "No messages match your search." : "No messages found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'blockHistory' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
          {loading ? (
            <LoadingSpinner text="Loading block history..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm">
                    <th className="px-6 py-4 font-medium">Customer</th>
                    <th className="px-6 py-4 font-medium">Last Action Date</th>
                    <th className="px-6 py-4 font-medium">Current Status</th>
                    <th className="px-6 py-4 font-medium">Last Admin</th>
                    <th className="px-6 py-4 font-medium">Last Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((h) => (
                      <tr key={h._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {h.customer ? (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                {(h.customer.name || 'C')[0].toUpperCase()}
                              </div>
                              <div>
                                {canView ? (
                                  <button 
                                    onClick={() => { setTimelineCustomer(h.customer); setIsTimelineModalOpen(true); }}
                                    className="text-left text-primary hover:underline focus:outline-none"
                                  >
                                    <div className="text-sm font-medium">{h.customer.name || 'Unknown'}</div>
                                  </button>
                                ) : (
                                  <div className="text-sm font-medium">{h.customer.name || 'Unknown'}</div>
                                )}
                                <div className="text-xs text-gray-500 font-normal">{h.customer.email}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Deleted User</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {new Date(h.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${!h.customer?.isBlocked ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {!h.customer?.isBlocked ? 'Unblocked' : 'Blocked'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {h.admin ? h.admin.name : 'System'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={h.reason}>
                          {h.reason || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        {searchQuery ? "No history matches your search." : "No block history found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
          {loading ? (
            <LoadingSpinner text="Loading customers..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm">
                    <th className="px-6 py-4 font-medium">Name</th>
                    <th className="px-6 py-4 font-medium">Email</th>
                    <th className="px-6 py-4 font-medium">Joined</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c) => (
                      <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {(c.name || 'C')[0].toUpperCase()}
                          </div>
                          {canView ? (
                            <button 
                              onClick={() => { setSelectedCustomer(c); setIsViewModalOpen(true); }}
                              className="text-primary hover:underline font-medium text-left focus:outline-none"
                            >
                              {c.name || 'Unknown'}
                              {c.isWalkIn && (
                                <span className="ml-1.5 text-[10px] uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                  Walk-in
                                </span>
                              )}
                            </button>
                          ) : (
                            <>
                              {c.name || 'Unknown'}
                              {c.isWalkIn && (
                                <span className="ml-1.5 text-[10px] uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                  Walk-in
                                </span>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-500">{c.email || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            c.isWalkIn
                              ? 'bg-amber-100 text-amber-800'
                              : !c.isBlocked
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            {c.isWalkIn ? 'System' : !c.isBlocked ? 'Active' : 'Blocked'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            {canEdit && !c.isWalkIn && (
                              <button
                                type="button"
                                title="Edit"
                                aria-label="Edit"
                                onClick={() => openEditModal(c)}
                                className="inline-flex items-center justify-center p-1.5 text-primary hover:bg-primary/10 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[20px]">edit</span>
                              </button>
                            )}
                            {canBlock && !c.isWalkIn && (
                              <button
                                type="button"
                                title={c.isBlocked ? 'Unblock' : 'Block'}
                                aria-label={c.isBlocked ? 'Unblock' : 'Block'}
                                onClick={() => handleToggleBlock(c)}
                                className={`inline-flex items-center justify-center p-1.5 transition-colors ${
                                  c.isBlocked
                                    ? 'text-green-600 hover:bg-green-50'
                                    : 'text-red-500 hover:bg-red-50'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[20px]">
                                  {c.isBlocked ? 'lock_open' : 'block'}
                                </span>
                              </button>
                            )}
                            {c.isWalkIn && (
                              <span className="text-[11px] text-gray-400 px-1" title="System walk-in account">
                                Protected
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        {searchQuery ? "No customers match your search." : "No customers found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ViewDetailsModal 
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Customer Details"
        data={selectedCustomer}
      />
      
      <CustomerBlockTimelineModal
        isOpen={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        customer={timelineCustomer}
      />

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-surface w-full max-w-lg rounded-xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-2xl font-serif font-bold text-secondary">Add New Customer</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddCustomer} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input required name="name" type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Jane Doe" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input required name="email" type="email" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="jane@example.com" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input name="phone" type="tel" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="+1 (555) 000-0000" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input required name="password" type="password" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Set a temporary password" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea name="address" rows="3" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none" placeholder="123 Luxury Ave..."></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors">
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-surface w-full max-w-lg rounded-xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-2xl font-serif font-bold text-secondary">Edit Customer</h2>
              <button onClick={() => { setIsEditModalOpen(false); setEditingCustomer(null); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleEditCustomer} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input required name="name" type="text" defaultValue={editingCustomer.name} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Jane Doe" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input disabled type="email" defaultValue={editingCustomer.email} className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input name="phone" type="tel" defaultValue={editingCustomer.phone} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="+1 (555) 000-0000" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea name="address" rows="3" defaultValue={editingCustomer.address} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none" placeholder="123 Luxury Ave..."></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => { setIsEditModalOpen(false); setEditingCustomer(null); }} className="px-6 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors">
                  Update Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isMessageModalOpen && selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-surface w-full max-w-lg rounded-xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-2xl font-serif font-bold text-secondary">Message Details</h2>
              <button onClick={() => { setIsMessageModalOpen(false); setSelectedMessage(null); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-1">From</span>
                <div className="text-gray-900 font-medium">{selectedMessage.name} <span className="text-gray-500 font-normal">({selectedMessage.email})</span></div>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-1">Service Interest</span>
                <div className="text-gray-900">{selectedMessage.serviceInterest}</div>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-1">Date Received</span>
                <div className="text-gray-900">{new Date(selectedMessage.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-1">Message</span>
                <div className="bg-gray-50 p-4 rounded-lg text-gray-800 whitespace-pre-wrap border border-gray-100">
                  {selectedMessage.message}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <div>
                <span className="text-sm text-gray-500 mr-2">Status:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${selectedMessage.status === 'unread' ? 'bg-red-100 text-red-700' : selectedMessage.status === 'read' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                  {selectedMessage.status.charAt(0).toUpperCase() + selectedMessage.status.slice(1)}
                </span>
              </div>
              <div className="flex gap-3">
                {canReply && selectedMessage.status !== 'replied' && (
                  <button 
                    onClick={() => handleUpdateMessageStatus(selectedMessage._id, 'replied')} 
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors"
                  >
                    Mark as Replied
                  </button>
                )}
                <button 
                  onClick={() => { setIsMessageModalOpen(false); setSelectedMessage(null); }} 
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
