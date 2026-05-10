import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, User, CheckCircle, XCircle, Clock, Navigation, AlertTriangle, RefreshCw, Home, LogIn, LogOut } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../utils/api';
import { avt, fmtTime } from '../utils/api';
import { toast } from '../components/Toast';

const STEPS = { camera: 1, gps: 2, pick: 3, setpin: 4, selfie: 5, auto: 2, done: 6, blocked: 2 };
const LABELS = { camera: 'Scan QR Code', gps: 'Verifying Location', pick: 'Select Your Name', setpin: 'Set Your PIN', selfie: 'Take Selfie', auto: 'Auto Attendance', done: 'Done!', blocked: 'Access Denied' };

export default function Scan() {
  const nav = useNavigate();
  const [step, setStep] = useState('camera');
  const [adminId, setAdminId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selEmp, setSelEmp] = useState(null);
  const [geoResult, setGeoResult] = useState(null);
  const [search, setSearch] = useState('');
  const [doneData, setDoneData] = useState(null);
  const [blockedInfo, setBlockedInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [selfieData, setSelfieData] = useState(null);
  const [showSelfieCamera, setShowSelfieCamera] = useState(false);

  const scannerRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => () => { stopCamera(); }, []);

  useEffect(() => {
    if (step === 'camera') setTimeout(startCamera, 300);
    if (step === 'gps')    setTimeout(startGPS, 300);
  }, [step]);

  const startCamera = () => {
    if (scannerRef.current) return;
    const el = document.getElementById('qr-reader');
    if (!el) return;
    const sc = new Html5Qrcode('qr-reader');
    scannerRef.current = sc;
    sc.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 180, height: 180 } },
      text => {
        try {
          const data = JSON.parse(text);
          if (data.adminId) { 
            stopCamera(); 
            setAdminId(data.adminId); 
            localStorage.setItem('current_admin_id', data.adminId);
            setStep('gps'); 
          }
          else toast('Invalid QR code');
        } catch { toast('Invalid QR code'); }
      }, () => {}
    ).catch(() => { scannerRef.current = null; });
  };

  const stopCamera = () => {
    if (scannerRef.current) { scannerRef.current.stop().catch(() => {}); scannerRef.current = null; }
  };

  const startGPS = () => {
    if (!navigator.geolocation) { setStep('pick'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => setGeoResult({ ok: true, lat: pos.coords.latitude, long: pos.coords.longitude }),
      () => setGeoResult({ ok: false, error: 'Location access denied' }),
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (!geoResult) return;
    if (geoResult.ok) {
      setTimeout(() => {
        // Always fetch fresh employee data first
        console.log('Fetching employees for adminId:', adminId);
        api.get(`/attendance/employees/${adminId}`)
          .then(r => { 
            console.log('Employees fetched successfully:', r.data);
            setEmployees(r.data);
            
            // Check if user has PIN stored locally
            const storedPin = localStorage.getItem(`attendx_pin_${adminId}`);
            const storedEmployeeData = localStorage.getItem(`attendx_employee_${adminId}`);
            
            if (storedPin && storedEmployeeData) {
              try {
                const storedEmployee = JSON.parse(storedEmployeeData);
                // Find the employee in fresh data to ensure it still exists
                const currentEmployee = r.data.find(emp => emp._id === storedEmployee._id);
                
                if (currentEmployee) {
                  console.log('Found existing employee, proceeding with auto attendance:', currentEmployee.name);
                  setSelEmp(currentEmployee);
                  if (currentEmployee.selfieRequired) {
                    setStep('selfie');
                  } else {
                    setStep('auto');
                    markSmartAttendance(currentEmployee);
                  }
                } else {
                  console.log('Stored employee not found in current list, showing employee selection');
                  // Clear invalid stored data
                  localStorage.removeItem(`attendx_pin_${adminId}`);
                  localStorage.removeItem(`attendx_employee_${adminId}`);
                  setStep('pick');
                }
              } catch (error) {
                console.error('Error parsing stored employee data:', error);
                // Clear corrupted data
                localStorage.removeItem(`attendx_pin_${adminId}`);
                localStorage.removeItem(`attendx_employee_${adminId}`);
                setStep('pick');
              }
            } else {
              console.log('No stored PIN/employee found, showing employee selection');
              setStep('pick');
            }
          })
          .catch(error => {
            console.error('Failed to fetch employees:', error);
            toast('Failed to load employees. Please try again.');
            setStep('blocked');
            setBlockedInfo({ error: 'Failed to load employee list' });
          });
      }, 1000);
    } else {
      setBlockedInfo({ error: geoResult.error });
      setStep('blocked');
    }
  }, [geoResult, adminId]);

  const markSmartAttendance = async (employee) => {
    if (!employee || !geoResult) return;
    console.log('Starting markSmartAttendance for:', employee.name);
    setLoading(true);
    try {
      const attendanceData = { 
        employeeId: employee._id, 
        adminId, 
        lat: geoResult.lat, 
        long: geoResult.long 
      };
      
      if (selfieData) {
        attendanceData.selfieImage = selfieData;
      }
      
      console.log('Sending attendance data:', attendanceData);
      const { data } = await api.post('/attendance/smart', attendanceData);
      console.log('Attendance marked successfully:', data);
      setDoneData({ type: data.action === 'punch-in' ? 'in' : 'out', data, emp: employee });
      setStep('done');
    } catch (e) {
      console.error('Attendance marking failed:', e);
      if (e.response?.status === 403) { 
        setBlockedInfo(e.response.data); 
        setStep('blocked'); 
      } else {
        toast(e.response?.data?.message || 'Failed to mark attendance. Please try again.');
        setStep('pick'); // Go back to employee selection
      }
    } finally { 
      setLoading(false); 
    }
  };

  const handleEmployeeSelect = (employee) => {
    setSelEmp(employee);
    setIsFirstTime(true);
    setStep('setpin');
  };

  const handleSetPin = () => {
    if (!newPin || newPin.length !== 4) {
      toast('PIN must be 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      toast('PINs do not match');
      return;
    }
    localStorage.setItem(`attendx_pin_${adminId}`, newPin);
    localStorage.setItem(`attendx_employee_${adminId}`, JSON.stringify(selEmp));
    toast('PIN set successfully!');
    
    if (selEmp.selfieRequired) {
      setStep('selfie');
    } else {
      markSmartAttendance(selEmp);
    }
  };

  // const handlePinEntry = async () => {
//     if (!pin || pin.length !== 4) {
//       toast('Enter 4-digit PIN');
//       return;
//     }
//     const storedPin = localStorage.getItem(`attendx_pin_${adminId}`);
//     const storedEmployee = JSON.parse(localStorage.getItem(`attendx_employee_${adminId}`) || '{}');
//     
//     if (pin !== storedPin) {
//       toast('Incorrect PIN');
//       setPin('');
//       return;
//     }
//     
//     setSelEmp(storedEmployee);
//     markSmartAttendance(storedEmployee);
//   };

  const goBack = () => {
    const map = { camera: '/', gps: 'camera', blocked: 'camera', pick: 'gps', setpin: 'pick', auto: 'camera', done: '/' };
    const next = map[step];
    if (next === '/') { nav('/'); }
    else { setStep(next); }
  };

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.employeeCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 16, background: 'var(--ink)' }}>
      <div style={{ background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: 4, width: '100%', maxWidth: 440, overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
          <button onClick={goBack} style={{ width: 32, height: 32, border: '1.5px solid var(--border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink2)', fontSize: 16, fontWeight: 'bold' }}>
            ←
          </button>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, flex: 1 }}>{LABELS[step]}</div>
          {step !== 'done' && step !== 'blocked' && step !== 'auto' && (
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--ink2)', background: 'var(--border)', padding: '3px 8px', borderRadius: 2 }}>
              {STEPS[step]} / 4
            </span>
          )}
        </div>

        {/* Progress bar */}
        {step !== 'auto' && (
          <div style={{ display: 'flex', gap: 4, padding: '14px 18px 0' }}>
            {[1,2,3,4,5].map(n => (
              <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: STEPS[step] > n ? 'var(--success)' : STEPS[step] === n ? 'var(--accent)' : 'var(--border)', transition: 'background 0.3s' }} />
            ))}
          </div>
        )}

        <div style={{ padding: 20 }}>
          {step === 'camera'  && <CameraStep />}
          {step === 'gps'     && <GPSStep geoResult={geoResult} />}
          {step === 'blocked' && <BlockedStep info={blockedInfo} onRetry={() => { setGeoResult(null); setStep('gps'); }} onHome={() => nav('/')} />}
          {step === 'pick'    && <PickStep employees={filtered} search={search} setSearch={setSearch} geoResult={geoResult} onPick={handleEmployeeSelect} loading={loading} />}
          {step === 'setpin'  && <SetPinStep employee={selEmp} newPin={newPin} setNewPin={setNewPin} confirmPin={confirmPin} setConfirmPin={setConfirmPin} onSetPin={handleSetPin} loading={loading} />}
          {step === 'selfie'  && <SelfieStep employee={selEmp} onCapture={() => setShowSelfieCamera(true)} loading={loading} />}
          {step === 'auto'    && <AutoStep employee={selEmp} loading={loading} />}
          {step === 'done'    && <DoneStep doneData={doneData} onHome={() => nav('/')} />}
        </div>
      </div>
      
      {showSelfieCamera && (
        <SelfieCamera 
          onCapture={(imageData) => {
            setSelfieData(imageData);
            setShowSelfieCamera(false);
            setStep('auto');
            markSmartAttendance(selEmp);
          }} 
          onClose={() => setShowSelfieCamera(false)} 
        />
      )}
    </div>
  );
}

