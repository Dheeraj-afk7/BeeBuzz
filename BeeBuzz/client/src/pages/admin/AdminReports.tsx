import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import './admin.css';

// ── Reusable Chart Components ──────────────────────────────────────────────

const AreaChart: React.FC<{ data: { x: string; y: number }[]; color?: string; height?: number }> = ({
  data, color = '#f59e0b', height = 180
}) => {
  if (!data || data.length === 0) return <div style={{ color: 'var(--text-muted)', padding: 20, fontSize: 13 }}>No data available</div>;
  const max = Math.max(...data.map(d => d.y), 1);
  const w = 600; const h = height;
  const padLeft = 50; const padBottom = 30; const padTop = 20; const padRight = 20;
  const chartW = w - padLeft - padRight;
  const chartH = h - padBottom - padTop;

  const points = data.map((d, i) => ({
    x: padLeft + (i / (data.length - 1 || 1)) * chartW,
    y: padTop + chartH - (d.y / max) * chartH,
    label: d.x,
    value: d.y,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${points[points.length - 1].x.toFixed(1)},${h - padBottom} L${padLeft},${h - padBottom} Z`;

  const gradId = `grad-${color.replace('#', '')}`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
        const y = padTop + chartH * (1 - pct);
        return (
          <g key={i}>
            <line x1={padLeft} y1={y} x2={w - padRight} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
            <text x={padLeft - 8} y={y + 4} textAnchor="end" fontSize="9" fill="rgba(148,163,184,0.6)">
              {pct === 0 ? 0 : `${Math.round(max * pct / 1000)}k`}
            </text>
          </g>
        );
      })}
      {/* Area fill */}
      <path d={areaD} fill={`url(#${gradId})`} />
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill={color} stroke="var(--admin-surface)" strokeWidth="2" />
          {i % Math.max(1, Math.floor(points.length / 8)) === 0 && (
            <text x={p.x} y={h - padBottom + 16} textAnchor="middle" fontSize="8" fill="rgba(148,163,184,0.7)">
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
};

const HorizontalBar: React.FC<{ items: { label: string; value: number; color: string }[]; maxValue?: number }> = ({ items, maxValue }) => {
  const max = maxValue || Math.max(...items.map(i => i.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
            <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
            <span style={{ color: item.color, fontWeight: 700 }}>{item.value.toLocaleString()}</span>
          </div>
          <div style={{ height: 8, background: 'var(--admin-surface-2)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${(item.value / max) * 100}%`,
              background: `linear-gradient(90deg, ${item.color}, ${item.color}88)`,
              borderRadius: 4, transition: 'width 0.8s ease',
              minWidth: item.value > 0 ? 4 : 0,
            }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const AdminReports: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getStats()
      .then(r => setStats(r.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="admin-loading"><div className="admin-spinner" /> Loading analytics...</div>;

  const charts = stats?.charts || {};
  const overview = stats?.overview || {};

  // Build area chart data for revenue
  const revenueData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toISOString().split('T')[0];
    const found = (charts.revenueByDay || []).find((r: any) => r.date?.startsWith(dateStr));
    return {
      x: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      y: found ? Math.round(parseFloat(found.revenue)) : 0,
    };
  });

  // Orders per day
  const ordersData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toISOString().split('T')[0];
    const found = (charts.recentLoads || []).find((r: any) => r.date?.startsWith(dateStr));
    return {
      x: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      y: found ? parseInt(found.count) : 0,
    };
  });

  // Monthly loads
  const monthlyData = (charts.loadsByMonth || []).map((m: any) => ({
    x: m.month?.split(' ')[0] || '',
    y: parseInt(m.count) || 0,
  }));

  // Status distribution
  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending / Bidding', color: '#f59e0b' },
    accepted: { label: 'Assigned', color: '#3b82f6' },
    en_route: { label: 'In Transit', color: '#06b6d4' },
    delivered: { label: 'Delivered', color: '#10b981' },
    cancelled: { label: 'Cancelled', color: '#ef4444' },
  };
  const statusBars = (charts.loadsByStatus || []).map((s: any) => ({
    label: statusMap[s.status]?.label || s.status,
    value: parseInt(s.count),
    color: statusMap[s.status]?.color || '#64748b',
  }));

  // Platform metrics
  const conversionRate = overview.totalLoads > 0
    ? ((overview.completedLoads / overview.totalLoads) * 100).toFixed(1)
    : '0';

  const avgOrderValue = overview.completedLoads > 0
    ? Math.round(overview.totalRevenue / overview.completedLoads)
    : 0;

  const platformFeeRevenue = Math.round(overview.totalRevenue * 0.05);

  return (
    <div className="anim-fadeIn">
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Conversion Rate', value: `${conversionRate}%`, sub: 'Orders completed vs. posted', color: '#10b981', icon: '📈' },
          { label: 'Avg. Order Value', value: `₹${avgOrderValue.toLocaleString()}`, sub: 'Per completed shipment', color: '#3b82f6', icon: '💰' },
          { label: 'Platform Revenue', value: `₹${platformFeeRevenue.toLocaleString()}`, sub: '5% commission earned', color: '#f59e0b', icon: '🏦' },
          { label: 'Driver Utilization', value: overview.totalDrivers > 0 ? `${Math.min(100, Math.round((overview.activeLoads / (overview.totalDrivers || 1)) * 100))}%` : '0%', sub: 'Active loads per driver', color: '#8b5cf6', icon: '🚚' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: 22, marginBottom: 10 }}>{kpi.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, marginTop: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Revenue Area Chart */}
      <div className="admin-chart-card" style={{ marginBottom: 20 }}>
        <div className="admin-chart-header">
          <div>
            <div className="admin-chart-title">💵 Revenue Trend — Last 30 Days</div>
            <div className="admin-chart-subtitle">Daily escrow transaction volume</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>
            ₹{revenueData.reduce((a, b) => a + b.y, 0).toLocaleString()}
          </div>
        </div>
        <AreaChart data={revenueData} color="#f59e0b" height={180} />
      </div>

      {/* Orders Area Chart */}
      <div className="admin-chart-card" style={{ marginBottom: 20 }}>
        <div className="admin-chart-header">
          <div>
            <div className="admin-chart-title">📦 Order Volume — Last 30 Days</div>
            <div className="admin-chart-subtitle">Daily shipments created</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#3b82f6' }}>
            {ordersData.reduce((a, b) => a + b.y, 0)} orders
          </div>
        </div>
        <AreaChart data={ordersData} color="#3b82f6" height={150} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Monthly orders bar */}
        <div className="admin-chart-card">
          <div className="admin-chart-header">
            <div>
              <div className="admin-chart-title">📅 Monthly Order Volume</div>
              <div className="admin-chart-subtitle">Last 6 months</div>
            </div>
          </div>
          {monthlyData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140, padding: '0 4px' }}>
              {monthlyData.map((d: any, i: number) => {
                const max = Math.max(...monthlyData.map((m: any) => m.y), 1);
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>{d.y || ''}</div>
                    <div style={{ width: '100%', borderRadius: '6px 6px 0 0', background: `linear-gradient(180deg, #10b981, rgba(16,185,129,0.3))`, height: `${(d.y / max) * 85}%`, minHeight: 4, transition: 'height 0.6s ease' }} />
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.x}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>No data for last 6 months</div>
          )}
        </div>

        {/* Status distribution */}
        <div className="admin-chart-card">
          <div className="admin-chart-header">
            <div>
              <div className="admin-chart-title">📊 Order Status Distribution</div>
              <div className="admin-chart-subtitle">All-time breakdown</div>
            </div>
          </div>
          {statusBars.length > 0 ? (
            <HorizontalBar items={statusBars} />
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>No orders yet</div>
          )}
        </div>
      </div>

      {/* Top Performers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="admin-chart-card">
          <div className="admin-chart-header">
            <div className="admin-chart-title">🚚 Top Drivers by Revenue</div>
          </div>
          {(charts.topDrivers || []).length > 0 ? (
            <HorizontalBar
              items={(charts.topDrivers || []).map((d: any, i: number) => ({
                label: d.name,
                value: Math.round(d.total_earned),
                color: ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4'][i] || '#f59e0b',
              }))}
            />
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>No driver data</div>
          )}
        </div>

        <div className="admin-chart-card">
          <div className="admin-chart-header">
            <div className="admin-chart-title">📦 Top Shippers by Spend</div>
          </div>
          {(charts.topShippers || []).length > 0 ? (
            <HorizontalBar
              items={(charts.topShippers || []).map((d: any, i: number) => ({
                label: d.name,
                value: Math.round(d.total_spent),
                color: ['#8b5cf6', '#3b82f6', '#f59e0b', '#10b981', '#06b6d4'][i] || '#8b5cf6',
              }))}
            />
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>No shipper data</div>
          )}
        </div>
      </div>

      {/* Platform Health */}
      <div className="admin-chart-card">
        <div className="admin-chart-header">
          <div className="admin-chart-title">🏥 Platform Health Metrics</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'User Growth Rate', value: `+${overview.totalUsers || 0} users`, icon: '📈', color: '#10b981', sub: 'All time' },
            { label: 'KYC Completion', value: overview.totalDrivers > 0 ? `${Math.round((overview.verifiedUsers / (overview.totalDrivers || 1)) * 100)}%` : '0%', icon: '✅', color: '#3b82f6', sub: 'Drivers verified' },
            { label: 'Escrow Utilization', value: overview.totalRevenue > 0 ? `${Math.round((overview.pendingEscrow / overview.totalRevenue) * 100)}%` : '0%', icon: '🔒', color: '#8b5cf6', sub: 'Funds in escrow' },
          ].map((m, i) => (
            <div key={i} style={{ background: 'var(--admin-surface-2)', border: '1px solid var(--admin-border)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>{m.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{m.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
