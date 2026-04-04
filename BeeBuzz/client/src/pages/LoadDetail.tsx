import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { loadApi, bidApi } from '../services/api';
import { Load, Bid } from '../types';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import './LoadDetail.css';

// Map Icons setup
const truckIcon = new L.DivIcon({
  html: '<div style="font-size: 26px; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); transform: translate(-50%, -50%);">🚚</div>',
  className: 'custom-truck-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const defaultMarker = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

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
  
  const [isEditingBid, setIsEditingBid] = useState(false);
  const [editBidAmount, setEditBidAmount] = useState('');
  const [editBidNotes, setEditBidNotes] = useState('');

  const [isEditingLoad, setIsEditingLoad] = useState(false);
  const [editLoadForm, setEditLoadForm] = useState({ price: '', cargoWeight: '' });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ coordinates: [number, number][], distance: number, suggestedPrice: number } | null>(null);

  const isDriver = user?.role === 'driver';
  const isShipper = user?.role === 'shipper';

  useEffect(() => { loadLoad(); }, [id]);
  useEffect(() => {
    if (lastMessage?.type === 'location_update' && lastMessage.loadId === id) setLocation({ lat: lastMessage.lat, lng: lastMessage.lng });
    if (lastMessage?.type === 'load_update' && lastMessage.loadId === id) loadLoad();
  }, [lastMessage, id]);

  useEffect(() => {
    if (load) {
      const fetchRouteAndPricing = async () => {
        try {
          const pLat = load.pickupLat || 17.6868;
          const pLng = load.pickupLng || 83.2185;
          const dLat = load.deliveryLat || 16.5062;
          const dLng = load.deliveryLng || 80.6480;

          const url = `https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${dLng},${dLat}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          const data = await res.json();
          
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const coords = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);
            const distanceKM = route.distance / 1000;
            
            // Dynamic Pricing Model
            let rate = 20; // flat base rate
            const type = load.truckType?.toLowerCase() || '';
            if (type.includes('pickup')) rate = 15;
            else if (type.includes('mini')) rate = 18;
            else if (type.includes('lorry')) rate = 25;
            else if (type.includes('container')) rate = 35;
            else if (type.includes('flatbed')) rate = 40;
            
            let multiplier = 1;
            if (load.cargoWeight > 500) multiplier = 1.1;
            if (load.cargoWeight > 1000) multiplier = 1.25;
            
            const suggestedPrice = Math.round(distanceKM * rate * multiplier);
            setRouteInfo({ coordinates: coords, distance: distanceKM, suggestedPrice });
          }
        } catch (err) {
          console.error("OSRM routing failed", err);
        }
      };
      fetchRouteAndPricing();
    }
  }, [load]);

  useEffect(() => {
    let watchId: number | undefined;

    if (isTracking && load) {
      if (!('geolocation' in navigator)) {
        alert('Geolocation is not supported by your browser');
        setIsTracking(false);
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          try {
            await loadApi.updateLocation(load.id, lat, lng);
            // Optimistically update local map for the driver
            setLocation({ lat, lng });
          } catch (error) {
            console.error("Location update failed", error);
          }
        },
        (error) => {
          console.error("Error tracking position:", error);
          alert("Please enable location services or allow permissions in your browser to track your route.");
          setIsTracking(false);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    }

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isTracking, load]);

  const loadLoad = async () => {
    try {
      const response = await loadApi.getOne(id!);
      setLoad(response.data.data);
      setEditLoadForm({ price: response.data.data.price, cargoWeight: response.data.data.cargoWeight });
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

  const handleEditBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const myBid = load?.bids?.find((b: any) => b.driverId === user?.id);
      if (myBid) {
        const response = await bidApi.update(myBid.id, { amount: parseFloat(editBidAmount), notes: editBidNotes });
        alert("Server responded: " + JSON.stringify(response.data));
      }
      setIsEditingBid(false);
      loadLoad();
    } catch (error) { console.error('Failed to edit bid:', error); }
    finally { setUpdating(false); }
  };

  const handleEditLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await loadApi.update(load!.id, { price: parseFloat(editLoadForm.price), cargoWeight: parseFloat(editLoadForm.cargoWeight) });
      setIsEditingLoad(false);
      loadLoad();
    } catch (error) { console.error('Failed to edit load:', error); }
    finally { setUpdating(false); }
  };

  const myBid = load?.bids?.find((b: any) => b.driverId === user?.id);

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
          {isShipper && load.status === 'open' && (
            <>
              <button className="btn btn-secondary" onClick={() => setIsEditingLoad(!isEditingLoad)} disabled={updating}>Edit Load</button>
              <button className="btn btn-danger" onClick={() => loadApi.cancel(id!)} disabled={updating}>Cancel</button>
            </>
          )}
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
            {load && (
              <div className="map-container card-static" style={{ minHeight: '350px', display: 'flex', flexDirection: 'column' }}>
                <div className="map-header">
                  <h4>📡 Optimized Route Map</h4>
                  {location ? <span className="live-indicator"></span> : <span className="text-muted" style={{fontSize:'12px'}}>(Waiting for Driver GPS)</span>}
                </div>
                
                <MapContainer 
                  center={[load.pickupLat || 17.6868, load.pickupLng || 83.2185]} 
                  zoom={7} 
                  style={{ flex: 1, minHeight: '250px', width: '100%', borderRadius: '8px', zIndex: 0 }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  
                  {/* Drawing Route Polyline */}
                  {routeInfo && <Polyline positions={routeInfo.coordinates} color="#4A90E2" weight={5} opacity={0.7} />}
                  
                  {/* Pickup and Delivery endpoints */}
                  <Marker position={[load.pickupLat || 17.6868, load.pickupLng || 83.2185]} icon={defaultMarker} />
                  <Marker position={[load.deliveryLat || 16.5062, load.deliveryLng || 80.6480]} icon={defaultMarker} />
                  
                  {/* Live Tracking Truck Marker */}
                  {location && <Marker position={[location.lat, location.lng]} icon={truckIcon} />}
                </MapContainer>
                
                <div className="map-footer text-muted" style={{ marginTop: '8px', fontSize: '12px' }}>
                  {location ? `Live Route Coordinates: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Route Map Ready. Awaiting Live Tracking Data.'}
                </div>
              </div>
            )}
          </div>

          <div className="card-static">
            <h3>Cargo Details</h3>
            {isEditingLoad ? (
              <form onSubmit={handleEditLoad} className="cargo-info" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Update Weight (kg)</label>
                  <input type="number" className="input" value={editLoadForm.cargoWeight} onChange={e => setEditLoadForm({...editLoadForm, cargoWeight: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{display:'flex', justifyContent:'space-between'}}>
                    <span>Update Price (₹)</span>
                    {routeInfo && <span style={{color:'#4A90E2', fontSize:'12px'}}>✨ AI Fare: ₹{routeInfo.suggestedPrice.toLocaleString()} ({routeInfo.distance.toFixed(1)} km)</span>}
                  </label>
                  <input type="number" className="input" value={editLoadForm.price} onChange={e => setEditLoadForm({...editLoadForm, price: e.target.value})} required />
                </div>
                <div style={{display:'flex', gap:'10px', marginTop: '10px'}}>
                  <button type="submit" className="btn btn-primary" disabled={updating}>Save Changes</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setIsEditingLoad(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <div className="cargo-info">
                <div className="cargo-item"><span className="cargo-label">Type</span><span className="cargo-value">{load.cargoType}</span></div>
                <div className="cargo-item"><span className="cargo-label">Weight</span><span className="cargo-value">{load.cargoWeight.toLocaleString()} kg</span></div>
                <div className="cargo-item"><span className="cargo-label">Truck</span><span className="cargo-value">{load.truckType}</span></div>
                <div className="cargo-item"><span className="cargo-label">Price</span><span className="cargo-value price">₹{load.price.toLocaleString()}</span></div>
                <div className="cargo-item"><span className="cargo-label">Pickup</span><span className="cargo-value">{new Date(load.pickupDate).toLocaleString()}</span></div>
                <div className="cargo-item"><span className="cargo-label">Delivery</span><span className="cargo-value">{new Date(load.deliveryDate).toLocaleString()}</span></div>
                
                {routeInfo && (
                  <div className="cargo-item" style={{ gridColumn: '1 / -1', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{display:'flex', flexDirection:'column'}}>
                      <span className="cargo-label" style={{color: '#4A90E2', fontWeight: 600}}>AI Distance Analysis ✨</span>
                      <span className="text-muted" style={{fontSize: '13px'}}>{routeInfo.distance.toFixed(1)} km mapped driving distance</span>
                    </div>
                    <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end'}}>
                      <span className="cargo-label" style={{color: '#4A90E2', fontWeight: 600}}>Recommended Amount ✨</span>
                      <span className="cargo-value price" style={{color: '#4A90E2'}}>₹{routeInfo.suggestedPrice.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {isDriver && load.status === 'open' && (
            <>
              {!myBid ? (
                <div className="card-static">
                  <h3>Place Your Bid</h3>
                  <form onSubmit={handlePlaceBid} className="bid-form">
                    {routeInfo && (
                      <div className="suggested-bid-banner" style={{background: 'rgba(74, 144, 226, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #4A90E2'}}>
                        <span style={{fontSize:'14px', color:'#4A90E2'}}>💡 <strong>Market Insight:</strong> Based on the mapped driving distance of <strong>{routeInfo.distance.toFixed(1)} km</strong> and a <strong>{load.truckType}</strong> hauling <strong>{load.cargoWeight}kg</strong>, the algorithmic recommended bid for this load is <strong>₹{routeInfo.suggestedPrice.toLocaleString()}</strong>.</span>
                      </div>
                    )}
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Bid Amount (₹)</label><input type="number" className="input" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} placeholder={`e.g. ${routeInfo?.suggestedPrice || 1000}`} required /></div>
                    </div>
                    <div className="form-group"><label className="form-label">Notes (Optional)</label><textarea className="input textarea" value={bidNotes} onChange={(e) => setBidNotes(e.target.value)} placeholder="Any notes..." rows={2} /></div>
                    <button type="submit" className="btn btn-primary" disabled={updating}>{updating ? 'Submitting...' : 'Place Bid'}</button>
                  </form>
                </div>
              ) : (
                <div className="card-static">
                  <h3>Your Active Bid</h3>
                  {isEditingBid ? (
                    <form onSubmit={handleEditBid} className="bid-form">
                      {routeInfo && (
                        <div className="suggested-bid-banner" style={{background: 'rgba(74, 144, 226, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #4A90E2'}}>
                          <span style={{fontSize:'14px', color:'#4A90E2'}}>✨ AI Recommends: ₹{routeInfo.suggestedPrice.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="form-group"><label className="form-label">Edit Amount (₹)</label><input type="number" className="input" value={editBidAmount} onChange={(e) => setEditBidAmount(e.target.value)} required /></div>
                      <div className="form-group"><label className="form-label">Edit Notes</label><textarea className="input textarea" value={editBidNotes} onChange={(e) => setEditBidNotes(e.target.value)} rows={2} /></div>
                      <div style={{display:'flex', gap:'10px'}}>
                        <button type="submit" className="btn btn-primary" disabled={updating}>Update Bid</button>
                        <button type="button" className="btn btn-ghost" onClick={() => setIsEditingBid(false)}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className="bid-item" style={{border: '1px solid var(--border)', padding: '16px', borderRadius: '8px'}}>
                      <div className="bid-info">
                        <span className="bid-amount" style={{fontSize: '24px'}}>₹{myBid.amount.toLocaleString()}</span>
                        <span className={`badge badge-${myBid.status}`}>{myBid.status}</span>
                      </div>
                      {myBid.notes && <p className="text-muted" style={{marginTop: '10px'}}>{myBid.notes}</p>}
                      {myBid.status === 'pending' && (
                        <button className="btn btn-secondary" style={{marginTop: '16px'}} onClick={() => {
                          setEditBidAmount(myBid.amount.toString());
                          setEditBidNotes(myBid.notes || '');
                          setIsEditingBid(true);
                        }}>Edit Amount</button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
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

            {isDriver && load.driverId === user?.id && ['accepted', 'arrived_pickup', 'loaded', 'en_route'].includes(load.currentStatus) && (
              <button
                className={`btn ${isTracking ? 'btn-danger' : 'btn-success'}`}
                onClick={() => setIsTracking(!isTracking)}
                style={{ width: '100%', marginTop: '10px' }}
              >
                {isTracking ? '🛑 Stop Sharing Location' : '📍 Share Real Live Location'}
              </button>
            )}
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
