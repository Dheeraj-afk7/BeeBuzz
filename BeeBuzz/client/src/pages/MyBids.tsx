import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bidApi } from '../services/api';
import './MyBids.css';

const MyBids: React.FC = () => {
  const navigate = useNavigate();
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { bidApi.getMyBids().then(r => { setBids(r.data.data); setLoading(false); }).catch(console.error); }, []);

  return (
    <div className="my-bids-page animate-fadeIn">
      <div className="page-header"><h1>My Bids</h1><p className="page-subtitle">Track your submitted bids</p></div>
      {loading ? <div className="loading">Loading...</div> : bids.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">💰</div><h3>No bids yet</h3><p>Browse jobs and place your first bid</p><button className="btn btn-primary" onClick={() => navigate('/jobs')}>Browse Jobs</button></div>
      ) : (
        <div className="bids-list">
          {bids.map(bid => (
            <div key={bid.id} className="bid-card card" onClick={() => navigate(`/loads/${bid.loadId}`)}>
              <div className="bid-header"><span className="badge badge-{bid.status}">{bid.status}</span><span className="bid-amount">₹{bid.amount?.toLocaleString()}</span></div>
              <div className="bid-route">{bid.pickupAddress} → {bid.deliveryAddress}</div>
              <div className="bid-meta"><span>{bid.cargoType}</span><span>•</span><span>{bid.loadStatus}</span></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBids;
