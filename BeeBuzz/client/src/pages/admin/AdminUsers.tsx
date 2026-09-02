import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../services/api';
import './admin.css';

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const limit = 15;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.getUsers({ search, role: roleFilter, status: statusFilter, page, limit });
      setUsers(r.data.data.users);
      setTotal(r.data.data.total);
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openUser = async (id: string) => {
    setModalLoading(true);
    try {
      const r = await adminApi.getUser(id);
      setSelectedUser(r.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleVerify = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(action);
    try {
      await adminApi.verifyUser(id, { action });
      if (selectedUser) {
        const r = await adminApi.getUser(id);
        setSelectedUser(r.data.data);
      }
      fetchUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (u: any) => {
    if (u.isVerified) return <span className="admin-status verified">✓ Verified</span>;
    if (u.documentStatus === 'rejected') return <span className="admin-status rejected">✗ Rejected</span>;
    return <span className="admin-status pending">⏳ Pending</span>;
  };

  return (
    <div className="anim-fadeIn">
      <div className="admin-table-card">
        <div className="admin-table-header">
          <div className="admin-table-title">Users ({total})</div>
          <input
            className="admin-search"
            placeholder="🔍 Search by name, email, phone..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <select className="admin-filter-select" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="">All Roles</option>
            <option value="driver">Drivers</option>
            <option value="shipper">Shippers</option>
          </select>
          <select className="admin-filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending KYC</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loading ? (
          <div className="admin-loading"><div className="admin-spinner"></div> Loading users...</div>
        ) : (
          <table className="admin-table">
            <thead><tr>
              <th>User</th><th>Role</th><th>Phone</th><th>License / Vehicle</th>
              <th>Jobs</th><th>Rating</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={8}><div className="admin-empty"><div className="admin-empty-icon">👤</div>No users found</div></td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: u.role === 'driver' ? 'var(--admin-blue-dim)' : 'var(--admin-purple-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: u.role === 'driver' ? 'var(--admin-blue)' : 'var(--admin-purple)', flexShrink: 0 }}>
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{u.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`admin-status ${u.role}`}>{u.role}</span></td>
                  <td>{u.phone}</td>
                  <td style={{ fontSize: 11 }}>
                    {u.licenseNumber && <div>DL: {u.licenseNumber}</div>}
                    {u.vehicleNumber && <div>RC: {u.vehicleNumber}</div>}
                    {!u.licenseNumber && !u.vehicleNumber && <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--admin-amber)' }}>{u.totalJobs || 0}</td>
                  <td>⭐ {parseFloat(u.rating || 5).toFixed(1)}</td>
                  <td>{statusBadge(u)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="admin-btn admin-btn-view" onClick={() => openUser(u.id)}>👁 View</button>
                      {!u.isVerified && (
                        <button className="admin-btn admin-btn-approve" onClick={() => handleVerify(u.id, 'approve')}
                          disabled={actionLoading === 'approve'}>✓</button>
                      )}
                      {u.isVerified && (
                        <button className="admin-btn admin-btn-reject" onClick={() => handleVerify(u.id, 'reject')}
                          disabled={actionLoading === 'reject'}>✗</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="admin-pagination">
          <span>Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}</span>
          <button className="admin-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <button className="admin-page-btn" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser !== null && (
        <div className="admin-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            {modalLoading ? (
              <div className="admin-loading"><div className="admin-spinner" /></div>
            ) : (
              <>
                <div className="admin-modal-header">
                  <div>
                    <div className="admin-modal-title">{selectedUser.user?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{selectedUser.user?.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {statusBadge(selectedUser.user)}
                    <button className="admin-close-btn" onClick={() => setSelectedUser(null)}>✕</button>
                  </div>
                </div>

                {/* User info grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  {[
                    ['Role', selectedUser.user?.role],
                    ['Phone', selectedUser.user?.phone],
                    ['Company', selectedUser.user?.companyName || '—'],
                    ['GSTIN', selectedUser.user?.gstin || '—'],
                    ['License No.', selectedUser.user?.licenseNumber || '—'],
                    ['Vehicle No.', selectedUser.user?.vehicleNumber || '—'],
                    ['Total Jobs', selectedUser.user?.totalJobs || 0],
                    ['Rating', `⭐ ${parseFloat(selectedUser.user?.rating || 5).toFixed(1)}`],
                    ['Joined', new Date(selectedUser.user?.createdAt).toLocaleDateString()],
                    ['DL Verified', selectedUser.user?.dlVerified ? '✓ Yes' : '✗ No'],
                  ].map(([label, val]) => (
                    <div key={label} style={{ background: 'var(--admin-surface-2)', border: '1px solid var(--admin-border)', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Documents */}
                {selectedUser.user?.role === 'driver' && (
                  <>
                    <div className="admin-section-title">📎 Uploaded Documents</div>
                    <div className="doc-grid" style={{ marginBottom: 20 }}>
                      {[
                        { label: 'Profile Photo', photo: selectedUser.user?.profilePhoto, icon: '🤳' },
                        { label: 'Driving License', photo: selectedUser.user?.licensePhoto, icon: '📄' },
                        { label: 'Insurance Cert.', photo: selectedUser.user?.insurancePhoto, icon: '🛡' },
                      ].map(doc => (
                        <div key={doc.label} className="doc-item">
                          {doc.photo ? (
                            <img src={doc.photo} alt={doc.label} onClick={() => window.open(doc.photo, '_blank')} style={{ cursor: 'zoom-in' }} />
                          ) : (
                            <div className="doc-item-no-img">{doc.icon}</div>
                          )}
                          <div className="doc-item-label">
                            <span>{doc.label}</span>
                            {doc.photo ? (
                              <span style={{ fontSize: 10, color: '#f59e0b' }}>⏳</span>
                            ) : (
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Not uploaded</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Approve / Reject */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                      <button className="admin-btn admin-btn-approve" style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => handleVerify(selectedUser.user.id, 'approve')}
                        disabled={actionLoading !== null || selectedUser.user.isVerified}>
                        {selectedUser.user.isVerified ? '✓ Already Verified' : '✓ Approve & Verify Driver'}
                      </button>
                      <button className="admin-btn admin-btn-reject" style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => handleVerify(selectedUser.user.id, 'reject')}
                        disabled={actionLoading !== null}>
                        ✗ Reject Documents
                      </button>
                    </div>
                  </>
                )}

                {/* Recent Orders */}
                {selectedUser.loads?.length > 0 && (
                  <>
                    <div className="admin-section-title">📦 Recent Orders</div>
                    <table className="admin-table" style={{ marginBottom: 16 }}>
                      <thead><tr><th>ID</th><th>Route</th><th>Status</th><th>Price</th></tr></thead>
                      <tbody>
                        {selectedUser.loads.slice(0, 5).map((l: any) => (
                          <tr key={l.id}>
                            <td style={{ fontFamily: 'monospace', fontSize: 11 }}>#{l.id.slice(0, 8)}</td>
                            <td style={{ fontSize: 11 }}>{l.pickup_address?.split(',')[0]} → {l.delivery_address?.split(',')[0]}</td>
                            <td><span className={`admin-status ${l.status}`}>{l.status}</span></td>
                            <td style={{ color: '#10b981', fontWeight: 600 }}>₹{parseInt(l.price).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
