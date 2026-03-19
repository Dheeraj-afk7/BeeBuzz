import React, { useState, useEffect, useCallback } from 'react';
import { paymentApi } from '../services/api';
import './Earnings.css';

interface Transaction {
  id: string;
  loadId?: string;
  amount: number;
  platformFee?: number;
  netAmount?: number;
  status: 'pending' | 'completed' | 'failed';
  type?: 'payment' | 'payout' | 'refund';
  description?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  createdAt: string;
}

interface EarningsData {
  transactions: Transaction[];
  pendingAmount: number;
  totalEarnings: number;
  availableBalance?: number;
  totalJobs?: number;
}

const Earnings: React.FC = () => {
  const [earnings, setEarnings] = useState<EarningsData>({
    transactions: [],
    pendingAmount: 0,
    totalEarnings: 0,
    availableBalance: 0,
    totalJobs: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await paymentApi.getEarnings();
      const data = response.data.data;
      
      setEarnings({
        transactions: data.transactions || [],
        pendingAmount: data.pendingAmount || 0,
        totalEarnings: data.totalEarnings || 0,
        availableBalance: data.availableBalance || 0,
        totalJobs: data.totalJobs || 0
      });
    } catch (err: any) {
      console.error('Failed to fetch earnings:', err);
      setError(err.response?.data?.message || 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="earnings-page animate-fadeIn">
        <div className="page-header">
          <h1>Earnings</h1>
          <p className="page-subtitle">Track your income and payments</p>
        </div>
        <div className="loading-container">
          <div className="loading">Loading earnings...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="earnings-page animate-fadeIn">
        <div className="page-header">
          <h1>Earnings</h1>
          <p className="page-subtitle">Track your income and payments</p>
        </div>
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="btn btn-primary" onClick={fetchEarnings}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="earnings-page animate-fadeIn">
      <div className="page-header">
        <div>
          <h1>Earnings</h1>
          <p className="page-subtitle">Track your income and payments</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchEarnings}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="earnings-stats">
        <div className="earnings-card primary">
          <div className="earnings-icon">💰</div>
          <div className="earnings-content">
            <span className="earnings-label">Total Earnings</span>
            <span className="earnings-value">{formatCurrency(earnings.totalEarnings)}</span>
          </div>
        </div>
        
        <div className="earnings-card warning">
          <div className="earnings-icon">⏳</div>
          <div className="earnings-content">
            <span className="earnings-label">Pending</span>
            <span className="earnings-value pending">{formatCurrency(earnings.pendingAmount)}</span>
          </div>
        </div>
        
        <div className="earnings-card success">
          <div className="earnings-icon">🏦</div>
          <div className="earnings-content">
            <span className="earnings-label">Available Balance</span>
            <span className="earnings-value success">{formatCurrency(earnings.availableBalance || 0)}</span>
          </div>
        </div>
        
        <div className="earnings-card info">
          <div className="earnings-icon">📋</div>
          <div className="earnings-content">
            <span className="earnings-label">Total Jobs</span>
            <span className="earnings-value">{earnings.totalJobs || 0}</span>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="transactions-section">
        <h2 className="section-title">Transaction History</h2>
        
        {earnings.transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No Transactions Yet</h3>
            <p>Your earnings will appear here once you complete deliveries.</p>
          </div>
        ) : (
          <div className="transactions-list">
            {earnings.transactions.map((tx) => (
              <div key={tx.id} className="transaction-card">
                <div className="tx-header">
                  <div className="tx-info">
                    <span className="tx-date">{formatDate(tx.createdAt)}</span>
                    <span className="tx-id">#{tx.id.slice(0, 8)}</span>
                  </div>
                  <span className={`badge badge-${tx.status}`}>
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </span>
                </div>
                
                <div className="tx-route">
                  {tx.pickupAddress && tx.deliveryAddress ? (
                    <span className="tx-address">
                      {tx.pickupAddress} → {tx.deliveryAddress}
                    </span>
                  ) : (
                    <span className="tx-description">{tx.description || 'N/A'}</span>
                  )}
                </div>
                
                <div className="tx-amounts">
                  <div className="amount-row">
                    <span className="amount-label">Gross Amount</span>
                    <span className="amount-value">{formatCurrency(tx.amount)}</span>
                  </div>
                  {tx.platformFee !== undefined && tx.platformFee > 0 && (
                    <div className="amount-row fee">
                      <span className="amount-label">Platform Fee</span>
                      <span className="amount-value">-{formatCurrency(tx.platformFee)}</span>
                    </div>
                  )}
                  {tx.netAmount !== undefined && (
                    <div className="amount-row net">
                      <span className="amount-label">Net Earnings</span>
                      <span className="amount-value">{formatCurrency(tx.netAmount)}</span>
                    </div>
                  )}
                </div>
                
                {tx.type && (
                  <div className="tx-type">
                    <span className="type-badge">{tx.type}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Earnings;
