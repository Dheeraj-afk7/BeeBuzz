import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import './admin.css';

// ── Recharts-free bar chart component ──
const BarChart: React.FC<{ data: { label: string; value: number; color?: string }[]; height?: number }> = ({ data, height = 120 }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height, padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
            {d.value > 0 ? (d.value >= 1000 ? `₹${(d.value/1000).toFixed(0)}k` : d.value) : ''}
          </div>
          <div
            style={{
              width: '100%',
              borderRadius: '4px 4px 0 0',
              background: d.color || 'linear-gradient(180deg, #f59e0b, rgba(245,158,11,0.3))',
              transition: 'height 0.6s ease',
              minHeight: 4,
              height: `${(d.value / max) * 80}%`,
            }}
          />
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
            {d.label}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Sparkline (mini line chart) ──
const Sparkline: React.FC<{ values: number[]; color?: string; width?: number; height?: number }> = ({
  values, color = '#f59e0b', width = 80, height = 30
}) => {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ── Donut ──
const DonutChart: React.FC<{ segments: { label: string; value: number; color: string }[] }> = ({ segments }) => {
  const total = segments.reduce((a, b) => a + b.value, 0) || 1;
  let cumulative = 0;
  const r = 40, cx = 50, cy = 50;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="donut-wrap">
      <svg width={100} height={100} viewBox="0 0 100 100">
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const offset = circumference - cumulative * circumference;
          const dasharray = `${pct * circumference} ${(1 - pct) * circumference}`;
          const el = (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="12"
              strokeDasharray={dasharray}
              strokeDashoffset={offset - circumference * 0.25}
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
          );
          cumulative += pct;
          return el;
        })}
        <circle cx={cx} cy={cy} r={27} fill="var(--admin-surface)" />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text-primary)">
          {total}
        </text>
      </svg>
      <div className="donut-legend">
        {segments.map((s, i) => (
          <div key={i} className="donut-legend-item">
            <div className="donut-dot" style={{ background: s.color }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{s.label}</span>
            <span style={{ color: s.color, fontWeight: 700, marginLeft: 'auto', fontSize: 12 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  icon: string; label: string; value: string | number;
  color: string; change?: string; changeUp?: boolean; sparkData?: number[];
}> = ({ icon, label, value, color, change, changeUp, sparkData }) => (
  <div className={`admin-stat-card ${color}`}>
    <div className="admin-stat-icon">{icon}</div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div className="admin-stat-value">{value}</div>
        <div className="admin-stat-label">{label}</div>
        {change && (
          <div className={`admin-stat-change ${changeUp ? 'up' : 'down'}`}>
            {changeUp ? '↑' : '↓'} {change}
          </div>
        )}
      </div>
      {sparkData && <Sparkline values={sparkData} color={color === 'green' ? '#10b981' : color === 'blue' ? '#3b82f6' : '#f59e0b'} />}
    </div>
  </div>
);

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getStats()
      .then(r => setStats(r.data.data))
      .catch(err => console.error('Stats error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="admin-loading">
      <div className="admin-spinner"></div>
      Loading analytics...
    </div>
  );

  const overview = stats?.overview || {};
  const charts = stats?.charts || {};

  // Build last-7-days bar data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const found = (charts.recentLoads || []).find((r: any) => r.date?.startsWith(dateStr));
    return {
      label: d.toLocaleDateString('en', { weekday: 'short' }),
      value: found ? parseInt(found.count) : 0,
    };
  });

  const last30Revenue = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i) * 2);
    const dateStr = d.toISOString().split('T')[0];
    const found = (charts.revenueByDay || []).find((r: any) => r.date?.startsWith(dateStr));
    return {
      label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      value: found ? Math.round(parseFloat(found.revenue)) : 0,
      color: 'linear-gradient(180deg, #3b82f6, rgba(59,130,246,0.3))',
    };
  });

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: '#f59e0b' },
    accepted: { label: 'Accepted', color: '#3b82f6' },
    en_route: { label: 'In Transit', color: '#06b6d4' },
    delivered: { label: 'Delivered', color: '#10b981' },
    cancelled: { label: 'Cancelled', color: '#ef4444' },
  };

  const statusSegments = (charts.loadsByStatus || []).map((s: any) => ({
    label: statusMap[s.status]?.label || s.status,
    value: parseInt(s.count),
    color: statusMap[s.status]?.color || '#64748b',
  }));

  const revenueSparkData = last30Revenue.map(d => d.value);

  return (
    <div className="anim-fadeIn">
      {/* Overview Stats */}
      <div className="admin-stats-grid">
        <StatCard icon="👥" label="Total Users" value={overview.totalUsers || 0} color="blue"
          change="+12% this month" changeUp sparkData={[40,45,42,50,55,60,overview.totalUsers || 0]} />
        <StatCard icon="🚚" label="Total Orders" value={overview.totalLoads || 0} color="amber"
          change="+8% this week" changeUp sparkData={[20,25,22,30,28,35,overview.totalLoads || 0]} />
        <StatCard icon="💰" label="Total Revenue" value={`₹${(overview.totalRevenue || 0).toLocaleString()}`} color="green"
          change="+15% MTD" changeUp sparkData={revenueSparkData.slice(-7)} />
        <StatCard icon="🔒" label="In Escrow" value={`₹${(overview.pendingEscrow || 0).toLocaleString()}`} color="purple"
          change="Active holds" />
        <StatCard icon="✅" label="Completed" value={overview.completedLoads || 0} color="green"
          change="Delivered orders" changeUp />
        <StatCard icon="⚡" label="Active Orders" value={overview.activeLoads || 0} color="cyan" />
        <StatCard icon="📋" label="Pending KYC" value={overview.pendingDocs || 0} color="red"
          change="Needs review" />
        <StatCard icon="🏆" label="Verified Users" value={overview.verifiedUsers || 0} color="green" />
      </div>

      {/* Charts Row */}
      <div className="admin-charts-grid">
        {/* Orders last 7 days */}
        <div className="admin-chart-card">
          <div className="admin-chart-header">
            <div>
              <div className="admin-chart-title">📦 Orders — Last 7 Days</div>
              <div className="admin-chart-subtitle">Daily order volume trend</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                {last7Days.reduce((a, b) => a + b.value, 0)}
              </div>
              <div style={{ fontSize: 11, color: '#10b981' }}>↑ This week</div>
            </div>
          </div>
          <BarChart data={last7Days} height={140} />
        </div>

        {/* Load Status Donut */}
        <div className="admin-chart-card">
          <div className="admin-chart-header">
            <div>
              <div className="admin-chart-title">📊 Order Status Breakdown</div>
              <div className="admin-chart-subtitle">All-time distribution</div>
            </div>
          </div>
          {statusSegments.length > 0 ? (
            <DonutChart segments={statusSegments} />
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>No order data yet</div>
          )}
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="admin-chart-card" style={{ marginBottom: 24 }}>
        <div className="admin-chart-header">
          <div>
            <div className="admin-chart-title">💵 Revenue — Last 30 Days</div>
            <div className="admin-chart-subtitle">Daily transaction volume (INR)</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#3b82f6' }}>
              ₹{last30Revenue.reduce((a, b) => a + b.value, 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>30-day total</div>
          </div>
        </div>
        <BarChart data={last30Revenue} height={160} />
      </div>

      {/* Top Performers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Top Drivers */}
        <div className="admin-table-card">
          <div className="admin-table-header">
            <div className="admin-table-title">🏆 Top Drivers</div>
          </div>
          <table className="admin-table">
            <thead><tr>
              <th>Driver</th><th>Jobs</th><th>Rating</th><th>Earned</th>
            </tr></thead>
            <tbody>
              {(charts.topDrivers || []).length === 0 ? (
                <tr><td colSpan={4} className="admin-empty">No data yet</td></tr>
              ) : (charts.topDrivers || []).map((d: any, i: number) => (
                <tr key={d.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--admin-amber-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--admin-amber)', flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--admin-amber)', fontWeight: 700 }}>{d.total_jobs}</td>
                  <td>⭐ {parseFloat(d.rating || 5).toFixed(1)}</td>
                  <td style={{ color: '#10b981', fontWeight: 600 }}>₹{Math.round(d.total_earned).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Shippers */}
        <div className="admin-table-card">
          <div className="admin-table-header">
            <div className="admin-table-title">📦 Top Shippers</div>
          </div>
          <table className="admin-table">
            <thead><tr>
              <th>Shipper</th><th>Loads</th><th>Spent</th>
            </tr></thead>
            <tbody>
              {(charts.topShippers || []).length === 0 ? (
                <tr><td colSpan={3} className="admin-empty">No data yet</td></tr>
              ) : (charts.topShippers || []).map((s: any, i: number) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--admin-purple-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--admin-purple)', flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                        {s.company_name && <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{s.company_name}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--admin-purple)', fontWeight: 700 }}>{s.total_loads}</td>
                  <td style={{ color: '#10b981', fontWeight: 600 }}>₹{Math.round(s.total_spent).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User breakdown */}
      <div className="admin-chart-card">
        <div className="admin-chart-header">
          <div>
            <div className="admin-chart-title">👥 User Composition</div>
            <div className="admin-chart-subtitle">Platform user breakdown</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Drivers', value: overview.totalDrivers || 0, color: '#3b82f6', icon: '🚚' },
            { label: 'Shippers', value: overview.totalShippers || 0, color: '#8b5cf6', icon: '📦' },
            { label: 'Verified', value: overview.verifiedUsers || 0, color: '#10b981', icon: '✅' },
            { label: 'Pending KYC', value: overview.pendingDocs || 0, color: '#f59e0b', icon: '📋' },
          ].map((item, i) => (
            <div key={i} style={{ flex: '1 1 140px', background: 'var(--admin-surface-2)', border: '1px solid var(--admin-border)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 28 }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
