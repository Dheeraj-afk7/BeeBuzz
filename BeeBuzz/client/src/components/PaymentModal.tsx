import React, { useState } from 'react';
import './Modal.css';

interface PaymentModalProps {
  amount: number;
  onSuccess: (paymentSource: string) => void;
  onCancel: () => void;
}

const luhnCheck = (num: string): boolean => {
  const digits = num.replace(/\D/g, '');
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i]);
    if (isEven) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    isEven = !isEven;
  }
  return sum % 10 === 0 && digits.length >= 13;
};

const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/;

const PaymentModal: React.FC<PaymentModalProps> = ({ amount, onSuccess, onCancel }) => {
  const [method, setMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'processing' | 'done'>('form');

  const platformFee = Math.round(amount * 0.05);
  const driverPayout = amount - platformFee;

  const formatCard = (val: string) => {
    const digits = val.replace(/\D/g, '').substring(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').substring(0, 4);
    if (digits.length > 2) return digits.substring(0, 2) + '/' + digits.substring(2);
    return digits;
  };

  const validate = (): boolean => {
    setError('');
    if (method === 'upi') {
      if (!upiRegex.test(upiId)) {
        setError('Enter a valid UPI ID (e.g. name@upi or number@bank)');
        return false;
      }
    } else if (method === 'card') {
      if (!luhnCheck(cardNumber.replace(/\s/g, ''))) {
        setError('Invalid card number. Please check and try again.');
        return false;
      }
      const [mm, yy] = cardExpiry.split('/');
      const month = parseInt(mm);
      const year = 2000 + parseInt(yy || '0');
      const now = new Date();
      if (!mm || !yy || month < 1 || month > 12 || year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
        setError('Card expiry date is invalid or card has expired.');
        return false;
      }
      if (!cardCvv || cardCvv.length < 3) {
        setError('CVV must be 3–4 digits.');
        return false;
      }
      if (!cardName.trim()) {
        setError('Please enter the cardholder name.');
        return false;
      }
    }
    return true;
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setStep('processing');
    setLoading(true);

    // Simulate escrow payment processing (1.5s)
    await new Promise(res => setTimeout(res, 1500));

    setStep('done');
    setLoading(false);

    // Give 800ms to show success state, then call onSuccess
    await new Promise(res => setTimeout(res, 800));

    const ref = method === 'card'
      ? `card_${cardNumber.replace(/\s/g, '').slice(-4)}_escrow`
      : method === 'upi'
      ? `upi_${upiId.replace('@', '_')}_escrow`
      : `netbanking_escrow`;

    onSuccess(ref);
  };

  const methods = [
    { id: 'upi', label: 'UPI', icon: '⚡', sub: 'GPay, PhonePe, BHIM' },
    { id: 'card', label: 'Card', icon: '💳', sub: 'Debit / Credit' },
    { id: 'netbanking', label: 'Net Banking', icon: '🏦', sub: 'All major banks' },
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fadeIn" style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <div>
            <h3>Secure Escrow Payment</h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              🔒 Funds held in escrow until delivery is confirmed
            </p>
          </div>
          <button className="close-btn" onClick={onCancel} disabled={loading}>×</button>
        </div>

        <div className="modal-body">
          {/* Escrow Breakdown */}
          <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              💼 Escrow Breakdown
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Bid Amount (Locked in Escrow)', value: `₹${amount.toLocaleString()}`, color: 'var(--text-primary)', bold: false },
                { label: 'BeeBuzz Platform Fee (5%)', value: `− ₹${platformFee.toLocaleString()}`, color: '#f59e0b', bold: false },
                null,
                { label: 'Driver Net Payout', value: `₹${driverPayout.toLocaleString()}`, color: '#10b981', bold: true },
              ].map((row, i) =>
                row === null ? (
                  <div key={i} style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '2px 0' }} />
                ) : (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                    <span style={{ color: row.color, fontWeight: row.bold ? 700 : 500 }}>{row.value}</span>
                  </div>
                )
              )}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
              Released to driver only after you verify delivery.
            </div>
          </div>

          {step === 'processing' && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ width: 48, height: 48, border: '3px solid rgba(245,158,11,0.2)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Processing Escrow Lock...</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>Securing funds for bid acceptance</div>
            </div>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#10b981' }}>Payment Locked in Escrow</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>Assigning driver...</div>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handlePay}>
              {/* Payment Method Selector */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                {methods.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id as any)}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: 10,
                      border: `1px solid ${method === m.id ? '#f59e0b' : 'var(--border)'}`,
                      background: method === m.id ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.02)',
                      color: method === m.id ? '#f59e0b' : 'var(--text-secondary)',
                      cursor: 'pointer', textAlign: 'center',
                      transition: 'all 0.2s', fontFamily: 'inherit',
                    }}>
                    <div style={{ fontSize: 20 }}>{m.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>{m.sub}</div>
                  </button>
                ))}
              </div>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
                  ⚠ {error}
                </div>
              )}

              {method === 'upi' && (
                <div className="form-group">
                  <label className="form-label">UPI ID</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. 9876543210@ybl or name@okaxis"
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                    required
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Supports: GPay, PhonePe, Paytm, BHIM, Amazon Pay
                  </div>
                </div>
              )}

              {method === 'card' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Card Number</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={e => setCardNumber(formatCard(e.target.value))}
                      maxLength={19}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Expiry (MM/YY)</label>
                      <input type="text" className="input" placeholder="08/27"
                        value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                        maxLength={5} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CVV</label>
                      <input type="password" className="input" placeholder="•••"
                        value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                        maxLength={4} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cardholder Name</label>
                    <input type="text" className="input" placeholder="As on card"
                      value={cardName} onChange={e => setCardName(e.target.value)} required />
                  </div>
                </>
              )}

              {method === 'netbanking' && (
                <div className="form-group">
                  <label className="form-label">Select Bank</label>
                  <select className="select" required>
                    <option value="">-- Choose your bank --</option>
                    {['SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Yes Bank', 'IndusInd Bank'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    You'll be redirected to your bank's secure portal.
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 12, padding: '12px', fontSize: 15, fontWeight: 700 }}
                disabled={loading}>
                🔒 Lock ₹{amount.toLocaleString()} in Escrow
              </button>

              <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                🛡 256-bit SSL encrypted • PCI-DSS compliant simulation
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
