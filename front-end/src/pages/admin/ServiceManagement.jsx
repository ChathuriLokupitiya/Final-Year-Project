import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import useAlertStore from '../../store/alertStore';
import useAuthStore from '../../store/authStore';
import ViewDetailsModal from '../../components/common/ViewDetailsModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ServiceManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const rawActions = user?.permissions?.actions || {};
  const currentTabActions = Array.isArray(rawActions) ? rawActions : (rawActions['Services'] || []);
  const canAdd = isAdmin || currentTabActions.includes('Add');
  const canEdit = isAdmin || currentTabActions.includes('Edit');
  const canDelete = isAdmin || currentTabActions.includes('Delete');
  const canView = isAdmin || currentTabActions.includes('View');

  const [activeTab, setActiveTab] = useState('services'); // 'services' | 'categories'
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Service Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Category Modal States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCategoryEditMode, setIsCategoryEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const { showAlert, showConfirm } = useAlertStore();

  const fileInputRef = useRef(null);
  const [imagePreviews, setImagePreviews] = useState([]);
  
  const [selectedService, setSelectedService] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCategoryViewModalOpen, setIsCategoryViewModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    category: '',
    description: '',
    price: '',
    discountPrice: '',
    duration: '',
    tags: '',
    isActive: true,
    isConsultation: false,
    existingImages: [],
    images: [] // Used to hold new files
  });

  const [categoryFormData, setCategoryFormData] = useState({
    id: null,
    name: '',
    description: '',
    isActive: true
  });

  const fetchServices = async () => {
    setLoading(true);
    try {
      const [servicesRes, categoriesRes] = await Promise.all([
        api.get('/admin/services'),
        api.get('/categories?all=true')
      ]);
      setServices(servicesRes.data.data || servicesRes.data || []);
      setCategories(categoriesRes.data.data || []);
    } catch (error) {
      console.error("Failed to load data:", error);
      showAlert('error', 'Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleCategoryInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCategoryFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFileChange = async (e) => {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length === 0) return;

    const validFiles = [];
    for (const file of newFiles) {
      const isValid = await new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(img.src);
          const ratio = img.width / img.height;
          // Allow minor rounding tolerance (e.g., 900/600 = 1.5)
          resolve(Math.abs(ratio - 1.5) < 0.05);
        };
        img.onerror = () => resolve(false);
      });

      if (isValid) {
        validFiles.push(file);
      } else {
        showAlert('error', 'Invalid Resolution', `"${file.name}" rejected. Please use exactly a 3:2 aspect ratio (e.g., 900x600 px).`);
      }
    }

    if (validFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    
    setFormData(prev => {
      const combinedFiles = [...prev.images, ...validFiles];
      const totalImages = (prev.existingImages?.length || 0) + combinedFiles.length;
      
      if (totalImages > 5) {
        showAlert('error', 'Limit Exceeded', 'You can only have a maximum of 5 images per service.');
        if (fileInputRef.current) fileInputRef.current.value = "";
        return prev;
      }
      
      setImagePreviews(combinedFiles.map(file => URL.createObjectURL(file)));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return { ...prev, images: combinedFiles };
    });
  };

  const handleRemoveNewImage = (index) => {
    setFormData(prev => {
      const updatedImages = [...prev.images];
      updatedImages.splice(index, 1);
      
      const updatedPreviews = [...imagePreviews];
      URL.revokeObjectURL(updatedPreviews[index]); // free memory
      updatedPreviews.splice(index, 1);
      setImagePreviews(updatedPreviews);
      
      return { ...prev, images: updatedImages };
    });
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setFormData({ id: null, name: '', category: '', description: '', price: '', discountPrice: '', duration: '', tags: '', isActive: true, isConsultation: false, existingImages: [], images: [] });
    setImagePreviews([]);
    if(fileInputRef.current) fileInputRef.current.value = "";
    setIsModalOpen(true);
  };

  const openEditModal = (service) => {
    setIsEditMode(true);
    setFormData({
      id: service._id,
      name: service.name,
      category: service.category?._id || service.category || '',
      description: service.description,
      price: service.price,
      discountPrice: service.discountPrice ?? '',
      duration: service.duration,
      tags: service.tags?.join(', ') || '',
      isActive: service.isActive !== undefined ? service.isActive : true,
      isConsultation: !!service.isConsultation,
      existingImages: service.images || [],
      images: []
    });
    setImagePreviews([]);
    if(fileInputRef.current) fileInputRef.current.value = "";
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let savedService;
      const data = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        price: parseFloat(formData.price),
        discountPrice:
          formData.discountPrice === '' || formData.discountPrice == null
            ? null
            : parseFloat(formData.discountPrice),
        duration: parseInt(formData.duration, 10),
        isActive: formData.isActive,
        isConsultation: !!formData.isConsultation,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      };

      if (isEditMode) {
        const updateRes = await api.put(`/services/${formData.id}`, data);
        savedService = updateRes.data.data;
      } else {
        const res = await api.post('/services', data);
        savedService = res.data.data;
      }

      // Handle Image Upload if any
      if (formData.images.length > 0 && savedService) {
        const imageFormData = new FormData();
        formData.images.forEach((file) => {
          imageFormData.append('images', file);
        });
        
        await api.post(`/services/${savedService._id}/images`, imageFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      showAlert('success', 'Success', isEditMode ? 'Service updated successfully' : 'Service created successfully');
      closeModal();
      fetchServices();
    } catch (error) {
      console.error(error);
      showAlert('error', 'Error', error.response?.data?.message || 'Failed to save service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    showConfirm(
      "Delete Service",
      "Are you sure you want to delete this service? This will deactivate it.",
      async () => {
        try {
          await api.delete(`/services/${id}`);
          showAlert('success', 'Deleted', 'Service deleted successfully');
          fetchServices();
        } catch (error) {
          showAlert('error', 'Error', 'Failed to delete service');
        }
      }
    );
  };

  const handleDeleteImage = async (imageUrl) => {
    showConfirm(
      "Delete Image",
      "Are you sure you want to delete this image? This action cannot be undone.",
      async () => {
        try {
          await api.delete(`/services/${formData.id}/images`, {
            data: { imageUrl }
          });
          setFormData(prev => ({
            ...prev,
            existingImages: prev.existingImages.filter(img => img !== imageUrl)
          }));
          showAlert('success', 'Success', 'Image deleted successfully');
          fetchServices();
        } catch (error) {
          console.error(error);
          showAlert('error', 'Error', 'Failed to delete image');
        }
      }
    );
  };

  const openCategoryAddModal = () => {
    setIsCategoryEditMode(false);
    setCategoryFormData({ id: null, name: '', description: '', isActive: true });
    setIsCategoryModalOpen(true);
  };

  const openCategoryEditModal = (cat) => {
    setIsCategoryEditMode(true);
    setCategoryFormData({ id: cat._id, name: cat.name, description: cat.description || '', isActive: cat.isActive !== false });
    setIsCategoryModalOpen(true);
  };

  const closeCategoryModal = () => setIsCategoryModalOpen(false);

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = { name: categoryFormData.name, description: categoryFormData.description, isActive: categoryFormData.isActive };
      if (isCategoryEditMode) {
        await api.put(`/categories/${categoryFormData.id}`, data);
      } else {
        await api.post('/categories', data);
      }
      showAlert('success', 'Success', isCategoryEditMode ? 'Category updated' : 'Category created');
      closeCategoryModal();
      fetchServices();
    } catch (error) {
      showAlert('error', 'Error', error.response?.data?.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCategoryDelete = (id) => {
    showConfirm("Delete Category", "Are you sure? This will deactivate the category.", async () => {
      try {
        await api.delete(`/categories/${id}`);
        showAlert('success', 'Deleted', 'Category deleted successfully');
        fetchServices();
      } catch (error) {
        showAlert('error', 'Error', 'Failed to delete category');
      }
    });
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-3xl font-serif text-secondary font-bold">Manage Services</h1>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
            <input 
              type="text" 
              placeholder="Search by name or category..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary text-sm bg-white"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {canAdd && (
            <button onClick={activeTab === 'services' ? openAddModal : openCategoryAddModal} className="btn btn-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">add</span>
              {activeTab === 'services' ? 'Add New Service' : 'Add New Category'}
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('services')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'services' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Services
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'categories' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Categories
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <LoadingSpinner text={`Loading ${activeTab}...`} />
        ) : activeTab === 'services' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm">
                  <th className="px-6 py-4 font-medium">Service Name</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Duration(mins)</th>
                  <th className="px-6 py-4 font-medium">Price(LKR)</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.filter(service => {
                  if (statusFilter === 'active' && service.isActive === false) return false;
                  if (statusFilter === 'inactive' && service.isActive !== false) return false;
                  
                  if (searchQuery) {
                    const query = searchQuery.toLowerCase();
                    const nameMatch = service.name?.toLowerCase().includes(query);
                    const catMatch = (service.category?.name || service.category || '').toLowerCase().includes(query);
                    return nameMatch || catMatch;
                  }
                  
                  return true;
                }).length > 0 ? (
                  services.filter(service => {
                    if (statusFilter === 'active' && service.isActive === false) return false;
                    if (statusFilter === 'inactive' && service.isActive !== false) return false;
                    
                    if (searchQuery) {
                      const query = searchQuery.toLowerCase();
                      const nameMatch = service.name?.toLowerCase().includes(query);
                      const catMatch = (service.category?.name || service.category || '').toLowerCase().includes(query);
                      return nameMatch || catMatch;
                    }
                    
                    return true;
                  }).map((service) => (
                    <tr key={service._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                        {service.images && service.images.length > 0 && (
                          <img src={service.images[0]} alt={service.name} className="w-10 h-10 rounded-md object-cover" />
                        )}
                        {canView ? (
                          <button 
                            onClick={() => { setSelectedService(service); setIsViewModalOpen(true); }}
                            className="text-primary hover:underline font-medium text-left focus:outline-none"
                          >
                            {service.name}
                          </button>
                        ) : (
                          service.name
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 capitalize">{service.category?.name || service.category || 'General'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{service.duration}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {service.discountPrice != null && service.discountPrice < service.price ? (
                          <span>
                            <span className="text-primary font-medium">LKR {service.discountPrice?.toFixed(0)}</span>
                            <span className="ml-2 text-xs text-gray-400 line-through">LKR {service.price?.toFixed(0)}</span>
                          </span>
                        ) : (
                          <>LKR {service.price?.toFixed(2)}</>
                        )}
                        {service.isConsultation && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-primary">Consult</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${service.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {service.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          {canEdit && (
                            <button
                              type="button"
                              title="Edit"
                              aria-label="Edit"
                              onClick={() => openEditModal(service)}
                              className="inline-flex items-center justify-center p-1.5 text-primary hover:bg-primary/10 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[20px]">edit</span>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              title="Delete"
                              aria-label="Delete"
                              onClick={() => handleDelete(service._id)}
                              className="inline-flex items-center justify-center p-1.5 text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      {services.length === 0 ? "No services found." : "No services match the selected filter."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm">
                  <th className="px-6 py-4 font-medium">Category Name</th>
                  <th className="px-6 py-4 font-medium">Description</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.filter(cat => {
                  if (statusFilter === 'active' && cat.isActive === false) return false;
                  if (statusFilter === 'inactive' && cat.isActive !== false) return false;
                  
                  if (searchQuery) {
                    const query = searchQuery.toLowerCase();
                    return cat.name?.toLowerCase().includes(query) || cat.description?.toLowerCase().includes(query);
                  }
                  return true;
                }).length > 0 ? (
                  categories.filter(cat => {
                    if (statusFilter === 'active' && cat.isActive === false) return false;
                    if (statusFilter === 'inactive' && cat.isActive !== false) return false;
                    
                    if (searchQuery) {
                      const query = searchQuery.toLowerCase();
                      return cat.name?.toLowerCase().includes(query) || cat.description?.toLowerCase().includes(query);
                    }
                    return true;
                  }).map((cat) => (
                    <tr key={cat._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {canView ? (
                          <button 
                            onClick={() => { setSelectedCategory(cat); setIsCategoryViewModalOpen(true); }}
                            className="text-primary hover:underline font-medium text-left focus:outline-none"
                          >
                            {cat.name}
                          </button>
                        ) : (
                          cat.name
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm max-w-[300px] truncate">{cat.description || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {cat.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          {canEdit && (
                            <button
                              type="button"
                              title="Edit"
                              aria-label="Edit"
                              onClick={() => openCategoryEditModal(cat)}
                              className="inline-flex items-center justify-center p-1.5 text-primary hover:bg-primary/10 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[20px]">edit</span>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              title="Delete"
                              aria-label="Delete"
                              onClick={() => handleCategoryDelete(cat._id)}
                              className="inline-flex items-center justify-center p-1.5 text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                      {categories.length === 0 ? "No categories found." : "No categories match the selected filter."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg p-6 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif text-secondary">{isEditMode ? 'Edit Service' : 'Add New Service'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name} 
                  onChange={handleInputChange}
                  required 
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={formData.category} 
                  onChange={handleInputChange}
                  required 
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3" 
                >
                  <option value="">Select a Category</option>
                  {categories.map((c, i) => (
                    <option key={c._id || i} value={c._id || c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  name="description"
                  value={formData.description} 
                  onChange={handleInputChange}
                  required 
                  rows="3"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (LKR)</label>
                  <input 
                    type="number" 
                    name="price"
                    value={formData.price} 
                    onChange={handleInputChange}
                    min="0" step="0.01" required 
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price (LKR)</label>
                  <input 
                    type="number" 
                    name="discountPrice"
                    value={formData.discountPrice} 
                    onChange={handleInputChange}
                    min="0" step="0.01"
                    placeholder="Optional"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (mins)</label>
                  <input 
                    type="number" 
                    name="duration"
                    value={formData.duration} 
                    onChange={handleInputChange}
                    min="1" required 
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3" 
                  />
                </div>
                <div className="flex flex-col justify-end gap-2 pb-1">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      name="isConsultation"
                      checked={!!formData.isConsultation}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    Consultation service
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                <input 
                  type="text" 
                  name="tags"
                  value={formData.tags} 
                  onChange={handleInputChange}
                  placeholder="e.g. Popular, New, Relaxing"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3" 
                />
              </div>

              {isEditMode && (
                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-md border border-gray-100">
                  <label className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      name="isActive"
                      checked={formData.isActive} 
                      onChange={handleInputChange}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-opacity-50"
                    />
                    Service is Active
                  </label>
                  <span className="text-xs text-gray-500">
                    (Inactive services will not be bookable by customers)
                  </span>
                </div>
              )}

              <div>
                <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-md border border-blue-100 flex items-start gap-2 mb-4">
                  <span className="material-symbols-outlined text-[18px] mt-0.5">info</span>
                  <p>For the best visual experience on the customer site, we recommend uploading images with a <strong>3:2 aspect ratio</strong> (e.g., 900x600 pixels).</p>
                </div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Images {isEditMode && '(Adding new images will append them)'}
                </label>
                <input 
                  type="file" 
                  multiple
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm mb-2" 
                />
                {formData.existingImages && formData.existingImages.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">Existing Images</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.existingImages.map((imgUrl, index) => (
                        <div key={index} className="relative w-16 h-16 rounded overflow-hidden border border-gray-200">
                          <img src={imgUrl} alt={`existing ${index}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleDeleteImage(imgUrl)}
                            className="absolute top-1 right-1 bg-white text-red-500 rounded-full w-5 h-5 flex items-center justify-center shadow hover:bg-red-50 transition-colors z-10"
                            title="Delete image"
                          >
                            <span className="material-symbols-outlined text-[14px] font-bold">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {imagePreviews.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">New Images</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative w-16 h-16 rounded overflow-hidden border border-gray-200">
                          <img src={preview} alt={`preview ${index}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveNewImage(index)}
                            className="absolute top-1 right-1 bg-white text-red-500 rounded-full w-5 h-5 flex items-center justify-center shadow hover:bg-red-50 transition-colors z-10"
                            title="Remove new image"
                          >
                            <span className="material-symbols-outlined text-[14px] font-bold">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary flex items-center justify-center min-w-[120px]">
                  {submitting ? <span className="material-symbols-outlined animate-spin mr-2">autorenew</span> : null}
                  {submitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Add Service')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ViewDetailsModal 
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Service Details"
        data={selectedService ? {
          Name: selectedService.name,
          Category: selectedService.category?.name || selectedService.category,
          Description: selectedService.description,
          Price: selectedService.price,
          'Duration (mins)': selectedService.duration,
          'Is Active': selectedService.isActive,
          'Available Staff': selectedService.availableStaff?.map(staff => staff.user?.name || 'Unknown Staff').join(', ') || 'None',
          'Average Rating': selectedService.averageRating ? `${selectedService.averageRating} (${selectedService.totalReviews} reviews)` : 'No ratings yet',
          Tags: selectedService.tags?.join(', '),
          Images: selectedService.images,
        } : null}
      />

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif text-secondary">{isCategoryEditMode ? 'Edit Category' : 'Add New Category'}</h2>
              <button onClick={closeCategoryModal} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={categoryFormData.name} 
                  onChange={handleCategoryInputChange}
                  required 
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea 
                  name="description"
                  value={categoryFormData.description} 
                  onChange={handleCategoryInputChange}
                  rows="3"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3" 
                />
              </div>

              {isCategoryEditMode && (
                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-md border border-gray-100">
                  <label className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      name="isActive"
                      checked={categoryFormData.isActive} 
                      onChange={handleCategoryInputChange}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-opacity-50"
                    />
                    Category is Active
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={closeCategoryModal} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary flex items-center justify-center min-w-[120px]">
                  {submitting ? <span className="material-symbols-outlined animate-spin mr-2">autorenew</span> : null}
                  {submitting ? 'Saving...' : (isCategoryEditMode ? 'Save Changes' : 'Add Category')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ViewDetailsModal 
        isOpen={isCategoryViewModalOpen}
        onClose={() => setIsCategoryViewModalOpen(false)}
        title="Category Details"
        data={selectedCategory ? {
          'Category Name': selectedCategory.name,
          Description: selectedCategory.description || '-',
          'Is Active': selectedCategory.isActive,
          'Created At': new Date(selectedCategory.createdAt).toLocaleDateString(),
        } : null}
      />
    </div>
  );
};

export default ServiceManagement;
