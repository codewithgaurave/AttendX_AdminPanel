import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { toast } from '../../components/Toast';
import { Clock, AlertCircle, Send, CheckCircle } from 'lucide-react';

export default function RenewalRequest() {
  const { auth } = useAuth();
  const [renewalStatus, setRenewalStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRenewalStatus();
  }, []);

  const loadRenewalStatus = async () => {
    try {
      const response = await api.get('/admin/renewal-status');
      setRenewalStatus(response.data);
    } catch (error) {
      console.error('Error loading renewal status:', error);
    }
  };

  const submitRenewalRequest = async () => {
    if (!message.trim()) {
      toast('Please enter a message for your renewal request');
      return;
    }

    setLoading(true);
    try {
      await api.post('/admin/request-renewal', { message });
      toast('Renewal request submitted successfully!');
      setMessage('');
      loadRenewalStatus();
    } catch (error) {
      toast(error.response?.data?.message || 'Error submitting renewal request');
    } finally {
      setLoading(false);
    }
  };

  if (!renewalStatus) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink2)' }}>
          <Clock size={16} />Loading...
        </div>
      </div>
    );
  }

  const daysLeft = Math.ceil((new Date(renewalStatus.validUntil) - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      {/* Account Status */}
      <div style={{ 
        background: renewalStatus.isExpired ? '#fee2e2' : daysLeft <= 2 ? '#fff7ed' : '#ecfdf5',
        border: `1.5px solid ${renewalStatus.isExpired ? '#fecaca' : daysLeft <= 2 ? '#fed7aa' : '#bbf7d0'}`,
        borderRadius: 8,
        padding: 20,
        marginBottom: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          {renewalStatus.isExpired ? (
            <AlertCircle size={24} color="#dc2626" />
          ) : daysLeft <= 2 ? (
            <Clock size={24} color="#ea580c" />
          ) : (
            <CheckCircle size={24} color="#16a34a" />
          )}
          <div>
            <div style={{ 
              fontFamily: 'Syne, sans-serif', 
              fontSize: 18, 
              fontWeight: 800,
              color: renewalStatus.isExpired ? '#dc2626' : daysLeft <= 2 ? '#ea580c' : '#16a34a'
            }}>
              {renewalStatus.isExpired ? 'Account Expired' : daysLeft <= 2 ? 'Account Expiring Soon' : 'Account Active'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink2)', marginTop: 2 }}>
              {renewalStatus.isExpired 
                ? `Expired on ${new Date(renewalStatus.validUntil).toLocaleDateString()}`
                : `Valid until ${new Date(renewalStatus.validUntil).toLocaleDateString()} (${daysLeft} days left)`
              }
            </div>
          </div>
        </div>

        {renewalStatus.isExpired && (
          <div style={{ 
            background: 'rgba(220, 38, 38, 0.1)', 
            padding: 12, 
            borderRadius: 6, 
            fontSize: 13,
            color: '#dc2626'
          }}>
            <strong>Your account has expired.</strong> You cannot scan QR codes or access attendance features until your account is renewed.
          </div>
        )}
      </div>

      {/* Renewal Request Status */}
      {renewalStatus.renewalRequested && (
        <div style={{
          background: renewalStatus.renewalApproved ? '#ecfdf5' : '#fef3c7',
          border: `1.5px solid ${renewalStatus.renewalApproved ? '#bbf7d0' : '#fde68a'}`,
          borderRadius: 8,
          padding: 20,
          marginBottom: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            {renewalStatus.renewalApproved ? (
              <CheckCircle size={20} color="#16a34a" />
            ) : (
              <Clock size={20} color="#d97706" />
            )}
            <div style={{ 
              fontWeight: 700, 
              color: renewalStatus.renewalApproved ? '#16a34a' : '#d97706'
            }}>
              {renewalStatus.renewalApproved ? 'Renewal Approved!' : 'Renewal Request Pending'}
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink2)' }}>
            {renewalStatus.renewalApproved 
              ? `Your account was renewed on ${new Date(renewalStatus.renewalApprovedDate).toLocaleDateString()}`
              : `Request submitted on ${new Date(renewalStatus.renewalRequestDate).toLocaleDateString()}. Waiting for Master Admin approval.`
            }
          </div>
        </div>
      )}

      {/* Renewal Request Form */}
      {(renewalStatus.isExpired || daysLeft <= 2) && !renewalStatus.renewalRequested && (
        <div style={{
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          borderRadius: 8,
          padding: 24
        }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              Request Account Renewal
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink2)' }}>
              Send a renewal request to the Master Admin. Include details about your business needs.
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Message to Master Admin *</label>
            <textarea
              className="form-inp"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Please describe your business needs and why you need account renewal..."
              rows={4}
              style={{ resize: 'vertical', minHeight: 100 }}
            />
          </div>

          <button
            className="btn btn-primary btn-full"
            onClick={submitRenewalRequest}
            disabled={loading || !message.trim()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Send size={16} />
            {loading ? 'Submitting Request...' : 'Submit Renewal Request'}
          </button>
        </div>
      )}

      {/* Account Info */}
      <div style={{
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: 16,
        marginTop: 24
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Account Information
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
          <div>
            <span style={{ color: 'var(--ink2)' }}>Account Type:</span>
            <span style={{ marginLeft: 8, fontWeight: 600 }}>Demo Account</span>
          </div>
          <div>
            <span style={{ color: 'var(--ink2)' }}>QR Scanning:</span>
            <span style={{ 
              marginLeft: 8, 
              fontWeight: 600,
              color: renewalStatus.canScanAttendance ? '#16a34a' : '#dc2626'
            }}>
              {renewalStatus.canScanAttendance ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}