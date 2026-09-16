import { create } from 'zustand';

const useAlertStore = create((set, get) => ({
  alerts: [], // { id, type, title, message, duration }
  confirmations: [], // { id, title, message, onConfirm, onCancel, confirmText, cancelText }
  prompts: [], // { id, title, message, onConfirm, onCancel, confirmText, cancelText }

  // types: 'success', 'error', 'info', 'warning'
  showAlert: (type, title, message, duration = 5000) => {
    const id = Date.now().toString() + Math.random().toString();
    set((state) => ({
      alerts: [...state.alerts, { id, type, title, message, duration }]
    }));

    if (duration > 0) {
      setTimeout(() => {
        get().hideAlert(id);
      }, duration);
    }
    return id;
  },

  hideAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.filter((alert) => alert.id !== id)
    }));
  },

  showConfirm: (title, message, onConfirm, onCancel = null, options = {}) => {
    const id = Date.now().toString() + Math.random().toString();
    const { confirmText = 'Confirm', cancelText = 'Cancel' } = options;
    
    set((state) => ({
      confirmations: [
        ...state.confirmations, 
        { id, title, message, onConfirm, onCancel, confirmText, cancelText }
      ]
    }));
    return id;
  },

  hideConfirm: (id) => {
    set((state) => ({
      confirmations: state.confirmations.filter((conf) => conf.id !== id)
    }));
  },

  showPrompt: (title, message, onConfirm, onCancel = null, options = {}) => {
    const id = Date.now().toString() + Math.random().toString();
    const { confirmText = 'Submit', cancelText = 'Cancel' } = options;
    
    set((state) => ({
      prompts: [
        ...state.prompts, 
        { id, title, message, onConfirm, onCancel, confirmText, cancelText }
      ]
    }));
    return id;
  },

  hidePrompt: (id) => {
    set((state) => ({
      prompts: state.prompts.filter((prompt) => prompt.id !== id)
    }));
  }
}));

export default useAlertStore;
