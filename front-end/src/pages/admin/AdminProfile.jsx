import { useState, useRef, useEffect } from 'react';
import useAuthStore from '../../store/authStore';
import useAlertStore from '../../store/alertStore';
import api from '../../services/api';
import adminImg from '../../assets/admin.png';
import profileImg from '../../assets/profile.jpg';

const AdminProfile = () => {
  const { user, fetchUser } = useAuthStore();
  const { showAlert } = useAlertStore();
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    currentPassword: '',
    newPassword: '',
    bio: ''
  });

  useEffect(() => {
    if (user?.role === 'staff') {
      api.get('/staff/me/profile')
        .then(res => {
          const profile = res.data.data || res.data;
          setFormData(prev => ({
            ...prev,
            bio: profile.bio || ''
          }));
        })
        .catch(err => console.error('Failed to load staff profile:', err));
    }
  }, [user]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // First update profile info
      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      };
      
      await api.put('/users/profile', updateData);
      
      if (user?.role === 'staff') {
        await api.put('/staff/me/profile', {
          bio: formData.bio
        });
      }
      
      // If password is provided, change password
      if (formData.currentPassword && formData.newPassword) {
        await api.put('/auth/change-password', {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        });
        setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '' }));
      }
      
      // Refresh user store
      await fetchUser();
      showAlert('success', 'Success', 'Profile updated successfully');
    } catch (error) {
      showAlert('error', 'Error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append('avatar', file);

    setIsUploading(true);
    try {
      await api.post('/users/avatar', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchUser();
      showAlert('success', 'Success', 'Avatar updated successfully');
    } catch (error) {
      showAlert('error', 'Error', 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-serif text-secondary font-bold">My Profile</h1>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant p-8">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4 md:w-1/3">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-surface-container-low shadow-sm">
                <img 
                  src={user?.avatar || (user?.role === 'admin' ? adminImg : profileImg)} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 bg-black/40 text-white rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined mb-1">photo_camera</span>
                <span className="text-xs font-semibold">{isUploading ? 'Uploading...' : 'Change'}</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
            <div className="text-center">
              <h3 className="font-title-md font-semibold text-on-surface">{user?.name}</h3>
              <p className="text-sm text-on-surface-variant capitalize tracking-widest font-bold mt-1">{user?.role}</p>
            </div>
          </div>

          {/* Form Section */}
          <div className="flex-1">
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              
              <div className="space-y-4">
                <h2 className="font-title-sm font-semibold border-b border-outline-variant/30 pb-2">Personal Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-on-surface-variant">Full Name</label>
                    <input 
                      type="text" 
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-on-surface-variant">Phone Number</label>
                    <input 
                      type="tel" 
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface-variant">Email Address</label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    required
                  />
                </div>
                
                {user?.role === 'staff' && (
                  <div className="space-y-4 pt-4 mt-4 border-t border-outline-variant/30">
                    <h2 className="font-title-sm font-semibold mb-2">Professional Profile</h2>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-on-surface-variant">Bio</label>
                      <textarea 
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        rows="5"
                        placeholder="Share your expertise, philosophy, and what clients can expect..."
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4">
                <h2 className="font-title-sm font-semibold border-b border-outline-variant/30 pb-2">Security</h2>
                <p className="text-xs text-on-surface-variant mb-2">Leave blank if you do not wish to change your password.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-on-surface-variant">Current Password</label>
                    <input 
                      type="password" 
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-on-surface-variant">New Password</label>
                    <input 
                      type="password" 
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-end">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-semibold hover:bg-on-primary-container disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>

            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