function CameraStep() {
  return (
    <>
      <div style={{ position: 'relative', background: 'var(--ink)', borderRadius: 4, overflow: 'hidden', marginBottom: 16, minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="scan-corner sc-tl" /><div className="scan-corner sc-tr" />
        <div className="scan-corner sc-bl" /><div className="scan-corner sc-br" />
        <div className="scan-line" />
        <div id="qr-reader" style={{ width: '100%' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ink2)', textAlign: 'center', justifyContent: 'center' }}>
        <Camera size={14} />Point camera at the company QR code at the entrance
      </div>
    </>
  );
}

function GPSStep({ geoResult }) {
  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface2)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Navigation size={28} color="var(--accent2)" />
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Verifying Your Location</div>
      <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 24, lineHeight: 1.6 }}>Please allow location access when prompted.</div>
      <div className="gps-radar">
        <div className="gps-radar-ring" style={{ width: '80%', height: '80%', top: '10%', left: '10%' }} />
        <div className="gps-radar-ring" style={{ width: '50%', height: '50%', top: '25%', left: '25%' }} />
        <div className="gps-radar-dot" style={{ background: geoResult ? (geoResult.ok ? 'var(--success)' : 'var(--danger)') : 'var(--accent2)' }} />
      </div>
      {!geoResult && <div style={{ fontSize: 13, color: 'var(--warning)', fontWeight: 600 }}>Detecting location…</div>}
      {geoResult?.ok && (
        <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
          <CheckCircle size={16} />Location verified!
        </div>
      )}
      {geoResult?.ok && (
        <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Loading employees...</div>
      )}
    </div>
  );
}

