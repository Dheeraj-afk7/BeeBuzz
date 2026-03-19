import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadApi } from '../services/api';
import { Load } from '../types';
import './Loads.css';

const statusLabels: Record<string, string> = {
  open: 'Open', assigned: 'Assigned', in_transit: 'In Transit', delivered: 'Delivered', cancelled: 'Cancelled'
};

const Loads: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => { loadLoads(); }, [filter]);

  const loadLoads = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await loadApi.getAll(params);
      setLoads(response.data.data);
    } catch (error) { console.error('Failed to load:', error); }
    finally { setLoading(false); }
  };

  const isDriver = user?.role === 'driver';
  const filters = isDriver 
    ? [{ value: 'all', label: 'All' }, { value: 'available', label: 'Available' }, { value: 'my', label: 'My Jobs' }]
    : [{ value: 'all', label: 'All' }, { value: 'open', label: 'Open' }, { value: 'in_transit', label: 'In Transit' }, { value: 'delivered', label: 'Delivered' }];

  return (
    <div className="loads-page animate-fadeIn">
      <div className="page-header">
        <div>
          <h1>{isDriver ? 'My Jobs' : 'My Loads'}</h1>
          <p className="page-subtitle">{isDriver ? 'Track and manage your delivery jobs' : 'Track and manage your loads'}</p>
        </div>
        {!isDriver && <button className="btn btn-primary" onClick={() => navigate('/loads/new')}>+ Post Load</button>}
      </div>

      <div className="filters">
        {filters.map((f) => (
          <button key={f.value} className={`filter-btn ${filter === f.value ? 'active' : ''}`} onClick={() => setFilter(f.value)}>{f.label}</button>
        ))}
      </div>

      {loading ? <div className="loading">Loading...</div> : loads.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📦</div><h3>No loads found</h3><p>{isDriver ? 'No jobs available' : 'Post your first load'}</p></div>
      ) : (
        <div className="loads-grid">
          {loads.map((load) => (
            <div key={load.id} className="load-card card" onClick={() => navigate(`/loads/${load.id}`)}>
              <div className="card-header">
                <span className="load-id">#{load.id.slice(0, 8)}</span>
                <span className={`badge badge-${load.status}`}>{statusLabels[load.status]}</span>
              </div>
              <div className="route-display">
                <div className="route-item"><span className="route-icon">📍</span><span className="route-text">{load.pickupAddress}</span></div>
                <div className="route-arrow">↓</div>
                <div className="route-item"><span className="route-icon">🏁</span><span className="route-text">{load.deliveryAddress}</span></div>
              </div>
              <div className="card-details">
                <div className="detail"><span className="detail-label">Cargo</span><span className="detail-value">{load.cargoType}</span></div>
                <div className="detail"><span className="detail-label">Weight</span><span className="detail-value">{load.cargoWeight} kg</span></div>
                <div className="detail"><span className="detail-label">Price</span><span className="detail-value price">₹{load.price.toLocaleString()}</span></div>
              </div>
              <div className="card-footer">
                <span className="date">Pickup: {new Date(load.pickupDate).toLocaleDateString()}</span>
                <span className="bid-count">📝 {load.bidCount} bids</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Loads;
