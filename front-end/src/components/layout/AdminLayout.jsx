import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import adminImg from '../../assets/admin.png';
import profileImg from '../../assets/profile.jpg';

const AdminLayout = () => {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [badges, setBadges] = useState({
    appointments: 0,
    messages: 0,
    leaves: 0
  });

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const res = await api.get('/admin/dashboard');
        const overview = res.data?.data;
        if (overview) {
          setBadges({
            appointments: overview.appointments?.pending || 0,
            messages: overview.pendingInquiries || 0,
            leaves: overview.pendingLeaves || 0
          });
        }
      } catch (error) {
        console.error("Failed to fetch dashboard badges", error);
      }
    };
    
    if (user) {
      fetchBadges();
      const interval = setInterval(fetchBadges, 60000); // refresh every minute
      return () => clearInterval(interval);
    }
  }, [user]);

  const renderBadge = (key) => {
    const count = badges[key];
    if (!count) return null;
    return (
      <span className="ml-2 bg-error text-surface text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center justify-center min-w-[20px]">
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/admin/login');
  };

  const isAdmin = user?.role === 'admin';
  const staffTabs = user?.permissions?.tabs || [];

  const allNavItems = [
    { name: 'Dashboard', icon: 'dashboard', path: '/admin', end: true },
    { name: 'Appointments', icon: 'calendar_month', path: '/admin/appointments', badgeKey: 'appointments' },
    { 
      name: 'Customers management', 
      icon: 'group', 
      path: '/admin/customers',
      subItems: [
        { name: 'Customers', path: '/admin/customers', search: '' },
        { name: 'Block history', path: '/admin/customers', search: '?tab=blocked' },
        { name: 'Customer messages', path: '/admin/customers', search: '?tab=messages', badgeKey: 'messages' }
      ]
    },
    { 
      name: 'Staff management', 
      icon: 'badge', 
      path: '/admin/staff',
      subItems: [
        { name: 'Staff', path: '/admin/staff', search: '' },
        { name: 'Staff Leaves', path: '/admin/staff', search: '?tab=leaves', badgeKey: 'leaves' }
      ]
    },
    { name: 'My Leaves', icon: 'event_note', path: '/admin/my-leaves' },
    { name: 'Services', icon: 'spa', path: '/admin/services' },
    { name: 'Reviews', icon: 'star_rate', path: '/admin/reviews' },
    { name: 'Gallery', icon: 'photo_library', path: '/admin/gallery' },
    { 
      name: 'Promotions', 
      icon: 'local_offer', 
      path: '/admin/promotions',
      subItems: [
        { name: 'Catalog Discounts', path: '/admin/promotions', search: '' },
        { name: 'Loyalty Redeem', path: '/admin/promotions', search: '?tab=loyalty' },
        { name: 'Send Coupons', path: '/admin/promotions', search: '?tab=send' },
        { name: 'Coupon History', path: '/admin/promotions', search: '?tab=coupons' },
        { name: 'Redeem History', path: '/admin/promotions', search: '?tab=history' },
      ]
    },
    // TEMP: operational reports disabled
    // {
    //   name: 'Reports',
    //   icon: 'analytics',
    //   path: '/admin/reports',
    //   subItems: [
    //     { name: 'Daily Report', path: '/admin/reports', search: '?tab=daily' },
    //     { name: 'Appointments Report', path: '/admin/reports', search: '?tab=appointments' },
    //     { name: 'Revenue Report', path: '/admin/reports', search: '?tab=revenue' },
    //     { name: 'Customers Report', path: '/admin/reports', search: '?tab=customers' },
    //     { name: 'Staff Performance Report', path: '/admin/reports', search: '?tab=staff' },
    //   ],
    // },
    { name: 'Settings', icon: 'settings', path: '/admin/settings' },
  ];

  const navItems = allNavItems.map(item => {
    if (isAdmin) {
      if (item.name === 'My Leaves') return null;
      return item;
    }
    
    if (item.name === 'My Leaves') return item; // Staff always gets My Leaves

    if (item.subItems) {
      const allowedSubItems = item.subItems.filter(
        (sub) => staffTabs.includes(sub.name) || staffTabs.includes(item.name)
      );
      if (staffTabs.includes(item.name) || allowedSubItems.length > 0) {
        if (allowedSubItems.length === 0) {
          return { ...item, subItems: undefined };
        }
        return { ...item, subItems: allowedSubItems };
      }
      return null;
    }
    
    return staffTabs.includes(item.name) ? item : null;
  }).filter(Boolean);

  // Auto-collapse if we navigate away
  useEffect(() => {
    if (expandedMenu) {
      const activeItem = navItems.find(i => i.name === expandedMenu);
      if (activeItem && !location.pathname.startsWith(activeItem.path)) {
        setExpandedMenu('');
      }
    }
  }, [location.pathname]);

  return (
    <div className="font-body-md text-on-background bg-background min-h-screen selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* SideNavBar Shell */}
      <aside className={`fixed left-0 top-0 bg-surface-container-lowest dark:bg-surface-dim shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-col h-full py-base z-50 animate-fade-in transition-all duration-300 ${isSidebarCollapsed ? 'w-20 items-center' : 'w-72'}`}>
        <div className={`mb-10 flex items-center ${isSidebarCollapsed ? 'justify-center w-full px-0' : 'justify-between px-gutter'}`}>
          {!isSidebarCollapsed && (
            <div>
              <h1 className="font-headline-sm text-headline-sm font-semibold text-primary dark:text-primary-fixed-dim tracking-wide whitespace-nowrap">
                Aura Admin
              </h1>
              <p className="font-label-md text-label-md text-on-surface-variant opacity-70 whitespace-nowrap">
                Consultancy Portal
              </p>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 rounded-full hover:bg-surface-container transition-all flex-shrink-0 text-on-surface-variant"
          >
            <span className="material-symbols-outlined">
              {isSidebarCollapsed ? 'menu' : 'menu_open'}
            </span>
          </button>
        </div>
        <nav className="flex-1 space-y-1 w-full overflow-y-auto overflow-x-hidden no-scrollbar pb-4">
          {navItems.map((item) => (
            <div key={item.name}>
              {item.subItems ? (
                <>
                  <div
                    onClick={() => {
                      if (isSidebarCollapsed) {
                        setIsSidebarCollapsed(false);
                        setExpandedMenu(item.name);
                      } else {
                        if (expandedMenu === item.name) {
                          setExpandedMenu('');
                        } else {
                          setExpandedMenu(item.name);
                        }
                      }
                    }}
                    title={isSidebarCollapsed ? item.name : ''}
                    className={`flex items-center py-3 transition-all cursor-pointer ${
                      isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-6'
                    } ${
                      expandedMenu === item.name || window.location.pathname.startsWith(item.path)
                        ? 'text-primary dark:text-primary-fixed-dim font-semibold bg-surface-container scale-[0.98]'
                        : 'text-on-surface-variant dark:text-surface-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:bg-surface-container dark:hover:bg-surface-container-high'
                    }`}
                  >
                    <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center w-full relative' : ''}`}>
                      {item.subItems && item.subItems.some(sub => sub.badgeKey && badges[sub.badgeKey] > 0) && (
                        <span className={`w-2 h-2 rounded-full bg-error ${isSidebarCollapsed ? 'absolute left-4 top-1/2 -translate-y-1/2' : 'mr-2'}`}></span>
                      )}
                      <span className={`material-symbols-outlined ${isSidebarCollapsed ? '' : 'mr-3'}`}>{item.icon}</span>
                      {!isSidebarCollapsed && <span className="font-label-md text-label-md whitespace-nowrap">{item.name}</span>}
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="flex items-center">
                        <span className="material-symbols-outlined text-sm">
                          {expandedMenu === item.name ? 'expand_less' : 'expand_more'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {expandedMenu === item.name && !isSidebarCollapsed && (
                    <div className="bg-surface-container-low dark:bg-surface-container-high py-2 animate-fade-in">
                      {item.subItems.map((sub) => (
                        <NavLink
                          key={sub.name}
                          to={{ pathname: sub.path, search: sub.search }}
                          end={sub.search === ''}
                          className={({ isActive }) => {
                            const isSearchMatch = window.location.search === sub.search || (!window.location.search && sub.search === '');
                            return `flex items-center pl-14 pr-6 py-2 transition-all ${
                              isActive && isSearchMatch
                                ? 'text-primary dark:text-primary-fixed-dim font-semibold border-r-2 border-primary dark:border-primary-fixed-dim'
                                : 'text-on-surface-variant dark:text-surface-variant hover:text-primary'
                            }`;
                          }}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-label-md text-sm whitespace-nowrap">{sub.name}</span>
                            {sub.badgeKey && renderBadge(sub.badgeKey)}
                          </div>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <NavLink
                  to={item.path}
                  end={item.end}
                  title={isSidebarCollapsed ? item.name : ''}
                  onClick={(e) => {
                    if (isSidebarCollapsed) {
                      setIsSidebarCollapsed(false);
                    }
                  }}
                  className={({ isActive }) => 
                    `flex items-center py-3 transition-all ${
                      isSidebarCollapsed ? 'justify-center px-0' : 'px-6'
                    } ${
                      isActive 
                        ? 'text-primary dark:text-primary-fixed-dim font-semibold border-r-2 border-primary dark:border-primary-fixed-dim bg-surface-container scale-[0.98]'
                        : 'text-on-surface-variant dark:text-surface-variant hover:text-primary dark:hover:text-primary-fixed-dim hover:bg-surface-container dark:hover:bg-surface-container-high'
                    }`
                  }
                >
                  <div className="flex items-center justify-between w-full relative">
                    <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center w-full relative' : ''}`}>
                      {isSidebarCollapsed && item.badgeKey && badges[item.badgeKey] > 0 && (
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-error"></span>
                      )}
                      <span className={`material-symbols-outlined ${isSidebarCollapsed ? '' : 'mr-3'}`}>{item.icon}</span>
                      {!isSidebarCollapsed && <span className="font-label-md text-label-md whitespace-nowrap">{item.name}</span>}
                    </div>
                    {!isSidebarCollapsed && item.badgeKey && renderBadge(item.badgeKey)}
                  </div>
                </NavLink>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* TopNavBar Shell */}
      <header className={`flex justify-between items-center w-full px-gutter h-16 bg-surface-bright/90 dark:bg-surface-dim/90 backdrop-blur-md sticky top-0 z-40 border-b border-outline-variant dark:border-outline animate-fade-in transition-all duration-300 ${isSidebarCollapsed ? 'ml-20 max-w-[calc(100%-5rem)]' : 'ml-72 max-w-[calc(100%-18rem)]'}`}>
        <div className="flex items-center flex-1">
          {/* <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input 
              className="w-full bg-surface-container-low border-none rounded-full pl-10 pr-4 py-2 text-label-md focus:ring-1 focus:ring-primary-container focus:outline-none" 
              placeholder="Search analytics or customers..." 
              type="text"
            />
          </div> */}
        </div>
        <div className="flex items-center gap-6">
          {/* Icons removed per user request */}
          <div className="h-8 w-[1px] bg-outline-variant mx-2"></div>
          
          <div className="flex items-center gap-3 cursor-pointer relative hover:bg-gray-200 p-2 rounded-lg transition-colors" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <div className="text-right">
              <p className="font-label-md text-label-md font-bold text-primary">{user?.name || 'Admin'}</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">{user?.role === 'staff' ? 'Staff Member' : 'Salon Owner'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container overflow-hidden border border-outline-variant">
              <img 
                className="w-full h-full object-cover" 
                src={user?.avatar || (user?.role === 'admin' ? adminImg : profileImg)} 
                alt="Profile"
              />
            </div>

            {/* Dropdown for Profile & Logout */}
            <div className={`absolute right-0 top-full mt-2 transition-all duration-300 w-48 bg-surface border border-outline-variant/30 luxury-shadow ${isDropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
              {user?.role === 'staff' && (
                <button 
                  onClick={() => {
                    navigate('/admin/profile');
                    setIsDropdownOpen(false);
                  }} 
                  className="w-full text-left px-4 py-3 font-label-md text-on-surface hover:bg-surface-container flex items-center gap-2 border-b border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-[18px]">person</span>
                  Profile
                </button>
              )}
              <button 
                onClick={handleLogout} 
                className="w-full text-left px-4 py-3 font-label-md text-error hover:bg-error/5 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className={`p-gutter max-w-screen-xl animate-fade-in transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        <div className="pb-10 min-h-[50vh]">
          <Outlet />
        </div>
        
        <footer className="mt-48 border-t border-outline-variant/30 pt-6 pb-6 flex justify-between items-center opacity-60">
          <p className="font-label-sm text-label-sm">© 2024 Aura Luxury Salon Systems. All rights reserved.</p>
          <div className="flex gap-6 font-label-sm text-label-sm uppercase tracking-widest">
            <a className="hover:text-primary" href="#">Privacy</a>
            <a className="hover:text-primary" href="#">Security</a>
            <a className="hover:text-primary" href="#">Support</a>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default AdminLayout;
