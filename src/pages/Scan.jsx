import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, MapPin, CheckCircle, XCircle, Navigation, RefreshCw, Home, LogIn, LogOut, Clock, User } from 'lucide-react';
import api from '../utils/api';
import { avt, fmtTime } from '../utils/api';
import { toast } from '../components/Toast';

// ─── Flow ────────────────────────────────────────────────────────────────────
// FIRST TIME:  scan → gps → pick_name → set_pin → (selfie?) → done
// RETURNING:   scan → gps → (selfie?) → done  (auto punch-in/out)
// ─────────────────────────────────────────────────────────────────────────────

export default function Scan() {
  const nav = useNavigate();
  const [step, setStep] = useState('scan');       // scan | gps | pick | pin | selfie | marking | done | blocked
  const [adminId, setAdminId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selEmp, setSelEmp] = useState(null);
  const [coords, setCoords] = useState(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [selfieImg, setSelfieImg] = useState(null);
  const [doneData, setDoneData] = useState(null);
  const [blockedMsg, setBlockedMsg] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const scannerRef = useRef(null);
  const adminIdRef = useRef(adminId); // ref taaki GPS callback mein fresh value mile

  // adminId change hone pe ref sync karo
  useEffect(() => { adminIdRef.current = adminId; }, [adminId]);

  // cleanup camera on unmount
  useEffect(() => () => stopScanner(), []);

  // start scanner when on scan step
  useEffect(() => {
    if (step === 'scan') setTimeout(startScanner, 300);
  }, [step]);

  // start GPS when on gps step
  useEffect(() => {
    if (step === 'gps') doGPS();
  }, [step]);

  // ── Scanner ────────────────────────────────────────────────────────────────
  const startScanner = () => {
    if (scannerRef.current) return;
    const el = document.getElementById('qr-box');
    if (!el) return;
    const sc = new Html5Qrcode('qr-box');
    scannerRef.current = sc;
    sc.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 200, height: 200 } },
      text => {
        try {
          const data = JSON.parse(text);
          if (!data.adminId) { toast('Invalid QR code'); return; }
          stopScanner();
          adminIdRef.current = data.adminId;
          setAdminId(data.adminId);
          setStep('gps');
        } catch { toast('Invalid QR code'); }
      },
      () => {}
    ).catch(() => { scannerRef.current = null; });
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
  };

  // ── GPS ────────────────────────────────────────────────────────────────────
  const doGPS = () => {
    if (!navigator.geolocation) { proceedAfterGPS({ lat: 0, long: 0 }); return; }
    navigator.geolocation.getCurrentPosition(
      pos => proceedAfterGPS({ lat: pos.coords.latitude, long: pos.coords.longitude }),
      () => { setBlockedMsg('Location access denied. Please allow location and retry.'); setStep('blocked'); },
      { timeout: 12000, maximumAge: 0, enableHighAccuracy: true }
    );
  };

  const proceedAfterGPS = async (location) => {
    setCoords(location);
    const aid = adminIdRef.current || adminId; // ref se fresh value lo
    const storedPin = localStorage.getItem(`pin_${aid}`);
    const storedEmpRaw = localStorage.getItem(`emp_${aid}`);

    if (storedPin && storedEmpRaw) {
      try {
        const { data } = await api.get(`/attendance/employees/${aid}`);
        const storedEmp = JSON.parse(storedEmpRaw);
        const freshEmp = data.find(e => e._id === storedEmp._id);
        if (freshEmp) {
          setSelEmp(freshEmp);
          if (freshEmp.selfieRequired) {
            setStep('selfie');
          } else {
            setStep('marking');
            markAttendance(freshEmp, location, null, aid);
          }
        } else {
          localStorage.removeItem(`pin_${aid}`);
          localStorage.removeItem(`emp_${aid}`);
          setEmployees(data);
          setStep('pick');
        }
      } catch {
        toast('Could not connect to server. Please retry.');
        setBlockedMsg('Server connection failed.');
        setStep('blocked');
      }
    } else {
      try {
        const { data } = await api.get(`/attendance/employees/${aid}`);
        setEmployees(data);
        setStep('pick');
      } catch {
        setBlockedMsg('Could not load employee list. Please retry.');
        setStep('blocked');
      }
    }
  };

  const clearStored = () => {
    const aid = adminIdRef.current || adminId;
    localStorage.removeItem(`pin_${aid}`);
    localStorage.removeItem(`emp_${aid}`);
  };

  // ── Mark Attendance ────────────────────────────────────────────────────────
  const markAttendance = async (employee, location, selfie, aid) => {
    setBusy(true);
    const resolvedAdminId = aid || adminIdRef.current || adminId;
    try {
      const payload = {
        employeeId: employee._id,
        adminId: resolvedAdminId,
        lat: location.lat,
        long: location.long,
      };
      if (selfie) payload.selfieImage = selfie;

      const { data } = await api.post('/attendance/smart', payload);
      setDoneData({ emp: employee, res: data });
      setStep('done');
    } catch (e) {
      if (e.response?.status === 403) {
        setBlockedMsg(e.response.data?.violation || e.response.data?.message || 'Attendance blocked.');
        setStep('blocked');
      } else {
        toast(e.response?.data?.message || 'Failed to mark attendance. Try again.', 4000, 'error');
        setStep('scan');
      }
    } finally {
      setBusy(false);
    }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handlePickName = (emp) => {
    setSelEmp(emp);
    setStep('pin');
  };

  const handleSetPin = () => {
    if (pin.length !== 4) { toast('Enter 4-digit PIN'); return; }
    if (pin !== confirmPin) { toast('PINs do not match'); return; }
    const aid = adminIdRef.current || adminId;
    localStorage.setItem(`pin_${aid}`, pin);
    localStorage.setItem(`emp_${aid}`, JSON.stringify(selEmp));
    if (selEmp.selfieRequired) {
      setStep('selfie');
    } else {
      setStep('marking');
      markAttendance(selEmp, coords, null, aid);
    }
  };

  const handleSelfie = (imgData) => {
    setSelfieImg(imgData);
    setStep('marking');
    markAttendance(selEmp, coords, imgData, adminIdRef.current || adminId);
  };

  const retry = () => { setStep('scan'); setAdminId(null); setCoords(null); setSelEmp(null); setPin(''); setConfirmPin(''); setSelfieImg(null); setSearch(''); };

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.employeeCode || '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  const stepNum = { scan: 1, gps: 2, pick: 3, pin: 4, selfie: 5, marking: 5, done: 5, blocked: 0 };
  const stepLabel = { scan: 'Scan QR Code', gps: 'Verifying Location', pick: 'Select Your Name', pin: 'Set Your PIN', selfie: 'Take Selfie', marking: 'Marking Attendance', done: 'Done!', blocked: 'Access Denied' };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 16, background: 'var(--ink)' }}>
      <div style={{ background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: 4, width: '100%', maxWidth: 420, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
          <button onClick={() => step === 'done' || step === 'blocked' ? nav('/') : retry()}
            style={{ width: 32, height: 32, border: '1.5px solid var(--border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', color: 'var(--ink2)', fontSize: 16, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ←
          </button>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, flex: 1 }}>{stepLabel[step]}</div>
          {step !== 'done' && step !== 'blocked' && step !== 'marking' && (
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--ink2)', background: 'var(--border)', padding: '3px 8px', borderRadius: 2 }}>
              {stepNum[step]} / 5
            </span>
          )}
        </div>

        {/* Progress */}
        {step !== 'blocked' && (
          <div style={{ display: 'flex', gap: 4, padding: '12px 18px 0' }}>
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: stepNum[step] > n ? 'var(--success)' : stepNum[step] === n ? 'var(--accent)' : 'var(--border)', transition: 'background 0.3s' }} />
            ))}
          </div>
        )}

        <div style={{ padding: 20 }}>
          {step === 'scan'    && <ScanStep />}
          {step === 'gps'     && <GPSStep />}
          {step === 'pick'    && <PickStep employees={filtered} search={search} setSearch={setSearch} onPick={handlePickName} />}
          {step === 'pin'     && <PinStep emp={selEmp} pin={pin} setPin={setPin} confirmPin={confirmPin} setConfirmPin={setConfirmPin} onSubmit={handleSetPin} />}
          {step === 'selfie'  && <SelfieStep onCapture={handleSelfie} />}
          {step === 'marking' && <MarkingStep emp={selEmp} />}
          {step === 'done'    && <DoneStep doneData={doneData} onHome={() => nav('/')} />}
          {step === 'blocked' && <BlockedStep msg={blockedMsg} onRetry={retry} onHome={() => nav('/')} />}
        </div>
      </div>
    </div>
  );
}