function BlockedStep({ info, onRetry, onHome }) {
  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fdeee8', border: '2px solid var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <XCircle size={28} color="var(--danger)" />
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, marginBottom: 8, color: 'var(--danger)' }}>Attendance Blocked</div>
      {info?.distance && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 28, fontWeight: 500, color: 'var(--danger)', marginBottom: 6 }}>{info.distance}m</div>}
      <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 20, lineHeight: 1.6 }}>
        {info?.violation || info?.error || 'Could not verify your location.'}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={onRetry} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={14} />Retry</button>
        <button className="btn" onClick={onHome} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Home size={14} />Home</button>
      </div>
    </div>
  );
}

function PickStep({ employees, search, setSearch, geoResult, onPick, loading }) {
  return (
    <>
      {geoResult?.ok && (
        <div style={{ fontSize: 12, color: 'var(--success)', background: '#e8f5ee', border: '1px solid #b8dcc8', borderRadius: 4, padding: '8px 12px', marginBottom: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={13} />Location verified — tap your name to set PIN
        </div>
      )}
      <div style={{ fontSize: 13, color: 'var(--accent)', background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 4, padding: '8px 12px', marginBottom: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
        <CheckCircle size={13} />First time? Select your name to set 4-digit PIN
      </div>
      <input className="form-inp" placeholder="Search your name..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 10 }} disabled={loading} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
        {employees.length === 0 && (
          <div className="empty-state">
            <User size={32} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--ink2)' }} />
            <div style={{ marginBottom: 8 }}>No employees found</div>
            <div style={{ fontSize: 11, color: 'var(--ink2)', textAlign: 'center' }}>
              {search ? 'Try a different search term' : 'Employee list may be empty or failed to load'}
            </div>
          </div>
        )}
        {employees.map(e => (
          <div key={e._id} onClick={() => !loading && onPick(e)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', 
              border: '1.5px solid var(--border)', borderRadius: 4, 
              cursor: loading ? 'not-allowed' : 'pointer', 
              background: 'var(--surface)', transition: 'all 0.15s',
              opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={ev => { if (!loading) { ev.currentTarget.style.borderColor = 'var(--ink)'; ev.currentTarget.style.background = 'var(--surface2)'; } }}
            onMouseLeave={ev => { if (!loading) { ev.currentTarget.style.borderColor = 'var(--border)'; ev.currentTarget.style.background = 'var(--surface)'; } }}>
            <div className="emp-avt">{avt(e.name)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{e.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink2)', marginTop: 2 }}>{e.designation} · {e.employeeCode}</div>
            </div>
            {loading && <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Processing...</div>}
          </div>
        ))}
      </div>
    </>
  );
}

function SetPinStep({ employee, newPin, setNewPin, confirmPin, setConfirmPin, onSetPin, loading }) {
  if (!employee) return null;
  
  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <div className="emp-avt" style={{ width: 64, height: 64, fontSize: 20, fontWeight: 800, margin: '0 auto 16px', borderRadius: 8 }}>
        {avt(employee.name)}
      </div>
      
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
        Welcome, {employee.name}!
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 20 }}>
        Set a 4-digit PIN for quick attendance
      </div>
      
      <div style={{ maxWidth: 280, margin: '0 auto' }}>
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>Enter 4-digit PIN</label>
          <input 
            className="form-inp" 
            type="password" 
            maxLength="4" 
            value={newPin} 
            onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            style={{ textAlign: 'center', fontSize: 18, letterSpacing: 4 }}
            disabled={loading}
          />
        </div>
        
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>Confirm PIN</label>
          <input 
            className="form-inp" 
            type="password" 
            maxLength="4" 
            value={confirmPin} 
            onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            style={{ textAlign: 'center', fontSize: 18, letterSpacing: 4 }}
            disabled={loading}
          />
        </div>
        
        <button 
          className="btn btn-primary btn-full" 
          onClick={onSetPin}
          disabled={loading || !newPin || newPin.length !== 4 || !confirmPin}
          style={{ fontSize: 14, fontWeight: 700 }}
        >
          {loading ? 'Setting PIN...' : 'Set PIN & Mark Attendance'}
        </button>
      </div>
    </div>
  );
}

function SelfieStep({ employee, onCapture, loading }) {
  if (!employee) return null;
  
  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface2)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Camera size={28} color="var(--accent2)" />
      </div>
      
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
        📸 Selfie Required
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 20, lineHeight: 1.6 }}>
        Your admin requires a selfie for attendance verification
      </div>
      
      <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 4, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: 'var(--accent)' }}>
        💡 <strong>Tip:</strong> Make sure your face is clearly visible and well-lit
      </div>
      
      <button 
        className="btn btn-primary btn-full" 
        onClick={onCapture}
        disabled={loading}
        style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <Camera size={16} />
        {loading ? 'Processing...' : 'Take Selfie'}
      </button>
    </div>
  );
}

