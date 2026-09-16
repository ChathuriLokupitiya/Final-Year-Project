import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import Navigation from '../public/Navigation';
import Footer from '../public/Footer';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('Verifying your email...');
  const hasFetched = React.useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing verification token.');
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    const verifyAccount = async () => {
      try {
        const response = await api.get(`/auth/verify-email/${token}`);
        setStatus('success');
        setMessage(response.data?.message || 'Email verified successfully. You can now log in.');
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Failed to verify email. The link may be invalid or expired.');
      }
    };

    verifyAccount();
  }, [token]);

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-grow flex items-center justify-center p-8 mt-20">
        <div className="max-w-md w-full bg-surface p-12 text-center luxury-shadow border border-outline-variant/30 animate-fade-in">
          {status === 'verifying' && (
            <div className="flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl text-primary mb-6 animate-pulse">hourglass_empty</span>
              <h2 className="font-headline-md text-2xl text-on-surface mb-4 uppercase tracking-widest">Verifying</h2>
              <p className="font-body-md text-secondary">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center">
              <span className="material-symbols-outlined text-5xl text-primary mb-6">check_circle</span>
              <h2 className="font-headline-md text-2xl text-on-surface mb-4 uppercase tracking-widest">Verified</h2>
              <p className="font-body-md text-secondary mb-8">{message}</p>
              
              <Link 
                to="/login"
                className="w-full bg-on-surface text-surface font-label-md text-label-md uppercase tracking-widest py-4 hover:bg-primary transition-all duration-300 block luxury-shadow"
              >
                Proceed to Login
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center">
              <span className="material-symbols-outlined text-5xl text-error mb-6">error</span>
              <h2 className="font-headline-md text-2xl text-on-surface mb-4 uppercase tracking-widest">Verification Failed</h2>
              <p className="font-body-md text-secondary mb-8">{message}</p>
              
              <Link 
                to="/register"
                className="w-full bg-surface border border-outline-variant text-on-surface font-label-md text-label-md uppercase tracking-widest py-4 hover:bg-surface-container-low transition-all duration-300 block"
              >
                Return to Registration
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VerifyEmail;