// ── Step Components ────────────────────────────────────────────────────────────

function ScanStep() {
  return (
    <>
      <div style={{ position: 'relative', background: '#000', borderRadius: 4, overflow: 'hidden', marginBottom: 16, minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="scan-corner sc-tl" /><div className="scan-corner sc-tr" />
        <div className="scan-corner sc-bl" /><div className="scan-corner sc-br" />
        <div className="scan-line" />
        <div id="qr-box" style={{ width: '100%' }} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink2)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Camera size={13} /> Point camera at the office QR code
      </div>
    </>
  );
}

function GPSStep() {
  return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface2)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Navigation size={28} color="var(--accent2)" />
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, marginBottom: 8 }}>Verifying Location</div>
      <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 24 }}>Please allow location access when prompted.</div>
      <div className="gps-radar">
        <div className="gps-radar-ring" style={{ width: '80%', height: '80%', top: '10%', left: '10%' }} />
        <div className="gps-radar-ring" style={{ width: '50%', height: '50%', top: '25%', left: '25%' }} />
        <div className="gps-radar-dot" />
      </div>
      <div style={{ fontSize: 13, color: 'var(--warning)', fontWeight: 600 }}>Detecting location…</div>
    </div>
  );
}

function PickStep({ employees, search, setSearch, onPick }) {
  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--success)', background: '#e8f5ee', border: '1px solid #b8dcc8', borderRadius: 4, padding: '8px 12px', marginBottom: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
        <CheckCircle size={13} /> Location verified! Select your name below.
      </div>
      <input
        className="form-inp"
        placeholder="Search your name..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 10 }}
        autoFocus
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
        {employees.length === 0 && (
          <div className="empty-state">
            <User size={32} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--ink2)' }} />
            <div>{search ? 'No match found' : 'No employees found'}</div>
          </div>
        )}
        {employees.map(e => (
          <div key={e._id} onClick={() => onPick(e)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: 4, cursor: 'pointer', background: 'var(--surface)', transition: 'all 0.15s' }}
            onMouseEnter={ev => { ev.currentTarget.style.borderColor = 'var(--ink)'; ev.currentTarget.style.background = 'var(--surface2)'; }}
            onMouseLeave={ev => { ev.currentTarget.style.borderColor = 'var(--border)'; ev.currentTarget.style.background = 'var(--surface)'; }}>
            <div className="emp-avt">{avt(e.name)}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{e.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink2)', marginTop: 2 }}>{e.designation} · {e.employeeCode}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function PinStep({ emp, pin, setPin, confirmPin, setConfirmPin, onSubmit }) {
  if (!emp) return null;
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div className="emp-avt" style={{ width: 60, height: 60, fontSize: 20, fontWeight: 800, margin: '0 auto 12px', borderRadius: 8 }}>{avt(emp.name)}</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Hi, {emp.name}!</div>
      <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 20 }}>Set a 4-digit PIN for future attendance</div>

      <div style={{ maxWidth: 260, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, textAlign: 'left' }}>Enter PIN</label>
          <input className="form-inp" type="password" inputMode="numeric" maxLength={4}
            value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••" style={{ textAlign: 'center', fontSize: 22, letterSpacing: 6 }} autoFocus />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, textAlign: 'left' }}>Confirm PIN</label>
          <input className="form-inp" type="password" inputMode="numeric" maxLength={4}
            value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••" style={{ textAlign: 'center', fontSize: 22, letterSpacing: 6 }} />
        </div>
        <button className="btn btn-primary btn-full" onClick={onSubmit}
          disabled={pin.length !== 4 || confirmPin.length !== 4}
          style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>
          Set PIN & Continue →
        </button>
      </div>
    </div>
  );
}

