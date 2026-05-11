import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, MapPin } from 'lucide-react';
import PWAInstallButton from '../components/PWAInstallButton';

const getClockStr = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
const getDateStr  = () => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export default function Home() {
  const nav = useNavigate();
  const [clock, setClock] = useState(getClockStr());

  useEffect(() => {
    const t = setInterval(() => setClock(getClockStr()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 16 }}>
        <div style={{ background: 'var(--surface)', border: '2px solid var(--ink)', borderRadius: 4, width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '6px 6px 0 var(--ink)' }}>

          {/* Header */}
          <div style={{ background: 'var(--ink)', padding: '28px 32px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 800, color: 'var(--bg)', letterSpacing: -1 }}>
              Atten<span style={{ color: 'var(--accent)' }}>Zo</span>
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4, textTransform: 'uppercase', letterSpacing: 2, fontFamily: 'DM Mono, monospace' }}>
              Admin Portal
            </div>
          </div>

          {/* Body */}
            <div style={{ padding: 28 }}>
                {/* Clock */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 38, fontWeight: 500, color: 'var(--ink)', lineHeight: 1, letterSpacing: -1 }}>
                        {clock}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink2)', marginTop: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {getDateStr()}
                    </div>
                </div>

                <div style={{ height: 1, background: 'var(--border)', marginBottom: 24 }} />

                <HomeBtn primary icon={<LogIn size={18} />} onClick={() => nav('/login')}>
                    Admin Login
                </HomeBtn>
                
                <HomeBtn primary icon={<MapPin size={18} />} onClick={() => nav('/scan')}>
                    Scan QR & Mark Attendance
                </HomeBtn>
            </div>
        </div>
      </div>
      
      <PWAInstallButton />
    </>
  );
}

function HomeBtn({ children, primary, icon, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      style={{
        width: '100%', padding: '14px 16px', border: '2px solid',
        borderColor: primary ? 'var(--accent)' : 'var(--ink)',
        borderRadius: 4, cursor: 'pointer',
        fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700,
        transition: 'all 0.15s', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 10, marginBottom: 12,
        background: primary ? (hov ? '#a83420' : 'var(--accent)') : (hov ? 'var(--ink)' : 'transparent'),
        color: primary ? '#fff' : (hov ? 'var(--bg)' : 'var(--ink2)'),
        boxShadow: primary ? '4px 4px 0 rgba(200,75,47,0.25)' : 'none',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
    >
      {icon}{children}
    </button>
  );
}
