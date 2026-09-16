import { useEffect, useState } from 'react';
import useAlertStore from '../../store/alertStore';

const AlertItem = ({ alert, onHide }) => {
  const { type, title, message, id } = alert;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 text-green-900 border-green-200';
      case 'error':
        return 'bg-red-50 text-red-900 border-red-200';
      case 'warning':
        return 'bg-yellow-50 text-yellow-900 border-yellow-200';
      default:
        return 'bg-surface text-on-surface border-outline-variant';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <span className="material-symbols-outlined text-green-600">check_circle</span>;
      case 'error':
        return <span className="material-symbols-outlined text-red-600">error</span>;
      case 'warning':
        return <span className="material-symbols-outlined text-yellow-600">warning</span>;
      default:
        return <span className="material-symbols-outlined text-primary">info</span>;
    }
  };

  return (
    <div className={`pointer-events-auto flex w-full max-w-md rounded-lg shadow-lg border p-4 animate-fade-in ${getTypeStyles()}`}>
      <div className="flex-shrink-0 mr-3">
        {getIcon()}
      </div>
      <div className="flex-1">
        {title && <h3 className="text-sm font-headline-sm uppercase tracking-wider mb-1">{title}</h3>}
        <p className="text-sm font-body-sm opacity-90">{message}</p>
      </div>
      <div className="flex-shrink-0 ml-4">
        <button
          onClick={() => onHide(id)}
          className="inline-flex text-current opacity-50 hover:opacity-100 transition-opacity focus:outline-none"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
    </div>
  );
};

const ConfirmationModal = ({ conf, onHide }) => {
  const { id, title, message, onConfirm, onCancel, confirmText, cancelText } = conf;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onHide(id);
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onHide(id);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface w-full max-w-md p-8 rounded-none border border-outline-variant/30 luxury-shadow flex flex-col transform scale-100 animate-fade-in">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-2xl">help</span>
          </div>
          <h2 className="font-headline-md text-2xl text-on-surface uppercase tracking-widest">{title}</h2>
        </div>
        <p className="font-body-md text-secondary mb-8 leading-relaxed">
          {message}
        </p>
        <div className="flex justify-end gap-4 mt-auto">
          <button
            onClick={handleCancel}
            className="border border-outline px-6 py-2 font-label-md uppercase tracking-widest hover:bg-surface-container transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className="bg-primary text-on-primary px-6 py-2 font-label-md uppercase tracking-widest hover:bg-primary/90 transition-colors luxury-shadow"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const PromptModal = ({ promptObj, onHide }) => {
  const { id, title, message, onConfirm, onCancel, confirmText, cancelText } = promptObj;
  const [inputValue, setInputValue] = useState('');

  const handleConfirm = () => {
    if (onConfirm) onConfirm(inputValue);
    onHide(id);
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onHide(id);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-surface w-full max-w-md p-8 rounded-xl border border-outline-variant/30 luxury-shadow flex flex-col transform scale-100 animate-fade-in">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-2xl">edit_note</span>
          </div>
          <h2 className="font-headline-md text-xl text-on-surface uppercase tracking-widest">{title}</h2>
        </div>
        <p className="font-body-md text-secondary mb-4 leading-relaxed">
          {message}
        </p>
        <div className="mb-8">
          <textarea
            className="w-full border border-outline-variant rounded-lg p-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
            rows="3"
            placeholder="Type your reason here..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          ></textarea>
        </div>
        <div className="flex justify-end gap-4 mt-auto">
          <button
            onClick={handleCancel}
            className="border border-outline px-6 py-2 font-label-md uppercase tracking-widest hover:bg-surface-container transition-colors rounded-lg"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className="bg-primary text-on-primary px-6 py-2 font-label-md uppercase tracking-widest hover:bg-primary/90 transition-colors luxury-shadow rounded-lg"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const GlobalAlert = () => {
  const { alerts, confirmations, prompts, hideAlert, hideConfirm, hidePrompt } = useAlertStore();

  return (
    <>
      {/* Toast Alerts Container */}
      <div className="fixed top-0 right-0 z-[100] flex flex-col gap-3 p-6 pointer-events-none w-full sm:w-auto items-end">
        {alerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} onHide={hideAlert} />
        ))}
      </div>

      {/* Confirmation Modals Container */}
      {confirmations.map((conf) => (
        <ConfirmationModal key={conf.id} conf={conf} onHide={hideConfirm} />
      ))}

      {/* Prompt Modals Container */}
      {prompts.map((promptObj) => (
        <PromptModal key={promptObj.id} promptObj={promptObj} onHide={hidePrompt} />
      ))}
    </>
  );
};

export default GlobalAlert;
