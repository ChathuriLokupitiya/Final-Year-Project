import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useAlertStore from '../../store/alertStore';
import { API_URL } from '../../services/api';
import Navigation from '../public/Navigation';
import Footer from '../public/Footer';
import loginImage from '../../assets/login.jpg';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, error } = useAuthStore();
  const { showAlert } = useAlertStore();
  const navigate = useNavigate();
  const location = useLocation();
  const alertShownRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('error') === 'blocked' && !alertShownRef.current) {
      alertShownRef.current = true;
      showAlert('error', 'Access Denied', 'your acc has be blocked ples contatc our team');
      // Remove query param to avoid repeat alerts
      navigate('/login', { replace: true });
    } else if (params.get('error') === 'auth_failed' && !alertShownRef.current) {
      alertShownRef.current = true;
      showAlert('error', 'Login Failed', 'Authentication with Google failed. Please try again.');
      navigate('/login', { replace: true });
    }
  }, [location.search, navigate, showAlert]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setIsSubmitting(true);
    
    if (!formData.email || !formData.password) {
      setIsSubmitting(false);
      return setLocalError('Please fill in all fields');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setIsSubmitting(false);
      return setLocalError('Please enter a valid email address');
    }

    const result = await login(formData);
    
    if (result.success) {
      navigate('/dashboard/profile'); // Redirect to profile page after login
    } else {
      setIsSubmitting(false);
      // Check if the error is the blocked account error
      if (result.error && result.error.includes('blocked')) {
        showAlert('error', 'Access Denied', result.error);
      }
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md selection:bg-primary-container/30">
      <Navigation />
      
      <main className="min-h-[calc(100vh-80px)] flex flex-col md:flex-row mt-20">
        {/* Left Side: Architectural Imagery */}
        <div className="hidden md:block md:w-1/2 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/5 z-10 pointer-events-none"></div>
          <img 
            alt="Minimalist architectural interior" 
            className="w-full h-full object-cover" 
            src={loginImage}
          />
          {/* Branding Overlay */}
          <div className="absolute bottom-12 left-12 z-20 max-w-sm">
            <h2 className="font-headline-lg text-4xl md:text-headline-lg text-white mb-4 leading-tight">
              Curation of <br/>Modern Beauty
            </h2>
            <p className="font-body-md text-white/80">
              Experience the intersection of architectural serenity and expert salon consultancy.
            </p>
          </div>
        </div>
        
        {/* Right Side: Login Form */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-24 bg-surface">
          <div className="w-full max-w-md">
            <div className="mb-12">
              <span className="font-label-sm text-label-sm uppercase text-primary tracking-[0.2em] mb-4 block">Welcome Back</span>
              <h1 className="font-headline-lg text-4xl md:text-headline-lg text-on-surface mb-2">Enter Aura</h1>
              <p className="font-body-md text-secondary">Please sign in to access your curated dashboard.</p>
            </div>

            {((error && !error.includes('blocked')) || localError) && (
              <div className="bg-error-container text-on-error-container p-4 rounded-sm mb-6 text-sm font-label-md">
                {(error && !error.includes('blocked')) ? error : localError}
              </div>
            )}

            <form className="space-y-7" onSubmit={handleSubmit}>
              {/* Email Input */}
              <div className="auth-field group">
                <label 
                  className="auth-label group-focus-within:text-primary transition-colors" 
                  htmlFor="email"
                >
                  Email Address
                </label>
                <input 
                  className="auth-input" 
                  id="email" 
                  name="email" 
                  placeholder="name@example.com" 
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              
              {/* Password Input */}
              <div className="auth-field group">
                <div className="flex justify-between items-center gap-4">
                  <label 
                    className="auth-label group-focus-within:text-primary transition-colors mb-0" 
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <Link className="font-label-sm text-label-sm uppercase text-primary-container hover:text-primary transition-colors shrink-0" to="/forgot-password">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <input 
                    className="auth-input auth-input-with-icon" 
                    id="password" 
                    name="password" 
                    placeholder="••••••••" 
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-secondary cursor-pointer hover:text-on-surface bg-transparent border-0 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </button>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="pt-6 space-y-6">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary-container text-white font-label-md text-label-md uppercase tracking-widest py-5 hover:bg-primary transition-all duration-500 luxury-shadow flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  <span>{isSubmitting ? 'Authenticating...' : 'Enter Aura'}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
                
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-outline-variant/30"></div>
                  <span className="flex-shrink mx-4 font-label-sm text-label-sm text-outline/50 uppercase tracking-widest">or</span>
                  <div className="flex-grow border-t border-outline-variant/30"></div>
                </div>
                
                <button 
                  type="button"
                  onClick={() => window.location.href = `${API_URL}/auth/google`}
                  className="w-full bg-surface border border-secondary/20 text-secondary font-label-md text-label-md uppercase tracking-widest py-5 hover:bg-surface-container-low transition-all duration-500 flex items-center justify-center gap-4"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"></path>
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>
            </form>
            
            <div className="mt-12 text-center">
              <p className="font-body-md text-secondary">
                New to Aura? 
                <Link className="text-primary-container font-semibold hover:underline underline-offset-8 transition-all ml-2" to="/register">Create an account</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Login;
