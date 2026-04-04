import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadApi } from '../services/api';
import LocationPicker from '../components/LocationPicker';

const CreateLoad: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    pickupAddress: '', pickupLat: 28.6139, pickupLng: 77.2090,
    deliveryAddress: '', deliveryLat: 19.0760, deliveryLng: 72.8777,
    cargoType: '', cargoWeight: '', truckType: '', pickupDate: '', deliveryDate: '', price: '', specialRequirements: ''
  });
  const [recommendedPrice, setRecommendedPrice] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    const { pickupLat, pickupLng, deliveryLat, deliveryLng, cargoWeight, truckType } = form;
    if (pickupLat && deliveryLat && cargoWeight && truckType) {
      const fetchPricing = async () => {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${deliveryLng},${deliveryLat}?overview=false`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            const distanceKM = data.routes[0].distance / 1000;
            setDistance(distanceKM);
            
            let rate = 20;
            const type = truckType.toLowerCase();
            if (type.includes('pickup')) rate = 15;
            else if (type.includes('mini')) rate = 18;
            else if (type.includes('lorry')) rate = 25;
            else if (type.includes('container')) rate = 35;
            else if (type.includes('flatbed')) rate = 40;
            
            let multiplier = 1;
            const weight = parseFloat(cargoWeight);
            if (weight > 500) multiplier = 1.1;
            if (weight > 1000) multiplier = 1.25;
            
            setRecommendedPrice(Math.round(distanceKM * rate * multiplier));
          }
        } catch (e) {
          console.error("OSRM failed route fetch", e);
        }
      };
      
      const timer = setTimeout(() => fetchPricing(), 800);
      return () => clearTimeout(timer);
    }
  }, [form.pickupLat, form.pickupLng, form.deliveryLat, form.deliveryLng, form.cargoWeight, form.truckType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLocationSelect = (type: 'pickup' | 'delivery', address: string, lat: number, lng: number) => {
    setForm(prev => ({
      ...prev,
      [`${type}Address`]: address,
      [`${type}Lat`]: lat,
      [`${type}Lng`]: lng,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loadApi.create({ ...form, cargoWeight: parseFloat(form.cargoWeight), price: parseFloat(form.price) });
      navigate('/loads');
    } catch (err: any) { setError(err.response?.data?.error || 'Failed to create load'); }
    finally { setLoading(false); }
  };

  return (
    <div className="create-load animate-fadeIn">
      <div className="page-header"><h1>Post New Load</h1><p className="page-subtitle">Fill in the details to create a new shipment</p></div>
      <div className="form-container">
        <form onSubmit={handleSubmit} className="load-form">
          {error && <div className="form-error-banner">{error}</div>}
          <div className="form-section">
            <h3>📍 Pickup Location</h3>
            <LocationPicker 
              label="Search address or click on map" 
              defaultLat={form.pickupLat}
              defaultLng={form.pickupLng}
              onLocationSelect={(addr, lat, lng) => handleLocationSelect('pickup', addr, lat, lng)} 
            />
          </div>
          <div className="form-section">
            <h3>🏁 Delivery Location</h3>
            <LocationPicker 
              label="Search address or click on map" 
              defaultLat={form.deliveryLat}
              defaultLng={form.deliveryLng}
              onLocationSelect={(addr, lat, lng) => handleLocationSelect('delivery', addr, lat, lng)} 
            />
          </div>
          <div className="form-section">
            <h3>📦 Cargo Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Cargo Type</label>
                <select name="cargoType" className="select" value={form.cargoType} onChange={handleChange} required>
                  <option value="">Select type</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Food">Food & Beverages</option>
                  <option value="Machinery">Machinery</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Weight (kg)</label>
                <input type="number" name="cargoWeight" className="input" value={form.cargoWeight} onChange={handleChange} placeholder="0" required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Truck Type</label>
                <select name="truckType" className="select" value={form.truckType} onChange={handleChange} required>
                  <option value="">Select truck</option>
                  <option value="Pickup">Pickup</option>
                  <option value="Mini Truck">Mini Truck</option>
                  <option value="Lorry">Lorry</option>
                  <option value="Container">Container</option>
                  <option value="Flatbed">Flatbed</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                  <span>Offer Price (₹)</span>
                  {recommendedPrice && distance !== null && (
                    <span style={{color: '#4A90E2', fontSize: '12px', fontWeight: 'bold'}}>
                      ✨ AI Fare: ₹{recommendedPrice.toLocaleString()} ({distance.toFixed(1)} km)
                    </span>
                  )}
                </label>
                <input type="number" name="price" className="input" value={form.price} onChange={handleChange} placeholder={recommendedPrice ? `e.g. ${recommendedPrice}` : "0"} required />
              </div>
            </div>
            <div className="form-group"><label className="form-label">Special Requirements</label><textarea name="specialRequirements" className="input textarea" value={form.specialRequirements} onChange={handleChange} placeholder="Any special instructions..." rows={2} /></div>
          </div>
          <div className="form-section">
            <h3>📅 Schedule</h3>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Pickup Date</label><input type="datetime-local" name="pickupDate" className="input" value={form.pickupDate} onChange={handleChange} required /></div>
              <div className="form-group"><label className="form-label">Delivery Date</label><input type="datetime-local" name="deliveryDate" className="input" value={form.deliveryDate} onChange={handleChange} required /></div>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/loads')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Posting...' : 'Post Load'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLoad;
