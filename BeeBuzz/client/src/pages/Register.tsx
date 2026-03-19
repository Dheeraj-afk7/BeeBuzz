import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    role: 'shipper', companyName: '', gstin: '', licenseNumber: '', vehicleType: '', vehicleNumber: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(formData);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-background">
        <div className="bg-shape shape-1"></div>
        <div className="bg-shape shape-2"></div>
        <div className="bg-shape shape-3"></div>
      </div>
      
      <div className="auth-container animate-fadeIn">
        <div className="auth-header">
          <div className="auth-logo">🐝</div>
          <h1>Join Beebuzz</h1>
          <p>Create your account to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          
          <div className="form-group">
            <label className="form-label">I am a...</label>
            <select name="role" value={formData.role} onChange={handleChange} className="select">
              <option value="shipper">🌸 Shipper (Sending Goods)</option>
              <option value="driver">🐝 Driver (Transporting Goods)</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" name="name" className="input" value={formData.name} onChange={handleChange} placeholder="John Doe" required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input type="tel" name="phone" className="input" value={formData.phone} onChange={handleChange} placeholder="+91 9876543210" required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" name="email" className="input" value={formData.email} onChange={handleChange} placeholder="you@example.com" required />
          </div>

          {formData.role === 'shipper' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input type="text" name="companyName" className="input" value={formData.companyName} onChange={handleChange} placeholder="Company Pvt Ltd" />
              </div>
              <div className="form-group">
                <label className="form-label">GSTIN</label>
                <input type="text" name="gstin" className="input" value={formData.gstin} onChange={handleChange} placeholder="GSTIN Number" />
              </div>
            </div>
          )}

          {formData.role === 'driver' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">License Number</label>
                <input type="text" name="licenseNumber" className="input" value={formData.licenseNumber} onChange={handleChange} placeholder="DL Number" />
              </div>
              <div className="form-group">
                <label className="form-label">Vehicle Type</label>
                <input type="text" name="vehicleType" className="input" value={formData.vehicleType} onChange={handleChange} placeholder="Truck Type" />
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" name="password" className="input" value={formData.password} onChange={handleChange} placeholder="Create a password" required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input type="password" name="confirmPassword" className="input" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm password" required />
            </div>
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
