import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../services/api';
import './admin.css';

const AdminPayments: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.getPayments({ status: statusFilter, page, limit });
      setPayments(r.data.data.payments);
      setTotal(r.data.data.total);
      setSummary(r.data.data.summary || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const summaryCards = [
    { label: 'Total Volume', value: `₹${Math.round(summary.total_volume || 0).toLocaleString()}`, color: '#3b82f6', icon: '💳' },
    { label: 'Platform Fees', value: `₹${Math.round(summary.total_fees || 0).toLocaleString()}`, color: '#f59e0b', icon: '🏦' },
    { label: 'In Escrow', value: `₹${Math.round(summary.held || 0).toLocaleString()}`, color: '#8b5cf6', icon: '🔒' },
    { label: 'Released', value: `₹${Math.round(summary.released || 0).toLocaleString()}`, color: '#10b981', icon: '✅' },
  ];

  return (
    <div className="anim-fadeIn">
      {/* Summary Cards */}
      <div className="admin-stats-grid" style={{ marginBottom: 24 }}>
        {summaryCards.map((c, i) => (
          <div key={i} className="admin-stat-card" style={{ borderColor: `${c.color}22` }}>
            <div className="admin-stat-icon" style={{ background: `${c.color}18`, fontSize: 20 }}>{c.icon}</div>
            <div className="admin-stat-value" style={{ color: c.color }}>{c.value}</div>
            <div className="admin-stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="admin-table-card">
        <div className="admin-table-header">
          <div className="admin-table-title">Payment Ledger ({total})</div>
          <select className="admin-filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Payments</option>
            <option value="held">In Escrow</option>
            <option value="released">Released</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        {loading ? (
          <div className="admin-loading"><div className="admin-spinner"></div> Loading payments...</div>
        ) : (
          <table className="admin-table">
            <thead><tr>
              <th>Payment ID</th><th>Shipper</th><th>Driver</th>
              <th>Route</th><th>Amount</th><th>Platform Fee</th>
              <th>Net Payout</th><th>Status</th><th>Date</th>
            </tr></thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={9}><div className="admin-empty"><div className="admin-empty-icon">💳</div>No payments found</div></td></tr>
              ) : payments.map(p => (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#f59e0b' }}>#{p.id?.slice(0, 10)}</td>
                  <td style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.shipper_name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.shipper_email}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.driver_name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.driver_email}</div>
                  </td>
                  <td style={{ fontSize: 11 }}>
                    <div>{p.pickup_address?.split(',')[0]}</div>
                    <div style={{ color: 'var(--text-muted)' }}>→ {p.delivery_address?.split(',')[0]}</div>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{Math.round(p.amount || 0).toLocaleString()}</td>
                  <td style={{ color: '#f59e0b' }}>₹{Math.round(p.platform_fee || 0).toLocaleString()}</td>
                  <td style={{ fontWeight: 700, color: '#10b981' }}>₹{Math.round(p.net_amount || 0).toLocaleString()}</td>
                  <td>
                    <span className={`admin-status ${p.status}`}>{p.status}</span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(p.created_at).toLocaleDateString()}
                    {p.released_at && <div style={{ color: '#10b981' }}>Released: {new Date(p.released_at).toLocaleDateString()}</div>}
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
    </div>
  );
};

export default AdminPayments;
