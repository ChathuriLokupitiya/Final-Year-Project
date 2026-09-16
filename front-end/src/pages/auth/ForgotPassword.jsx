import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import Navigation from '../public/Navigation';
import Footer from '../public/Footer';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });
  const [timer, setTimer] = useState(60);
  
  const navigate = useNavigate();

  // Handle countdown timer
  useEffect(() => {
    let interval = null;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleResendOTP = async () => {
    if (timer > 0) return;
    setStatus({ loading: true, error: '', success: '' });
    try {
      await api.post('/auth/forgot-password', { email });
      setStatus({ loading: false, error: '', success: 'A new OTP has been sent to your email.' });
      setTimer(60);
    } catch (error) {
      setStatus({ 
        loading: false, 
        error: error.response?.data?.message || 'Failed to resend OTP.', 
        success: '' 
      });
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) return setStatus({ error: 'Email is required', loading: false, success: '' });
    
    setStatus({ loading: true, error: '', success: '' });
    try {
      await api.post('/auth/forgot-password', { email });
      setStatus({ loading: false, error: '', success: 'OTP sent to your email.' });
      setStep(2);
    } catch (error) {
      setStatus({ 
        loading: false, 
        error: error.response?.data?.message || 'Failed to send OTP.', 
        success: '' 
      });
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp) return setStatus({ error: 'OTP is required', loading: false, success: '' });
    
    setStatus({ loading: true, error: '', success: '' });
    try {
      const response = await api.post('/auth/verify-otp', { email, otp });
      setResetToken(response.data.data.resetToken);
      setStatus({ loading: false, error: '', success: '' });
      setStep(3);
    } catch (error) {
      setStatus({ 
        loading: false, 
        error: error.response?.data?.message || 'Invalid or expired OTP.', 
        success: '' 
      });
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return setStatus({ error: 'Passwords do not match', loading: false, success: '' });
    }
    if (passwords.newPassword.length < 6) {
      return setStatus({ error: 'Password must be at least 6 characters', loading: false, success: '' });
    }
    
    setStatus({ loading: true, error: '', success: '' });
    try {
      await api.post('/auth/reset-password', { 
        resetToken, 
        newPassword: passwords.newPassword 
      });
      
      setStatus({ loading: false, error: '', success: 'Password reset successfully! Redirecting to login...' });
      
      setTimeout(() => {
        navigate('/login');
      }, 2500);
      
    } catch (error) {
      const data = error.response?.data;
      const errorMsg = data?.errors?.length > 0 
        ? data.errors[0].message 
        : data?.message || 'Failed to reset password.';
        
      setStatus({ 
        loading: false, 
        error: errorMsg, 
        success: '' 
      });
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md selection:bg-primary-container/30 min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-grow flex flex-col md:flex-row mt-20">
        {/* Left Side: Editorial Imagery */}
        <div className="hidden md:block md:w-1/2 relative overflow-hidden bg-surface">
          <div className="absolute inset-0 bg-black/10 z-10 pointer-events-none"></div>
          <img 
            alt="Minimalist abstract texture" 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAMxMniJkm-jq1nRj8V9grRgy1glcC7DMdoAdvJNqjsRQcOkNuoGcyTsOedsf8N_J6tcbpQvml45Eq3lUkKOBWgiCqE3ELcMy2gk88FReRdCMSVIN0EuVqCnk0F4GkjJ9X2i8Sg4MiO1LFKS4kuTWhwtuu0vmLxddUdp0DY9vya7OiM46AmJ3509z38lYkIdxH0JCR0c_lLRfedImWkd_V8_6KicL9wPmRqpWKrR1-svXbUNv7a_O89iQOaZtHCSiI8Xie3zuhNzYg"
          />
          <div className="absolute bottom-12 left-12 z-20 max-w-sm">
            <h2 className="font-headline-lg text-4xl md:text-headline-lg text-white mb-4 leading-tight">
              Restore Your <br/>Access
            </h2>
            <p className="font-body-md text-white/80">
              A seamless process to regain entry to your curated dashboard and bespoke services.
            </p>
          </div>
        </div>
        
        {/* Right Side: Flow Forms */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-24 bg-surface">
          <div className="w-full max-w-md animate-fade-in">
            <div className="mb-12">
              <span className="font-label-sm text-label-sm uppercase text-primary tracking-[0.2em] mb-4 block">Account Recovery</span>
              <h1 className="font-headline-lg text-4xl md:text-headline-lg text-on-surface mb-2">
                {step === 1 ? 'Forgot Password' : step === 2 ? 'Verify OTP' : 'New Password'}
              </h1>
              <p className="font-body-md text-secondary">
                {step === 1 
                  ? 'Enter your email address and we will send you a one-time passcode.' 
                  : step === 2 
                  ? `Enter the 6-digit code sent to ${email}`
                  : 'Create a new, secure password for your account.'
                }
              </p>
            </div>

            {status.error && (
              <div className="bg-error-container text-on-error-container p-4 rounded-sm mb-6 text-sm font-label-md animate-fade-in">
                {status.error}
              </div>
            )}
            
            {status.success && (
              <div className="bg-primary-container text-on-primary-container p-4 rounded-sm mb-6 text-sm font-label-md animate-fade-in">
                {status.success}
              </div>
            )}

            {/* Step 1: Email */}
            {step === 1 && (
              <form className="space-y-8 animate-fade-in" onSubmit={handleSendOTP}>
                <div className="group">
                  <label className="font-label-sm text-label-sm uppercase text-outline mb-2 block transition-all duration-300 group-focus-within:text-primary group-focus-within:tracking-[0.2em]">
                    Email Address
                  </label>
                  <input 
                    className="w-full bg-transparent border-b border-outline-variant py-3 px-0 font-body-md text-on-surface focus:outline-none focus:border-primary transition-all duration-300 placeholder:text-outline/40" 
                    type="email"
                    placeholder="name@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                
                <div className="pt-6">
                  <button 
                    type="submit"
                    disabled={status.loading}
                    className="w-full bg-on-surface text-surface font-label-md text-label-md uppercase tracking-widest py-5 hover:bg-primary transition-all duration-500 luxury-shadow flex items-center justify-center gap-3 disabled:opacity-70"
                  >
                    <span>{status.loading ? 'Sending...' : 'Send Recovery Code'}</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: OTP */}
            {step === 2 && (
              <form className="space-y-8 animate-fade-in" onSubmit={handleVerifyOTP}>
                <div className="group relative">
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-label-sm text-label-sm uppercase text-outline transition-all duration-300 group-focus-within:text-primary group-focus-within:tracking-[0.2em]">
                      One-Time Passcode (OTP)
                    </label>
                    <button 
                      type="button"
                      disabled={timer > 0}
                      onClick={handleResendOTP}
                      className="font-label-sm text-label-sm uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-primary hover:text-primary-container"
                    >
                      {timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}
                    </button>
                  </div>
                  <input 
                    className="w-full bg-transparent border-b border-outline-variant py-3 px-0 font-headline-md tracking-widest text-on-surface focus:outline-none focus:border-primary transition-all duration-300 placeholder:text-outline/40 text-center" 
                    type="text"
                    placeholder="000000" 
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                
                <div className="pt-6 space-y-4">
                  <button 
                    type="submit"
                    disabled={status.loading}
                    className="w-full bg-on-surface text-surface font-label-md text-label-md uppercase tracking-widest py-5 hover:bg-primary transition-all duration-500 luxury-shadow flex items-center justify-center gap-3 disabled:opacity-70"
                  >
                    <span>{status.loading ? 'Verifying...' : 'Verify Code'}</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setStep(1); setStatus({ loading: false, error: '', success: '' }); }}
                    className="w-full text-secondary font-label-sm uppercase tracking-widest hover:text-primary transition-colors py-2"
                  >
                    Use a different email
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: New Password */}
            {step === 3 && (
              <form className="space-y-8 animate-fade-in" onSubmit={handleResetPassword}>
                <div className="group">
                  <label className="font-label-sm text-label-sm uppercase text-outline mb-2 block transition-all duration-300 group-focus-within:text-primary group-focus-within:tracking-[0.2em]">
                    New Password
                  </label>
                  <div className="relative">
                    <input 
                      className="w-full bg-transparent border-b border-outline-variant py-3 px-0 font-body-md text-on-surface focus:outline-none focus:border-primary transition-all duration-300 pr-10" 
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••" 
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})}
                      required
                      autoFocus
                    />
                    <span 
                      className="material-symbols-outlined absolute right-0 top-3 text-secondary cursor-pointer hover:text-on-surface"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </div>
                </div>

                <div className="group">
                  <label className="font-label-sm text-label-sm uppercase text-outline mb-2 block transition-all duration-300 group-focus-within:text-primary group-focus-within:tracking-[0.2em]">
                    Confirm New Password
                  </label>
                  <input 
                    className="w-full bg-transparent border-b border-outline-variant py-3 px-0 font-body-md text-on-surface focus:outline-none focus:border-primary transition-all duration-300" 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••" 
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})}
                    required
                  />
                </div>
                
                <div className="pt-6">
                  <button 
                    type="submit"
                    disabled={status.loading || status.success}
                    className="w-full bg-primary-container text-white font-label-md text-label-md uppercase tracking-widest py-5 hover:bg-primary transition-all duration-500 luxury-shadow flex items-center justify-center gap-3 disabled:opacity-70"
                  >
                    <span>{status.loading ? 'Updating...' : 'Reset Password'}</span>
                    <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                  </button>
                </div>
              </form>
            )}
            
            <div className="mt-12 text-center">
              <Link className="font-label-sm uppercase tracking-widest text-secondary hover:text-primary transition-colors flex items-center justify-center gap-2" to="/login">
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ForgotPassword;
