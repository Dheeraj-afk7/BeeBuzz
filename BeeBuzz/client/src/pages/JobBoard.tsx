import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadApi } from '../services/api';
import { Load } from '../types';
import './JobBoard.css';

const JobBoard: React.FC = () => {
  const navigate = useNavigate();
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApi.getAll({ status: 'available' }).then(r => { setLoads(r.data.data); setLoading(false); }).catch(console.error);
  }, []);

  return (
    <div className="job-board animate-fadeIn">
      <div className="page-header"><h1>Job Board</h1><p className="page-subtitle">Find available loads to transport</p></div>
      <div className="job-stats">
        <div className="job-stat"><span className="stat-number">{loads.length}</span><span className="stat-text">Available Jobs</span></div>
        <div className="job-stat"><span className="stat-number">₹{loads.reduce((s, l) => s + l.price, 0).toLocaleString()}</span><span className="stat-text">Total Value</span></div>
      </div>
      {loading ? <div className="loading">Loading...</div> : (
        <div className="jobs-grid">
          {loads.map(load => (
            <div key={load.id} className="job-card card" onClick={() => navigate(`/loads/${load.id}`)}>
              <div className="job-header"><span className="job-id">#{load.id.slice(0, 8)}</span><span className="job-price">₹{load.price.toLocaleString()}</span></div>
              <div className="job-route">
                <div className="route-from"><span className="route-dot origin"></span><span className="route-text">{load.pickupAddress}</span></div>
                <div className="route-arrow">↓</div>
                <div className="route-to"><span className="route-dot dest"></span><span className="route-text">{load.deliveryAddress}</span></div>
              </div>
              <div className="job-details">
                <div className="detail"><span className="label">Cargo</span><span className="value">{load.cargoType}</span></div>
                <div className="detail"><span className="label">Weight</span><span className="value">{load.cargoWeight} kg</span></div>
                <div className="detail"><span className="label">Truck</span><span className="value">{load.truckType}</span></div>
              </div>
              <button className="btn btn-primary job-cta">View Details</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobBoard;
