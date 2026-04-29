import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { avt, fmtDate } from '../../utils/api';
import { exportEmployeeReport } from '../../utils/exportExcel';
import { ChevronLeft, ChevronRight, Users, BarChart2, Download, Calendar, List, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function Reports() {
  const { auth } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selEmp, setSelEmp] = useState(null);
  const [empReport, setEmpReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [viewMode, setViewMode] = useState('list'); // list or calendar

  useEffect(() => { 
    api.get('/admin/employees').then(r => {
      console.log('Reports - Employees API response:', r.data);
      const employees = r.data.employees || r.data || [];
      const validEmployees = Array.isArray(employees) ? employees : [];
      // Only show active employees
      const activeEmployees = validEmployees.filter(e => e.isActive !== false);
      console.log('Reports - Active employees:', activeEmployees.length);
      setEmployees(activeEmployees);
    }).catch(err => {
      console.error('Reports - Error loading employees:', err);
      setEmployees([]);
    });
  }, []);

  useEffect(() => {
    if (!selEmp) return;
    setLoading(true);
    api.get(`/attendance/employee/${selEmp._id}?month=${month}`)
      .then(r => setEmpReport(r.data))
      .finally(() => setLoading(false));
  }, [selEmp, month]);

  const chgMonth = (d) => {
    const dt = new Date(month + '-01');
    dt.setMonth(dt.getMonth() + d);
    setMonth(dt.toISOString().slice(0, 7));
  };

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Reports</div>
      <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 20 }}>Monthly attendance analysis per employee</div>

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => chgMonth(-1)} style={{ width: 32, height: 32, border: '1.5px solid var(--border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink2)' }}><ChevronLeft size={16} /></button>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800 }}>{monthLabel}</div>
        <button onClick={() => chgMonth(1)} style={{ width: 32, height: 32, border: '1.5px solid var(--border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink2)' }}><ChevronRight size={16} /></button>
      </div>

      {/* Employee list - full width */}
      <div className="tbl-wrap" style={{ marginBottom: 24 }}>
        <div className="tbl-head-row">
          <div className="tbl-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={15} />Select Employee</div>
          {selEmp && <button className="btn btn-sm" onClick={() => { setSelEmp(null); setEmpReport(null); }}>✕ Clear</button>}
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
                <div style={{ fontSize: 11, color: selEmp?._id === e._id ? '#ccc' : 'var(--ink2)' }}>{e.employeeCode} · {e.designation}</div>
              </div>
              {selEmp?._id === e._id && <ChevronRight size={14} color="var(--accent)" style={{ flexShrink: 0 }} />}
            </div>
          )) : null}
          {Array.isArray(employees) && employees.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ink2)', fontSize: 13 }}>No employees found</div>
          )}
        </div>
      </div>

      {/* Report section - full width below */}
      {selEmp && (
        <div>
          {/* Employee header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '16px 20px', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 4 }}>
            <div className="emp-avt" style={{ width: 48, height: 48, fontSize: 16, fontWeight: 800 }}>{avt(selEmp.name)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800 }}>{selEmp.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink2)' }}>{selEmp.employeeCode} · {selEmp.designation} · {monthLabel}</div>
            </div>
            {empReport && (
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ display: 'flex', background: 'var(--surface2)', padding: 2, borderRadius: 4, border: '1px solid var(--border)' }}>
                  <button onClick={() => setViewMode('list')} 
                    style={{ padding: '6px 12px', border: 'none', background: viewMode === 'list' ? 'var(--ink)' : 'transparent', color: viewMode === 'list' ? 'var(--bg)' : 'var(--ink2)', borderRadius: 3, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <List size={12} />List
                  </button>
                  <button onClick={() => setViewMode('calendar')} 
                    style={{ padding: '6px 12px', border: 'none', background: viewMode === 'calendar' ? 'var(--ink)' : 'transparent', color: viewMode === 'calendar' ? 'var(--bg)' : 'var(--ink2)', borderRadius: 3, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={12} />Calendar
                  </button>
                </div>
                <button className="btn btn-primary" onClick={() => exportEmployeeReport(empReport, selEmp.name, month)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Download size={14} />Export
                </button>
              </div>
            )}
          </div>

          {loading && (
            <div className="empty-state"><BarChart2 size={32} style={{ margin: '0 auto 10px', display: 'block', color: 'var(--ink2)' }} /><div>Loading report…</div></div>
          )}

          {!loading && empReport && (
            <>
              {/* Stats cards - same as Overview */}
              <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: 20 }}>
                {[
                  { label: 'Present',   val: empReport.summary.present,                  cls: 's-present' },
                  { label: 'Absent',    val: empReport.summary.absent,                   cls: 's-absent' },
                  { label: 'Half Day',  val: empReport.summary.halfDay,                  cls: 's-out' },
                  { label: 'Late Days', val: empReport.summary.lateDays,                 cls: 's-out' },
                  { label: 'Total Hrs', val: empReport.summary.totalHoursWorked + 'h',   cls: 's-total' },
                ].map(s => (
                  <div key={s.label} className={`stat-box ${s.cls}`}>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-val">{s.val}</div>
                  </div>
                ))}
              </div>

              {/* Daily records table or calendar */}
              {viewMode === 'list' ? (
                <div className="tbl-wrap">
                  <div className="tbl-head-row">
                    <div className="tbl-title">{selEmp.name} — Daily Records</div>
                    <span style={{ fontSize: 11, color: 'var(--ink2)' }}>{empReport.records.length} days</span>
                  </div>
                  <table>
                    <thead><tr>
                      <th>Date</th><th>Check In</th><th>Check Out</th>
                      <th>Hours Worked</th><th>Late By</th><th>Early Leave</th><th>Status</th>
                    </tr></thead>
                    <tbody>
                      {empReport.records.map(r => (
                        <tr key={r.date}>
                          <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{r.date}</td>
                          <td><span className="time-tag">{r.checkInTime || '—'}</span></td>
                          <td><span className="time-tag">{r.checkOutTime || '—'}</span></td>
                          <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--success)' }}>{r.hoursWorked || '—'}</td>
                          <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: r.isLate ? 'var(--warning)' : 'var(--ink2)' }}>
                            {r.isLate ? r.lateBy : '—'}
                          </td>
                          <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: r.isEarlyLeave ? 'var(--warning)' : 'var(--ink2)' }}>
                            {r.isEarlyLeave ? r.earlyLeaveBy : '—'}
                          </td>
                          <td><span className={`badge ${r.status === 'present' ? 'b-in' : r.status === 'half-day' ? 'b-out' : 'b-absent'}`}>{r.status}</span></td>
                        </tr>
                      ))}
                      {empReport.records.length === 0 && (
                        <tr><td colSpan={7}>
                          <div className="empty-state"><div>No records for {monthLabel}</div></div>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmployeeCalendar 
                  month={month} 
                  records={empReport.records} 
                  employee={selEmp}
                />
              )}
            </>
          )}
        </div>
      )}

      {!selEmp && (
        <div className="empty-state">
          <Users size={36} style={{ margin: '0 auto 10px', display: 'block', color: 'var(--ink2)' }} />
          <div>Select an employee above to view their report</div>
        </div>
      )}
    </>
  );
}

