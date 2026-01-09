import React, { useEffect, useState, useRef } from 'react';
import { Search, Bell, FileText, Info, CheckCircle } from 'lucide-react';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  role: {
    name: string;
  };
  employee?: {
    name: string;
    fullName: string;
    facialPhotoUrl?: string;
    position?: string;
  };
}

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type: string;
  createdAt: string;
}

const Header: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
    fetchNotifications();

    // Close notifications on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/users/me');
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  const handleMarkAllAsRead = async () => {
      try {
          await api.patch('/notifications/read-all');
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      } catch (error) {
          console.error('Error marking all as read:', error);
      }
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText size={16} className="text-blue-500" />;
      case 'alert': return <Info size={16} className="text-red-500" />;
      default: return <Info size={16} className="text-gray-500" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm h-16">
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#196ee6]" size={18} />
          <input 
            type="text" 
            placeholder="Busca global..." 
            className="h-10 w-64 xl:w-80 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#196ee6]/10 focus:border-[#196ee6] transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative" ref={notificationRef}>
          <button 
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 transition-colors border border-slate-200"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
              <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-semibold text-slate-700 text-sm">Notificações</h3>
                {unreadCount > 0 && (
                    <button onClick={handleMarkAllAsRead} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                        Marcar todas como lidas
                    </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">
                    Nenhuma notificação
                  </div>
                ) : (
                  notifications.map(notification => (
                    <div 
                      key={notification.id} 
                      className={`p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${notification.read ? 'opacity-60' : 'bg-blue-50/30'}`}
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-1 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${notification.read ? 'bg-slate-100' : 'bg-white shadow-sm border border-slate-100'}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm ${notification.read ? 'text-slate-600' : 'text-slate-900 font-medium'}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="mt-2 h-2 w-2 rounded-full bg-blue-500 shrink-0"></div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-black text-slate-900">
              {user?.employee?.fullName || user?.employee?.name || user?.email || 'Usuário'}
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
              {user?.employee?.position || user?.role?.name || 'Nível de Acesso'}
            </p>
          </div>
          <div className="h-10 w-10 overflow-hidden rounded-xl ring-2 ring-slate-100 cursor-pointer transition-all hover:ring-blue-100 bg-slate-100">
            {user?.employee?.facialPhotoUrl ? (
               <img 
                 src={`${api.defaults.baseURL?.replace('/api', '')}${user.employee.facialPhotoUrl}`} 
                 alt="User" 
                 className="h-full w-full object-cover"
               />
            ) : (
                <img src={`https://ui-avatars.com/api/?name=${user?.employee?.name || user?.email || 'User'}&background=random`} alt="User" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
