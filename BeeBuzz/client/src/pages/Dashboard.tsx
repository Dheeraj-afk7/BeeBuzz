import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadApi } from '../services/api';
import { Load } from '../types';
import './Dashboard.css';

const statusLabels: Record<string, string> = {
  open: 'Open', assigned: 'Assigned', in_transit: 'In Transit', delivered: 'Delivered', cancelled: 'Cancelled'
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const response = await loadApi.getAll();
      setLoads(response.data.data);
    } catch (error) { console.error('Failed to load:', error); }
    finally { setLoading(false); }
  };

  const isDriver = user?.role === 'driver';
  const activeLoads = loads.filter(l => ['assigned', 'in_transit'].includes(l.status));
  const pendingLoads = loads.filter(l => l.status === 'open');
  const deliveredLoads = loads.filter(l => l.status === 'delivered');

  return (
    <div className="dashboard animate-fadeIn">
      <div className="dashboard-header">
        <div>
          <h1>Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="dashboard-subtitle">{isDriver ? "Here's your delivery overview" : "Here's what's happening with your loads"}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate(isDriver ? '/jobs' : '/loads/new')}>
          {isDriver ? 'Browse Jobs' : '+ Post Load'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🚚</div>
          <div className="stat-content">
            <div className="stat-value">{activeLoads.length}</div>
            <div className="stat-label">Active {isDriver ? 'Jobs' : 'Loads'}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{pendingLoads.length}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{deliveredLoads.length}</div>
            <div className="stat-label">Delivered</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">{isDriver ? '💰' : '📦'}</div>
          <div className="stat-content">
            <div className="stat-value">{loads.length}</div>
            <div className="stat-label">Total {isDriver ? 'Jobs' : 'Loads'}</div>
          </div>
        </div>
      </div>

      <div className="recent-section">
        <div className="section-header">
          <h2>Recent {isDriver ? 'Jobs' : 'Loads'}</h2>
          <button className="btn btn-ghost" onClick={() => navigate(isDriver ? '/jobs' : '/loads')}>View All →</button>
        </div>

        {loading ? <div className="loading">Loading...</div> : loads.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>No loads yet</h3>
            <p>{isDriver ? 'Browse the job board to find available loads' : 'Post your first load to get started'}</p>
            <button className="btn btn-primary" onClick={() => navigate(isDriver ? '/jobs' : '/loads/new')}>
              {isDriver ? 'Browse Jobs' : 'Post Load'}
            </button>
          </div>
        ) : (
          <div className="loads-list">
            {loads.slice(0, 5).map((load) => (
              <div key={load.id} className="load-card card" onClick={() => navigate(`/loads/${load.id}`)}>
                <div className="load-route">
                  <div className="route-point origin">
                    <span className="point-dot"></span>
                    <div className="point-details">
                      <span className="point-label">From</span>
                      <span className="point-address">{load.pickupAddress}</span>
                    </div>
                  </div>
                  <div className="route-line"></div>
                  <div className="route-point destination">
                    <span className="point-dot"></span>
                    <div className="point-details">
                      <span className="point-label">To</span>
                      <span className="point-address">{load.deliveryAddress}</span>
                    </div>
                  </div>
                </div>
                <div className="load-meta">
                  <div className="meta-item">
                    <span className="meta-label">Cargo</span>
                    <span className="meta-value">{load.cargoType}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Weight</span>
                    <span className="meta-value">{load.cargoWeight.toLocaleString()} kg</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Price</span>
                    <span className="meta-value price">₹{load.price.toLocaleString()}</span>
                  </div>
                  <div className="meta-item">
                    <span className={`badge badge-${load.status}`}>{statusLabels[load.status]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
