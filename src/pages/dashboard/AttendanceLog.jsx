import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { avt, fmtDate, today } from '../../utils/api';
import { exportMonthlyAttendance, exportRangeAttendance } from '../../utils/exportExcel';
import { toast } from '../../components/Toast';
import Swal from 'sweetalert2';
import AttendanceCalendar from './AttendanceCalendar';
import {
  CalendarDays, Calendar, BarChart2, ChevronDown, ChevronUp,
  MapPin, Clock, CheckCircle, XCircle, Loader, Inbox, ChevronRight, Camera, Download, Edit2
} from 'lucide-react';

const MODE_TABS = [
  { id: 'date',     icon: <CalendarDays size={14} />, label: 'Date Wise' },
  { id: 'monthly',  icon: <Calendar size={14} />,     label: 'Monthly' },
  { id: 'range',    icon: <BarChart2 size={14} />,    label: 'Date Range' },
];

export default function AttendanceLog() {
  const { auth } = useAuth();
  const [mode, setMode] = useState('monthly');

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Attendance Log</div>
        <div style={{ fontSize: 13, color: 'var(--ink2)' }}>Check-in / check-out records with GPS & analysis</div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--surface2)', padding: 4, borderRadius: 6, width: 'fit-content', border: '1px solid var(--border)' }}>
        {MODE_TABS.map(t => (
          <button key={t.id} onClick={() => setMode(t.id)}
            style={{ padding: '8px 16px', borderRadius: 4, border: 'none', background: mode === t.id ? 'var(--ink)' : 'transparent', color: mode === t.id ? 'var(--bg)' : 'var(--ink2)', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {mode === 'date'     && <DateView    adminId={auth.user.id} />}
      {mode === 'monthly'  && <MonthlyView adminId={auth.user.id} />}
      {mode === 'range'    && <RangeView   adminId={auth.user.id} />}
    </>
  );
}

/* ── CALENDAR VIEW ── */
function CalendarView({ adminId }) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [employees, setEmployees] = useState([]);
  const [offices, setOffices] = useState([]);
  const [selEmp, setSelEmp] = useState('all');
  const [selOffice, setSelOffice] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => { 
    api.get('/admin/employees').then(r => setEmployees(Array.isArray(r.data) ? r.data : [])).catch(() => setEmployees([]));
    api.get('/admin/offices').then(r => setOffices(Array.isArray(r.data) ? r.data : [])).catch(() => setOffices([]));
  }, []);

  const load = () => {
    setLoading(true);
    const empParam = selEmp !== 'all' ? `&employeeId=${selEmp}` : '';
    const firstDay = `${month}-01`;
    const lastDay = new Date(month.slice(0,4), parseInt(month.slice(5,7)), 0).toISOString().split('T')[0];
    api.get(`/attendance/range/${adminId}?from=${firstDay}&to=${lastDay}${empParam}`)
      .then(r => setData(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [month, selEmp]);

  const chgMonth = (d) => {
    const dt = new Date(month + '-01');
    dt.setMonth(dt.getMonth() + d);
    setMonth(dt.toISOString().slice(0, 7));
  };

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  
  // Generate calendar days
  const generateCalendarDays = () => {
    const year = parseInt(month.slice(0, 4));
    const monthNum = parseInt(month.slice(5, 7)) - 1;
    const firstDay = new Date(year, monthNum, 1);
    const lastDay = new Date(year, monthNum + 1, 0);
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

  const getDayData = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return data?.dailySummary?.find(day => day.date === dateStr);
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
  const selectedDayData = selectedDate ? getDayData(selectedDate) : null;

  return (
    <>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Month</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NavBtn onClick={() => chgMonth(-1)}><ChevronDown size={14} style={{ transform: 'rotate(90deg)' }} /></NavBtn>
            <input className="form-inp" type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ maxWidth: 180 }} />
            <NavBtn onClick={() => chgMonth(1)}><ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} /></NavBtn>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Employee</label>
          <select className="form-inp" value={selEmp} onChange={e => setSelEmp(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="all">All Employees</option>
            {Array.isArray(employees) ? employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>) : null}
          </select>
        </div>
        {offices.length > 1 && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Office</label>
            <select className="form-inp" value={selOffice} onChange={e => setSelOffice(e.target.value)} style={{ maxWidth: 200 }}>
              <option value="all">All Offices</option>
              {offices.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedDate ? '2fr 1fr' : '1fr', gap: 20 }}>
        {/* Calendar Grid */}
        <div>
          <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            {/* Calendar Header */}
            <div style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '16px 20px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800 }}>{monthLabel}</div>
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
                const dayData = getDayData(date);
                const isCurrentMonthDay = isCurrentMonth(date);
                const isTodayDate = isToday(date);
                const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                
                return (
                  <CalendarDayCell
                    key={index}
                    date={date}
                    dayData={dayData}
                    isCurrentMonth={isCurrentMonthDay}
                    isToday={isTodayDate}
                    isSelected={isSelected}
                    onClick={() => setSelectedDate(date)}
                    loading={loading}
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
              
              {selectedDayData ? (
                <>
                  {/* Day Stats */}
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                      <span style={{ background: '#e8f5ee', border: '1px solid #b8dcc8', padding: '4px 10px', borderRadius: 3, fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={11} />{selectedDayData.present} Present
                      </span>
                      <span style={{ background: '#fdeee8', border: '1px solid #f0c0b0', padding: '4px 10px', borderRadius: 3, fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <XCircle size={11} />{selectedDayData.absent} Absent
                      </span>
                      {selectedDayData.halfDay > 0 && (
                        <span style={{ background: '#fff8e8', border: '1px solid #f0d090', padding: '4px 10px', borderRadius: 3, fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--warning)' }}>
                          {selectedDayData.halfDay} Half
                        </span>
                      )}
                      {selectedDayData.late > 0 && (
                        <span style={{ background: '#fff8e8', border: '1px solid #f0d090', padding: '4px 10px', borderRadius: 3, fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} />{selectedDayData.late} Late
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Employee Records */}
                  {selectedDayData.records.length > 0 ? (
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                      <MiniTable 
                        rows={selectedDayData.records.filter(r => selOffice === 'all' || r.office === offices.find(o => o._id === selOffice)?.name)} 
                        date={selectedDate.toISOString().split('T')[0]}
                        onMarkAttendance={() => load()}
                      />
                    </div>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink2)', fontSize: 13 }}>No records for this day</div>
                  )}
                </>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink2)', fontSize: 13 }}>No data available</div>
              )}
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(255,255,255,0.9)', padding: '20px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8, zIndex: 1000 }}>
          <Loader size={16} />Loading calendar...
        </div>
      )}
    </>
  );
}

function CalendarDayCell({ date, dayData, isCurrentMonth, isToday, isSelected, onClick, loading }) {
  const dayNumber = date.getDate();
  
  const getStatusColor = () => {
    if (!dayData || !dayData.records.length) return '#e5e7eb';
    const total = dayData.present + dayData.absent + dayData.halfDay;
    if (total === 0) return '#e5e7eb';
    const presentPercentage = (dayData.present / total) * 100;
    if (presentPercentage >= 90) return '#22c55e';
    if (presentPercentage >= 70) return '#84cc16';
    if (presentPercentage >= 50) return '#f59e0b';
    return '#ef4444';
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
        cursor: dayData ? 'pointer' : 'default',
        transition: 'all 0.15s',
        position: 'relative'
      }}
      onMouseEnter={e => {
        if (dayData && !isSelected) {
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

      {/* Status bar */}
      {dayData && dayData.records.length > 0 && (
        <div style={{
          width: '100%',
          height: 4,
          borderRadius: 2,
          background: getStatusColor(),
          marginBottom: 4
        }} />
      )}

      {/* Quick stats */}
      {dayData && (
        <div style={{ fontSize: 9, color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--ink2)' }}>
          {dayData.present > 0 && <div>✓ {dayData.present}</div>}
          {dayData.absent > 0 && <div>✗ {dayData.absent}</div>}
          {dayData.late > 0 && <div>⏰ {dayData.late}</div>}
        </div>
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

/* ── DATE WISE ── */
function DateView({ adminId }) {
  const [date, setDate] = useState(today());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [offices, setOffices] = useState([]);
  const [selOffice, setSelOffice] = useState('all');
  const [employees, setEmployees] = useState([]);

  useEffect(() => { 
    api.get('/admin/offices').then(r => setOffices(r.data || []));
    api.get('/admin/employees').then(r => {
      const employees = r.data.employees || r.data || [];
      setEmployees(Array.isArray(employees) ? employees : []);
    }).catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get(`/attendance/report/${adminId}?date=${date}`)
      .then(r => setReport(r.data)).finally(() => setLoading(false));
  }, [date]);

  const filterByOffice = (rows) => selOffice === 'all' ? rows : rows.filter(r => r.office === offices.find(o => o._id === selOffice)?.name);

  const present = filterByOffice(report?.present || []);
  const absent  = filterByOffice(report?.absent  || []);
  const summary = report?.summary;

  const markAttendance = async (employeeId, status) => {
    try {
      console.log('Marking attendance:', { employeeId, date, status });
      await api.post('/attendance/mark', { employeeId, date, status });
      toast(`Marked as ${status}`, 3000, 'success');
      // Reload the report data
      setLoading(true);
      const response = await api.get(`/attendance/report/${adminId}?date=${date}`);
      setReport(response.data);
      console.log('Report reloaded successfully');
    } catch (e) { 
      console.error('Mark attendance error:', e);
      const errorMsg = e.response?.data?.message || 'Error marking attendance';
      toast(errorMsg, 4000, 'error');
    } finally {
      setLoading(false);
    }
  };

  const markAbsentEmployees = async () => {
    const absentEmpIds = absent.map(a => a.employeeId);
    const validEmployees = Array.isArray(employees) ? employees : [];
    const notMarked = validEmployees.filter(e => !present.find(p => p.employeeId === e._id) && !absentEmpIds.includes(e._id));
    
    if (notMarked.length === 0) {
      toast('All employees already marked');
      return;
    }

    const result = await Swal.fire({
      title: `Mark ${notMarked.length} employees as Absent?`,
      text: 'This will mark all unmarked employees as absent for today.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c84b2f',
      cancelButtonColor: '#5a5248',
      confirmButtonText: 'Yes, Mark Absent',
      background: '#faf7f2',
      color: '#1a1612',
    });

    if (!result.isConfirmed) return;

    try {
      for (const emp of notMarked) {
        await api.post('/attendance/mark', { employeeId: emp._id, date, status: 'absent' });
      }
      toast(`${notMarked.length} employees marked as absent`);
      setLoading(true);
      api.get(`/attendance/report/${adminId}?date=${date}`)
        .then(r => setReport(r.data)).finally(() => setLoading(false));
    } catch (e) { toast('Error marking attendance'); }
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Select Date</label>
          <input className="form-inp" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ maxWidth: 200 }} />
        </div>
        {offices.length > 1 && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Office</label>
            <select className="form-inp" value={selOffice} onChange={e => setSelOffice(e.target.value)} style={{ maxWidth: 200 }}>
              <option value="all">All Offices</option>
              {offices.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
            </select>
          </div>
        )}
        {summary && <SummaryPills summary={summary} />}
        <button className="btn btn-primary btn-sm" onClick={markAbsentEmployees} style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <Edit2 size={14} />Mark Absent
        </button>
      </div>
      <AttTable rows={[...present, ...absent]} title={fmtDate(date)} loading={loading} onMarkAttendance={markAttendance} />
    </>
  );
}

/* ── MONTHLY ── */
function MonthlyView({ adminId }) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [employees, setEmployees] = useState([]);
  const [offices, setOffices] = useState([]);
  const [selEmp, setSelEmp] = useState('all');
  const [selOffice, setSelOffice] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('calendar'); // calendar or list
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => { 
    api.get('/admin/employees').then(r => {
      const employees = r.data.employees || r.data || [];
      setEmployees(Array.isArray(employees) ? employees : []);
    }).catch(() => setEmployees([]));
    api.get('/admin/offices').then(r => {
      const offices = r.data.offices || r.data || [];
      setOffices(Array.isArray(offices) ? offices : []);
    }).catch(() => setOffices([]));
  }, []);

  const load = () => {
    setLoading(true);
    const empParam = selEmp !== 'all' ? `&employeeId=${selEmp}` : '';
    const firstDay = `${month}-01`;
    const lastDay  = new Date(month.slice(0,4), parseInt(month.slice(5,7)), 0).toISOString().split('T')[0];
    api.get(`/attendance/range/${adminId}?from=${firstDay}&to=${lastDay}${empParam}`)
      .then(r => setData(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [month, selEmp]);

  const chgMonth = (d) => {
    const dt = new Date(month + '-01');
    dt.setMonth(dt.getMonth() + d);
    setMonth(dt.toISOString().slice(0, 7));
  };

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const overall = data?.overallSummary;

  const handleExport = () => {
    const filteredDaily = data?.dailySummary?.map(day => ({
      ...day,
      records: day.records.filter(r => selOffice === 'all' || r.office === offices.find(o => o._id === selOffice)?.name)
    })) || [];
    exportMonthlyAttendance(filteredDaily, employees, month, overall);
  };

  // Calendar functions
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

  const getDayData = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return data?.dailySummary?.find(day => day.date === dateStr);
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
  const selectedDayData = selectedDate ? getDayData(selectedDate) : null;

  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Month</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NavBtn onClick={() => chgMonth(-1)}><ChevronDown size={14} style={{ transform: 'rotate(90deg)' }} /></NavBtn>
            <input className="form-inp" type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ maxWidth: 180 }} />
            <NavBtn onClick={() => chgMonth(1)}><ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} /></NavBtn>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Employee</label>
          <select className="form-inp" value={selEmp} onChange={e => setSelEmp(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="all">All Employees</option>
            {Array.isArray(employees) ? employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>) : null}
          </select>
        </div>
        {offices.length > 1 && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Office</label>
            <select className="form-inp" value={selOffice} onChange={e => setSelOffice(e.target.value)} style={{ maxWidth: 200 }}>
              <option value="all">All Offices</option>
              {offices.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
            </select>
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', background: 'var(--surface2)', padding: 2, borderRadius: 4, border: '1px solid var(--border)' }}>
            <button onClick={() => setViewMode('calendar')} 
              style={{ padding: '6px 12px', border: 'none', background: viewMode === 'calendar' ? 'var(--ink)' : 'transparent', color: viewMode === 'calendar' ? 'var(--bg)' : 'var(--ink2)', borderRadius: 3, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              Calendar
            </button>
            <button onClick={() => setViewMode('list')} 
              style={{ padding: '6px 12px', border: 'none', background: viewMode === 'list' ? 'var(--ink)' : 'transparent', color: viewMode === 'list' ? 'var(--bg)' : 'var(--ink2)', borderRadius: 3, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              List
            </button>
          </div>
          <button className="btn btn-primary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} />Export
          </button>
        </div>
      </div>

      {overall && <OverallStats overall={overall} />}

      {viewMode === 'calendar' ? (
        <div>
          {/* Calendar Grid */}
          <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            {/* Calendar Header */}
            <div style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '16px 20px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800 }}>{monthLabel}</div>
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
                const dayData = getDayData(date);
                const isCurrentMonthDay = isCurrentMonth(date);
                const isTodayDate = isToday(date);
                
                return (
                  <CalendarDayCell
                    key={index}
                    date={date}
                    dayData={dayData}
                    isCurrentMonth={isCurrentMonthDay}
                    isToday={isTodayDate}
                    isSelected={false}
                    onClick={() => {
                      const dayData = getDayData(date);
                      if (dayData) {
                        showDayDetailsModal(date, dayData, offices, selOffice);
                      }
                    }}
                    loading={loading}
                  />
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading && <EmptyState icon={<Loader size={32} />} text="Loading…" />}
          {!loading && data?.dailySummary?.map(day => (
            <DayAccordion key={day.date} day={day} expanded={null} setExpanded={() => {}} />
          ))}
          {!loading && data?.dailySummary?.length === 0 && (
            <EmptyState icon={<Inbox size={32} />} text={`No data for ${monthLabel}`} />
          )}
        </div>
      )}

      {loading && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(255,255,255,0.9)', padding: '20px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8, zIndex: 1000 }}>
          <Loader size={16} />Loading calendar...
        </div>
      )}
    </>
  );
}

/* ── DATE RANGE ── */
function RangeView({ adminId }) {
  const [from, setFrom] = useState(today().slice(0, 8) + '01');
  const [to, setTo]     = useState(today());
  const [employees, setEmployees] = useState([]);
  const [offices, setOffices] = useState([]);
  const [selEmp, setSelEmp] = useState('all');
  const [selOffice, setSelOffice] = useState('all');
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('calendar'); // calendar or list
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => { 
    api.get('/admin/employees').then(r => {
      const employees = r.data.employees || r.data || [];
      setEmployees(Array.isArray(employees) ? employees : []);
    }).catch(() => setEmployees([]));
    api.get('/admin/offices').then(r => {
      const offices = r.data.offices || r.data || [];
      setOffices(Array.isArray(offices) ? offices : []);
    }).catch(() => setOffices([]));
  }, []);

  const load = () => {
    if (!from || !to) return;
    setLoading(true);
    const empParam = selEmp !== 'all' ? `&employeeId=${selEmp}` : '';
    api.get(`/attendance/range/${adminId}?from=${from}&to=${to}${empParam}`)
      .then(r => setData(r.data)).finally(() => setLoading(false));
  };

  const overall = data?.overallSummary;

  const handleExport = () => {
    const filteredDaily = data?.dailySummary?.map(day => ({
      ...day,
      records: day.records.filter(r => selOffice === 'all' || r.office === offices.find(o => o._id === selOffice)?.name)
    })) || [];
    exportRangeAttendance(filteredDaily, employees, from, to, overall);
  };

  // Calendar functions for range view
  const generateRangeCalendarDays = () => {
    if (!from || !to) return [];
    const startDate = new Date(from);
    const endDate = new Date(to);
    const days = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const getDayData = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return data?.dailySummary?.find(day => day.date === dateStr);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const days = generateRangeCalendarDays();
  const selectedDayData = selectedDate ? getDayData(selectedDate) : null;

  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>From</label>
          <input className="form-inp" type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ maxWidth: 180 }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>To</label>
          <input className="form-inp" type="date" value={to} onChange={e => setTo(e.target.value)} style={{ maxWidth: 180 }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Employee</label>
          <select className="form-inp" value={selEmp} onChange={e => setSelEmp(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="all">All Employees</option>
            {Array.isArray(employees) ? employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>) : null}
          </select>
        </div>
        {offices.length > 1 && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Office</label>
            <select className="form-inp" value={selOffice} onChange={e => setSelOffice(e.target.value)} style={{ maxWidth: 200 }}>
              <option value="all">All Offices</option>
              {offices.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
            </select>
          </div>
        )}
        <button className="btn btn-primary" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Apply <ChevronRight size={14} />
        </button>
        {data && (
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ display: 'flex', background: 'var(--surface2)', padding: 2, borderRadius: 4, border: '1px solid var(--border)' }}>
              <button onClick={() => setViewMode('calendar')} 
                style={{ padding: '6px 12px', border: 'none', background: viewMode === 'calendar' ? 'var(--ink)' : 'transparent', color: viewMode === 'calendar' ? 'var(--bg)' : 'var(--ink2)', borderRadius: 3, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                Calendar
              </button>
              <button onClick={() => setViewMode('list')} 
                style={{ padding: '6px 12px', border: 'none', background: viewMode === 'list' ? 'var(--ink)' : 'transparent', color: viewMode === 'list' ? 'var(--bg)' : 'var(--ink2)', borderRadius: 3, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                List
              </button>
            </div>
            <button className="btn btn-primary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={14} />Export
            </button>
          </div>
        )}
      </div>

      {overall && <OverallStats overall={overall} />}

      {data && viewMode === 'calendar' ? (
        <div style={{ display: 'grid', gridTemplateColumns: selectedDate ? '2fr 1fr' : '1fr', gap: 20 }}>
          {/* Calendar Grid for Range */}
          <div>
            <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '16px 20px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800 }}>
                  {fmtDate(from)} - {fmtDate(to)}
                </div>
              </div>
              
              {/* Range Calendar Days */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, padding: 8 }}>
                {days.map((date, index) => {
                  const dayData = getDayData(date);
                  const isTodayDate = isToday(date);
                  const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                  
                  return (
                    <CalendarDayCell
                      key={index}
                      date={date}
                      dayData={dayData}
                      isCurrentMonth={true}
                      isToday={isTodayDate}
                      isSelected={isSelected}
                      onClick={() => setSelectedDate(date)}
                      loading={loading}
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
                
                {selectedDayData ? (
                  <>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                        <span style={{ background: '#e8f5ee', border: '1px solid #b8dcc8', padding: '4px 10px', borderRadius: 3, fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={11} />{selectedDayData.present} Present
                        </span>
                        <span style={{ background: '#fdeee8', border: '1px solid #f0c0b0', padding: '4px 10px', borderRadius: 3, fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <XCircle size={11} />{selectedDayData.absent} Absent
                        </span>
                        {selectedDayData.halfDay > 0 && (
                          <span style={{ background: '#fff8e8', border: '1px solid #f0d090', padding: '4px 10px', borderRadius: 3, fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--warning)' }}>
                            {selectedDayData.halfDay} Half
                          </span>
                        )}
                        {selectedDayData.late > 0 && (
                          <span style={{ background: '#fff8e8', border: '1px solid #f0d090', padding: '4px 10px', borderRadius: 3, fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} />{selectedDayData.late} Late
                          </span>
                        )}
                      </div>
                    </div>

                    {selectedDayData.records.length > 0 ? (
                      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                        <MiniTable 
                          rows={selectedDayData.records.filter(r => selOffice === 'all' || r.office === offices.find(o => o._id === selOffice)?.name)} 
                          date={selectedDate.toISOString().split('T')[0]}
                          onMarkAttendance={() => load()}
                        />
                      </div>
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink2)', fontSize: 13 }}>No records for this day</div>
                    )}
                  </>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink2)', fontSize: 13 }}>No data available</div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : data && viewMode === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading && <EmptyState icon={<Loader size={32} />} text="Loading…" />}
          {!loading && data?.dailySummary?.map(day => (
            <DayAccordion key={day.date} day={day} expanded={null} setExpanded={() => {}} />
          ))}
          {!loading && data?.dailySummary?.length === 0 && (
            <EmptyState icon={<Inbox size={32} />} text="No data for selected range" />
          )}
        </div>
      ) : (
        !data && !loading && (
          <EmptyState icon={<BarChart2 size={32} />} text="Select range and click Apply" />
        )
      )}

      {loading && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(255,255,255,0.9)', padding: '20px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8, zIndex: 1000 }}>
          <Loader size={16} />Loading calendar...
        </div>
      )}
    </>
  );
}

/* ── SHARED ── */

function NavBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ width: 32, height: 38, border: '1.5px solid var(--border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink2)' }}>
      {children}
    </button>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="empty-state">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: 'var(--ink2)' }}>{icon}</div>
      <div>{text}</div>
    </div>
  );
}

function OverallStats({ overall }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
      {[
        { label: 'Total Days',  val: overall.totalDays,              cls: 's-total' },
        { label: 'Present',     val: overall.totalPresent,           cls: 's-present' },
        { label: 'Half Day',    val: overall.totalHalfDay,           cls: 's-out' },
        { label: 'Late',        val: overall.totalLate,              cls: '' },
        { label: 'Total Hours', val: overall.totalHoursWorked + 'h', cls: '' },
      ].map(s => (
        <div key={s.label} className={`stat-box ${s.cls}`} style={{ padding: 16 }}>
          <div className="stat-label">{s.label}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 26, fontWeight: 500 }}>{s.val}</div>
        </div>
      ))}
    </div>
  );
}

function DayAccordion({ day, expanded, setExpanded }) {
  const isOpen = expanded === day.date;
  return (
    <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <div onClick={() => setExpanded(isOpen ? null : day.date)}
        style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', cursor: 'pointer', background: isOpen ? 'var(--surface2)' : 'transparent', transition: 'background 0.15s' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 500, minWidth: 100 }}>{fmtDate(day.date)}</div>
        <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={12} />{day.present} Present</span>
          {day.halfDay > 0 && <span style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 600 }}>{day.halfDay} Half</span>}
          <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><XCircle size={12} />{day.absent} Absent</span>
          {day.late > 0 && <span style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} />{day.late} Late</span>}
        </div>
        <span style={{ color: 'var(--ink2)', display: 'flex', alignItems: 'center' }}>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </div>
      {isOpen && (
        <div style={{ overflowX: 'auto', borderTop: '1px solid var(--border)' }}>
          {day.records.length > 0
            ? <MiniTable 
                rows={day.records} 
                date={day.date}
                onMarkAttendance={() => {}} 
              />
            : <div style={{ padding: '12px 20px', fontSize: 13, color: 'var(--ink2)' }}>No records for this day</div>}
        </div>
      )}
    </div>
  );
}

function SummaryPills({ summary }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 2 }}>
      <Pill bg="#e8f5ee" border="#b8dcc8" color="var(--success)"><CheckCircle size={11} />{summary.present} Present</Pill>
      <Pill bg="#fdeee8" border="#f0c0b0" color="var(--danger)"><XCircle size={11} />{summary.absent} Absent</Pill>
      {summary.halfDay > 0 && <Pill bg="#fff8e8" border="#f0d090" color="var(--warning)">{summary.halfDay} Half Day</Pill>}
      {summary.late > 0 && <Pill bg="#fff8e8" border="#f0d090" color="var(--warning)"><Clock size={11} />{summary.late} Late</Pill>}
      {summary.stillWorking > 0 && <Pill bg="#e8f0fe" border="#b0c8f0" color="var(--accent2)">{summary.stillWorking} Working</Pill>}
    </div>
  );
}

function Pill({ bg, border, color, children }) {
  return (
    <span style={{ fontSize: 12, background: bg, border: `1px solid ${border}`, color, fontWeight: 700, padding: '4px 10px', borderRadius: 3, fontFamily: 'DM Mono, monospace', display: 'flex', alignItems: 'center', gap: 4 }}>
      {children}
    </span>
  );
}

function showDayDetailsModal(date, dayData, offices, selOffice) {
  const filteredRecords = dayData.records.filter(r => selOffice === 'all' || r.office === offices.find(o => o._id === selOffice)?.name);
  
  const statsHtml = `
    <div style="display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center;">
      <span style="background: #e8f5ee; border: 1px solid #b8dcc8; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-family: 'DM Mono', monospace; color: #22c55e; display: flex; align-items: center; gap: 6px; font-weight: 600;">
        ✓ ${dayData.present} Present
      </span>
      <span style="background: #fdeee8; border: 1px solid #f0c0b0; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-family: 'DM Mono', monospace; color: #ef4444; display: flex; align-items: center; gap: 6px; font-weight: 600;">
        ✗ ${dayData.absent} Absent
      </span>
      ${dayData.halfDay > 0 ? `<span style="background: #fff8e8; border: 1px solid #f0d090; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-family: 'DM Mono', monospace; color: #f59e0b; font-weight: 600;">${dayData.halfDay} Half</span>` : ''}
      ${dayData.late > 0 ? `<span style="background: #fff8e8; border: 1px solid #f0d090; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-family: 'DM Mono', monospace; color: #f59e0b; font-weight: 600;">⏰ ${dayData.late} Late</span>` : ''}
    </div>
  `;

  const tableHtml = filteredRecords.length > 0 ? `
    <div style="border: 1.5px solid #d1d5db; border-radius: 8px; background: white; overflow: hidden;">
      <div style="max-height: 400px; overflow-y: auto; overflow-x: auto;">
        <table style="width: 100%; min-width: 800px; border-collapse: collapse; font-size: 14px;">
          <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <tr>
              <th style="min-width: 200px; text-align: left; padding: 12px 16px; border-bottom: 2px solid #e5e7eb; font-weight: 700; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Employee</th>
              <th style="min-width: 120px; text-align: left; padding: 12px 16px; border-bottom: 2px solid #e5e7eb; font-weight: 700; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Check In</th>
              <th style="min-width: 120px; text-align: left; padding: 12px 16px; border-bottom: 2px solid #e5e7eb; font-weight: 700; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Check Out</th>
              <th style="min-width: 100px; text-align: left; padding: 12px 16px; border-bottom: 2px solid #e5e7eb; font-weight: 700; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Hours</th>
              <th style="min-width: 100px; text-align: left; padding: 12px 16px; border-bottom: 2px solid #e5e7eb; font-weight: 700; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Late</th>
              <th style="min-width: 120px; text-align: left; padding: 12px 16px; border-bottom: 2px solid #e5e7eb; font-weight: 700; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">GPS</th>
              <th style="min-width: 100px; text-align: left; padding: 12px 16px; border-bottom: 2px solid #e5e7eb; font-weight: 700; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredRecords.map((r, index) => `
              <tr style="border-bottom: 1px solid #f1f5f9; ${index % 2 === 0 ? 'background: #fafbfc;' : 'background: white;'}">
                <td style="padding: 12px 16px; vertical-align: middle; min-width: 200px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0;">
                      ${r.name ? r.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'NA'}
                    </div>
                    <div style="min-width: 0;">
                      <div style="font-weight: 600; color: #1f2937; font-size: 13px; line-height: 1.3; white-space: nowrap;">${r.name || 'Unknown'}</div>
                      <div style="font-size: 11px; color: #6b7280; font-family: 'DM Mono', monospace; margin-top: 1px;">${r.employeeCode || ''}</div>
                    </div>
                  </div>
                </td>
                <td style="padding: 12px 16px; font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 500; vertical-align: middle; min-width: 120px;">
                  ${r.checkInTime ? `<div style="background: #ecfdf5; padding: 6px 8px; border-radius: 4px; border: 1px solid #d1fae5; color: #059669; text-align: center; font-size: 11px; white-space: nowrap;">${r.checkInTime}</div>` : '<span style="color: #9ca3af;">—</span>'}
                </td>
                <td style="padding: 12px 16px; font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 500; vertical-align: middle; min-width: 120px;">
                  ${r.checkOutTime ? `<div style="background: #fef2f2; padding: 6px 8px; border-radius: 4px; border: 1px solid #fecaca; color: #dc2626; text-align: center; font-size: 11px; white-space: nowrap;">${r.checkOutTime}</div>` : '<span style="color: #9ca3af;">—</span>'}
                </td>
                <td style="padding: 12px 16px; font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 600; vertical-align: middle; min-width: 100px;">
                  ${r.hoursWorked ? `<div style="background: #ecfdf5; padding: 6px 8px; border-radius: 4px; border: 1px solid #d1fae5; color: #059669; text-align: center; font-size: 11px; white-space: nowrap;">${r.hoursWorked}</div>` : 
                    (r.checkInTime && !r.checkOutTime ? '<div style="color: #f59e0b; background: #fffbeb; padding: 6px 8px; border-radius: 4px; border: 1px solid #fde68a; text-align: center; font-size: 11px; white-space: nowrap;">Working…</div>' : '<span style="color: #9ca3af;">—</span>')}
                </td>
                <td style="padding: 12px 16px; font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 500; vertical-align: middle; min-width: 100px; color: #f59e0b;">
                  ${r.isLate && r.lateBy ? `<div style="background: #fffbeb; padding: 6px 8px; border-radius: 4px; border: 1px solid #fde68a; text-align: center; font-size: 11px; white-space: nowrap;">${r.lateBy}</div>` : '<span style="color: #9ca3af;">—</span>'}
                </td>
                <td style="padding: 12px 16px; vertical-align: middle; min-width: 120px;">
                  ${r.checkInLocation && r.checkInDistance ? `<div style="background: #ecfdf5; padding: 6px 8px; border-radius: 4px; border: 1px solid #d1fae5; color: #059669; text-align: center; font-size: 11px; white-space: nowrap; display: flex; align-items: center; justify-content: center; gap: 4px;">📍 ${r.checkInDistance}m</div>` : '<span style="color: #9ca3af;">—</span>'}
                </td>
                <td style="padding: 12px 16px; vertical-align: middle; min-width: 100px;">
                  <div style="padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; white-space: nowrap;
                    ${r.status === 'present' ? 'background: #dcfce7; color: #166534; border: 1px solid #bbf7d0;' : 
                      r.status === 'half-day' ? 'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;' : 
                      'background: #fee2e2; color: #991b1b; border: 1px solid #fecaca;'}">
                    ${r.status || 'absent'}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  ` : '<div style="text-align: center; padding: 40px 20px; color: #6b7280; font-size: 15px;"><div style="font-size: 48px; margin-bottom: 12px; opacity: 0.5;">📋</div>No records found for this day</div>';

  Swal.fire({
    title: `<div style="font-family: 'Syne', sans-serif; font-weight: 800; color: #1f2937; margin-bottom: 10px;">${fmtDate(date.toISOString().split('T')[0])}</div>`,
    html: `<div>${statsHtml}${tableHtml}</div>`,
    width: 900,
    padding: '20px',
    showConfirmButton: true,
    confirmButtonText: 'Close',
    confirmButtonColor: '#1a1612',
    background: '#faf7f2',
    color: '#1a1612',
    customClass: {
      popup: 'day-details-modal',
      htmlContainer: 'day-details-content'
    },
    didOpen: () => {
      const style = document.createElement('style');
      style.textContent = `
        .day-details-modal {
          border-radius: 12px !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
        }
        .day-details-content {
          overflow: visible !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        .day-details-modal .swal2-html-container {
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }
      `;
      document.head.appendChild(style);
    }
  });
}
function showSelfie(name, type, selfie, time, location) {
  if (!selfie) {
    Swal.fire({
      title: 'No Photo',
      text: `${name} did not capture a selfie during ${type}.`,
      icon: 'info',
      confirmButtonColor: '#c84b2f',
      background: '#faf7f2',
      color: '#1a1612',
    });
    return;
  }
  Swal.fire({
    title: `${name} — Check ${type}`,
    html: `
      <img src="${selfie}" style="width:200px;height:200px;border-radius:50%;object-fit:cover;border:3px solid #2a7a4b;margin-bottom:12px;" />
      <div style="font-family:DM Mono,monospace;font-size:12px;color:#5a5248;">${time || ''}${location ? ' · ' + location : ''}</div>
    `,
    showConfirmButton: true,
    confirmButtonText: 'Close',
    confirmButtonColor: '#1a1612',
    background: '#faf7f2',
    color: '#1a1612',
    width: 360,
  });
}

function AttTable({ rows, title, loading, onMarkAttendance, showActions = true }) {
  const [updatingStatus, setUpdatingStatus] = useState({});

  const handleStatusUpdate = async (employeeId, newStatus, currentStatus) => {
    if (currentStatus === newStatus) {
      toast(`Employee already marked as ${newStatus}`, 2000, 'warning');
      return;
    }

    setUpdatingStatus(prev => ({ ...prev, [employeeId]: newStatus }));
    
    try {
      if (onMarkAttendance) {
        await onMarkAttendance(employeeId, newStatus);
      } else {
        toast('Status update not available in this view', 3000, 'error');
      }
    } catch (error) {
      console.error('Status update error:', error);
      toast('Failed to update status', 3000, 'error');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [employeeId]: undefined }));
    }
  };

  return (
    <div className="tbl-wrap" style={{ overflowX: 'auto' }}>
      <div className="tbl-head-row">
        <div className="tbl-title">{title}</div>
        <span style={{ fontSize: 11, color: 'var(--ink2)' }}>{rows.length} employees</span>
      </div>
      <table>
        <thead><tr>
          <th>Employee</th><th>Check In</th><th>In Photo</th><th>Check Out</th><th>Out Photo</th>
          <th>Hours</th><th>Late</th><th>GPS</th><th>Status</th>
          {showActions && onMarkAttendance && <th>Actions</th>}
        </tr></thead>
        <tbody>
          {loading && <tr><td colSpan={showActions && onMarkAttendance ? 10 : 9}><EmptyState icon={<Loader size={28} />} text="Loading…" /></td></tr>}
          {!loading && rows.map((r, i) => {
            const isUpdating = updatingStatus[r.employeeId];
            return (
              <tr key={r.employeeId + i} style={{ opacity: isUpdating ? 0.6 : 1 }}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="emp-avt" style={{ width: 28, height: 28, fontSize: 11 }}>{avt(r.name || '')}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink2)' }}>{r.employeeCode}</div>
                  </div>
                </div></td>
                <td><span className="time-tag">{r.checkInTime || '—'}</span></td>
                <td>
                  <button onClick={() => showSelfie(r.name, 'In', r.checkInSelfie, r.checkInTime, r.checkInLocation)}
                    style={{ background: r.checkInSelfie ? '#e8f5ee' : 'var(--surface2)', border: `1px solid ${r.checkInSelfie ? '#b8dcc8' : 'var(--border)'}`, borderRadius: 3, padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'DM Mono, monospace', fontWeight: 700, color: r.checkInSelfie ? 'var(--success)' : 'var(--ink2)' }}>
                    <Camera size={11} />{r.checkInSelfie ? 'View' : 'None'}
                  </button>
                </td>
                <td><span className="time-tag">{r.checkOutTime || '—'}</span></td>
                <td>
                  {r.checkOutTime
                    ? <button onClick={() => showSelfie(r.name, 'Out', r.checkOutSelfie, r.checkOutTime, r.checkOutLocation)}
                        style={{ background: r.checkOutSelfie ? '#e8f5ee' : 'var(--surface2)', border: `1px solid ${r.checkOutSelfie ? '#b8dcc8' : 'var(--border)'}`, borderRadius: 3, padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'DM Mono, monospace', fontWeight: 700, color: r.checkOutSelfie ? 'var(--success)' : 'var(--ink2)' }}>
                        <Camera size={11} />{r.checkOutSelfie ? 'View' : 'None'}
                      </button>
                    : <span style={{ color: 'var(--border)' }}>—</span>}
                </td>
                <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--success)' }}>
                  {r.hoursWorked || (r.checkInTime && !r.checkOutTime ? 'Working…' : '—')}
                </td>
                <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--warning)' }}>{r.isLate ? r.lateBy : '—'}</td>
                <td>{r.checkInLocation
                  ? <span className="gps-ok-tag" style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={11} />{r.checkInDistance}m</span>
                  : <span className="gps-na-tag">—</span>}
                </td>
                <td><span className={`badge ${r.status === 'present' ? 'b-in' : r.status === 'half-day' ? 'b-out' : 'b-absent'}`}>{r.status || 'absent'}</span></td>
                {showActions && onMarkAttendance && (
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button 
                        onClick={() => handleStatusUpdate(r.employeeId, 'present', r.status)} 
                        disabled={isUpdating}
                        style={{ 
                          padding: '4px 8px', 
                          fontSize: 10, 
                          border: '1px solid var(--success)', 
                          background: r.status === 'present' ? 'var(--success)' : 'transparent', 
                          color: r.status === 'present' ? 'white' : 'var(--success)', 
                          borderRadius: 3, 
                          cursor: isUpdating ? 'not-allowed' : 'pointer',
                          opacity: isUpdating ? 0.5 : 1,
                          fontWeight: 600,
                          minWidth: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Mark as Present"
                      >
                        {isUpdating === 'present' ? '⏳' : 'P'}
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(r.employeeId, 'half-day', r.status)} 
                        disabled={isUpdating}
                        style={{ 
                          padding: '4px 8px', 
                          fontSize: 10, 
                          border: '1px solid var(--warning)', 
                          background: r.status === 'half-day' ? 'var(--warning)' : 'transparent', 
                          color: r.status === 'half-day' ? 'white' : 'var(--warning)', 
                          borderRadius: 3, 
                          cursor: isUpdating ? 'not-allowed' : 'pointer',
                          opacity: isUpdating ? 0.5 : 1,
                          fontWeight: 600,
                          minWidth: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Mark as Half Day"
                      >
                        {isUpdating === 'half-day' ? '⏳' : 'H'}
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(r.employeeId, 'absent', r.status)} 
                        disabled={isUpdating}
                        style={{ 
                          padding: '4px 8px', 
                          fontSize: 10, 
                          border: '1px solid var(--danger)', 
                          background: r.status === 'absent' || !r.status ? 'var(--danger)' : 'transparent', 
                          color: r.status === 'absent' || !r.status ? 'white' : 'var(--danger)', 
                          borderRadius: 3, 
                          cursor: isUpdating ? 'not-allowed' : 'pointer',
                          opacity: isUpdating ? 0.5 : 1,
                          fontWeight: 600,
                          minWidth: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Mark as Absent"
                      >
                        {isUpdating === 'absent' ? '⏳' : 'A'}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={showActions && onMarkAttendance ? 10 : 9}><EmptyState icon={<Inbox size={28} />} text="No records" /></td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function MiniTable({ rows, onMarkAttendance, date, adminId }) {
  const [updatingStatus, setUpdatingStatus] = useState({});

  const handleStatusUpdate = async (employeeId, newStatus, currentStatus) => {
    if (currentStatus === newStatus) {
      toast(`Employee already marked as ${newStatus}`, 2000, 'warning');
      return;
    }

    setUpdatingStatus(prev => ({ ...prev, [employeeId]: newStatus }));
    
    try {
      console.log('Updating status:', { employeeId, date, newStatus });
      await api.post('/attendance/mark', { employeeId, date, status: newStatus });
      toast(`Marked as ${newStatus}`, 3000, 'success');
      
      // Trigger parent component reload if callback provided
      if (onMarkAttendance) {
        onMarkAttendance();
      }
    } catch (error) {
      console.error('Status update error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to update status';
      toast(errorMsg, 4000, 'error');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [employeeId]: undefined }));
    }
  };

  const thStyle = { textAlign: 'left', padding: '8px 16px', fontSize: 11, color: 'var(--ink2)', textTransform: 'uppercase', letterSpacing: 0.8, background: 'var(--surface2)', fontWeight: 600 };
  
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>
        <th style={thStyle}>Employee</th><th style={thStyle}>In</th><th style={thStyle}>Out</th>
        <th style={thStyle}>Hours</th><th style={thStyle}>Late</th><th style={thStyle}>Status</th>
        {date && <th style={thStyle}>Actions</th>}
      </tr></thead>
      <tbody>
        {rows.map((r, i) => {
          const isUpdating = updatingStatus[r.employeeId];
          return (
            <tr key={r.employeeId + i} style={{ borderBottom: '1px solid rgba(216,208,192,0.4)', opacity: isUpdating ? 0.6 : 1 }}>
              <td style={{ padding: '10px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="emp-avt" style={{ width: 26, height: 26, fontSize: 10 }}>{avt(r.name || '')}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink2)' }}>{r.employeeCode}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '10px 16px' }}><span className="time-tag">{r.checkInTime || '—'}</span></td>
              <td style={{ padding: '10px 16px' }}><span className="time-tag">{r.checkOutTime || '—'}</span></td>
              <td style={{ padding: '10px 16px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--success)' }}>
                {r.hoursWorked || (r.checkInTime && !r.checkOutTime ? 'Working…' : '—')}
              </td>
              <td style={{ padding: '10px 16px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--warning)' }}>
                {r.isLate ? r.lateBy : '—'}
              </td>
              <td style={{ padding: '10px 16px' }}>
                <span className={`badge ${r.status === 'present' ? 'b-in' : r.status === 'half-day' ? 'b-out' : 'b-absent'}`}>{r.status || 'absent'}</span>
              </td>
              {date && (
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button 
                      onClick={() => handleStatusUpdate(r.employeeId, 'present', r.status)} 
                      disabled={isUpdating}
                      style={{ 
                        padding: '3px 6px', 
                        fontSize: 9, 
                        border: '1px solid var(--success)', 
                        background: r.status === 'present' ? 'var(--success)' : 'transparent', 
                        color: r.status === 'present' ? 'white' : 'var(--success)', 
                        borderRadius: 3, 
                        cursor: isUpdating ? 'not-allowed' : 'pointer',
                        opacity: isUpdating ? 0.5 : 1,
                        fontWeight: 600,
                        minWidth: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Mark as Present"
                    >
                      {isUpdating === 'present' ? '⏳' : 'P'}
                    </button>
                    <button 
                      onClick={() => handleStatusUpdate(r.employeeId, 'half-day', r.status)} 
                      disabled={isUpdating}
                      style={{ 
                        padding: '3px 6px', 
                        fontSize: 9, 
                        border: '1px solid var(--warning)', 
                        background: r.status === 'half-day' ? 'var(--warning)' : 'transparent', 
                        color: r.status === 'half-day' ? 'white' : 'var(--warning)', 
                        borderRadius: 3, 
                        cursor: isUpdating ? 'not-allowed' : 'pointer',
                        opacity: isUpdating ? 0.5 : 1,
                        fontWeight: 600,
                        minWidth: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Mark as Half Day"
                    >
                      {isUpdating === 'half-day' ? '⏳' : 'H'}
                    </button>
                    <button 
                      onClick={() => handleStatusUpdate(r.employeeId, 'absent', r.status)} 
                      disabled={isUpdating}
                      style={{ 
                        padding: '3px 6px', 
                        fontSize: 9, 
                        border: '1px solid var(--danger)', 
                        background: r.status === 'absent' || !r.status ? 'var(--danger)' : 'transparent', 
                        color: r.status === 'absent' || !r.status ? 'white' : 'var(--danger)', 
                        borderRadius: 3, 
                        cursor: isUpdating ? 'not-allowed' : 'pointer',
                        opacity: isUpdating ? 0.5 : 1,
                        fontWeight: 600,
                        minWidth: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Mark as Absent"
                    >
                      {isUpdating === 'absent' ? '⏳' : 'A'}
                    </button>
                  </div>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
