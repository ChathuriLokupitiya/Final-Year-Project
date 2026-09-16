import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import useAlertStore from '../../store/alertStore';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AVAILABLE_TABS = [
  'Dashboard',
  'Appointments',
  'Customers management',
  'Customers',
  'Block history',
  'Customer messages',
  'Staff management',
  'Staff',
  'Staff Leaves',
  'Services',
  'Gallery',
  'Promotions',
  'Catalog Discounts',
  'Loyalty Redeem',
  'Send Coupons',
  'Coupon History',
  'Redeem History',
  // TEMP: operational reports disabled
  // 'Reports',
  // 'Daily Report',
  // 'Appointments Report',
  // 'Revenue Report',
  // 'Customers Report',
  // 'Staff Performance Report',
  'Reviews',
  'Settings'
];

const TABS_HIERARCHY = [
  { name: 'Dashboard' },
  { name: 'Appointments' },
  { 
    name: 'Customers management',
    subTabs: ['Customers', 'Block history', 'Customer messages']
  },
  {
    name: 'Staff management',
    subTabs: ['Staff', 'Staff Leaves']
  },
  { name: 'Services' },
  { name: 'Gallery' },
  {
    name: 'Promotions',
    subTabs: ['Catalog Discounts', 'Loyalty Redeem', 'Send Coupons', 'Coupon History', 'Redeem History']
  },
  // TEMP: operational reports disabled
  // {
  //   name: 'Reports',
  //   subTabs: [
  //     'Daily Report',
  //     'Appointments Report',
  //     'Revenue Report',
  //     'Customers Report',
  //     'Staff Performance Report',
  //   ],
  // },
  { name: 'Reviews' },
  { name: 'Settings' }
];

const AVAILABLE_ACTIONS = ['View', 'Add', 'Edit', 'Delete'];

const getActionsForTab = (tabName) => {
  if (tabName === 'Appointments') {
    return ['View', 'Add', 'Edit', 'Reschedule'];
  }
  if (tabName === 'Staff') {
    return ['View', 'Add', 'Assign', 'Edit', 'Remove'];
  }
  if (tabName === 'Customers') {
    return ['View', 'Add', 'Edit', 'Block'];
  }
  if (tabName === 'Block history') {
    return ['View', 'Block'];
  }
  if (tabName === 'Customer messages') {
    return ['View', 'Reply', 'Delete'];
  }
  if (tabName === 'Catalog Discounts') {
    return ['View', 'Add', 'Edit', 'Delete'];
  }
  if (tabName === 'Loyalty Redeem') {
    return ['View', 'Add', 'Edit', 'Delete'];
  }
  if (tabName === 'Send Coupons') {
    return ['View', 'Send'];
  }
  if (tabName === 'Coupon History') {
    return ['View', 'Edit', 'Delete'];
  }
  if (tabName === 'Redeem History') {
    return ['View'];
  }
  if (tabName === 'Promotions') {
    return ['View', 'Add', 'Edit', 'Delete', 'Send'];
  }
  // TEMP: operational reports disabled
  // if (
  //   tabName === 'Reports' ||
  //   tabName === 'Daily Report' ||
  //   tabName === 'Appointments Report' ||
  //   tabName === 'Revenue Report' ||
  //   tabName === 'Customers Report' ||
  //   tabName === 'Staff Performance Report'
  // ) {
  //   return ['View'];
  // }
  if (tabName === 'Reviews') {
    return ['View', 'Delete'];
  }
  return AVAILABLE_ACTIONS;
};

