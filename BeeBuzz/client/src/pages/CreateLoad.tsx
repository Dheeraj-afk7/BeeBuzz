import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadApi } from '../services/api';

const CreateLoad: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    pickupAddress: '', pickupLat: 28.6139, pickupLng: 77.2090,
    deliveryAddress: '', deliveryLat: 19.0760, deliveryLng: 72.8777,
    cargoType: '', cargoWeight: '', truckType: '', pickupDate: '', deliveryDate: '', price: '', specialRequirements: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
            <div className="form-group"><label className="form-label">Address</label><input type="text" name="pickupAddress" className="input" value={form.pickupAddress} onChange={handleChange} placeholder="Enter pickup address" required /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Latitude</label><input type="number" step="any" name="pickupLat" className="input" value={form.pickupLat} onChange={handleChange} required /></div>
              <div className="form-group"><label className="form-label">Longitude</label><input type="number" step="any" name="pickupLng" className="input" value={form.pickupLng} onChange={handleChange} required /></div>
            </div>
          </div>
          <div className="form-section">
            <h3>🏁 Delivery Location</h3>
            <div className="form-group"><label className="form-label">Address</label><input type="text" name="deliveryAddress" className="input" value={form.deliveryAddress} onChange={handleChange} placeholder="Enter delivery address" required /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Latitude</label><input type="number" step="any" name="deliveryLat" className="input" value={form.deliveryLat} onChange={handleChange} required /></div>
              <div className="form-group"><label className="form-label">Longitude</label><input type="number" step="any" name="deliveryLng" className="input" value={form.deliveryLng} onChange={handleChange} required /></div>
            </div>
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
                <label className="form-label">Offer Price (₹)</label>
                <input type="number" name="price" className="input" value={form.price} onChange={handleChange} placeholder="0" required />
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