function SelfieStep({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [captured, setCaptured] = useState(false);
  const [imgData, setImgData] = useState(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(s => { setStream(s); if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(() => toast('Camera access denied'));
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  const capture = () => {
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    const d = c.toDataURL('image/jpeg', 0.8);
    setImgData(d); setCaptured(true);
    stream?.getTracks().forEach(t => t.stop());
  };

  const retake = () => {
    setCaptured(false); setImgData(null);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(s => { setStream(s); if (videoRef.current) videoRef.current.srcObject = s; });
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, marginBottom: 4 }}>📸 Take Selfie</div>
      <div style={{ fontSize: 12, color: 'var(--ink2)', marginBottom: 14 }}>Required for attendance verification</div>

      <div style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 14, background: '#000', position: 'relative' }}>
        {!captured
          ? <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: 280, objectFit: 'cover', display: 'block' }} />
          : <img src={imgData} alt="selfie" style={{ width: '100%', height: 280, objectFit: 'cover', display: 'block' }} />
        }
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {!captured
          ? <button className="btn btn-primary btn-full" onClick={capture} style={{ fontWeight: 700 }}>📸 Capture</button>
          : <>
              <button className="btn" onClick={retake} style={{ flex: 1 }}>Retake</button>
              <button className="btn btn-primary" onClick={() => onCapture(imgData)} style={{ flex: 2, fontWeight: 700 }}>✓ Use This Photo</button>
            </>
        }
      </div>
    </div>
  );
}

