import { useState, useRef, useEffect } from 'react';
import useAuthStore from '../../../store/authStore';
import userService from '../../../services/userService';
import useAlertStore from '../../../store/alertStore';
import profileImg from '../../../assets/profile.jpg';

const DashboardProfile = () => {
  const { user, fetchUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);
  const { showAlert, showConfirm } = useAlertStore();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    }
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        gender: user.gender || '',
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || '',
          country: user.address?.country || ''
        }
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value
      }));
    }
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full Name is required.';
    } else if (formData.name.trim().length < 2 || formData.name.trim().length > 50) {
      newErrors.name = 'Name must be between 2 and 50 characters.';
    }

    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^\+?[\d\s-]{10,15}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        newErrors.phone = 'Please enter a valid phone number.';
      }
    }

    if (formData.dateOfBirth) {
      const selectedDate = new Date(formData.dateOfBirth);
      const today = new Date();
      if (selectedDate > today) {
        newErrors.dateOfBirth = 'Date of birth cannot be in the future.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    showConfirm(
      "Save Profile",
      "Are you sure you want to save these changes to your profile?",
      async () => {
        setIsLoading(true);
        try {
          await userService.updateMyProfile(formData);
          await fetchUser();
          setIsEditing(false);
          showAlert('success', 'Profile Updated', 'Your profile information has been saved successfully.');
        } catch (error) {
          console.error('Error updating profile:', error);
          showAlert('error', 'Update Failed', error.response?.data?.message || 'Failed to update profile.');
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAvatarLoading(true);
    const formDataObj = new FormData();
    formDataObj.append('avatar', file);

    try {
      await userService.uploadMyAvatar(formDataObj);
      await fetchUser();
      showAlert('success', 'Avatar Updated', 'Your profile picture has been updated successfully.');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      showAlert('error', 'Upload Failed', error.response?.data?.message || 'Failed to upload avatar.');
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-8 border-b border-outline-variant/30 pb-4">
        <div>
          <h1 className="font-headline-md text-3xl text-on-surface uppercase tracking-widest mb-2">My Profile</h1>
          <p className="font-body-md text-secondary">Manage your personal information and preferences.</p>
        </div>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="bg-primary-container text-on-primary-container px-6 py-2 font-label-md uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-colors luxury-shadow"
          >
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-4">
            <button 
              onClick={() => {
                setIsEditing(false);
                setErrors({});
                if (user) {
                  setFormData({
                    name: user.name || '',
                    phone: user.phone || '',
                    gender: user.gender || '',
                    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
                    address: {
                      street: user.address?.street || '',
                      city: user.address?.city || '',
                      state: user.address?.state || '',
                      zipCode: user.address?.zipCode || '',
                      country: user.address?.country || ''
                    }
                  });
                }
              }}
              className="border border-outline px-6 py-2 font-label-md uppercase tracking-widest hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-primary text-on-primary px-6 py-2 font-label-md uppercase tracking-widest hover:bg-primary/90 transition-colors luxury-shadow disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          {!isEditing ? (
            <div className="space-y-6">
              <div className="flex flex-col">
                <span className="font-label-sm uppercase tracking-widest text-outline mb-1">Full Name</span>
                <span className="font-body-lg text-on-surface">{user?.name || 'Not provided'}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm uppercase tracking-widest text-outline mb-1">Email Address</span>
                <span className="font-body-lg text-on-surface">{user?.email || 'Not provided'}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm uppercase tracking-widest text-outline mb-1">Mobile Number</span>
                <span className="font-body-lg text-on-surface">{user?.phone || 'Not provided'}</span>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <span className="font-label-sm uppercase tracking-widest text-outline mb-1">Gender</span>
                  <span className="font-body-lg text-on-surface capitalize">{user?.gender || 'Not provided'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm uppercase tracking-widest text-outline mb-1">Date of Birth</span>
                  <span className="font-body-lg text-on-surface">
                    {user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Not provided'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm uppercase tracking-widest text-outline mb-1">Address</span>
                <span className="font-body-lg text-on-surface">
                  {[user?.address?.street, user?.address?.city, user?.address?.state, user?.address?.zipCode, user?.address?.country].filter(Boolean).join(', ') || 'Not provided'}
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-label-sm uppercase tracking-widest text-outline">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`bg-surface-container-lowest border ${errors.name ? 'border-red-500' : 'border-outline-variant'} px-4 py-2 text-on-surface focus:outline-none focus:border-primary`}
                    required
                  />
                  {errors.name && <span className="text-red-500 text-xs mt-1">{errors.name}</span>}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label-sm uppercase tracking-widest text-outline">Email Address</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-surface-container border border-outline-variant px-4 py-2 text-on-surface/50 cursor-not-allowed"
                  />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="font-label-sm uppercase tracking-widest text-outline">Mobile Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`bg-surface-container-lowest border ${errors.phone ? 'border-red-500' : 'border-outline-variant'} px-4 py-2 text-on-surface focus:outline-none focus:border-primary`}
                  />
                  {errors.phone && <span className="text-red-500 text-xs mt-1">{errors.phone}</span>}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label-sm uppercase tracking-widest text-outline">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="bg-surface-container-lowest border border-outline-variant px-4 py-2 text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label-sm uppercase tracking-widest text-outline">Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className={`bg-surface-container-lowest border ${errors.dateOfBirth ? 'border-red-500' : 'border-outline-variant'} px-4 py-2 text-on-surface focus:outline-none focus:border-primary`}
                  />
                  {errors.dateOfBirth && <span className="text-red-500 text-xs mt-1">{errors.dateOfBirth}</span>}
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant/30">
                <h3 className="font-headline-sm mb-4">Address Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="font-label-sm uppercase tracking-widest text-outline">Street Address</label>
                    <input
                      type="text"
                      name="address.street"
                      value={formData.address.street}
                      onChange={handleChange}
                      className="bg-surface-container-lowest border border-outline-variant px-4 py-2 text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-label-sm uppercase tracking-widest text-outline">City</label>
                    <input
                      type="text"
                      name="address.city"
                      value={formData.address.city}
                      onChange={handleChange}
                      className="bg-surface-container-lowest border border-outline-variant px-4 py-2 text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-label-sm uppercase tracking-widest text-outline">State/Province</label>
                    <input
                      type="text"
                      name="address.state"
                      value={formData.address.state}
                      onChange={handleChange}
                      className="bg-surface-container-lowest border border-outline-variant px-4 py-2 text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-label-sm uppercase tracking-widest text-outline">ZIP/Postal Code</label>
                    <input
                      type="text"
                      name="address.zipCode"
                      value={formData.address.zipCode}
                      onChange={handleChange}
                      className="bg-surface-container-lowest border border-outline-variant px-4 py-2 text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-label-sm uppercase tracking-widest text-outline">Country</label>
                    <input
                      type="text"
                      name="address.country"
                      value={formData.address.country}
                      onChange={handleChange}
                      className="bg-surface-container-lowest border border-outline-variant px-4 py-2 text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="flex flex-col items-center justify-start border border-outline-variant/30 p-8 bg-surface-container-lowest luxury-shadow h-fit">
          <div className="w-40 h-40 rounded-full overflow-hidden mb-6 border-4 border-surface luxury-shadow relative group">
            {avatarLoading ? (
              <div className="w-full h-full flex items-center justify-center bg-surface-container">
                <span className="material-symbols-outlined animate-spin text-primary">sync</span>
              </div>
            ) : (
              <img 
                src={user?.avatar || profileImg} 
                alt="Profile avatar" 
                className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-75"
              />
            )}
            <div 
              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
            </div>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarChange} 
            className="hidden" 
            accept="image/jpeg,image/png,image/webp,image/jpg"
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarLoading}
            className="text-primary font-label-md uppercase tracking-widest hover:text-primary-container transition-colors disabled:opacity-50"
          >
            {avatarLoading ? 'Uploading...' : 'Change Avatar'}
          </button>
          
          <p className="text-xs text-secondary text-center mt-4 font-body-sm">
            Allowed formats: JPG, PNG, WEBP.<br/>Max size: 5MB.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardProfile;
