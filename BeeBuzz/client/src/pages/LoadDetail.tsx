import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { loadApi, bidApi } from '../services/api';
import { Load, Bid } from '../types';
import './LoadDetail.css';

const statusLabels: Record<string, string> = {
  pending: 'Pending', accepted: 'Accepted', arrived_pickup: 'Arrived Pickup', loaded: 'Loaded', en_route: 'En Route', arrived_delivery: 'Arrived Delivery', delivered: 'Delivered'
};

const statusFlow = ['pending', 'accepted', 'arrived_pickup', 'loaded', 'en_route', 'arrived_delivery', 'delivered'];

const LoadDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lastMessage } = useWebSocket();
  const [load, setLoad] = useState<Load | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidNotes, setBidNotes] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const isDriver = user?.role === 'driver';
  const isShipper = user?.role === 'shipper';

  useEffect(() => { loadLoad(); }, [id]);
  useEffect(() => {
    if (lastMessage?.type === 'location_update' && lastMessage.loadId === id) setLocation({ lat: lastMessage.lat, lng: lastMessage.lng });
    if (lastMessage?.type === 'load_update' && lastMessage.loadId === id) loadLoad();
  }, [lastMessage, id]);

  const loadLoad = async () => {
    try {
      const response = await loadApi.getOne(id!);
      setLoad(response.data.data);
      if (response.data.data.locations?.length > 0) setLocation(response.data.data.locations[0]);
    } catch (error) { console.error('Failed to load:', error); }
    finally { setLoading(false); }
  };


  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
    try { await loadApi.updateStatus(id!, newStatus); loadLoad(); } catch (error) { console.error('Failed:', error); }
    finally { setUpdating(false); }
  };

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await bidApi.create({ loadId: id, amount: parseFloat(bidAmount), notes: bidNotes });
      loadLoad();
      setBidAmount(''); setBidNotes('');
    } catch (error) { console.error('Failed:', error); }
    finally { setUpdating(false); }
  };

  const getNextStatus = () => {
    if (!load) return null;
    const currentIndex = statusFlow.indexOf(load.currentStatus);
    if (currentIndex < statusFlow.length - 1) return statusFlow[currentIndex + 1];
    return null;
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!load) return <div className="error">Load not found</div>;

  const nextStatus = getNextStatus();

  return (
    <div className="load-detail animate-fadeIn">
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button>
        <div className="header-actions">
          <span className={`badge badge-${load.status} badge-large`}>{statusLabels[load.currentStatus]}</span>
          {isShipper && load.status === 'open' && <button className="btn btn-danger" onClick={() => loadApi.cancel(id!)} disabled={updating}>Cancel</button>}
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="card-static">
            <h2>Load #{load.id.slice(0, 8)}</h2>
            <div className="route-detail">
              <div className="route-point origin">
                <div className="point-marker">📍</div>
                <div className="point-content">
                  <span className="point-label">Pickup Location</span>
                  <span className="point-address">{load.pickupAddress}</span>
                </div>
              </div>
              <div className="route-connector"><div className="connector-line"></div><div className="connector-icon">🚚</div><div className="connector-line"></div></div>
              <div className="route-point destination">
                <div className="point-marker">🏁</div>
                <div className="point-content">
                  <span className="point-label">Delivery Location</span>
                  <span className="point-address">{load.deliveryAddress}</span>
                </div>
              </div>
            </div>
            {location && <div className="location-update"><h4>📡 Live Location</h4><p>Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}</p></div>}
          </div>

          <div className="card-static">
            <h3>Cargo Details</h3>
            <div className="cargo-info">
              <div className="cargo-item"><span className="cargo-label">Type</span><span className="cargo-value">{load.cargoType}</span></div>
              <div className="cargo-item"><span className="cargo-label">Weight</span><span className="cargo-value">{load.cargoWeight.toLocaleString()} kg</span></div>
              <div className="cargo-item"><span className="cargo-label">Truck</span><span className="cargo-value">{load.truckType}</span></div>
              <div className="cargo-item"><span className="cargo-label">Price</span><span className="cargo-value price">₹{load.price.toLocaleString()}</span></div>
              <div className="cargo-item"><span className="cargo-label">Pickup</span><span className="cargo-value">{new Date(load.pickupDate).toLocaleString()}</span></div>
              <div className="cargo-item"><span className="cargo-label">Delivery</span><span className="cargo-value">{new Date(load.deliveryDate).toLocaleString()}</span></div>
            </div>
          </div>

          {isDriver && load.status === 'open' && !load.driverId && (
            <div className="card-static">
              <h3>Place Your Bid</h3>
              <form onSubmit={handlePlaceBid} className="bid-form">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Bid Amount (₹)</label><input type="number" className="input" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} placeholder="Your bid" required /></div>
                </div>
                <div className="form-group"><label className="form-label">Notes (Optional)</label><textarea className="input textarea" value={bidNotes} onChange={(e) => setBidNotes(e.target.value)} placeholder="Any notes..." rows={2} /></div>
                <button type="submit" className="btn btn-primary" disabled={updating}>{updating ? 'Submitting...' : 'Place Bid'}</button>
              </form>
            </div>
          )}

          {isShipper && load.bids && load.bids.length > 0 && (
            <div className="card-static">
              <h3>Bids ({load.bids.length})</h3>
              <div className="bids-list">
                {load.bids.map((bid: Bid) => (
                  <div key={bid.id} className="bid-item">
                    <div className="bid-info">
                      <span className="bid-driver">{bid.driverName}</span>
                      <span className="bid-rating">⭐ {bid.driverRating.toFixed(1)} • {bid.driverTotalJobs} jobs</span>
                    </div>
                    <div className="bid-amount">₹{bid.amount.toLocaleString()}</div>
                    {bid.status === 'pending' && <button className="btn btn-success btn-sm" onClick={() => bidApi.accept(bid.id)}>Accept</button>}
                    <span className={`badge badge-${bid.status}`}>{bid.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="detail-sidebar">
          <div className="card-static">
            <h3>Status Progress</h3>
            <div className="status-timeline">
              {statusFlow.map((status, index) => {
                const isActive = load.currentStatus === status;
                const isPast = statusFlow.indexOf(load.currentStatus) > index;
                return <div key={status} className={`timeline-item ${isActive ? 'active' : ''} ${isPast ? 'completed' : ''}`}><div className="timeline-dot"></div><span className="timeline-label">{statusLabels[status]}</span></div>;
              })}
            </div>
            {isDriver && load.driverId === user?.id && nextStatus && <button className="btn btn-primary" onClick={() => handleStatusUpdate(nextStatus)} disabled={updating} style={{ width: '100%', marginTop: '20px' }}>Mark as {statusLabels[nextStatus]}</button>}
          </div>

          <div className="card-static">
            <h3>{isDriver ? 'Shipper Info' : (load.driverId ? 'Driver Info' : 'No Driver Assigned')}</h3>
            {isDriver ? (<div className="contact-info"><p><strong>{load.shipperName}</strong></p><p>📞 {load.shipperPhone}</p></div>) : load.driverId ? (<div className="contact-info"><p><strong>{load.driverName}</strong></p><p>📞 {load.driverPhone}</p><p>🚛 {load.driverVehicle}</p></div>) : <p className="text-muted">Waiting for driver...</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadDetail;
