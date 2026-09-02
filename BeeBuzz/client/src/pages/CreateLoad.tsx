import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadApi } from '../services/api';
import LocationPicker from '../components/LocationPicker';
import './CreateLoad.css';

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
  const [aiData, setAiData] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [activeTier, setActiveTier] = useState<string | null>(null);

  useEffect(() => {
    // Reset AI pricing if parameters change to avoid mismatched calculations
    setAiData(null);
    setActiveTier(null);
  }, [form.cargoWeight, form.truckType, form.cargoType, form.pickupAddress, form.deliveryAddress]);

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

  const handleAiOptimize = async () => {
    if (!distance || !form.cargoWeight || !form.truckType || !form.cargoType) return;
    setAiLoading(true);
    try {
      const response = await (loadApi as any).aiPricing({
        distance,
        weight: parseFloat(form.cargoWeight),
        truckType: form.truckType,
        cargoType: form.cargoType,
        pickupAddress: form.pickupAddress,
        deliveryAddress: form.deliveryAddress
      });
      if (response.data?.success) {
        const payload = response.data.data;
        setAiData(payload);
        setForm(prev => ({ ...prev, price: String(payload.pricingTiers.balanced.price) }));
        setActiveTier('balanced');
      }
    } catch (err) {
      console.error("AI dynamic pricing error:", err);
    } finally {
      setAiLoading(false);
    }
  };

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
    } catch (err: any) { 
      setError(err.response?.data?.error || 'Failed to create load'); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="create-load-container animate-fadeIn">
      <div className="page-header">
        <h1>Post New Load</h1>
        <p className="page-subtitle">Fill in the details to create a new shipment with dynamic ML-optimized rates</p>
      </div>

      {error && <div className="form-error" style={{
        padding: '12px 18px',
        background: 'rgba(239, 68, 68, 0.1)',
        color: 'var(--danger)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '24px',
        fontSize: '0.9rem'
      }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="create-load-grid">
          {/* Left Column - Route & Schedule */}
          <div className="load-form-left">
            <div className="form-section-glass">
              <h3>📍 Pickup Location</h3>
              <LocationPicker 
                label="Search address or click on map" 
                defaultLat={form.pickupLat}
                defaultLng={form.pickupLng}
                onLocationSelect={(addr, lat, lng) => handleLocationSelect('pickup', addr, lat, lng)} 
              />
            </div>

            <div className="form-section-glass">
              <h3>🏁 Delivery Location</h3>
              <LocationPicker 
                label="Search address or click on map" 
                defaultLat={form.deliveryLat}
                defaultLng={form.deliveryLng}
                onLocationSelect={(addr, lat, lng) => handleLocationSelect('delivery', addr, lat, lng)} 
              />
            </div>

            <div className="form-section-glass">
              <h3>📅 Schedule & Directives</h3>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Pickup Date</label>
                  <input type="datetime-local" name="pickupDate" className="input" value={form.pickupDate} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Delivery Date</label>
                  <input type="datetime-local" name="deliveryDate" className="input" value={form.deliveryDate} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Special Requirements</label>
                <textarea 
                  name="specialRequirements" 
                  className="textarea" 
                  value={form.specialRequirements} 
                  onChange={handleChange} 
                  placeholder="E.g., refrigerated container, tail-lift required, fragile cargo handling..." 
                  rows={3} 
                />
              </div>
            </div>
          </div>

          {/* Right Column - Cargo Details & AI pricing */}
          <div className="load-form-right">
            <div className="form-section-glass">
              <h3>📦 Cargo & Vehicle Specification</h3>
              
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Cargo Type</label>
                  <select name="cargoType" className="select" value={form.cargoType} onChange={handleChange} required>
                    <option value="">Select type</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Food & Beverages">Food & Beverages</option>
                    <option value="Machinery">Machinery</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Weight (kg)</label>
                  <input type="number" name="cargoWeight" className="input" value={form.cargoWeight} onChange={handleChange} placeholder="e.g. 500" required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Truck Type</label>
                <select name="truckType" className="select" value={form.truckType} onChange={handleChange} required>
                  <option value="">Select truck type</option>
                  <option value="Pickup">Pickup</option>
                  <option value="Mini Truck">Mini Truck</option>
                  <option value="Lorry">Lorry</option>
                  <option value="Container">Container</option>
                  <option value="Flatbed">Flatbed</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Offer Price (₹)</label>
                  {distance !== null && (
                    <span style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: '700' }}>
                      {recommendedPrice !== null ? `Est. Base: ₹${recommendedPrice.toLocaleString()} | ` : ''}🛣️ {distance.toFixed(1)} km route
                    </span>
                  )}
                </div>
                
                <input type="number" name="price" className="input" value={form.price} onChange={handleChange} placeholder="Enter your offer price" required />

                {/* AI Dynamic Pricing Section */}
                {distance !== null && form.cargoWeight && form.truckType && form.cargoType && !aiData && (
                  <div className="ai-pricing-trigger-card">
                    <span>
                      🔮 <strong>BeeBuzz AI Engine</strong> is ready! We will analyze real-time spot rates, diesel indexes, monsoon premiums, and corridor density for you.
                    </span>
                    <button
                      type="button"
                      className="btn-ai-optimize"
                      onClick={handleAiOptimize}
                      disabled={aiLoading}
                    >
                      {aiLoading ? (
                        <>
                          <span style={{
                            width: '12px',
                            height: '12px',
                            border: '2px solid #000',
                            borderTopColor: 'transparent',
                            borderRadius: '50%',
                            display: 'inline-block',
                            animation: 'spin 0.8s linear infinite',
                            marginRight: '6px'
                          }}></span>
                          Fitting ML Regressor...
                        </>
                      ) : '✨ Optimize Price with AI'}
                    </button>
                  </div>
                )}

                {aiData && (
                  <div className="ai-pricing-panel">
                    <div className="ai-panel-header">
                      <h4 className="ai-panel-title">🔮 BeeBuzz ML Pricing Core</h4>
                      <span className="ai-panel-badge">
                        Model Status: Verified ({aiData.mlMetadata.r2.toFixed(2)}% R²)
                      </span>
                    </div>

                    <div className="ai-panel-tags">
                      <span className="ai-tag">🛣️ {aiData.demandLevel} ({aiData.demandSurge >= 0 ? `+${aiData.demandSurge}%` : `${aiData.demandSurge}%`})</span>
                      <span className="ai-tag">🌧️ {aiData.weatherCondition} ({aiData.weatherSurge >= 0 ? `+${aiData.weatherSurge}%` : `${aiData.weatherSurge}%`})</span>
                      <span className="ai-tag">⛽ Diesel Index: ₹{aiData.fuelPrice}/L</span>
                    </div>

                    <div className="ai-tiers-grid">
                      <div 
                        className={`pricing-tier-card ${activeTier === 'budget' ? 'active' : ''}`}
                        onClick={() => {
                          setForm(prev => ({ ...prev, price: String(aiData.pricingTiers.budget.price) }));
                          setActiveTier('budget');
                        }}
                      >
                        <span className="tier-title">Budget 💰</span>
                        <span className="tier-price">₹{aiData.pricingTiers.budget.price.toLocaleString()}</span>
                        <span className="tier-time budget">⏱️ {aiData.pricingTiers.budget.timeEstimate}</span>
                        <span className="tier-match">{aiData.pricingTiers.budget.probability} Match</span>
                      </div>

                      <div 
                        className={`pricing-tier-card ${activeTier === 'balanced' ? 'active' : ''}`}
                        onClick={() => {
                          setForm(prev => ({ ...prev, price: String(aiData.pricingTiers.balanced.price) }));
                          setActiveTier('balanced');
                        }}
                      >
                        <span className="tier-title">Balanced ⚖️</span>
                        <span className="tier-price">₹{aiData.pricingTiers.balanced.price.toLocaleString()}</span>
                        <span className="tier-time balanced">⏱️ {aiData.pricingTiers.balanced.timeEstimate}</span>
                        <span className="tier-match">{aiData.pricingTiers.balanced.probability} Match</span>
                      </div>

                      <div 
                        className={`pricing-tier-card ${activeTier === 'fast' ? 'active' : ''}`}
                        onClick={() => {
                          setForm(prev => ({ ...prev, price: String(aiData.pricingTiers.fast.price) }));
                          setActiveTier('fast');
                        }}
                      >
                        <span className="tier-title">Priority 🚀</span>
                        <span className="tier-price">₹{aiData.pricingTiers.fast.price.toLocaleString()}</span>
                        <span className="tier-time fast">⏱️ {aiData.pricingTiers.fast.timeEstimate}</span>
                        <span className="tier-match">{aiData.pricingTiers.fast.probability} Match</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Smart Cost Breakdown Receipt */}
            {distance !== null && form.price && (() => {
              const offerVal = parseFloat(form.price) || 0;
              const fuelCost = Math.round(distance * 8 * (aiData ? aiData.fuelPrice / 95.0 : 1.0));
              const platformFee = Math.round(offerVal * 0.05);
              const tolls = Math.round(distance * 3);
              const driverNet = Math.max(0, offerVal - platformFee - fuelCost - tolls);

              return (
                <div className="cost-breakdown-card">
                  <div className="breakdown-header">
                    <h4 className="breakdown-title">📊 Smart Cost Breakdown</h4>
                    <span className="breakdown-distance">{distance.toFixed(1)} km route</span>
                  </div>
                  <div className="breakdown-rows">
                    <div className="breakdown-row">
                      <span className="label">Est. Fuel Consumption</span>
                      <span className="value">₹{fuelCost.toLocaleString()}</span>
                    </div>
                    <div className="breakdown-row">
                      <span className="label">Operational Tolls</span>
                      <span className="value">₹{tolls.toLocaleString()}</span>
                    </div>
                    <div className="breakdown-row">
                      <span className="label">BeeBuzz Platform Fee (5%)</span>
                      <span className="value">₹{platformFee.toLocaleString()}</span>
                    </div>
                    <div className="breakdown-divider" />
                    <div className="breakdown-row total">
                      <span className="label">💵 Driver Net Takehome</span>
                      <span className="value">₹{driverNet.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/loads')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Posting...' : 'Post Load'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Embedded CSS animation for spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CreateLoad;
