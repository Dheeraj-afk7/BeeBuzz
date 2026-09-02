import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import './admin.css';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminUser, setAdminUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');
    if (!token || !user) {
      navigate('/admin/login', { replace: true });
      return;
    }
    const parsed = JSON.parse(user);
    if (parsed.role !== 'admin') {
      navigate('/admin/login', { replace: true });
      return;
    }
    setAdminUser(parsed);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: '📊', exact: true },
    { to: '/admin/users', label: 'Users', icon: '👥' },
    { to: '/admin/orders', label: 'Orders', icon: '📦' },
    { to: '/admin/payments', label: 'Payments', icon: '💳' },
    { to: '/admin/documents', label: 'Documents', icon: '📋', badge: 'docs' },
    { to: '/admin/reports', label: 'Analytics', icon: '📈' },
  ];

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-logo-icon">🐝</div>
          <div className="admin-logo-text">
            <div style={{ fontWeight: 800, fontSize: 14 }}>BeeBuzz</div>
            <div className="admin-logo-sub">Admin Panel</div>
          </div>
        </div>

        <nav className="admin-nav">
          <div className="admin-nav-section">Navigation</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={`admin-nav-item ${isActive(item.to, item.exact) ? 'active' : ''}`}
              end={item.exact}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-avatar">A</div>
          <div className="admin-user-info">
            <div className="admin-user-name">{adminUser?.name || 'Admin'}</div>
            <div className="admin-user-role">Super Admin</div>
          </div>
          <button className="admin-logout-btn" onClick={handleLogout} title="Logout">🚪</button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-header">
          <div className="admin-header-title">
            {navItems.find(n => isActive(n.to, n.exact))?.label || 'Admin'}
          </div>
          <div className="admin-header-badge">
            🛡 Admin Access
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            Live
          </div>
        </div>
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
