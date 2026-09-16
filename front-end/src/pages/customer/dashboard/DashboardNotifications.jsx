import React, { useState, useEffect } from 'react';
import notificationService from '../../../services/notificationService';

const DashboardNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await notificationService.getNotifications();
      setNotifications(res.data.data || res.data || []);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error("Failed to mark as read", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(notifications.filter(n => n._id !== id));
    } catch (error) {
      console.error("Failed to delete notification", error);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-8 border-b border-outline-variant/30 pb-4">
        <div>
          <h1 className="font-headline-md text-3xl text-on-surface uppercase tracking-widest mb-2">Notifications</h1>
          <p className="font-body-md text-secondary">Stay updated with your appointments, offers, and news.</p>
        </div>
        {notifications.some(n => !n.isRead) && (
          <button onClick={handleMarkAllRead} className="text-primary font-label-md uppercase tracking-widest hover:text-primary-container transition-colors">
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant/30 p-12 text-center flex flex-col items-center justify-center luxury-shadow opacity-70">
          <span className="material-symbols-outlined text-5xl text-outline mb-4">notifications</span>
          <h3 className="font-headline-sm text-xl text-on-surface mb-2 uppercase tracking-widest">No Notifications</h3>
          <p className="font-body-md text-secondary max-w-md">You're all caught up! New updates, confirmations, and exclusive offers will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {notifications.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((notification) => (
            <div 
              key={notification._id} 
              className={`p-6 border ${!notification.isRead ? 'border-primary bg-primary-container/5' : 'border-outline-variant/30 bg-surface-container-lowest'} luxury-shadow flex gap-6 items-start transition-colors relative group`}
            >
              <div className={`p-3 rounded-full ${!notification.isRead ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'}`}>
                <span className="material-symbols-outlined text-[24px]">
                  {notification.type === 'booking_confirmation' || notification.type === 'appointment_reminder'
                    ? 'calendar_month'
                    : notification.type === 'promotional'
                      ? 'sell'
                      : 'info'}
                </span>
              </div>
              
              <div className="flex-grow pr-8">
                <div className="flex justify-between items-start mb-1">
                  <h3 className={`font-headline-sm text-lg ${!notification.isRead ? 'text-primary' : 'text-on-surface'}`}>
                    {notification.title}
                  </h3>
                  <span className="font-label-sm text-xs uppercase tracking-widest text-outline">{new Date(notification.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="font-body-md text-secondary">{notification.message}</p>

                {notification.type === 'promotional' && notification.data?.couponCode && (
                  <div className="mt-4 p-4 border border-primary/30 bg-primary/5">
                    <p className="text-xs uppercase tracking-widest text-primary mb-2">Your coupon code</p>
                    <p className="font-mono text-xl text-on-surface tracking-widest mb-3">
                      {notification.data.couponCode}
                    </p>
                    {notification.data.discountLabel && (
                      <p className="text-sm text-secondary mb-2">
                        <span className="font-medium text-on-surface">Discount:</span>{' '}
                        {notification.data.discountLabel}
                      </p>
                    )}
                    <p className="text-sm text-secondary mb-1">
                      <span className="font-medium text-on-surface">Apply on:</span>{' '}
                      {notification.data.appliesTo?.length
                        ? notification.data.appliesTo.join(', ')
                        : notification.data.appliesToLabel || 'Any service or consultation'}
                    </p>
                    {notification.data.validUntil && (
                      <p className="text-xs text-outline mt-2">
                        Valid until {new Date(notification.data.validUntil).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="absolute right-6 top-6 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                {!notification.isRead && (
                  <button onClick={() => handleMarkRead(notification._id)} className="text-primary hover:text-primary-container" title="Mark as read">
                    <span className="material-symbols-outlined text-xl">mark_email_read</span>
                  </button>
                )}
                <button onClick={() => handleDelete(notification._id)} className="text-error hover:text-error/80" title="Delete">
                  <span className="material-symbols-outlined text-xl">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {notifications.length > itemsPerPage && (
        <div className="flex justify-center items-center mt-8 gap-4">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`p-2 border ${currentPage === 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-outline hover:border-primary text-secondary hover:text-primary transition-colors'}`}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <span className="font-label-sm uppercase tracking-widest text-gray-500">
            Page {currentPage} of {Math.ceil(notifications.length / itemsPerPage)}
          </span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(notifications.length / itemsPerPage), prev + 1))}
            disabled={currentPage === Math.ceil(notifications.length / itemsPerPage)}
            className={`p-2 border ${currentPage === Math.ceil(notifications.length / itemsPerPage) ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-outline hover:border-primary text-secondary hover:text-primary transition-colors'}`}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default DashboardNotifications;
