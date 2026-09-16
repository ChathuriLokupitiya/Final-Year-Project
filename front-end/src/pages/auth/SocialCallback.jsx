import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const SocialCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken, fetchUser } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      
      if (token) {
        // 1. Save the token in Zustand and LocalStorage
        setToken(token);
        
        // 2. Fetch the user details using the new token
        await fetchUser();
        
        // 3. Redirect to profile/dashboard
        // If we want to dynamically route based on role, we would read the user state after fetchUser,
        // but for now, sending them to the profile page is a safe default. 
        // Protected routes handle redirecting non-admins away from admin areas anyway.
        navigate('/profile');
      } else {
        // If there's no token, redirect back to login
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate, setToken, fetchUser]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
      <h2 className="text-xl font-serif text-gray-800">Authenticating...</h2>
      <p className="text-gray-500 mt-2">Please wait while we log you in securely.</p>
    </div>
  );
};

export default SocialCallback;
