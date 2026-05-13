import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { QrCode, MapPin, User, Camera, CheckSquare, Printer } from 'lucide-react';

export default function QRPanel() {
  const { auth } = useAuth();
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    api.get('/admin/me').then(r => {
      setAdmin(r.data);
    }).catch(() => {
      // fallback: try superadmin route
      api.get(`/superadmin/admins/${auth.user.id}/qr`).then(r => setAdmin(r.data)).catch(() => {});
    });
  }, []);

  const qrValue = JSON.stringify({ adminId: auth.user.id, companyName: admin?.companyName || '' });

  const steps = [
    { icon: <QrCode size={14} />,      text: <>Scan this QR code</> },
    { icon: <MapPin size={14} />,      text: <><strong>GPS check</strong> — must be within office radius</> },
    { icon: <User size={14} />,        text: <>First time: <strong>Select name & set PIN</strong></> },
    { icon: <CheckSquare size={14} />, text: <>Next times: <strong>Auto attendance</strong> after QR scan</> },
    { icon: <Camera size={14} />,      text: <><strong>Selfie</strong> — optional, depends on admin setting</> },
  ];

  return (
    <>
      {/* ── Print styles ── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #qr-print-area, #qr-print-area * { visibility: visible !important; }
          #qr-print-area {
            position: fixed !important;
            inset: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: #f5f0e8 !important;
            padding: 40px !important;
          }
          .qr-print-container {
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
          }
        }
      `}</style>

      {/* ── Hidden print area ── */}
      <div id="qr-print-area" style={{ display: 'none' }}>
        <div className="qr-print-container">
          {/* Header */}
          <div style={{ marginBottom: 60 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 56, fontWeight: 800, color: '#1a1612', letterSpacing: -2, marginBottom: 8 }}>
              {admin?.companyName || 'COMPANY NAME'}
            </div>
            <div style={{ fontSize: 18, color: '#888', fontFamily: 'DM Sans, sans-serif' }}>
              QR Attendance System
            </div>
          </div>

          {/* QR Code - Large */}
          <div style={{ background: '#ffffff', padding: 40, borderRadius: 12, display: 'inline-block', marginBottom: 60, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
            <QRCodeSVG value={qrValue} size={400} fgColor="#1a1612" bgColor="#ffffff" level="H" />
          </div>

          {/* Footer */}
          <div style={{ marginTop: 60, fontSize: 14, color: '#888', fontFamily: 'monospace' }}>
            📍 GPS Required | 🔒 Secure Attendance
          </div>
          <div style={{ marginTop: 16, fontSize: 12, color: '#bbb', fontFamily: 'monospace', letterSpacing: 1 }}>
            Powered by <strong style={{ color: '#c84b2f' }}>AttenZo</strong>
          </div>
        </div>
      </div>

      {/* ── Screen UI ── */}
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Company QR Code</div>
      <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 24 }}>Print and display at entrance — employees scan this to begin attendance</div>

      <div style={{ background: 'var(--surface)', border: '2px solid var(--ink)', borderRadius: 4, padding: 28, display: 'flex', alignItems: 'flex-start', gap: 32, marginBottom: 28, boxShadow: '4px 4px 0 var(--ink)', flexWrap: 'wrap' }}>

        {/* QR preview on screen */}
        <div>
          <div style={{ background: '#1a1612', borderRadius: 6, padding: '20px 24px', textAlign: 'center', boxShadow: '4px 4px 0 rgba(0,0,0,0.2)' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: '#f5f0e8', letterSpacing: -0.5, marginBottom: 2 }}>
              {admin?.companyName || 'COMPANY NAME'}
            </div>
            <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: 2, fontFamily: 'monospace', marginBottom: 16 }}>
              QR Attendance System
            </div>
            <div style={{ background: '#fff', padding: 10, borderRadius: 4, display: 'inline-block', marginBottom: 12 }}>
              <QRCodeSVG value={qrValue} size={180} fgColor="#1a1612" bgColor="#ffffff" level="H" />
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
              {admin?.companyName || 'COMPANY QR'}
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onClick={() => {
              document.getElementById('qr-print-area').style.display = 'flex';
              window.print();
              setTimeout(() => { document.getElementById('qr-print-area').style.display = 'none'; }, 500);
            }}
          >
            <Printer size={14} />Print QR Code
          </button>
        </div>

        {/* Steps */}
        <div style={{ flex: 1 }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Employee Steps</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--ink2)' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--ink)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700 }}>{i + 1}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>{s.icon}{s.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
