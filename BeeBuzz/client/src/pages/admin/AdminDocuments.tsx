import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import './admin.css';

const AdminDocuments: React.FC = () => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending');

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const r = await adminApi.getPendingDocuments();
      setDrivers(r.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  const filtered = drivers.filter(d => {
    if (filter === 'all') return true;
    if (filter === 'pending') return d.document_status === 'pending';
    if (filter === 'verified') return d.document_status === 'verified';
    if (filter === 'rejected') return d.document_status === 'rejected';
    return true;
  });

  const handleAction = async (driverId: string, action: 'approve' | 'reject') => {
    setActionLoading(action + driverId);
    try {
      await adminApi.verifyUser(driverId, { action: action === 'approve' ? 'verify_doc' : 'reject_doc' });
      await fetchDocs();
      if (selected?.id === driverId) {
        const updated = drivers.find(d => d.id === driverId);
        setSelected(updated || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const docTypes = [
    { key: 'profile_photo', label: 'Profile Photo', icon: '🤳' },
    { key: 'license_photo', label: 'Driving License', icon: '📄' },
    { key: 'insurance_photo', label: 'Insurance Cert.', icon: '🛡' },
  ];

  const pendingCount = drivers.filter(d => d.document_status === 'pending').length;

  return (
    <div className="anim-fadeIn">
      {/* Lightbox */}
      {lightbox && (
        <div className="admin-modal-overlay" onClick={() => setLightbox(null)} style={{ zIndex: 2000 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src={lightbox} alt="Document" style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 12, objectFit: 'contain', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }} />
            <button className="admin-close-btn" onClick={() => setLightbox(null)}
              style={{ position: 'absolute', top: -12, right: -12, background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Documents', value: drivers.length, color: '#3b82f6', icon: '📁' },
          { label: 'Pending Review', value: pendingCount, color: '#f59e0b', icon: '⏳' },
          { label: 'Verified', value: drivers.filter(d => d.document_status === 'verified').length, color: '#10b981', icon: '✅' },
          { label: 'Rejected', value: drivers.filter(d => d.document_status === 'rejected').length, color: '#ef4444', icon: '✗' },
        ].map((c, i) => (
          <div key={i} style={{ flex: 1, background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 12, padding: '16px 18px', cursor: 'pointer' }}
            onClick={() => setFilter(c.label.toLowerCase().replace('total documents', 'all').replace('pending review', 'pending') as any)}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Driver List */}
        <div style={{ width: 300, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {(['pending', 'all', 'verified', 'rejected'] as const).map(f => (
              <button key={f} className={`admin-btn ${filter === f ? 'admin-btn-view' : 'admin-btn-secondary'}`}
                style={{ fontSize: 11, padding: '5px 10px' }}
                onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'pending' && pendingCount > 0 && ` (${pendingCount})`}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '70vh', overflowY: 'auto' }}>
            {loading ? (
              <div className="admin-loading"><div className="admin-spinner" /></div>
            ) : filtered.length === 0 ? (
              <div className="admin-empty"><div className="admin-empty-icon">📋</div>No documents</div>
            ) : filtered.map(d => (
              <div key={d.id}
                onClick={() => setSelected(d)}
                style={{
                  background: selected?.id === d.id ? 'var(--admin-amber-dim)' : 'var(--admin-surface)',
                  border: `1px solid ${selected?.id === d.id ? 'rgba(245,158,11,0.4)' : 'var(--admin-border)'}`,
                  borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{d.email}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{d.phone}</div>
                  </div>
                  <span className={`admin-status ${d.document_status}`} style={{ fontSize: 10 }}>{d.document_status}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {docTypes.map(dt => (
                    <div key={dt.key} style={{ fontSize: 16, opacity: d[dt.key] ? 1 : 0.3 }} title={dt.label}>{dt.icon}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Document Review Panel */}
        <div style={{ flex: 1 }}>
          {!selected ? (
            <div className="admin-chart-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Select a driver to review documents</div>
                <div style={{ fontSize: 13, marginTop: 8 }}>Click a driver on the left panel to view their uploaded documents</div>
              </div>
            </div>
          ) : (
            <div className="admin-chart-card">
              {/* Driver header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--admin-border)' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--admin-blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--admin-blue)' }}>
                    {selected.name?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>{selected.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selected.email} • {selected.phone}</div>
                    {selected.license_number && <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 2 }}>DL: {selected.license_number} | RC: {selected.vehicle_number}</div>}
                  </div>
                </div>
                <span className={`admin-status ${selected.document_status}`} style={{ fontSize: 13 }}>{selected.document_status}</span>
              </div>

              {/* Documents */}
              <div className="admin-section-title">📎 Uploaded Documents</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                {docTypes.map(dt => (
                  <div key={dt.key} style={{ background: 'var(--admin-surface-2)', border: '1px solid var(--admin-border)', borderRadius: 12, overflow: 'hidden' }}>
                    {selected[dt.key] ? (
                      <div style={{ position: 'relative' }}>
                        <img
                          src={selected[dt.key]}
                          alt={dt.label}
                          style={{ width: '100%', height: 180, objectFit: 'cover', cursor: 'zoom-in', display: 'block' }}
                          onClick={() => setLightbox(selected[dt.key])}
                        />
                        <div style={{ position: 'absolute', top: 8, right: 8 }}>
                          <button style={{ background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}
                            onClick={() => setLightbox(selected[dt.key])}>
                            🔍 Zoom
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: 36 }}>{dt.icon}</div>
                        <div style={{ fontSize: 12 }}>Not uploaded</div>
                      </div>
                    )}
                    <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{dt.label}</div>
                      {selected[dt.key] && (
                        <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>✓ Uploaded</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  className="admin-btn admin-btn-approve"
                  style={{ flex: 1, justifyContent: 'center', padding: '12px', fontSize: 14 }}
                  onClick={() => handleAction(selected.id, 'approve')}
                  disabled={actionLoading !== null || selected.document_status === 'verified'}>
                  {actionLoading === `approve${selected.id}` ? '⏳ Processing...' :
                    selected.document_status === 'verified' ? '✓ Already Verified' : '✓ Approve & Verify Driver'}
                </button>
                <button
                  className="admin-btn admin-btn-reject"
                  style={{ flex: 1, justifyContent: 'center', padding: '12px', fontSize: 14 }}
                  onClick={() => handleAction(selected.id, 'reject')}
                  disabled={actionLoading !== null}>
                  {actionLoading === `reject${selected.id}` ? '⏳ Processing...' : '✗ Reject Documents'}
                </button>
              </div>

              {selected.document_status === 'rejected' && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--admin-red-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: 'var(--admin-red)' }}>
                  ⚠ Documents rejected. Driver needs to re-upload corrected documents.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDocuments;
