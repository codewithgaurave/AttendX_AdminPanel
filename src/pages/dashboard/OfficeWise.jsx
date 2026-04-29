import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { avt, fmtDate, today } from '../../utils/api';
import { MapPin, Users, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function OfficeWise() {
  const [offices, setOffices] = useState([]);
  const [selOffice, setSelOffice] = useState(null);
  const [tab, setTab] = useState('employees'); // employees | attendance
  const [date, setDate] = useState(today());
  const [employees, setEmployees] = useState([]);
  const [attReport, setAttReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/admin/offices').then(r => setOffices(r.data)); }, []);

  useEffect(() => {
    if (!selOffice) return;
    setLoading(true);
    if (tab === 'employees') {
      api.get('/admin/employees')
        .then(r => setEmployees(r.data.filter(e => (e.officeId?._id || e.officeId) === selOffice._id)))
        .finally(() => setLoading(false));
    } else {
      api.get(`/attendance/office/${selOffice._id}?date=${date}`)
        .then(r => setAttReport(r.data))
        .finally(() => setLoading(false));
    }
  }, [selOffice, tab, date]);

  const present = attReport?.present || [];
  const absent  = attReport?.absent  || [];
  const summary = attReport?.summary;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Office Wise</div>
        <div style={{ fontSize: 13, color: 'var(--ink2)' }}>View employees and attendance by office</div>
      </div>

      {/* Office cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 12, marginBottom: 24 }}>
        {offices.map(o => (
          <div key={o._id} onClick={() => { setSelOffice(o); setTab('employees'); setAttReport(null); }}
            style={{ background: selOffice?._id === o._id ? 'var(--ink)' : 'var(--surface)', border: `2px solid ${selOffice?._id === o._id ? 'var(--ink)' : 'var(--border)'}`, borderRadius: 4, padding: 16, cursor: 'pointer', transition: 'all 0.15s', boxShadow: selOffice?._id === o._id ? '4px 4px 0 var(--accent)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 4, background: selOffice?._id === o._id ? 'var(--accent)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={18} color={selOffice?._id === o._id ? '#fff' : 'var(--ink2)'} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: selOffice?._id === o._id ? 'var(--bg)' : 'var(--ink)' }}>{o.name}</div>
                <div style={{ fontSize: 11, color: selOffice?._id === o._id ? '#aaa' : 'var(--ink2)' }}>Radius: {o.radius}m</div>
              </div>
            </div>
            {o.address && <div style={{ fontSize: 11, color: selOffice?._id === o._id ? '#888' : 'var(--ink2)', lineHeight: 1.4 }}>{o.address.slice(0, 60)}…</div>}
          </div>
        ))}
        {offices.length === 0 && <div className="empty-state"><MapPin size={32} style={{ margin: '0 auto 10px', display: 'block', color: 'var(--ink2)' }} /><div>No offices found</div></div>}
      </div>

      {selOffice && (
        <>
          {/* Sub tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface2)', padding: 4, borderRadius: 6, width: 'fit-content', border: '1px solid var(--border)' }}>
            {[{ id: 'employees', label: 'Employees', icon: <Users size={14} /> }, { id: 'attendance', label: 'Attendance', icon: <CheckCircle size={14} /> }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding: '8px 16px', borderRadius: 4, border: 'none', background: tab === t.id ? 'var(--ink)' : 'transparent', color: tab === t.id ? 'var(--bg)' : 'var(--ink2)', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* Employees tab */}
          {tab === 'employees' && (
            <>
              <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 16 }}>
                <strong>{selOffice.name}</strong> — {employees.length} employees
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 12 }}>
                {employees.map(e => (
                  <div key={e._id} style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 4, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div className="emp-avt" style={{ width: 40, height: 40, fontSize: 14, fontWeight: 800 }}>{avt(e.name)}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{e.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink2)' }}>{e.employeeCode} · {e.designation}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {e.department && <span className="badge b-in">{e.department}</span>}
                      <span style={{ fontSize: 11, color: 'var(--ink2)', fontFamily: 'DM Mono, monospace' }}>
                        <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
                        {e.workingHours?.startTime} – {e.workingHours?.endTime}
                      </span>
                    </div>
                    {e.monthlySalary > 0 && (
                      <div style={{ marginTop: 8, fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'var(--success)' }}>
                        ₹ {e.monthlySalary.toLocaleString('en-IN')} / month
                      </div>
                    )}
                  </div>
                ))}
                {employees.length === 0 && !loading && (
                  <div className="empty-state"><Users size={32} style={{ margin: '0 auto 10px', display: 'block', color: 'var(--ink2)' }} /><div>No employees in this office</div></div>
                )}
              </div>
            </>
          )}

          {/* Attendance tab */}
          {tab === 'attendance' && (
            <>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Date</label>
                  <input className="form-inp" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ maxWidth: 200 }} />
                </div>
                {summary && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, background: '#e8f5ee', border: '1px solid #b8dcc8', color: 'var(--success)', fontWeight: 700, padding: '4px 10px', borderRadius: 3, fontFamily: 'DM Mono, monospace', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={11} />{summary.present} Present</span>
                    <span style={{ fontSize: 12, background: '#fdeee8', border: '1px solid #f0c0b0', color: 'var(--danger)', fontWeight: 700, padding: '4px 10px', borderRadius: 3, fontFamily: 'DM Mono, monospace', display: 'flex', alignItems: 'center', gap: 4 }}><XCircle size={11} />{summary.absent} Absent</span>
                    {summary.late > 0 && <span style={{ fontSize: 12, background: '#fff8e8', border: '1px solid #f0d090', color: 'var(--warning)', fontWeight: 700, padding: '4px 10px', borderRadius: 3, fontFamily: 'DM Mono, monospace', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} />{summary.late} Late</span>}
                  </div>
                )}
              </div>

              <div className="tbl-wrap" style={{ overflowX: 'auto' }}>
                <div className="tbl-head-row">
                  <div className="tbl-title">{selOffice.name} — {fmtDate(date)}</div>
                  <span style={{ fontSize: 11, color: 'var(--ink2)' }}>{(present.length + absent.length)} employees</span>
                </div>
                <table>
                  <thead><tr>
                    <th>Employee</th><th>Check In</th><th>Check Out</th>
                    <th>Hours</th><th>Late</th><th>Status</th>
                  </tr></thead>
                  <tbody>
                    {loading && <tr><td colSpan={6}><div className="empty-state"><div>Loading…</div></div></td></tr>}
                    {[...present, ...absent].map((r, i) => (
                      <tr key={r.employeeId + i}>
                        <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="emp-avt" style={{ width: 28, height: 28, fontSize: 11 }}>{avt(r.name || '')}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink2)' }}>{r.employeeCode}</div>
                          </div>
                        </div></td>
                        <td><span className="time-tag">{r.checkInTime || '—'}</span></td>
                        <td><span className="time-tag">{r.checkOutTime || '—'}</span></td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--success)' }}>
                          {r.hoursWorked || (r.checkInTime && !r.checkOutTime ? 'Working…' : '—')}
                        </td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--warning)' }}>{r.isLate ? r.lateBy : '—'}</td>
                        <td><span className={`badge ${r.status === 'present' ? 'b-in' : r.status === 'half-day' ? 'b-out' : 'b-absent'}`}>{r.status || 'absent'}</span></td>
                      </tr>
                    ))}
                    {!loading && present.length + absent.length === 0 && (
                      <tr><td colSpan={6}><div className="empty-state"><div>No records for this date</div></div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {!selOffice && offices.length > 0 && (
        <div className="empty-state">
          <MapPin size={36} style={{ margin: '0 auto 10px', display: 'block', color: 'var(--ink2)' }} />
          <div>Select an office above to view details</div>
        </div>
      )}
    </>
  );
}
