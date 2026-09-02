import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { loadApi } from '../services/api';
import { Load } from '../types';
import './Dashboard.css';

const statusLabels: Record<string, string> = {
  open: 'Open', assigned: 'Assigned', in_transit: 'In Transit', delivered_pending_verification: 'Pending Verification', delivered: 'Delivered', cancelled: 'Cancelled'
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { lastMessage } = useWebSocket();
  
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOutbid, setActiveOutbid] = useState<{ loadId: string; message: string; newAmount: number } | null>(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (lastMessage?.type === 'outbid' && user?.role === 'driver') {
      setActiveOutbid({
        loadId: lastMessage.loadId,
        message: lastMessage.message,
        newAmount: lastMessage.newAmount
      });
      
      const timer = setTimeout(() => {
        setActiveOutbid(null);
      }, 7000);
      
      return () => clearTimeout(timer);
    }
  }, [lastMessage, user]);

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

      {activeOutbid && (
        <div className="outbid-toast animate-slideIn" style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'rgba(239, 68, 68, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 10px 30px rgba(239, 68, 68, 0.4)',
          color: 'white',
          zIndex: 9999,
          maxWidth: '350px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          cursor: 'pointer'
        }} onClick={() => navigate(`/loads/${activeOutbid.loadId}`)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
              ⚠️ OUTBID ALERT!
            </span>
            <button style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }} onClick={(e) => { e.stopPropagation(); setActiveOutbid(null); }}>×</button>
          </div>
          <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.4' }}>
            {activeOutbid.message}
          </p>
          <div style={{ fontSize: '11px', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', alignSelf: 'flex-start' }}>
            Click to view load details & bid!
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
