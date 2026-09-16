import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { LogOut } from 'lucide-react';
import NotificationsPopover from '../web/NotificationsPopover';
import adminImg from '../../assets/admin.png';
import profileImg from '../../assets/profile.jpg';

const Navbar = () => {
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 py-4 glass border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-serif font-bold text-gray-900">
          Salon<span className="text-primary">System</span>
        </Link>
        <nav className="flex items-center gap-6 font-medium text-gray-700">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <Link to="/services" className="hover:text-primary transition-colors">Services</Link>
          <Link to="/gallery" className="hover:text-primary transition-colors">Gallery</Link>
          
          {isAuthenticated ? (
            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-gray-300 relative">
              <NotificationsPopover />
              
              <div className="relative">
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded-full transition-colors focus:outline-none"
                >
                  <img 
                    src={user?.avatar || (user?.role === 'admin' ? adminImg : profileImg)} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="text-sm hidden sm:inline font-medium text-gray-700">{user?.name || 'User'}</span>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-premium border border-gray-100 z-50 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                      <p className="text-sm font-semibold text-gray-900">{user?.name || 'User'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                    
                    <div className="py-2">
                      {user?.role === 'admin' || user?.role === 'staff' ? (
                        <Link to="/admin" onClick={() => setIsProfileOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors">
                          Admin Dashboard
                        </Link>
                      ) : (
                        <Link to="/profile" onClick={() => setIsProfileOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors">
                          My Profile
                        </Link>
                      )}
                      
                      <button 
                        onClick={() => {
                          setIsProfileOpen(false);
                          handleLogout();
                        }} 
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-gray-300">
              <Link to="/login" className="btn btn-outline py-2 px-4">Login</Link>
              <Link to="/register" className="btn btn-primary py-2 px-4">Book Now</Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