function SelfieCamera({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [captured, setCaptured] = useState(false);
  const [imageData, setImageData] = useState(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      toast('Camera access denied');
      onClose();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
    setImageData(dataURL);
    setCaptured(true);
  };

  const retake = () => {
    setCaptured(false);
    setImageData(null);
  };

  const confirm = () => {
    onCapture(imageData);
    stopCamera();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 20, maxWidth: 400, width: '90%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, margin: 0 }}>Take Selfie</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        
        <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', marginBottom: 16, background: '#000' }}>
          {!captured ? (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              style={{ width: '100%', height: 300, objectFit: 'cover' }}
            />
          ) : (
            <img 
              src={imageData} 
              alt="Captured selfie" 
              style={{ width: '100%', height: 300, objectFit: 'cover' }}
            />
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          {!captured ? (
            <>
              <button className="btn" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={capturePhoto} style={{ flex: 1 }}>📸 Capture</button>
            </>
          ) : (
            <>
              <button className="btn" onClick={retake} style={{ flex: 1 }}>Retake</button>
              <button className="btn btn-primary" onClick={confirm} style={{ flex: 1 }}>✓ Use This</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AutoStep({ employee, loading }) {
  if (!employee) return null;
  
  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <div className="emp-avt" style={{ width: 64, height: 64, fontSize: 20, fontWeight: 800, margin: '0 auto 16px', borderRadius: 8 }}>
        {avt(employee.name)}
      </div>
      
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
        Welcome back, {employee.name}!
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 20 }}>
        {employee.designation} • {employee.employeeCode}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
        <div style={{ 
          width: 20, 
          height: 20, 
          border: '2px solid var(--border)', 
          borderTop: '2px solid var(--accent)', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite' 
        }} />
        <span style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600 }}>
          Marking attendance automatically...
        </span>
      </div>
      
      <div style={{ fontSize: 11, color: 'var(--ink2)' }}>
        Your attendance is being processed
      </div>
    </div>
  );
}

function ConfirmStep({ emp, geoResult, loading, onMark, onBack }) {
  if (!emp) return null;
  return (
    <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
        {geoResult?.ok && (
          <span style={{ background: '#e8f5ee', border: '1px solid #b8dcc8', padding: '4px 10px', borderRadius: 2, fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} />GPS verified
          </span>
        )}
      </div>
      
      <div className="emp-avt" style={{ width: 72, height: 72, fontSize: 24, fontWeight: 800, margin: '0 auto 16px', borderRadius: 8 }}>{avt(emp.name)}</div>
      
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{emp.name}</div>
      <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 20 }}>{emp.designation} · {emp.employeeCode}</div>
      
      <div style={{ display: 'flex', gap: 12 }}>
        <ActionBtn color="var(--success)" icon={<LogIn size={22} />} label="CHECK IN" sub="Mark arrival" onClick={() => onMark('in')} disabled={loading} />
        <ActionBtn color="var(--danger)"  icon={<LogOut size={22} />} label="CHECK OUT" sub="Mark departure" onClick={() => onMark('out')} disabled={loading} />
      </div>
      
      <button className="btn btn-full" style={{ marginTop: 12, borderStyle: 'dashed', fontWeight: 400, fontSize: 12 }} onClick={onBack}>← Change Name</button>
    </div>
  );
}

function ActionBtn({ color, icon, label, sub, onClick, disabled }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ flex: 1, padding: '14px 10px', border: `2px solid ${color}`, borderRadius: 4, background: hov ? color : 'transparent', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: hov ? '#fff' : color, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'all 0.15s', opacity: disabled ? 0.5 : 1 }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {icon}<span>{label}</span>
      <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 400, opacity: 0.8 }}>{sub}</span>
    </button>
  );
}

