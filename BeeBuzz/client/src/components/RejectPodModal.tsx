import React, { useState } from 'react';
import './Modal.css';

interface RejectPodModalProps {
  onReject: (comment: string) => Promise<void>;
  onCancel: () => void;
}

const RejectPodModal: React.FC<RejectPodModalProps> = ({ onReject, onCancel }) => {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Please provide a reason so the driver knows what to fix.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onReject(comment.trim());
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reject delivery');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fadeIn" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3 style={{ margin: '0', color: 'var(--danger)' }}>⚠️ Reject Proof of Delivery</h3>
          <button className="close-btn" onClick={onCancel} disabled={loading} style={{ marginLeft: 'auto' }}>×</button>
        </div>

        <div className="modal-body">
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '20px',
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.6'
          }}>
            <strong style={{ color: 'var(--danger)' }}>Important:</strong> Rejecting this delivery will revert the load back to <strong>"Arrived at Delivery"</strong> status. The driver will be required to re-upload clear proof of delivery photos.
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="auth-error" style={{ marginBottom: '15px' }}>{error}</div>
            )}

            <div className="form-group">
              <label className="form-label">Reason for Rejection *</label>
              <textarea
                className="input textarea"
                placeholder="e.g. Photos are blurry, items not visible, wrong location, recipient not visible..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                required
                disabled={loading}
                autoFocus
                style={{ resize: 'vertical', minHeight: '120px' }}
              />
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                This message will be shown to the driver.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="submit"
                className="btn btn-danger"
                style={{ flex: 1 }}
                disabled={loading || !comment.trim()}
              >
                {loading ? 'Processing...' : '❌ Reject & Request Re-upload'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onCancel}
                disabled={loading}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RejectPodModal;
