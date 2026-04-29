import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { avt } from '../../utils/api';
import { Download, IndianRupee, ChevronLeft, ChevronRight, Users, TrendingDown, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function Salary() {
  const [employees, setEmployees] = useState([]);
  const [selEmp, setSelEmp] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { 
    api.get('/admin/employees').then(r => {
      console.log('Salary - Employees API response:', r.data);
      const employees = r.data.employees || r.data || [];
      const validEmployees = Array.isArray(employees) ? employees : [];
      // Only show active employees with salary set
      const activeEmployeesWithSalary = validEmployees.filter(e => e.isActive !== false && e.monthlySalary > 0);
      console.log('Salary - Active employees with salary:', activeEmployeesWithSalary.length);
      setEmployees(activeEmployeesWithSalary);
    }).catch(err => {
      console.error('Salary - Error loading employees:', err);
      setEmployees([]);
    });
  }, []);

  useEffect(() => {
    if (!selEmp) return;
    setLoading(true);
    api.get(`/admin/salary/${selEmp._id}?month=${month}`)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selEmp, month]);

  const chgMonth = (d) => {
    const dt = new Date(month + '-01');
    dt.setMonth(dt.getMonth() + d);
    setMonth(dt.toISOString().slice(0, 7));
  };

  const downloadPDF = async () => {
    if (!selEmp) return;
    setDownloading(true);
    try {
      const res = await api.get(`/admin/salary/${selEmp._id}/pdf?month=${month}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `salary-slip-${selEmp.employeeCode}-${month}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { } finally { setDownloading(false); }
  };

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Salary</div>
        <div style={{ fontSize: 13, color: 'var(--ink2)' }}>Auto salary calculation based on attendance</div>
      </div>

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => chgMonth(-1)} style={{ width: 32, height: 32, border: '1.5px solid var(--border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink2)' }}><ChevronLeft size={16} /></button>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800 }}>{monthLabel}</div>
        <button onClick={() => chgMonth(1)} style={{ width: 32, height: 32, border: '1.5px solid var(--border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink2)' }}><ChevronRight size={16} /></button>
      </div>

      {/* Employee list */}
      <div className="tbl-wrap" style={{ marginBottom: 24 }}>
        <div className="tbl-head-row">
          <div className="tbl-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={15} />Select Employee</div>
          {selEmp && <button className="btn btn-sm" onClick={() => { setSelEmp(null); setData(null); }}>✕ Clear</button>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))' }}>
          {Array.isArray(employees) ? employees.map(e => (
            <div key={e._id} onClick={() => setSelEmp(e)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid rgba(216,208,192,0.3)', borderRight: '1px solid rgba(216,208,192,0.3)', cursor: 'pointer', background: selEmp?._id === e._id ? 'var(--ink)' : 'transparent', transition: 'background 0.15s' }}
              onMouseEnter={ev => { if (selEmp?._id !== e._id) ev.currentTarget.style.background = 'var(--surface2)'; }}
              onMouseLeave={ev => { if (selEmp?._id !== e._id) ev.currentTarget.style.background = 'transparent'; }}>
              <div className="emp-avt" style={{ width: 32, height: 32, fontSize: 12, flexShrink: 0, background: selEmp?._id === e._id ? 'var(--accent)' : undefined }}>{avt(e.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: selEmp?._id === e._id ? 'var(--bg)' : 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</div>
                <div style={{ fontSize: 11, color: selEmp?._id === e._id ? '#ccc' : 'var(--ink2)' }}>
                  {e.employeeCode} · ₹{(e.monthlySalary || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          )) : null}
          {Array.isArray(employees) && employees.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ink2)', fontSize: 13 }}>No employees found</div>
          )}
        </div>
      </div>

      {/* Salary details */}
      {selEmp && loading && <div className="empty-state"><IndianRupee size={32} style={{ margin: '0 auto 10px', display: 'block', color: 'var(--ink2)' }} /><div>Calculating salary…</div></div>}

      {selEmp && !loading && data && (
        <div>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20, padding: '16px 20px', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="emp-avt" style={{ width: 48, height: 48, fontSize: 16, fontWeight: 800 }}>{avt(selEmp.name)}</div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800 }}>{selEmp.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink2)' }}>{selEmp.employeeCode} · {selEmp.designation} · {monthLabel}</div>
              </div>
            </div>
            <button className="btn btn-primary" onClick={downloadPDF} disabled={downloading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={15} />{downloading ? 'Generating…' : 'Download Salary Slip PDF'}
            </button>
          </div>

          {/* Attendance stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Working Days', val: data.attendance.totalWorkingDays, cls: 's-total',   icon: <Clock size={14} /> },
              { label: 'Present',      val: data.attendance.present,          cls: 's-present', icon: <CheckCircle size={14} /> },
              { label: 'Half Day',     val: data.attendance.halfDay,          cls: 's-out',     icon: <Clock size={14} /> },
              { label: 'Absent',       val: data.attendance.absent,           cls: 's-absent',  icon: <XCircle size={14} /> },
              { label: 'Weekly Offs',  val: data.attendance.weeklyOffs,       cls: '',          icon: <Clock size={14} /> },
              { label: 'Holidays',     val: data.attendance.holidayCount,     cls: '',          icon: <CheckCircle size={14} /> },
              { label: 'Hours Worked', val: data.totalHoursWorked + 'h',      cls: '',          icon: <Clock size={14} /> },
            ].map(s => (
              <div key={s.label} className={`stat-box ${s.cls}`} style={{ padding: '12px 14px' }}>
                <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{s.icon}{s.label}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 22, fontWeight: 500 }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Salary breakdown */}
          <div className="tbl-wrap">
            <div className="tbl-head-row">
              <div className="tbl-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IndianRupee size={15} />Salary Breakdown</div>
            </div>
            <table>
              <tbody>
                {[
                  ['Monthly CTC',         `₹ ${data.employee.monthlySalary.toLocaleString('en-IN')}`],
                  ['Per Day Salary',       `₹ ${data.salary.perDaySalary.toFixed(2)}`],
                  ['Earned Days',          data.salary.earnedDays],
                  ['Gross Salary',         `₹ ${data.salary.grossSalary.toLocaleString('en-IN')}`],
                  ['Deduction (Absent)',   `- ₹ ${data.salary.deduction.toLocaleString('en-IN')}`],
                ].map(([label, val], i) => (
                  <tr key={label} style={{ background: i % 2 === 0 ? 'var(--surface2)' : 'transparent' }}>
                    <td style={{ fontWeight: 500 }}>{label}</td>
                    <td style={{ fontFamily: 'DM Mono, monospace', textAlign: 'right', color: label.includes('Deduction') ? 'var(--danger)' : 'var(--ink)' }}>{val}</td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--ink)' }}>
                  <td style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--bg)' }}>Net Salary</td>
                  <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 700, textAlign: 'right', color: 'var(--accent)' }}>₹ {data.salary.netSalary.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Holidays this month */}
          {data.holidays.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Holidays This Month</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {data.holidays.map(h => (
                  <span key={h.date} style={{ background: '#e8f5ee', border: '1px solid #b8dcc8', padding: '4px 12px', borderRadius: 3, fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'var(--success)' }}>
                    {h.date} — {h.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!selEmp && (
        <div className="empty-state">
          <IndianRupee size={36} style={{ margin: '0 auto 10px', display: 'block', color: 'var(--ink2)' }} />
          <div>Select an employee to view salary details</div>
        </div>
      )}
    </>
  );
}
