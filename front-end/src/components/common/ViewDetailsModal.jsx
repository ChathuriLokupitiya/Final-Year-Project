import React from 'react';

const ViewDetailsModal = ({ isOpen, onClose, title, data }) => {
  if (!isOpen || !data) return null;

  // Filter out sensitive or internal fields
  const getFilteredData = (obj) => {
    if (!obj || typeof obj !== 'object') return {};
    const filtered = {};
    Object.keys(obj).forEach((key) => {
      // Exclude MongoDB internal fields, passwords, etc.
      if (
        ['password', 'refreshToken', '__v', 'emailVerificationToken', 'emailVerificationExpires', 'passwordResetToken', 'passwordResetExpires', 'passwordResetOTP', 'permissions', 'updatedAt'].includes(key)
      ) {
        return;
      }
      filtered[key] = obj[key];
    });
    return filtered;
  };

  const filteredData = getFilteredData(data);

  // Helper to format values
  const renderValue = (value) => {
    if (value === null || value === undefined) return <span className="text-gray-400 italic">Not set</span>;
    
    if (typeof value === 'boolean') {
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {value ? 'Yes' : 'No'}
        </span>
      );
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-gray-400 italic">Empty list</span>;
      
      const isImageArray = value.every(item => typeof item === 'string' && (item.match(/^https?:\/\/.*\.(jpeg|jpg|gif|png|webp)/i) || item.includes('ui-avatars.com') || item.includes('googleusercontent') || item.includes('cloudinary')));
      
      if (isImageArray) {
        return (
          <div className="flex flex-wrap gap-2 mt-2">
            {value.map((item, index) => (
              <a key={index} href={item} target="_blank" rel="noopener noreferrer">
                <img src={item} alt={`preview ${index}`} className="w-20 h-20 rounded-lg border border-gray-200 object-cover hover:opacity-80 transition-opacity" />
              </a>
            ))}
          </div>
        );
      }

      return (
        <ul className="list-disc list-inside space-y-1">
          {value.map((item, index) => (
            <li key={index}>
              {renderValue(item)}
            </li>
          ))}
        </ul>
      );
    }

    if (typeof value === 'object') {
      // Handle Date objects if any (though JSON parse usually gives strings, just in case)
      if (value instanceof Date) return value.toLocaleString();
      
      return (
        <div className="bg-gray-50 p-3 rounded-md border border-gray-100 mt-1">
          {Object.keys(value).map((subKey) => {
            // Ignore _id fields in sub-objects to keep it clean, unless it's the only thing
            if (subKey === '_id' && Object.keys(value).length > 1) return null;
            return (
              <div key={subKey} className="grid grid-cols-3 gap-2 py-1 border-b border-gray-100 last:border-0">
                <span className="text-sm font-medium text-gray-500 capitalize">{subKey.replace(/([A-Z])/g, ' $1').trim()}</span>
                <div className="col-span-2 text-sm text-gray-900 break-words">
                  {renderValue(value[subKey])}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Try to parse string as Date if it looks like ISO string
    if (typeof value === 'string') {
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
      if (isoRegex.test(value)) {
        return new Date(value).toLocaleString();
      }
      
      // Handle image URLs nicely
      if (value.match(/^https?:\/\/.*\.(jpeg|jpg|gif|png|webp)/i) || value.includes('ui-avatars.com') || value.includes('googleusercontent')) {
        return (
          <div className="mt-2">
            <img src={value} alt="Attachment" className="max-h-32 rounded-lg border border-gray-200 object-cover" />
          </div>
        );
      }
    }

    return <span className="break-words">{String(value)}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-2xl font-serif font-bold text-gray-800">{title}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-4 no-scrollbar">
          {Object.keys(filteredData).length === 0 ? (
            <div className="text-center text-gray-500 py-8">No details available.</div>
          ) : (
            (() => {
              const keys = Object.keys(filteredData);
              const sortedKeys = keys.filter(k => k !== 'address' && k !== 'notificationPreferences');
              if (keys.includes('notificationPreferences')) {
                sortedKeys.push('notificationPreferences');
              }
              if (keys.includes('address')) {
                sortedKeys.push('address');
              }
              
              return sortedKeys.map((key) => {
              // Special case for _id at root level
              if (key === '_id') {
                return (
                  <div key={key} className="flex items-start justify-between py-3 border-b border-gray-100">
                    <span className="w-1/3 text-sm font-semibold text-gray-500">ID</span>
                    <div className="w-2/3 text-sm text-gray-900 font-mono text-xs mt-0.5 break-all">
                      {filteredData[key]}
                    </div>
                  </div>
                );
              }

              // Format camelCase to Title Case
              const formattedKey = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, (str) => str.toUpperCase());

              return (
                <div key={key} className="flex flex-col sm:flex-row sm:items-start justify-between py-3 border-b border-gray-100 last:border-0">
                  <span className="w-full sm:w-1/3 text-sm font-semibold text-gray-700 mb-1 sm:mb-0">
                    {formattedKey}
                  </span>
                  <div className="w-full sm:w-2/3 text-sm text-gray-900">
                    {renderValue(filteredData[key])}
                  </div>
                </div>
              );
            });
          })()
          )}
        </div>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewDetailsModal;