function MarkingStep({ emp }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 0' }}>
      {emp && (
        <div className="emp-avt" style={{ width: 60, height: 60, fontSize: 20, fontWeight: 800, margin: '0 auto 16px', borderRadius: 8 }}>{avt(emp.name)}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent)' }}>Marking attendance…</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink2)' }}>Please wait</div>
    </div>
  );
}

function DoneStep({ doneData, onHome }) {
  if (!doneData) return null;
  const { emp, res } = doneData;
  const isIn = res.action === 'punch-in';
  const att = res.attendance;

  return (
    <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
      <div className="pop-in" style={{ width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', background: isIn ? '#e8f5ee' : '#fdeee8', border: `2px solid ${isIn ? 'var(--success)' : 'var(--danger)'}` }}>
        {isIn ? <LogIn size={36} color="var(--success)" /> : <LogOut size={36} color="var(--danger)" />}
      </div>

      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
        {isIn ? 'Punched In! 👋' : 'Punched Out! 👍'}
      </div>
      <div style={{ fontSize: 15, color: 'var(--ink2)', marginBottom: 4 }}>{emp.name}</div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--ink2)', marginBottom: 20 }}>
        {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginBottom: 20 }}>
        {att?.checkIn?.time && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}><Clock size={11} />In</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 500 }}>{fmtTime(att.checkIn.time)}</div>
          </div>
        )}
        {att?.checkOut?.time && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}><Clock size={11} />Out</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 500 }}>{fmtTime(att.checkOut.time)}</div>
          </div>
        )}
      </div>

      {res.isLate && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <span style={{ background: '#fff3cd', border: '1px solid #ffc107', padding: '5px 12px', borderRadius: 2, fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#856404', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={11} /> Late by {res.lateBy}
          </span>
        </div>
      )}

      {res.withinRadius && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <span style={{ background: '#e8f5ee', border: '1px solid #b8dcc8', padding: '5px 12px', borderRadius: 2, fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <MapPin size={11} /> {res.distance}m · GPS verified
          </span>
        </div>
      )}

      <button className="btn btn-primary" onClick={onHome} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Home size={14} /> Done
      </button>
    </div>
  );
}

function BlockedStep({ msg, onRetry, onHome }) {
  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fdeee8', border: '2px solid var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <XCircle size={28} color="var(--danger)" />
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, marginBottom: 8, color: 'var(--danger)' }}>Access Denied</div>
      <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 24, lineHeight: 1.6 }}>{msg || 'Could not verify your location.'}</div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={onRetry} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={14} /> Retry</button>
        <button className="btn" onClick={onHome} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Home size={14} /> Home</button>
      </div>
    </div>
  );
}
