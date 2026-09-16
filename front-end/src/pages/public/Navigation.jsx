import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import notificationService from '../../services/notificationService';
import logo from '../../assets/logo_no_bg.png';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      notificationService.getNotifications({ limit: 5 })
        .then(res => {
          setNotifications(res.data.data || res.data || []);
          if (res.data.meta && res.data.meta.unreadCount !== undefined) {
            setUnreadCount(res.data.meta.unreadCount);
          } else {
            // fallback
            setUnreadCount(res.data.data?.filter(n => !n.isRead).length || 0);
          }
        })
        .catch(err => console.error(err));
    }
  }, [isAuthenticated]);

  const getLinkClasses = (path) => {
    const baseClasses = "font-label-md text-label-md uppercase tracking-widest transition-colors";
    const isActive = location.pathname.startsWith(path);
    
    if (isActive) {
      return `${baseClasses} text-primary border-b border-primary pb-1`;
    }
    return `${baseClasses} text-on-surface-variant hover:text-primary`;
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/90 glass-nav border-b border-outline-variant/30 h-20">
      <div className="flex justify-between items-center w-full px-gutter max-w-container-max-width mx-auto h-full">
        {/* Logo */}
        <Link to="/" className="flex items-center font-headline-md text-headline-md tracking-tighter text-on-surface uppercase">
          <img src={logo} alt="A" className="h-20 w-auto inline-block -mr-4" />
          <span className="relative z-10">ura</span>
        </Link>
        
        {/* Desktop Links */}
        <div className="hidden md:flex gap-10 items-center">
          <Link to="/services" className={getLinkClasses('/services')}>Services</Link>
          <Link to="/consultancy" className={getLinkClasses('/consultancy')}>Consultancy</Link>
          <Link to="/gallery" className={getLinkClasses('/gallery')}>Gallery</Link>
          <Link to="/about" className={getLinkClasses('/about')}>About</Link>
          <Link to="/contact" className={getLinkClasses('/contact')}>Contact</Link>
        </div>
        
        {/* Desktop CTA or Auth User Profile */}
        <div className="hidden md:flex items-center gap-6">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard/wishlist" className="text-on-surface hover:text-primary transition-colors flex items-center">
                <span className="material-symbols-outlined">favorite</span>
              </Link>
              <div className="relative group/notify">
                <button className="text-on-surface hover:text-primary transition-colors flex items-center relative py-2">
                  <span className="material-symbols-outlined">notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                <div className="absolute right-0 top-full mt-2 opacity-0 invisible group-hover/notify:opacity-100 group-hover/notify:visible transition-all duration-300 z-50">
                  <div className="bg-surface border border-outline-variant/30 luxury-shadow w-80 flex flex-col">
                    <div className="px-4 py-3 border-b border-outline-variant/30 font-label-md text-label-md uppercase tracking-widest text-on-surface bg-surface-container-low">
                      Notifications
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.slice(0, 5).map((notification) => (
                          <Link key={notification._id} to="/dashboard/notifications" className={`px-4 py-3 border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors block text-left ${!notification.isRead ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
                            <p className={`font-label-sm text-sm truncate ${!notification.isRead ? 'text-primary' : 'text-on-surface'}`}>{notification.title}</p>
                            <p className="font-body-sm text-xs text-secondary mt-1 line-clamp-2">{notification.message}</p>
                          </Link>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center text-secondary text-sm">
                          No new notifications
                        </div>
                      )}
                    </div>
                    <Link to="/dashboard/notifications" className="px-4 py-3 text-center font-label-sm text-label-sm uppercase tracking-widest text-primary hover:bg-primary-container hover:text-on-primary-container transition-colors border-t border-outline-variant/30">
                      View All
                    </Link>
                  </div>
                </div>
              </div>
              <div className="relative group">
                <button className="flex items-center gap-3 pl-4 border-l border-outline-variant/30 focus:outline-none">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant/50 group-hover:border-primary transition-colors">
                    <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || "G"}&background=775a19&color=fff`} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                  <span className="font-label-md text-label-md text-on-surface group-hover:text-primary transition-colors flex items-center gap-1">
                    {user?.name || "Profile"}
                    <span className="material-symbols-outlined text-[18px]">expand_more</span>
                  </span>
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 top-full pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                  <div className="bg-surface border border-outline-variant/30 luxury-shadow w-56 py-2 flex flex-col">
                    <Link to="/dashboard/profile" className="px-6 py-3 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors text-left flex items-center gap-3">
                      <span className="material-symbols-outlined text-[18px]">person</span>
                      Profile
                    </Link>
                    <Link to="/dashboard/appointments" className="px-6 py-3 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors text-left flex items-center gap-3">
                      <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                      Appointments
                    </Link>
                    <button onClick={clearAuth} className="px-6 py-3 font-label-sm text-label-sm uppercase tracking-widest text-error hover:bg-error/5 transition-colors text-left border-t border-outline-variant/30 mt-2 pt-4 flex items-center gap-3">
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <Link to="/login" className="flex items-center justify-center bg-on-surface text-surface px-8 py-3 font-label-md uppercase tracking-widest hover:bg-primary transition-all duration-300 transform hover:scale-105">
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button 
          className="md:hidden flex items-center justify-center p-2 text-on-surface"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="material-symbols-outlined text-3xl">
            {isOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-surface border-b border-outline-variant/30 luxury-shadow flex flex-col px-gutter py-6 gap-6">
          <Link to="/services" className={getLinkClasses('/services')} onClick={() => setIsOpen(false)}>Services</Link>
          <Link to="/consultancy" className={getLinkClasses('/consultancy')} onClick={() => setIsOpen(false)}>Consultancy</Link>
          <Link to="/gallery" className={getLinkClasses('/gallery')} onClick={() => setIsOpen(false)}>Gallery</Link>
          <Link to="/about" className={getLinkClasses('/about')} onClick={() => setIsOpen(false)}>About</Link>
          <Link to="/contact" className={getLinkClasses('/contact')} onClick={() => setIsOpen(false)}>Contact</Link>
          
          {isAuthenticated ? (
            <div className="flex flex-col gap-4 mt-2 pt-4 border-t border-outline-variant/30">
              <Link to="/dashboard/profile" className="flex items-center gap-3" onClick={() => setIsOpen(false)}>
                <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant/50">
                  <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || "G"}&background=775a19&color=fff`} alt="Profile" className="w-full h-full object-cover" />
                </div>
                <span className="font-label-md text-label-md text-on-surface">
                  {user?.name || "Profile"}
                </span>
              </Link>
              <Link to="/dashboard/wishlist" className="flex items-center gap-3 text-on-surface-variant font-label-md uppercase tracking-widest hover:text-primary transition-colors" onClick={() => setIsOpen(false)}>
                <span className="material-symbols-outlined">favorite</span>
                Wishlist
              </Link>
              <Link to="/dashboard/notifications" className="flex items-center gap-3 text-on-surface-variant font-label-md uppercase tracking-widest relative w-max hover:text-primary transition-colors" onClick={() => setIsOpen(false)}>
                <span className="material-symbols-outlined">notifications</span>
                Notifications
                <span className="absolute top-0 -right-2 w-2 h-2 bg-primary rounded-full"></span>
              </Link>
              <button onClick={() => { clearAuth(); setIsOpen(false); }} className="text-left font-label-md uppercase tracking-widest text-error mt-2">
                Sign Out
              </button>
            </div>
          ) : (
            <Link to="/register" className="w-full bg-on-surface text-surface px-8 py-4 mt-2 font-label-md uppercase tracking-widest hover:bg-primary transition-all text-center" onClick={() => setIsOpen(false)}>
              Sign Up
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navigation;
