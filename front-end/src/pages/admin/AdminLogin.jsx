import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import logo from '../../assets/logo_no_bg.png';

const AdminLogin = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  
  const navigate = useNavigate();
  const { login, error: storeError, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    // If already logged in and is admin/staff, go to admin dashboard
    if (isAuthenticated && user) {
      if (['admin', 'staff'].includes(user.role)) {
        navigate('/admin');
      } else {
        // Customer shouldn't be here, send to customer dashboard
        navigate('/dashboard/profile');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLocalError('');

    const result = await login(formData);
    
    if (result.success) {
      // Get the latest user from the store
      const loggedInUser = useAuthStore.getState().user;
      
      if (loggedInUser && ['admin', 'staff'].includes(loggedInUser.role)) {
        navigate('/admin');
      } else {
        // User is a customer. Log them out and show error.
        await useAuthStore.getState().clearAuth();
        setLocalError('Access Denied. This portal is for administrative staff only.');
        setIsSubmitting(false);
      }
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-highest flex items-center justify-center p-4 font-body-md animate-fade-in relative overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-surface border-b border-outline-variant/30 hidden md:block"></div>
      
      <div className="bg-surface luxury-shadow w-full max-w-md p-8 md:p-12 relative z-10 border border-outline-variant/30">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 bg-surface-container-low rounded-full flex items-center justify-center mb-4 luxury-shadow border border-outline-variant/50">
            <img src={logo} alt="AURA Admin" className="w-20 h-auto" />
          </div>
          <h1 className="font-headline-md text-2xl uppercase tracking-widest text-on-surface text-center">
            Staff Portal
          </h1>
          <p className="font-label-sm tracking-widest text-secondary mt-2 uppercase">Authorized Access Only</p>
        </div>

        {(localError || storeError) && (
          <div className="bg-error/10 border-l-4 border-error p-4 mb-6">
            <p className="text-error font-body-sm">{localError || storeError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-label-sm uppercase tracking-widest text-secondary mb-2" htmlFor="email">
              Staff Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-surface-container-lowest border border-outline-variant px-4 py-3 text-on-surface focus:outline-none focus:border-primary transition-colors font-body-md"
              required
            />
          </div>

          <div>
            <label className="block font-label-sm uppercase tracking-widest text-secondary mb-2" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-surface-container-lowest border border-outline-variant px-4 py-3 pr-12 text-on-surface focus:outline-none focus:border-primary transition-colors font-body-md"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-on-surface text-surface py-4 font-label-md uppercase tracking-widest hover:bg-primary transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-4 luxury-shadow flex justify-center items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                Authenticating...
              </>
            ) : (
              'Secure Login'
            )}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-outline-variant/30 text-center">
          <p className="font-label-sm text-outline uppercase tracking-widest">Aura Salone Internal System</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
