import React, { useState, useEffect, useRef } from 'react';
import { authApi } from '../services/api';
import './Auth.css';
import './admin/admin.css';


const Profile: React.FC = () => {
  const [localUser, setLocalUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankIfscCode: '',
    signature: '',
    licenseNumber: '',
    vehicleNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [payingChallanId, setPayingChallanId] = useState<string | null>(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isDrawing, setIsDrawing] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [docPreviews, setDocPreviews] = useState<Record<string, string>>({});

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync user details and fetch latest from server
  useEffect(() => {
    const fetchLatestUser = async () => {
      try {
        const response = await authApi.getMe();
        const latestUser = response.data.data;
        setLocalUser(latestUser);
        setFormData({
          name: latestUser.name || '',
          phone: latestUser.phone || '',
          bankAccountName: latestUser.bankAccountName || '',
          bankAccountNumber: latestUser.bankAccountNumber || '',
          bankIfscCode: latestUser.bankIfscCode || '',
          signature: latestUser.signature || '',
          licenseNumber: latestUser.licenseNumber || '',
          vehicleNumber: latestUser.vehicleNumber || ''
        });
        localStorage.setItem('user', JSON.stringify(latestUser));
      } catch (err) {
        console.error('Failed to fetch latest user:', err);
      }
    };
    fetchLatestUser();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const response = await authApi.updateProfile(formData);
      setLocalUser(response.data.data);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Update local storage user object
      localStorage.setItem('user', JSON.stringify(response.data.data));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  // --- HTML5 Canvas Signature Pad Logic ---
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#4A90E2'; // Clean blue color
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveCanvasSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Check if canvas has drawing in it (basic check)
    const base64 = canvas.toDataURL('image/png');
    setFormData(prev => ({ ...prev, signature: base64 }));
    setMessage({ type: 'success', text: 'Signature captured! Please click "Save Changes" at the bottom to commit it.' });
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) {
      alert("Signature image must be under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData(prev => ({ ...prev, signature: event.target!.result as string }));
        setMessage({ type: 'success', text: 'Signature uploaded! Please click "Save Changes" at the bottom to commit it.' });
      }
    };
    reader.readAsDataURL(file);
  };

  // --- Driver Verification (Simulated) ---
  const handleVerifyDriver = async () => {
    if (!formData.licenseNumber || !formData.vehicleNumber) {
      setMessage({ type: 'error', text: 'Please enter both Driving License and Vehicle Plate numbers first!' });
      return;
    }
    setVerifying(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await authApi.verifyDriver({
        licenseNumber: formData.licenseNumber,
        vehicleNumber: formData.vehicleNumber
      });
      setLocalUser(response.data.data);
      localStorage.setItem('user', JSON.stringify(response.data.data));
      setFormData(prev => ({
        ...prev,
        licenseNumber: response.data.data.licenseNumber || '',
        vehicleNumber: response.data.data.vehicleNumber || ''
      }));
      setMessage({ type: 'success', text: 'Verification check complete. Simulated report generated.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Verification check failed' });
    } finally {
      setVerifying(false);
    }
  };

  // --- Document Upload ---
  const handleDocumentUpload = async (documentType: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: `${documentType} file exceeds 5MB limit.` });
      return;
    }
    setUploadingDoc(documentType);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        setDocPreviews(prev => ({ ...prev, [documentType]: base64 }));
        try {
          await authApi.uploadDocument({ documentType, documentPhoto: base64 });
          setMessage({ type: 'success', text: `${documentType === 'profile' ? 'Profile photo' : documentType === 'license' ? 'License' : 'Insurance'} uploaded! Admin team will review shortly.` });
        } catch (err: any) {
          setMessage({ type: 'error', text: err.response?.data?.error || 'Upload failed' });
        } finally {
          setUploadingDoc(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setUploadingDoc(null);
    }
  };

  const handlePayChallan = async (challanId: string) => {
    setPayingChallanId(challanId);
    try {
      const response = await authApi.payChallan({ challanId });
      setLocalUser(response.data.data);
      localStorage.setItem('user', JSON.stringify(response.data.data));
      setMessage({ type: 'success', text: 'Challan paid and settled successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to pay challan' });
    } finally {
      setPayingChallanId(null);
    }
  };

  const report = localUser?.verificationReport ? JSON.parse(localUser.verificationReport) : null;

  return (
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: '2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      <div className="auth-container animate-fadeIn" style={{ maxWidth: '600px', width: '100%', margin: '0' }}>
        <div className="auth-header" style={{ marginBottom: '1.5rem' }}>
          <h2>My Profile</h2>
          <p>Manage your account, signature, and banking details</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {message.text && (
            <div className={`auth-error`} style={{ background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : '', color: message.type === 'success' ? '#10b981' : '', border: message.type === 'success' ? '1px solid #10b981' : '' }}>
              {message.text}
            </div>
          )}
          
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" name="name" className="input" value={formData.name} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input type="tel" name="phone" className="input" value={formData.phone} onChange={handleChange} />
          </div>

          {/* Interactive Signature Canvas Section */}
          <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            Authorized Dynamic Signature
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Draw or upload your signature to place on dynamically generated cargo invoice waybills.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed var(--border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <canvas
                ref={canvasRef}
                width={450}
                height={150}
                style={{ background: '#121214', border: '1px solid #2d2d30', borderRadius: '6px', cursor: 'crosshair', maxWidth: '100%' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button type="button" className="btn" style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }} onClick={clearCanvas}>
                  Clear Pad
                </button>
                <button type="button" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={saveCanvasSignature}>
                  Capture Drawing
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>OR</span>
              <label className="btn" style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                Upload Image File
                <input type="file" accept="image/*" onChange={handleSignatureUpload} style={{ display: 'none' }} />
              </label>
            </div>

            {formData.signature && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px', background: 'rgba(74, 144, 226, 0.05)', border: '1px solid rgba(74, 144, 226, 0.2)', padding: '12px', borderRadius: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4A90E2', marginBottom: '8px' }}>Captured Active Signature Preview:</span>
                <img src={formData.signature} alt="Signature Preview" style={{ maxHeight: '80px', background: 'white', padding: '6px', borderRadius: '4px' }} />
              </div>
            )}
          </div>

          <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            Banking Details for Escrow
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            {localUser?.role === 'shipper' 
              ? 'These details will be used to process refunds if a load is cancelled.' 
              : 'Your verified escrow payments will be securely deposited into this account.'}
          </p>

          <div className="form-group">
            <label className="form-label">Account Holder Name</label>
            <input type="text" name="bankAccountName" className="input" value={formData.bankAccountName} onChange={handleChange} placeholder="e.g., John Doe" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input type="text" name="bankAccountNumber" className="input" value={formData.bankAccountNumber} onChange={handleChange} placeholder="e.g., 1234567890" />
            </div>
            <div className="form-group">
              <label className="form-label">IFSC Code</label>
              <input type="text" name="bankIfscCode" className="input" value={formData.bankIfscCode} onChange={handleChange} placeholder="e.g., HDFC0001234" />
            </div>
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading} style={{ marginTop: '1.5rem' }}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Driver Documents & Verification Side Panel */}
      {localUser?.role === 'driver' && (
        <div className="auth-container animate-fadeIn" style={{ maxWidth: '550px', width: '100%', margin: '0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Document Upload Section */}
          <div style={{ marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>Documents & KYC</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Upload documents for admin team verification</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
            {[
              { key: 'profile', label: 'Profile Photo', icon: '🤳', current: localUser?.profilePhoto || docPreviews['profile'] },
              { key: 'license', label: 'Driving License', icon: '📄', current: localUser?.licensePhoto || docPreviews['license'] },
              { key: 'insurance', label: 'Insurance Cert.', icon: '🛡', current: localUser?.insurancePhoto || docPreviews['insurance'] },
            ].map(doc => (
              <label key={doc.key} style={{
                border: `2px dashed ${doc.current ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
                borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 8, cursor: 'pointer',
                background: doc.current ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.02)',
                transition: 'all 0.2s', textAlign: 'center', position: 'relative',
              }}>
                {uploadingDoc === doc.key ? (
                  <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 24, height: 24, border: '2px solid rgba(74,144,226,0.3)', borderTopColor: '#4A90E2', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : doc.current ? (
                  <img src={doc.current} alt={doc.label} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8 }} />
                ) : (
                  <div style={{ height: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <span style={{ fontSize: 28 }}>{doc.icon}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Click to upload</span>
                  </div>
                )}
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{doc.label}</div>
                <div style={{ fontSize: 10 }}>
                  {doc.current ? (
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>⏳ Pending Review</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Not uploaded</span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    if (e.target.files?.[0]) handleDocumentUpload(doc.key, e.target.files[0]);
                  }}
                />
              </label>
            ))}
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>Driver Verification Check</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Simulated license & vehicle check — for production, connects to MoRTH APIs</p>
          </div>

          <div className="card-static" style={{ display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', width: '100%' }}>
              <span style={{ fontWeight: 'bold' }}>Verification Status:</span>
              <span className={`badge`} style={{ 
                background: localUser.isVerified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                color: localUser.isVerified ? '#10b981' : '#f59e0b',
                border: `1px solid ${localUser.isVerified ? '#10b981' : '#f59e0b'}`,
                padding: '4px 10px',
                borderRadius: '20px',
                fontWeight: 'bold',
                fontSize: '12px'
              }}>
                {localUser.isVerified ? '✓ Verified Carrier' : '⚠ Unverified KYC'}
              </span>
            </div>

            {localUser.dlVerified ? (
              <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '12px', borderRadius: '6px', fontSize: '13px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Driving License Number:</span>
                  <span style={{ fontWeight: 'bold', color: '#10b981' }}>{localUser.licenseNumber}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Vehicle Plate Number:</span>
                  <span style={{ fontWeight: 'bold', color: '#10b981' }}>{localUser.vehicleNumber}</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ margin: '0' }}>
                  <label className="form-label" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Driving License (DL) Number</label>
                  <input 
                    type="text" 
                    name="licenseNumber" 
                    className="input" 
                    value={formData.licenseNumber} 
                    onChange={handleChange} 
                    placeholder="e.g., DL-1420110012345" 
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                  />
                </div>
                <div className="form-group" style={{ margin: '0' }}>
                  <label className="form-label" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Vehicle Plate (RC) Number</label>
                  <input 
                    type="text" 
                    name="vehicleNumber" 
                    className="input" 
                    value={formData.vehicleNumber} 
                    onChange={handleChange} 
                    placeholder="e.g., DL-01-A-1234" 
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>
            )}

            {!localUser.dlVerified ? (
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleVerifyDriver} 
                disabled={verifying || !formData.licenseNumber || !formData.vehicleNumber}
                style={{ width: '100%', marginTop: '4px' }}
              >
                {verifying ? 'Running Verification Check...' : '🔍 Run Verification Check (Simulated)'}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.02)', borderRadius: '6px', padding: '12px' }}>
                  <div style={{ fontWeight: 'bold', color: '#10b981', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    🏛 Ministry of Road Transport & Highways Validation
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><strong>License Holder:</strong> {report?.holderName}</div>
                    <div><strong>Registered Class:</strong> {report?.licenseClass}</div>
                    <div><strong>Expiry:</strong> {report?.dateOfExpiry}</div>
                  </div>
                </div>

                <div style={{ border: '1px solid rgba(74, 144, 226, 0.3)', background: 'rgba(74, 144, 226, 0.02)', borderRadius: '6px', padding: '12px' }}>
                  <div style={{ fontWeight: 'bold', color: '#4A90E2', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    🚛 VAHAN Database RC Validation
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><strong>Vehicle Type:</strong> {report?.vahanStatus?.vehicleClass}</div>
                    <div><strong>Insurance Status:</strong> {report?.vahanStatus?.insuranceStatus}</div>
                    <div><strong>Fitness Status:</strong> {report?.vahanStatus?.fitnessStatus}</div>
                  </div>
                </div>

                {report?.challans && (
                  <div style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '13px', marginBottom: '10px' }}>
                      📋 Active Traffic Challans Ledger ({report.challans.filter((c: any) => c.status === 'unpaid').length})
                    </div>
                    {report.challans.length === 0 ? (
                      <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>✓ Clean driving record! No active challans found.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {report.challans.map((challan: any) => (
                          <div key={challan.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px' }}>
                            <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{challan.violation}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>ID: {challan.id} • Amount: ₹{challan.amount}</span>
                            </div>
                            {challan.status === 'unpaid' ? (
                              <button 
                                type="button" 
                                className="btn btn-primary" 
                                style={{ padding: '4px 8px', fontSize: '10px' }}
                                onClick={() => handlePayChallan(challan.id)}
                                disabled={payingChallanId === challan.id}
                              >
                                {payingChallanId === challan.id ? 'Paying...' : 'Pay Challan'}
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#10b981' }}>Paid ✓</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <button type="button" className="btn" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }} onClick={handleVerifyDriver} disabled={verifying}>
                  Run Validation Recheck
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
