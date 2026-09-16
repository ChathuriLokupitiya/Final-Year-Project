import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';

const CTASection = () => {
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadMenu = async () => {
    setIsDownloading(true);
    try {
      const [servicesRes, staffRes] = await Promise.all([
        api.get('/services?limit=1000'),
        api.get('/staff?limit=1000')
      ]);

      const services = servicesRes.data?.data || [];
      const staff = staffRes.data?.data || [];
      const consultants = staff.filter(s => s.isConsultant);

      // Create CSV content
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Services Section
      csvContent += "--- OUR SERVICES ---\n";
      csvContent += "Service Name,Category,Duration (mins),Price (LKR),Description\n";
      services.forEach(service => {
        const name = `"${(service.name || '').replace(/"/g, '""')}"`;
        const category = `"${(service.category?.name || service.category || '').replace(/"/g, '""')}"`;
        const desc = `"${(service.description || '').replace(/"/g, '""')}"`;
        csvContent += `${name},${category},${service.duration || ''},${service.price || ''},${desc}\n`;
      });

      csvContent += "\n\n";

      // Consultants Section
      csvContent += "--- OUR CONSULTANTS ---\n";
      csvContent += "Consultant Name,Specialization,Experience (Yrs)\n";
      consultants.forEach(consultant => {
        const name = `"${(consultant.user?.name || '').replace(/"/g, '""')}"`;
        const spec = `"${(consultant.specializations?.[0] || 'Consultant').replace(/"/g, '""')}"`;
        csvContent += `${name},${spec},${consultant.experience || 0}\n`;
      });

      // Trigger download
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "Aura_Salon_Menu.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("Failed to download menu", error);
      alert("Failed to download the menu. Please try again later.");
    } finally {
      setIsDownloading(false);
    }
  };
  return (
    <section className="py-section-gap-desktop relative overflow-hidden">
      <div className="absolute inset-0">
        <img alt="Atmospheric background" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBRjzDZ_ie6nYcozRDWECu59mIab_v-119fUEjp2OSxfTgG1KMISrsGojQxPAUS2kwhJGukxxeBfirbaqEB46bzsqttccw0c4VpWcFGID6k1zx37uaqn8zP9xmj-AmM8z1xlMbJWWgF7Am61L1SBmFdFToBaRUQPl-Ojw8GK5S_phPfnidS4AHa1EiJwLf5r0h7ed4NTYrfvHv6fKMyYxTHuR8a4sY8vv3cRlJwJ592L9zMDSx7fEONPqh3gAyVXRc576QyG5PfaZ8" />
        <div className="absolute inset-0 bg-surface/80"></div>
      </div>
      <div className="relative z-10 max-w-container-max-width mx-auto px-gutter text-center py-20">
        <h2 className="font-display-lg text-display-lg mb-8">Your Evolution Awaits</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant mb-12 max-w-2xl mx-auto">Step into a world of curated beauty and timeless elegance. Secure your session today and discover the Aura within.</p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <button 
            onClick={() => navigate('/services')}
            className="bg-on-surface text-surface px-12 py-6 font-label-md uppercase tracking-widest hover:bg-primary transition-all luxury-shadow transform hover:-translate-y-1"
          >
            Book Your Visit
          </button>
          <button 
            onClick={handleDownloadMenu}
            disabled={isDownloading}
            className="px-12 py-6 border border-on-surface font-label-md uppercase tracking-widest hover:bg-on-surface hover:text-surface transition-all disabled:opacity-50"
          >
            {isDownloading ? 'Generating...' : 'Download Menu'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
