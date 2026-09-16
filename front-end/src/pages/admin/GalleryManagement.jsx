import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import useAlertStore from '../../store/alertStore';
import useAuthStore from '../../store/authStore';
import ViewDetailsModal from '../../components/common/ViewDetailsModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const GalleryManagement = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const rawActions = user?.permissions?.actions || {};
  const currentTabActions = Array.isArray(rawActions) ? rawActions : (rawActions['Gallery'] || []);
  const canAdd = isAdmin || currentTabActions.includes('Add');
  const canEdit = isAdmin || currentTabActions.includes('Edit');
  const canDelete = isAdmin || currentTabActions.includes('Delete');
  const canView = isAdmin || currentTabActions.includes('View');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showAlert, showConfirm } = useAlertStore();

  const beforeInputRef = useRef(null);
  const afterInputRef = useRef(null);
  const [previews, setPreviews] = useState({ beforeImage: null, afterImage: null });
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    id: null,
    title: '',
    description: '',
    type: '',
    beforeImage: null,
    afterImage: null,
  });

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const res = await api.get('/gallery');
      setItems(res.data.data || res.data || []);
    } catch (error) {
      console.error("Failed to load gallery:", error);
      showAlert('error', 'Error', 'Failed to load gallery items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e, field) => {
    const file = e.target.files[0];
    if (file) {
      const isValid = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const ratio = img.width / img.height;
          if (ratio < 0.78 || ratio > 0.82) {
            showAlert('error', 'Invalid Resolution', 'Please upload images with a 4:5 aspect ratio (e.g., 800x1000).');
            resolve(false);
          } else {
            resolve(true);
          }
        };
        img.onerror = () => resolve(false);
        img.src = URL.createObjectURL(file);
      });

      if (!isValid) {
        e.target.value = '';
        return;
      }

      setFormData(prev => ({ ...prev, [field]: file }));
      setPreviews(prev => ({ ...prev, [field]: URL.createObjectURL(file) }));
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setFormData({ id: null, title: '', description: '', type: '', tags: '', beforeImage: null, afterImage: null });
    setPreviews({ beforeImage: null, afterImage: null });
    if (beforeInputRef.current) beforeInputRef.current.value = "";
    if (afterInputRef.current) afterInputRef.current.value = "";
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setIsEditMode(true);
    setFormData({ 
      id: item._id, 
      title: item.title, 
      description: item.description || '', 
      type: item.type, 
      tags: item.tags?.join(', ') || '',
      beforeImage: null, 
      afterImage: null 
    });
    setPreviews({ beforeImage: item.beforeImage, afterImage: item.afterImage });
    if (beforeInputRef.current) beforeInputRef.current.value = "";
    if (afterInputRef.current) afterInputRef.current.value = "";
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('type', formData.type);
      
      const tagsArray = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      data.append('tags', JSON.stringify(tagsArray));
      
      if (formData.beforeImage) data.append('before', formData.beforeImage);
      if (formData.afterImage) data.append('after', formData.afterImage);

      if (isEditMode) {
        await api.put(`/gallery/${formData.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showAlert('success', 'Success', 'Gallery item updated successfully');
      } else {
        await api.post('/gallery', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showAlert('success', 'Success', 'Gallery item uploaded successfully');
      }
      
      closeModal();
      fetchGallery();
    } catch (error) {
      console.error(error);
      showAlert('error', 'Error', error.response?.data?.message || 'Failed to upload gallery item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    showConfirm(
      "Delete Item",
      "Are you sure you want to delete this gallery item?",
      async () => {
        try {
          await api.delete(`/gallery/${id}`);
          showAlert('success', 'Deleted', 'Gallery item deleted successfully');
          fetchGallery();
        } catch (error) {
          showAlert('error', 'Error', 'Failed to delete gallery item');
        }
      }
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-serif text-secondary font-bold">Manage Gallery</h1>
        {canAdd && (
          <button onClick={openAddModal} className="btn btn-primary">Add Before/After Card</button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Loading gallery..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm">
                  <th className="px-6 py-4 font-medium">Title</th>
                  <th className="px-6 py-4 font-medium">Images</th>
                  <th className="px-6 py-4 font-medium">Description</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Tags</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length > 0 ? (
                  items.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {canView ? (
                          <button 
                            onClick={() => { setSelectedItem(item); setIsViewModalOpen(true); }}
                            className="text-primary hover:underline font-medium text-left focus:outline-none"
                          >
                            {item.title}
                          </button>
                        ) : (
                          item.title
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {item.beforeImage && (
                            <img src={item.beforeImage} alt="before" className="w-12 h-12 rounded object-cover border border-gray-200" title="Before" />
                          )}
                          {item.afterImage && (
                            <img src={item.afterImage} alt="after" className="w-12 h-12 rounded object-cover border border-gray-200" title="After" />
                          )}
                          {item.image && (
                            <img src={item.image} alt="single" className="w-12 h-12 rounded object-cover border border-gray-200" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{item.description}</td>
                      <td className="px-6 py-4">
                        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium capitalize">
                          {item.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {item.tags && item.tags.length > 0 ? (
                            item.tags.map((tag, idx) => (
                              <span key={idx} className="bg-gray-100 text-gray-600 border border-gray-200 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs italic">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          {canEdit && (
                            <button
                              type="button"
                              title="Edit"
                              aria-label="Edit"
                              onClick={() => openEditModal(item)}
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
                              onClick={() => handleDelete(item._id)}
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
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No gallery items found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg p-6 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif text-secondary">{isEditMode ? 'Edit Gallery Item' : 'Add Gallery Item'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input 
                  type="text" 
                  name="title"
                  value={formData.title} 
                  onChange={handleInputChange}
                  required 
                  placeholder="e.g. Balayage Transformation"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category (e.g. Wedding, Hair, Nails)</label>
                <input 
                  type="text" 
                  name="type"
                  value={formData.type} 
                  onChange={handleInputChange}
                  required 
                  placeholder="e.g. Wedding"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea 
                  name="description"
                  value={formData.description} 
                  onChange={handleInputChange}
                  rows="2"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                <input 
                  type="text" 
                  name="tags"
                  value={formData.tags} 
                  onChange={handleInputChange}
                  placeholder="e.g. balayage, blonde, summer"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3" 
                />
              </div>

              <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-md border border-blue-100 flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] mt-0.5">info</span>
                <p>For the best visual experience in the customer gallery, we recommend uploading images with a <strong>4:5 aspect ratio</strong> (e.g., 800x1000 pixels).</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Before Image</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    ref={beforeInputRef}
                    onChange={(e) => handleFileChange(e, 'beforeImage')}
                    required={!isEditMode}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm bg-gray-50 mb-2" 
                  />
                  {previews.beforeImage && (
                    <div className="relative w-full aspect-[4/5] bg-gray-100 rounded border border-gray-200 overflow-hidden">
                      <img src={previews.beforeImage} alt="Before preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">After Image</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    ref={afterInputRef}
                    onChange={(e) => handleFileChange(e, 'afterImage')}
                    required={!isEditMode}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm bg-gray-50 mb-2" 
                  />
                  {previews.afterImage && (
                    <div className="relative w-full aspect-[4/5] bg-gray-100 rounded border border-gray-200 overflow-hidden">
                      <img src={previews.afterImage} alt="After preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary flex items-center justify-center min-w-[120px]">
                  {submitting ? <span className="material-symbols-outlined animate-spin mr-2">autorenew</span> : null}
                  {submitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Upload Images')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ViewDetailsModal 
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Gallery Details"
        data={selectedItem}
      />
    </div>
  );
};

export default GalleryManagement;