function DoneStep({ doneData, onHome }) {
  if (!doneData) return null;
  const { type, data, emp } = doneData;
  const att = data.attendance;
  const isIn = type === 'in';
  const action = data.action || type;
  
  return (
    <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
      <div className="pop-in" style={{ width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', background: isIn ? '#e8f5ee' : '#fdeee8', border: `2px solid ${isIn ? 'var(--success)' : 'var(--danger)'}` }}>
        {isIn ? <CheckCircle size={36} color="var(--success)" /> : <LogOut size={36} color="var(--danger)" />}
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
        {isIn ? 'Welcome In!' : 'See You Tomorrow!'}
      </div>
      <div style={{ fontSize: 15, color: 'var(--ink2)', marginBottom: 8 }}>{emp.name}</div>
      <div style={{ fontSize: 12, color: 'var(--ink2)', marginBottom: 20, fontFamily: 'DM Mono, monospace' }}>
        {action === 'punch-in' ? 'Punched In' : 'Punched Out'} • {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16 }}>
        {att?.checkIn?.time && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}><Clock size={11} />In</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 500 }}>{fmtTime(att.checkIn.time)}</div>
          </div>
        )}
        {att?.checkOut?.time && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}><Clock size={11} />Out</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 500 }}>{fmtTime(att.checkOut.time)}</div>
          </div>
        )}
      </div>
      
      {data.analysis?.hoursWorked && (
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '8px 18px', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'DM Mono, monospace', fontSize: 13, marginBottom: 16 }}>
          <Clock size={13} />Total: {data.analysis.hoursWorked}
        </div>
      )}
      
      {data.isLate && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <span style={{ background: '#fff3cd', border: '1px solid #ffc107', padding: '5px 12px', borderRadius: 2, fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#856404', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={11} />Late by {data.lateBy}
          </span>
        </div>
      )}
      
      {data.withinRadius && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <span style={{ background: '#e8f5ee', border: '1px solid #b8dcc8', padding: '5px 12px', borderRadius: 2, fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <MapPin size={11} />{data.distance}m • GPS verified
          </span>
        </div>
      )}
      
      <button className="btn btn-primary" onClick={onHome} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        Done <Home size={14} />
      </button>
    </div>
  );
}
