import { useState } from 'react';
import { Bell } from 'lucide-react';

const NotificationsPopover = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'New Appointment', message: 'Sarah booked a Haircut for tomorrow at 10 AM.', isRead: false, time: '2 hours ago' },
    { id: 2, title: 'Payment Successful', message: 'Your payment of LKR 120.00 was received.', isRead: true, time: '1 day ago' },
    { id: 3, title: 'Review Received', message: 'Jessica left a 5-star review!', isRead: true, time: '2 days ago' },
  ]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-primary transition-colors focus:outline-none"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-premium border border-gray-100 z-50 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline font-medium">
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-[300px] overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`p-4 hover:bg-gray-50 transition-colors ${!notif.isRead ? 'bg-primary/5' : ''}`}>
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`text-sm font-medium ${!notif.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-xs text-gray-400">{notif.time}</span>
                    </div>
                    <p className="text-xs text-gray-500">{notif.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500 text-sm">
                No notifications yet.
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-gray-100 text-center bg-gray-50">
            <button className="text-sm font-medium text-primary hover:underline">View All</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPopover;
