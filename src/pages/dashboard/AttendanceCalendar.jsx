import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function AttendanceCalendar() {
  const { auth } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState({});
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    api.get('/admin/employees').then(r => {
      console.log('Calendar employees API response:', r.data);
      setEmployees(Array.isArray(r.data) ? r.data : []);
    }).catch(err => {
      console.error('Calendar employees API error:', err);
      setEmployees([]);
    });
  }, []);

  useEffect(() => {
    loadMonthData();
  }, [currentDate, selectedEmployee]);

  const loadMonthData = async () => {
    setLoading(true);
    try {
      const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
      const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
      const empParam = selectedEmployee !== 'all' ? `&employeeId=${selectedEmployee}` : '';
      
      const { data } = await api.get(`/attendance/range/${auth.user.id}?from=${firstDay}&to=${lastDay}${empParam}`);
      
      // Convert daily summary to date-keyed object
      const dateData = {};
      data.dailySummary?.forEach(day => {
        dateData[day.date] = day;
      });
      
      setAttendanceData(dateData);
    } catch (err) {
      console.error('Error loading calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const days = [];
    const current = new Date(startDate);

    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDayStatus = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayData = attendanceData[dateStr];
    
    if (!dayData) return { status: 'no-data', count: 0 };
    
    const total = dayData.present + dayData.absent + dayData.halfDay;
    if (total === 0) return { status: 'no-data', count: 0 };
    
    const presentPercentage = (dayData.present / total) * 100;
    
    if (presentPercentage >= 90) return { status: 'excellent', count: dayData.present, total };
    if (presentPercentage >= 70) return { status: 'good', count: dayData.present, total };
    if (presentPercentage >= 50) return { status: 'average', count: dayData.present, total };
    return { status: 'poor', count: dayData.present, total };
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === month;
  };

  const days = getDaysInMonth();

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
          Attendance Calendar
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink2)' }}>
          Monthly attendance overview with visual indicators
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            onClick={() => navigateMonth(-1)}
            style={{ 
              width: 36, height: 36, border: '1.5px solid var(--border)', borderRadius: 4, 
              background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', color: 'var(--ink2)' 
            }}
          >
            <ChevronLeft size={16} />
          </button>
          
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, minWidth: 200, textAlign: 'center' }}>
            {MONTHS[month]} {year}
          </div>
          
          <button 
            onClick={() => navigateMonth(1)}
            style={{ 
              width: 36, height: 36, border: '1.5px solid var(--border)', borderRadius: 4, 
              background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', color: 'var(--ink2)' 
            }}
          >
            <ChevronRight size={16} />
          </button>
          
          <button 
            onClick={goToToday}
            className="btn btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Calendar size={14} />Today
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <select 
            className="form-inp" 
            value={selectedEmployee} 
            onChange={e => setSelectedEmployee(e.target.value)}
            style={{ maxWidth: 200 }}
          >
            <option value="all">All Employees</option>
            {Array.isArray(employees) ? employees.map(emp => (
              <option key={emp._id} value={emp._id}>{emp.name}</option>
            )) : null}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)' }}>Legend:</div>
        {[
          { status: 'excellent', label: '90%+ Present', color: '#22c55e' },
          { status: 'good', label: '70-89% Present', color: '#84cc16' },
          { status: 'average', label: '50-69% Present', color: '#f59e0b' },
          { status: 'poor', label: '<50% Present', color: '#ef4444' },
          { status: 'no-data', label: 'No Data', color: '#e5e7eb' }
        ].map(item => (
          <div key={item.status} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ 
              width: 12, height: 12, borderRadius: 2, 
              background: item.color, border: '1px solid var(--border)' 
            }} />
            <span style={{ fontSize: 11, color: 'var(--ink2)' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={{ 
        background: 'var(--surface)', 
        border: '1.5px solid var(--border)', 
        borderRadius: 4, 
        overflow: 'hidden' 
      }}>
        {/* Header */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          background: 'var(--ink)', 
          color: 'var(--bg)' 
        }}>
          {DAYS.map(day => (
            <div key={day} style={{ 
              padding: '12px 8px', 
              textAlign: 'center', 
              fontSize: 12, 
              fontWeight: 700,
              fontFamily: 'DM Sans, sans-serif'
            }}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {days.map((date, index) => {
            const dayStatus = getDayStatus(date);
            const isCurrentMonthDay = isCurrentMonth(date);
            const isTodayDate = isToday(date);
            
            return (
              <CalendarDay
                key={index}
                date={date}
                status={dayStatus}
                isCurrentMonth={isCurrentMonthDay}
                isToday={isTodayDate}
                attendanceData={attendanceData[date.toISOString().split('T')[0]]}
              />
            );
          })}
        </div>
      </div>

      {loading && (
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255,255,255,0.9)',
          padding: '20px',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <div className="spinner" />
          Loading calendar...
        </div>
      )}
    </>
  );
}

function CalendarDay({ date, status, isCurrentMonth, isToday, attendanceData }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const getStatusColor = () => {
    switch (status.status) {
      case 'excellent': return '#22c55e';
      case 'good': return '#84cc16';
      case 'average': return '#f59e0b';
      case 'poor': return '#ef4444';
      default: return '#e5e7eb';
    }
  };

  const dayNumber = date.getDate();
  
  return (
    <div
      style={{
        position: 'relative',
        minHeight: 80,
        padding: '8px',
        border: '1px solid var(--border)',
        background: isCurrentMonth ? 'var(--surface)' : 'var(--surface2)',
        opacity: isCurrentMonth ? 1 : 0.6,
        cursor: attendanceData ? 'pointer' : 'default',
        transition: 'all 0.15s'
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Date number */}
      <div style={{
        fontSize: 14,
        fontWeight: isToday ? 800 : 600,
        color: isToday ? 'var(--accent)' : 'var(--ink)',
        marginBottom: 4
      }}>
        {dayNumber}
      </div>

      {/* Status indicator */}
      {status.status !== 'no-data' && (
        <div style={{
          width: '100%',
          height: 6,
          borderRadius: 3,
          background: getStatusColor(),
          marginBottom: 4
        }} />
      )}

      {/* Attendance count */}
      {attendanceData && (
        <div style={{ fontSize: 10, color: 'var(--ink2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 2 }}>
            <CheckCircle size={8} color="#22c55e" />
            <span>{attendanceData.present}</span>
          </div>
          {attendanceData.absent > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <XCircle size={8} color="#ef4444" />
              <span>{attendanceData.absent}</span>
            </div>
          )}
        </div>
      )}

      {/* Today indicator */}
      {isToday && (
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

      {/* Tooltip */}
      {showTooltip && attendanceData && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'var(--ink)',
          color: 'var(--bg)',
          padding: '8px 12px',
          borderRadius: 4,
          fontSize: 11,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          marginTop: 4
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </div>
          <div>Present: {attendanceData.present}</div>
          <div>Absent: {attendanceData.absent}</div>
          {attendanceData.halfDay > 0 && <div>Half Day: {attendanceData.halfDay}</div>}
          {attendanceData.late > 0 && <div>Late: {attendanceData.late}</div>}
        </div>
      )}
    </div>
  );
}