/* ── Employee Calendar Component ── */
function EmployeeCalendar({ month, records, employee }) {
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Generate calendar days
  const generateCalendarDays = () => {
    const year = parseInt(month.slice(0, 4));
    const monthNum = parseInt(month.slice(5, 7)) - 1;
    const firstDay = new Date(year, monthNum, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const getDayRecord = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return records.find(r => r.date === dateStr);
  };

  const isCurrentMonth = (date) => {
    const monthNum = parseInt(month.slice(5, 7)) - 1;
    return date.getMonth() === monthNum;
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const days = generateCalendarDays();
  const monthLabel = new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const selectedRecord = selectedDate ? getDayRecord(selectedDate) : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedDate ? '2fr 1fr' : '1fr', gap: 20 }}>
      {/* Calendar Grid */}
      <div>
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          {/* Calendar Header */}
          <div style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800 }}>{employee.name} - {monthLabel}</div>
          </div>
          
          {/* Days Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--surface2)' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 1 }}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {days.map((date, index) => {
              const record = getDayRecord(date);
              const isCurrentMonthDay = isCurrentMonth(date);
              const isTodayDate = isToday(date);
              const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
              
              return (
                <EmployeeCalendarDayCell
                  key={index}
                  date={date}
                  record={record}
                  isCurrentMonth={isCurrentMonthDay}
                  isToday={isTodayDate}
                  isSelected={isSelected}
                  onClick={() => setSelectedDate(date)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Day Details */}
      {selectedDate && (
        <div>
          <div className="tbl-wrap">
            <div className="tbl-head-row">
              <div className="tbl-title">{fmtDate(selectedDate.toISOString().split('T')[0])}</div>
              <button className="btn btn-sm" onClick={() => setSelectedDate(null)}>✕</button>
            </div>
            
            {selectedRecord ? (
              <div style={{ padding: '20px' }}>
                {/* Status */}
                <div style={{ marginBottom: 16 }}>
                  <span className={`badge ${selectedRecord.status === 'present' ? 'b-in' : selectedRecord.status === 'half-day' ? 'b-out' : 'b-absent'}`} style={{ fontSize: 12, padding: '6px 12px' }}>
                    {selectedRecord.status || 'absent'}
                  </span>
                </div>
                
                {/* Times */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Check In</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 600 }}>
                      {selectedRecord.checkInTime || '—'}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Check Out</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 600 }}>
                      {selectedRecord.checkOutTime || '—'}
                    </div>
                  </div>
                  
                  {selectedRecord.hoursWorked && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Hours Worked</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 600, color: 'var(--success)' }}>
                        {selectedRecord.hoursWorked}
                      </div>
                    </div>
                  )}
                  
                  {selectedRecord.isLate && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Late By</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 600, color: 'var(--warning)' }}>
                        {selectedRecord.lateBy}
                      </div>
                    </div>
                  )}
                  
                  {selectedRecord.isEarlyLeave && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Early Leave</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 600, color: 'var(--warning)' }}>
                        {selectedRecord.earlyLeaveBy}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink2)', fontSize: 13 }}>
                No attendance record for this day
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeCalendarDayCell({ date, record, isCurrentMonth, isToday, isSelected, onClick }) {
  const dayNumber = date.getDate();
  
  const getStatusColor = () => {
    if (!record) return '#e5e7eb';
    if (record.status === 'present') return '#22c55e';
    if (record.status === 'half-day') return '#f59e0b';
    return '#ef4444'; // absent
  };

  const getStatusIcon = () => {
    if (!record) return null;
    if (record.status === 'present') return '✓';
    if (record.status === 'half-day') return '½';
    return '✗'; // absent
  };

  return (
    <div
      onClick={onClick}
      style={{
        minHeight: 80,
        padding: '8px',
        border: '1px solid var(--border)',
        background: isSelected ? 'var(--accent)' : isCurrentMonth ? 'var(--surface)' : 'var(--surface2)',
        opacity: isCurrentMonth ? 1 : 0.6,
        cursor: record ? 'pointer' : 'default',
        transition: 'all 0.15s',
        position: 'relative'
      }}
      onMouseEnter={e => {
        if (record && !isSelected) {
          e.currentTarget.style.background = 'var(--surface2)';
          e.currentTarget.style.borderColor = 'var(--ink)';
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          e.currentTarget.style.background = isCurrentMonth ? 'var(--surface)' : 'var(--surface2)';
          e.currentTarget.style.borderColor = 'var(--border)';
        }
      }}
    >
      {/* Date number */}
      <div style={{
        fontSize: 14,
        fontWeight: isToday ? 800 : 600,
        color: isSelected ? 'white' : isToday ? 'var(--accent)' : 'var(--ink)',
        marginBottom: 4
      }}>
        {dayNumber}
      </div>

      {/* Status indicator */}
      {record && (
        <>
          <div style={{
            width: '100%',
            height: 4,
            borderRadius: 2,
            background: getStatusColor(),
            marginBottom: 4
          }} />
          
          <div style={{
            fontSize: 12,
            color: isSelected ? 'rgba(255,255,255,0.9)' : getStatusColor(),
            fontWeight: 700,
            textAlign: 'center'
          }}>
            {getStatusIcon()}
          </div>
          
          {record.checkInTime && (
            <div style={{
              fontSize: 9,
              color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--ink2)',
              marginTop: 2
            }}>
              {record.checkInTime}
            </div>
          )}
          
          {record.isLate && (
            <div style={{
              fontSize: 8,
              color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--warning)',
              marginTop: 1
            }}>
              ⏰ Late
            </div>
          )}
        </>
      )}

      {/* Today indicator */}
      {isToday && !isSelected && (
        <div style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--accent)'
        }} />
      )}
    </div>
  );
}
