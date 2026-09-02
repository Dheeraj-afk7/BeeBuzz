import React, { useState } from 'react';
import './Modal.css';

interface OtpModalProps {
  onVerify: (otp: string) => Promise<void>;
  onCancel: () => void;
}

const OtpModal: React.FC<OtpModalProps> = ({ onVerify, onCancel }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await onVerify(otp);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid OTP');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fadeIn" style={{ maxWidth: '400px', textAlign: 'center' }}>
        <div className="modal-header">
          <h3 style={{ margin: '0 auto' }}>Verify Payment Release</h3>
          <button className="close-btn" onClick={onCancel} disabled={loading} style={{ position: 'absolute', right: '20px' }}>×</button>
        </div>
        
        <div className="modal-body">
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>✉️</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            We've sent a 6-digit verification code to your registered email address.
          </p>

          <form onSubmit={handleSubmit}>
            {error && <div className="auth-error" style={{ marginBottom: '15px' }}>{error}</div>}
            
            <div className="form-group">
              <input 
                type="text" 
                className="input" 
                placeholder="000000" 
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ fontSize: '2rem', textAlign: 'center', letterSpacing: '10px' }}
                required 
                disabled={loading}
                autoFocus
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Release Funds'}
            </button>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '15px' }}>
              Check your terminal (Ethereal test email preview link)
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OtpModal;
