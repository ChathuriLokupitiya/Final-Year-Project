import { useState } from 'react';
import api from '../../../services/api';
import useAlertStore from '../../../store/alertStore';
import contactHero from '../../../assets/contatct.jpg';

const ContactSection = () => {
  const { showAlert } = useAlertStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    serviceInterest: 'General Inquiry',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      showAlert('error', 'Error', 'Please fill in all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showAlert('error', 'Error', 'Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/inquiries', formData);
      showAlert('success', 'Success', 'Your inquiry has been submitted successfully.');
      setFormData({
        name: '',
        email: '',
        serviceInterest: 'General Inquiry',
        message: ''
      });
    } catch (error) {
      showAlert('error', 'Error', error.response?.data?.message || 'Failed to submit inquiry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="max-w-container-max-width mx-auto px-margin-mobile md:px-gutter py-section-gap-desktop">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
        {/* Studio Details & Map */}
        <div className="lg:col-span-5 space-y-16 reveal-on-scroll">
          <div className="space-y-8">
            <div className="flex items-start space-x-6 group">
              <div className="w-12 h-12 flex items-center justify-center border border-outline-variant/40 rounded-full group-hover:border-primary transition-colors duration-500">
                <span className="material-symbols-outlined text-primary">location_on</span>
              </div>
              <div>
                <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-secondary mb-2">The Studio</h3>
                <p className="font-headline-sm text-2xl md:text-headline-sm">15 Galle Face Centre Rd<br/>Colombo 03, Sri Lanka</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-6 group">
              <div className="w-12 h-12 flex items-center justify-center border border-outline-variant/40 rounded-full group-hover:border-primary transition-colors duration-500">
                <span className="material-symbols-outlined text-primary">schedule</span>
              </div>
              <div>
                <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-secondary mb-2">Availability</h3>
                <p className="font-body-lg text-body-lg">Monday – Saturday<br/>10:00 AM – 8:00 PM</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-6 group">
              <div className="w-12 h-12 flex items-center justify-center border border-outline-variant/40 rounded-full group-hover:border-primary transition-colors duration-500">
                <span className="material-symbols-outlined text-primary">call</span>
              </div>
              <div>
                <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-secondary mb-2">Connect</h3>
                <p className="font-body-lg text-body-lg">+94 11 234 5678</p>
                <p className="font-body-lg text-body-lg text-primary underline underline-offset-4 decoration-outline-variant hover:decoration-primary cursor-pointer transition-all">concierge@aura.lk</p>
              </div>
            </div>
          </div>
          
          {/* Map Placeholder */}
          <div className="relative aspect-video w-full bg-surface-container-low overflow-hidden group">
            <div 
              className="absolute inset-0 grayscale contrast-75 opacity-60 mix-blend-multiply transition-all duration-700 group-hover:opacity-80 bg-cover bg-center" 
              style={{ backgroundImage: `url(${contactHero})` }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-4 h-4 bg-primary rounded-full"></div>
              </div>
            </div>
            <div className="absolute bottom-6 left-6 p-4 shadow-sm border border-outline-variant/20 bg-surface/80 backdrop-blur-md">
              <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface">View on Google Maps</p>
            </div>
          </div>
        </div>
        
        {/* Inquiry Form */}
        <div className="lg:col-span-7 bg-white p-8 md:p-16 shadow-premium border border-outline-variant/20 reveal-on-scroll">
          <h2 className="font-headline-md text-3xl md:text-headline-md mb-2">Inquiry Form</h2>
          <p className="font-body-md text-body-md text-secondary mb-12">Submit your details below and our concierge will contact you within 24 hours.</p>
          
          <form className="space-y-10" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="relative group">
                <label className="font-label-sm text-label-sm uppercase tracking-widest text-secondary mb-2 block group-focus-within:text-primary transition-colors duration-300">Full Name</label>
                <input 
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-transparent border-0 border-b border-outline-variant focus:border-primary focus:ring-0 px-3 py-3 transition-all font-body-md" 
                  placeholder="e.g. Amaya Perera" 
                  type="text" 
                />
              </div>
              <div className="relative group">
                <label className="font-label-sm text-label-sm uppercase tracking-widest text-secondary mb-2 block group-focus-within:text-primary transition-colors duration-300">Email Address</label>
                <input 
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-transparent border-0 border-b border-outline-variant focus:border-primary focus:ring-0 px-3 py-3 transition-all font-body-md" 
                  placeholder="email@address.com" 
                  type="email" 
                />
              </div>
            </div>
            
            <div className="relative group">
              <label className="font-label-sm text-label-sm uppercase tracking-widest text-secondary mb-2 block group-focus-within:text-primary transition-colors duration-300">Service Interest</label>
              <select 
                name="serviceInterest"
                value={formData.serviceInterest}
                onChange={handleChange}
                className="w-full bg-transparent border-0 border-b border-outline-variant focus:border-primary focus:ring-0 px-3 py-3 transition-all font-body-md appearance-none"
              >
                <option value="General Inquiry">General Inquiry</option>
                <option value="Bespoke Hair Styling">Bespoke Hair Styling</option>
                <option value="Signature Facial Rituals">Signature Facial Rituals</option>
                <option value="Luxe Bridal Consultancy">Luxe Bridal Consultancy</option>
                <option value="Skin Longevity Programs">Skin Longevity Programs</option>
              </select>
              <div className="absolute right-0 bottom-3 pointer-events-none">
                <span className="material-symbols-outlined text-secondary">keyboard_arrow_down</span>
              </div>
            </div>
            
            <div className="relative group">
              <label className="font-label-sm text-label-sm uppercase tracking-widest text-secondary mb-2 block group-focus-within:text-primary transition-colors duration-300">Your Message</label>
              <textarea 
                required
                name="message"
                value={formData.message}
                onChange={handleChange}
                className="w-full bg-transparent border-0 border-b border-outline-variant focus:border-primary focus:ring-0 px-3 py-3 transition-all font-body-md resize-none" 
                placeholder="Describe your beauty goals or specific requirements..." 
                rows="4"
              ></textarea>
            </div>
            
            <div className="pt-6">
              <button 
                disabled={isSubmitting}
                className="group relative w-full md:w-auto bg-primary text-on-primary px-12 py-5 font-label-md text-label-md uppercase tracking-widest overflow-hidden transition-all duration-500 hover:shadow-lg disabled:opacity-70" 
                type="submit"
              >
                <span className="relative z-10">{isSubmitting ? 'Submitting...' : 'Submit Inquiry'}</span>
                <div className="absolute inset-0 bg-on-primary-container translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
