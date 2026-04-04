import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationApi } from '../services/api';
import './Layout.css';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await notificationApi.getUnread();
        setUnreadCount(response.data.data.count);
      } catch (e) { console.error('Failed to fetch notifications'); }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };
  const isDriver = user?.role === 'driver';

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🐝</span>
            {sidebarOpen && <span className="logo-text">Beebuzz</span>}
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">📊</span>
            {sidebarOpen && <span>Dashboard</span>}
          </NavLink>
          
          {isDriver ? (
            <>
              <NavLink to="/jobs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon">📋</span>
                {sidebarOpen && <span>Job Board</span>}
              </NavLink>
              <NavLink to="/my-bids" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon">💰</span>
                {sidebarOpen && <span>My Bids</span>}
              </NavLink>
              <NavLink to="/earnings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon">💵</span>
                {sidebarOpen && <span>Earnings</span>}
              </NavLink>
            </>
          ) : (
            <NavLink to="/loads/new" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">➕</span>
              {sidebarOpen && <span>Post Load</span>}
            </NavLink>
          )}
          
          <NavLink to="/loads" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">🚚</span>
            {sidebarOpen && <span>My Loads</span>}
          </NavLink>
          
          <NavLink to="/notifications" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">🔔</span>
            {sidebarOpen && (
              <>
                <span>Notifications</span>
                {unreadCount > 0 && <span className="badge-count">{unreadCount}</span>}
              </>
            )}
          </NavLink>
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
            {sidebarOpen && (
              <div className="user-details">
                <div className="user-name">{user?.name}</div>
                <div className="user-role">{user?.role}</div>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            {sidebarOpen ? 'Logout' : '🚪'}
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        <header className="top-bar">
          <div className="page-title">
            {isDriver ? '🐝 Driver Portal' : '🌸 Shipper Portal'}
          </div>
          <div className="top-bar-actions">
            <button 
              className="btn btn-ghost" 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              style={{ fontSize: '1.2rem', padding: '8px 12px', marginRight: '8px' }}
              title="Toggle Light/Dark Mode"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <div className="connection-status">
              <span className="status-dot online"></span>
              Live
            </div>
          </div>
        </header>
        
        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