const Settings = () => {
  const { user } = useAuthStore();
  const { showAlert } = useAlertStore();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Local state for the form so we can modify checkboxes before saving
  const [editedPermissions, setEditedPermissions] = useState({
    tabs: [],
    actions: []
  });
  const [expandedTabs, setExpandedTabs] = useState({});

  const toggleExpand = (tabName) => {
    setExpandedTabs(prev => ({ ...prev, [tabName]: !prev[tabName] }));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/admin/dashboard-users');
      // Filter out the current user if they are the top admin, to prevent self-lockout
      // Though it's fine to see everyone. We'll disable edits on admins.
      setUsers(res.data.data);
    } catch (error) {
      showAlert('error', 'Error', 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectUser = (u) => {
    setSelectedUser(u);
    let initialActions = u.permissions?.actions || {};
    if (Array.isArray(initialActions)) {
      initialActions = {};
    }
    setEditedPermissions({
      tabs: u.permissions?.tabs || [],
      actions: initialActions
    });
  };

  const toggleTabPermission = (tab) => {
    setEditedPermissions(prev => {
      const tabs = prev.tabs.includes(tab) 
        ? prev.tabs.filter(t => t !== tab) 
        : [...prev.tabs, tab];
      return { ...prev, tabs };
    });
  };

  const toggleActionPermission = (tab, action) => {
    setEditedPermissions(prev => {
      const tabActions = prev.actions[tab] || [];
      const newTabActions = tabActions.includes(action) 
        ? tabActions.filter(a => a !== action) 
        : [...tabActions, action];
      return { 
        ...prev, 
        actions: {
          ...prev.actions,
          [tab]: newTabActions
        }
      };
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    
    try {
      const res = await api.put(`/admin/users/${selectedUser._id}/permissions`, {
        permissions: editedPermissions
      });
      showAlert('success', 'Success', 'Permissions updated successfully!');
      
      // Update local state to reflect change
      setUsers(users.map(u => u._id === selectedUser._id ? { ...u, permissions: editedPermissions } : u));
      setSelectedUser(null);
    } catch (error) {
      showAlert('error', 'Error', error.response?.data?.message || 'Failed to update permissions');
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading settings..." />;
  }

  // Only Admins can modify permissions. If a staff member reaches this page somehow, they shouldn't edit.
  const isSuperAdmin = user?.role === 'admin';

  const filteredUsers = users.filter((u) => {
    const name = u.name || '';
    const email = u.email || '';
    const query = searchQuery.toLowerCase();
    return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-serif text-secondary font-bold">Settings & Access Control</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List Panel */}
        <div className="lg:col-span-1 bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden flex flex-col">
          <div className="p-4 border-b border-outline-variant/50 bg-surface-container-lowest shrink-0">
            <h2 className="font-title-md font-semibold mb-3">Dashboard Users</h2>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
              <input 
                type="text" 
                placeholder="Search users..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-surface"
              />
            </div>
          </div>
          <div className="divide-y divide-outline-variant/30 max-h-[600px] overflow-y-auto no-scrollbar flex-1">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => (
              <div 
                key={u._id} 
                onClick={() => handleSelectUser(u)}
                className={`p-4 cursor-pointer transition-colors flex items-center gap-3 ${selectedUser?._id === u._id ? 'bg-primary-container/20 border-l-4 border-primary' : 'hover:bg-surface-container-lowest'}`}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 shrink-0 border border-outline-variant">
                  <img 
                    src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=random`} 
                    alt={u.name}
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div>
                  <p className="font-label-md font-semibold text-on-surface">{u.name}</p>
                  <p className="text-[11px] text-on-surface-variant uppercase tracking-widest font-bold">{u.role}</p>
                </div>
              </div>
            ))
            ) : (
              <div className="p-8 text-center text-on-surface-variant text-sm">
                {searchQuery ? 'No users found matching your search.' : 'No users available.'}
              </div>
            )}
          </div>
        </div>

        {/* Permissions Panel */}
        <div className="lg:col-span-2 bg-surface rounded-2xl shadow-sm border border-outline-variant">
          {!selectedUser ? (
            <div className="h-[400px] flex flex-col items-center justify-center p-12 text-center text-on-surface-variant opacity-70">
              <span className="material-symbols-outlined text-5xl mb-4">admin_panel_settings</span>
              <p className="font-title-md font-semibold">Select a user</p>
              <p className="font-label-md mt-2">Choose a user from the list to manage their access permissions.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full animate-fade-in">
              <div className="p-6 border-b border-outline-variant/50 flex justify-between items-start">
                <div>
                  <h2 className="font-title-lg font-semibold text-primary">Permissions for {selectedUser.name}</h2>
                  <p className="font-label-md text-on-surface-variant mt-1">Configure what this user can see and do.</p>
                </div>
                {selectedUser.role === 'admin' && (
                  <span className="px-3 py-1 bg-error-container text-on-error-container text-[10px] uppercase tracking-widest font-bold rounded-full">
                    Admin
                  </span>
                )}
              </div>

              <div className="p-6 flex-1 space-y-8">
                {selectedUser.role === 'admin' ? (
                  <div className="bg-primary-container/10 p-6 rounded-xl border border-primary/20 text-center py-10">
                    <span className="material-symbols-outlined text-primary text-5xl mb-3">verified_user</span>
                    <h3 className="font-title-md font-semibold text-primary mb-2">Unrestricted Access</h3>
                    <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
                      Users with the <strong>Admin</strong> role inherently have full access to all tabs and actions. 
                      Permissions cannot be restricted for this role.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Tabs and Actions Permissions */}
                    <div>
                      <h3 className="font-title-md font-semibold mb-2 border-b border-outline-variant/30 pb-2">Visible Tabs & Permissions</h3>
                      <p className="text-[12px] text-on-surface-variant mb-4">Select which tabs are visible and define the specific actions allowed within each tab.</p>
                      <div className="flex flex-col gap-3">
                        {TABS_HIERARCHY.map((tabObj) => (
                          <div key={tabObj.name} className={`flex flex-col rounded-xl transition-all border ${editedPermissions.tabs.includes(tabObj.name) ? 'bg-primary/5 border-primary/30' : 'bg-surface-container-lowest border-outline-variant/30 hover:border-outline-variant'}`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between p-3 gap-4">
                              <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                                <label className="flex items-center gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editedPermissions.tabs.includes(tabObj.name)}
                                    onChange={() => toggleTabPermission(tabObj.name)}
                                    disabled={!isSuperAdmin}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant"
                                  />
                                  <span className={`font-label-md select-none ${editedPermissions.tabs.includes(tabObj.name) ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}>{tabObj.name}</span>
                                </label>
                                {tabObj.subTabs && (
                                  <button 
                                    type="button"
                                    onClick={() => toggleExpand(tabObj.name)} 
                                    className="text-on-surface-variant hover:text-primary transition-colors p-1 flex items-center justify-center ml-auto md:ml-2"
                                  >
                                    <span className="material-symbols-outlined text-lg">
                                      {expandedTabs[tabObj.name] ? 'expand_less' : 'expand_more'}
                                    </span>
                                  </button>
                                )}
                              </div>
                              {editedPermissions.tabs.includes(tabObj.name) && !tabObj.subTabs && (
                                <div className="flex items-center gap-3 flex-wrap md:justify-end ml-7 md:ml-0 border-t md:border-t-0 pt-2 md:pt-0 border-outline-variant/20">
                                  {getActionsForTab(tabObj.name).map(action => (
                                    <label key={action} className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={(editedPermissions.actions[tabObj.name] || []).includes(action)}
                                        onChange={() => toggleActionPermission(tabObj.name, action)}
                                        disabled={!isSuperAdmin}
                                        className="w-3.5 h-3.5 rounded text-primary focus:ring-primary border-outline-variant"
                                      />
                                      <span className="text-xs text-on-surface-variant select-none">{action}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {tabObj.subTabs && expandedTabs[tabObj.name] && (
                              <div className="flex flex-col gap-2 p-3 pt-0 border-t border-outline-variant/20 mt-1 bg-white/50 rounded-b-xl">
                                {tabObj.subTabs.map(subTab => (
                                  <div key={subTab} className={`flex flex-col md:flex-row md:items-center justify-between p-2 rounded-lg transition-all gap-4 ${editedPermissions.tabs.includes(subTab) ? 'bg-primary/10' : 'hover:bg-surface-container-lowest'}`}>
                                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                                      <input
                                        type="checkbox"
                                        checked={editedPermissions.tabs.includes(subTab)}
                                        onChange={() => toggleTabPermission(subTab)}
                                        disabled={!isSuperAdmin}
                                        className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant"
                                      />
                                      <span className={`font-label-md text-sm select-none ${editedPermissions.tabs.includes(subTab) ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}>{subTab}</span>
                                    </label>
                                    {editedPermissions.tabs.includes(subTab) && (
                                      <div className="flex items-center gap-3 flex-wrap md:justify-end ml-7 md:ml-0">
                                        {getActionsForTab(subTab).map(action => (
                                          <label key={action} className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={(editedPermissions.actions[subTab] || []).includes(action)}
                                              onChange={() => toggleActionPermission(subTab, action)}
                                              disabled={!isSuperAdmin}
                                              className="w-3.5 h-3.5 rounded text-primary focus:ring-primary border-outline-variant"
                                            />
                                            <span className="text-xs text-on-surface-variant select-none">{action}</span>
                                          </label>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-outline-variant/50 flex justify-end gap-4 bg-surface-container-lowest rounded-b-2xl">
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="px-6 py-2 rounded-lg font-label-md font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSavePermissions}
                  disabled={selectedUser.role === 'admin' || !isSuperAdmin}
                  className="px-6 py-2 rounded-lg font-label-md font-semibold bg-primary text-on-primary shadow-sm hover:bg-on-primary-container disabled:opacity-50 transition-colors"
                >
                  Save Permissions
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
