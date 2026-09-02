import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../services/api';
import './admin.css';

const statusColors: Record<string, string> = {
  open: 'pending', assigned: 'in-transit', in_transit: 'in-transit',
  delivered: 'delivered', cancelled: 'cancelled'
};

const AdminOrders: React.FC = () => {
  const [loads, setLoads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLoad, setSelectedLoad] = useState<any>(null);
  const limit = 15;

  const fetchLoads = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.getLoads({ search, status: statusFilter, page, limit });
      setLoads(r.data.data.loads);
      setTotal(r.data.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { fetchLoads(); }, [fetchLoads]);

  const statusFlow = ['pending', 'accepted', 'arrived_pickup', 'loaded', 'en_route', 'arrived_delivery', 'delivered_pending_verification', 'delivered'];
  const statusLabels: Record<string, string> = {
    pending: 'Bidding', accepted: 'Assigned', arrived_pickup: 'At Pickup', loaded: 'Loaded',
    en_route: 'In Transit', arrived_delivery: 'At Delivery', delivered_pending_verification: 'POD Review', delivered: 'Delivered'
  };

  return (
    <div className="anim-fadeIn">
      <div className="admin-table-card">
        <div className="admin-table-header">
          <div className="admin-table-title">Orders ({total})</div>
          <input
            className="admin-search"
            placeholder="🔍 Search by route or shipper..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <select className="admin-filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div className="admin-loading"><div className="admin-spinner"></div> Loading orders...</div>
        ) : (
          <table className="admin-table">
            <thead><tr>
              <th>Order ID</th><th>Route</th><th>Shipper</th><th>Driver</th>
              <th>Cargo</th><th>Price</th><th>Status</th><th>Date</th><th></th>
            </tr></thead>
            <tbody>
              {loads.length === 0 ? (
                <tr><td colSpan={9}><div className="admin-empty"><div className="admin-empty-icon">📦</div>No orders found</div></td></tr>
              ) : loads.map(l => (
                <tr key={l.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#f59e0b' }}>#{l.id?.slice(0, 8)}</td>
                  <td style={{ fontSize: 12 }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{l.pickup_address?.split(',')[0]}</div>
                    <div style={{ color: 'var(--text-muted)' }}>→ {l.delivery_address?.split(',')[0]}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{l.shipper_name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.shipper_email}</div>
                  </td>
                  <td>
                    {l.driver_name ? (
                      <>
                        <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{l.driver_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.driver_email}</div>
                      </>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Unassigned</span>}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    <div>{l.cargo_type}</div>
                    <div style={{ color: 'var(--text-muted)' }}>{l.cargo_weight?.toLocaleString()} kg</div>
                  </td>
                  <td style={{ color: '#10b981', fontWeight: 700, fontSize: 13 }}>₹{parseInt(l.price || 0).toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span className={`admin-status ${statusColors[l.status] || 'pending'}`}>{l.status}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{statusLabels[l.current_status] || l.current_status}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(l.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="admin-btn admin-btn-view" onClick={() => setSelectedLoad(l)}>👁</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="admin-pagination">
          <span>Showing {Math.min((page-1)*limit+1, total)}–{Math.min(page*limit, total)} of {total}</span>
          <button className="admin-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <button className="admin-page-btn" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      </div>

      {/* Load Detail Modal */}
      {selectedLoad && (
        <div className="admin-modal-overlay" onClick={() => setSelectedLoad(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="admin-modal-header">
              <div>
                <div className="admin-modal-title">Order #{selectedLoad.id?.slice(0, 8).toUpperCase()}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Posted {new Date(selectedLoad.created_at).toLocaleString()}
                </div>
              </div>
              <button className="admin-close-btn" onClick={() => setSelectedLoad(null)}>✕</button>
            </div>

            {/* Status Timeline */}
            <div style={{ marginBottom: 24 }}>
              <div className="admin-section-title">🗓 Status Timeline</div>
              <div style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
                {statusFlow.map((s, i) => {
                  const currentIdx = statusFlow.indexOf(selectedLoad.current_status);
                  const isPast = i < currentIdx;
                  const isCurrent = i === currentIdx;
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 80 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: isCurrent ? '#f59e0b' : isPast ? '#10b981' : 'var(--admin-surface-2)',
                          border: `2px solid ${isCurrent ? '#f59e0b' : isPast ? '#10b981' : 'var(--admin-border)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, color: isCurrent || isPast ? '#000' : 'var(--text-muted)',
                          fontWeight: 700, marginBottom: 6,
                          boxShadow: isCurrent ? '0 0 12px rgba(245,158,11,0.5)' : 'none',
                          transition: 'all 0.3s',
                        }}>
                          {isPast ? '✓' : i + 1}
                        </div>
                        <div style={{ fontSize: 9, color: isCurrent ? '#f59e0b' : isPast ? '#10b981' : 'var(--text-muted)', textAlign: 'center', fontWeight: isCurrent ? 700 : 400 }}>
                          {statusLabels[s]}
                        </div>
                      </div>
                      {i < statusFlow.length - 1 && (
                        <div style={{ height: 2, background: isPast ? '#10b981' : 'var(--admin-border)', flex: 1, marginBottom: 22 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                ['Shipper', selectedLoad.shipper_name],
                ['Driver', selectedLoad.driver_name || 'Unassigned'],
                ['Pickup', selectedLoad.pickup_address],
                ['Delivery', selectedLoad.delivery_address],
                ['Cargo Type', selectedLoad.cargo_type],
                ['Weight', `${selectedLoad.cargo_weight?.toLocaleString()} kg`],
                ['Truck Type', selectedLoad.truck_type],
                ['Price', `₹${parseInt(selectedLoad.price || 0).toLocaleString()}`],
                ['Pickup Date', new Date(selectedLoad.pickup_date).toLocaleDateString()],
                ['Delivery Date', new Date(selectedLoad.delivery_date).toLocaleDateString()],
              ].map(([label, val]) => (
                <div key={label} style={{ background: 'var(--admin-surface-2)', border: '1px solid var(--admin-border)', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
