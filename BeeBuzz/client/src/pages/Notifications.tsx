import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../services/api';
import { Notification } from '../types';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationApi.getAll().then(r => { setNotifications(r.data.data); setLoading(false); }).catch(console.error);
  }, []);

  const handleRead = async (id: string) => {
    await notificationApi.markAsRead(id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <div className="notifications-page animate-fadeIn">
      <div className="page-header"><h1>Notifications</h1></div>
      {loading ? <div className="loading">Loading...</div> : notifications.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🔔</div><h3>No notifications</h3></div>
      ) : (
        <div className="notifications-list">
          {notifications.map(n => (
            <div key={n.id} className={`notification-card card ${!n.read ? 'unread' : ''}`} onClick={() => { if (!n.read) handleRead(n.id); if (n.referenceId) navigate(`/loads/${n.referenceId}`); }}>
              <div className="notif-title">{n.title}</div>
              <div className="notif-message">{n.message}</div>
              <div className="notif-time">{new Date(n.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
