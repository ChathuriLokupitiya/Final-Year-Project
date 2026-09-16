import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { API_URL } from '../../services/api';
import Navigation from '../public/Navigation';
import Footer from '../public/Footer';
import sideImage from '../../assets/galleyhero.jpeg';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', mobile: '', password: '', confirmPassword: '' });
  const [acceptedAgreements, setAcceptedAgreements] = useState(false);
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: false, error: '', success: '' });
    
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      return setStatus({ loading: false, error: 'Please fill in all required fields', success: '' });
    }

    if (!acceptedAgreements) {
      return setStatus({
        loading: false,
        error: 'Please agree to the Terms of Service and Privacy Policy to continue.',
        success: '',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return setStatus({ loading: false, error: 'Please enter a valid email address', success: '' });
    }

    if (formData.password.length < 8) {
      return setStatus({
        loading: false,
        error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
        success: '',
      });
    }

    if (formData.password !== formData.confirmPassword) {
      return setStatus({ loading: false, error: 'Passwords do not match', success: '' });
    }

    try {
      setStatus({ loading: true, error: '', success: '' });
      await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        phone: formData.mobile || undefined,
        password: formData.password,
        acceptAgreements: true,
      });
      
      setStatus({ loading: false, error: '', success: 'Registration successful! Please check your email to verify your account.' });
      
      setTimeout(() => {
        navigate('/login');
      }, 5000);
      
    } catch (error) {
      setStatus({ 
        loading: false, 
        error: error.response?.data?.message || error.response?.data?.errors?.[0]?.message || 'Registration failed',
        success: ''
      });
    }
  };

  return (
    <div className="bg-background text-on-background selection:bg-primary-fixed selection:text-on-primary-fixed">
      <Navigation />
      
      <main className="min-h-screen flex flex-col md:flex-row mt-20">
        {/* Left Side: Editorial Image */}
        <div className="hidden md:block w-1/2 relative overflow-hidden bg-surface-container-highest">
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 hover:scale-105" 
            style={{ backgroundImage: `url(${sideImage})` }}
          ></div>
          
          {/* Glassmorphism Overlay (Subtle) */}
          <div className="absolute bottom-12 left-12 right-12 p-8 backdrop-blur-xl bg-white/10 border border-white/20 luxury-shadow">
            <h2 className="font-headline-lg text-4xl md:text-headline-lg text-white mb-2">Curated Radiance</h2>
            <p className="font-body-md text-body-md text-white/80 max-w-md">
              Your journey to effortless sophistication begins here. Join our exclusive community for bespoke beauty expertise.
            </p>
          </div>
        </div>
        
        {/* Right Side: Registration Form */}
        <div className="w-full md:w-1/2 flex items-center justify-center bg-background px-margin-mobile py-12 md:px-gutter">
          <div className="max-w-md w-full animate-fade-in">
            <div className="mb-10 text-center md:text-left">
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-3xl md:text-headline-lg text-on-surface mb-3">Create Your Aura Account</h1>
              <p className="font-body-md text-body-md text-secondary">Enter the world of quiet luxury and refined beauty.</p>
            </div>

            {status.error && (
              <div className="bg-error-container text-on-error-container p-4 rounded-sm mb-6 text-sm font-label-md">
                {status.error}
              </div>
            )}
            
            {status.success && (
              <div className="bg-primary-container text-on-primary-container p-4 rounded-sm mb-6 text-sm font-label-md">
                {status.success}
              </div>
            )}

            <form className="space-y-7" onSubmit={handleSubmit}>
              {/* Full Name */}
              <div className="auth-field group">
                <label className="auth-label group-focus-within:text-primary transition-colors">Full Name</label>
                <input 
                  className="auth-input" 
                  placeholder="e.g., Julianne Moore" 
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              {/* Email Address */}
              <div className="auth-field group">
                <label className="auth-label group-focus-within:text-primary transition-colors">Email Address</label>
                <input 
                  className="auth-input" 
                  placeholder="julianne@aura-luxury.com" 
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              
              {/* Mobile Number */}
              <div className="auth-field group">
                <label className="auth-label group-focus-within:text-primary transition-colors">Mobile Number</label>
                <input 
                  className="auth-input" 
                  placeholder="+94 77 123 4567" 
                  type="tel"
                  name="mobile"
                  autoComplete="tel"
                  value={formData.mobile}
                  onChange={handleChange}
                />
              </div>
              
              {/* Password */}
              <div className="auth-field group">
                <label className="auth-label group-focus-within:text-primary transition-colors">Create Password</label>
                <div className="relative">
                  <input 
                    className="auth-input auth-input-with-icon" 
                    placeholder="••••••••••••" 
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    required
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

              {/* Confirm Password */}
              <div className="auth-field group">
                <label className="auth-label group-focus-within:text-primary transition-colors">Confirm Password</label>
                <div className="relative">
                  <input 
                    className="auth-input auth-input-with-icon" 
                    placeholder="••••••••••••" 
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
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
              
              {/* Terms & Privacy agreement — stored on user.agreements */}
              <div className="flex items-start gap-3 pt-2">
                <input 
                  className="mt-1 w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20 bg-transparent checked:bg-primary checked:border-primary transition-colors cursor-pointer" 
                  id="terms" 
                  type="checkbox"
                  checked={acceptedAgreements}
                  onChange={(e) => setAcceptedAgreements(e.target.checked)}
                  required
                />
                <label className="font-body-md text-label-md text-secondary leading-snug" htmlFor="terms">
                  I have read and agree to Aura’s{' '}
                  <Link className="text-primary hover:underline underline-offset-4" to="/terms" target="_blank" rel="noopener noreferrer">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link className="text-primary hover:underline underline-offset-4" to="/privacy" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>
              
              {/* Action Button */}
              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={status.loading || status.success || !acceptedAgreements}
                  className="w-full bg-primary-container text-on-primary-container py-5 rounded-none font-label-md text-label-md uppercase tracking-widest font-bold transition-all duration-300 hover:bg-primary hover:text-on-primary luxury-shadow active:scale-[0.98] disabled:opacity-70"
                >
                  {status.loading ? 'Creating Account...' : 'Begin Your Transformation'}
                </button>
              </div>
              
              <div className="flex items-center gap-4 my-6">
                <div className="h-px bg-outline-variant/30 flex-1"></div>
                <span className="font-label-sm text-label-sm uppercase text-outline tracking-widest">or</span>
                <div className="h-px bg-outline-variant/30 flex-1"></div>
              </div>
              
              <button 
                type="button"
                onClick={() => {
                  if (!acceptedAgreements) {
                    setStatus({
                      loading: false,
                      error: 'Please agree to the Terms of Service and Privacy Policy before continuing with Google.',
                      success: '',
                    });
                    return;
                  }
                  window.location.href = `${API_URL}/auth/google`;
                }}
                className="w-full border border-outline-variant py-4 flex items-center justify-center gap-3 transition-all duration-300 hover:bg-surface-container-low hover:border-primary group"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                </svg>
                <span className="font-label-md text-label-md uppercase tracking-widest text-on-surface group-hover:text-primary transition-colors">Sign up with Google</span>
              </button>
            </form>
            
            <div className="mt-10 text-center">
              <p className="font-body-md text-body-md text-secondary">
                Already have an account? 
                <Link className="text-primary font-semibold hover:underline underline-offset-4 ml-2" to="/login">Log in</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Register;
