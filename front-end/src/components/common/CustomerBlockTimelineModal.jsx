import { useState, useEffect } from 'react';
import api from '../../services/api';
import useAlertStore from '../../store/alertStore';

const CustomerBlockTimelineModal = ({ isOpen, onClose, customer }) => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useAlertStore();

  useEffect(() => {
    if (isOpen && customer) {
      fetchTimeline();
    }
  }, [isOpen, customer]);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/customers/${customer._id}/block-history`);
      setTimeline(res.data.data || res.data || []);
    } catch (error) {
      console.error("Failed to load timeline:", error);
      showAlert('error', 'Error', 'Failed to load customer block timeline');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-surface w-full max-w-2xl rounded-xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-serif font-bold text-secondary">Block History Timeline</h2>
            <p className="text-sm text-gray-500 mt-1">{customer?.name} ({customer?.email})</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading timeline...</div>
          ) : timeline.length === 0 ? (
            <div className="text-center py-10 text-gray-500 flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl mb-3 opacity-30">history</span>
              <p>No block history found for this customer.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-gray-200 ml-3 md:ml-6 space-y-8 pb-4">
              {timeline.map((item, index) => (
                <div key={item._id} className="relative pl-8 md:pl-10">
                  {/* Timeline dot */}
                  <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                    item.action === 'unblocked' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  
                  <div className="bg-white border border-gray-100 p-4 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium mb-2 ${
                          item.action === 'unblocked' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {item.action === 'unblocked' ? 'Unblocked' : 'Blocked'}
                        </span>
                        <h4 className="text-sm font-medium text-gray-800">
                          By: {item.admin ? item.admin.name : 'System Admin'}
                        </h4>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-4 bg-gray-50 px-2 py-1 rounded">
                        {new Date(item.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    
                    <div className="mt-3 bg-gray-50 p-3 rounded text-sm text-gray-600">
                      <span className="font-medium text-gray-700 text-xs uppercase tracking-wider block mb-1">Reason:</span>
                      {item.reason ? (
                        <p className="whitespace-pre-wrap">{item.reason}</p>
                      ) : (
                        <p className="italic text-gray-400">No reason provided.</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerBlockTimelineModal;
