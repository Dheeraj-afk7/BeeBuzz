import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import './admin.css';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await adminApi.login({ email, password });
      const { token, user } = response.data.data;

      if (user.role !== 'admin') {
        setError('Access denied. Admin credentials required.');
        return;
      }

      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(user));
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card anim-fadeIn">
        <div className="admin-login-logo">
          <div className="admin-login-logo-icon">🐝</div>
          <div className="admin-login-logo-text">
            <h1>BeeBuzz</h1>
            <p>Operations Command Centre</p>
          </div>
        </div>

        {error && <div className="admin-error-box">⚠ {error}</div>}

        <form onSubmit={handleLogin}>
          <div className="admin-input-group">
            <label className="admin-input-label">Admin Email</label>
            <input
              type="email"
              className="admin-input"
              placeholder="admin@beebuzz.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="admin-input-group">
            <label className="admin-input-label">Password</label>
            <input
              type="password"
              className="admin-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="admin-btn-primary" disabled={loading}>
            {loading ? '🔐 Authenticating...' : '🔐 Access Admin Portal'}
          </button>
        </form>

        <div className="admin-hint">
          🛡 This portal is restricted to authorized administrators only.<br />
          Unauthorized access attempts are logged and monitored.
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
