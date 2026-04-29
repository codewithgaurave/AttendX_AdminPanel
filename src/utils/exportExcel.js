import * as XLSX from 'xlsx';

// Generic Excel export
export const exportToExcel = (sheets, filename) => {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, data }) => {
    const ws = XLSX.utils.json_to_sheet(data);
    // Auto column width
    const cols = Object.keys(data[0] || {}).map(k => ({ wch: Math.max(k.length, 14) }));
    ws['!cols'] = cols;
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// Attendance monthly export
export const exportMonthlyAttendance = (dailySummary, employees, month, overallSummary) => {
  const sheets = [];

  // Sheet 1: Summary
  sheets.push({
    name: 'Summary',
    data: [
      { Metric: 'Month', Value: month },
      { Metric: 'Total Days', Value: overallSummary?.totalDays || 0 },
      { Metric: 'Total Present', Value: overallSummary?.totalPresent || 0 },
      { Metric: 'Total Half Day', Value: overallSummary?.totalHalfDay || 0 },
      { Metric: 'Total Late', Value: overallSummary?.totalLate || 0 },
      { Metric: 'Total Hours Worked', Value: (overallSummary?.totalHoursWorked || 0) + 'h' },
    ]
  });

  // Sheet 2: Day wise
  const dayRows = [];
  dailySummary?.forEach(day => {
    day.records?.forEach(r => {
      dayRows.push({
        Date: day.date,
        'Employee Name': r.name || '',
        'Employee Code': r.employeeCode || '',
        Designation: r.designation || '',
        'Check In': r.checkInTime || '—',
        'Check Out': r.checkOutTime || '—',
        'Hours Worked': r.hoursWorked || '—',
        'Late By': r.isLate ? r.lateBy : '—',
        Status: r.status || 'absent',
      });
    });
    // Add absent employees for this day
    const presentIds = new Set(day.records?.map(r => r.employeeId?.toString()));
    employees?.forEach(e => {
      if (!presentIds.has(e._id?.toString())) {
        dayRows.push({
          Date: day.date,
          'Employee Name': e.name,
          'Employee Code': e.employeeCode,
          Designation: e.designation,
          'Check In': '—', 'Check Out': '—',
          'Hours Worked': '—', 'Late By': '—',
          Status: 'absent',
        });
      }
    });
  });
  if (dayRows.length) sheets.push({ name: 'Day Wise', data: dayRows });

  // Sheet 3: Employee wise summary
  const empMap = {};
  dailySummary?.forEach(day => {
    day.records?.forEach(r => {
      if (!empMap[r.employeeId]) empMap[r.employeeId] = { name: r.name, code: r.employeeCode, designation: r.designation, present: 0, halfDay: 0, absent: 0, late: 0, totalHours: 0 };
      if (r.status === 'present') empMap[r.employeeId].present++;
      else if (r.status === 'half-day') empMap[r.employeeId].halfDay++;
      else empMap[r.employeeId].absent++;
      if (r.isLate) empMap[r.employeeId].late++;
      empMap[r.employeeId].totalHours += r.hoursWorkedDecimal || 0;
    });
  });
  const empRows = Object.values(empMap).map(e => ({
    'Employee Name': e.name, 'Employee Code': e.code,
    Designation: e.designation, Present: e.present,
    'Half Day': e.halfDay, Absent: e.absent,
    'Late Days': e.late, 'Total Hours': e.totalHours.toFixed(1) + 'h',
  }));
  if (empRows.length) sheets.push({ name: 'Employee Wise', data: empRows });

  exportToExcel(sheets, `Attendance-${month}`);
};

// Date range export
export const exportRangeAttendance = (dailySummary, employees, from, to, overallSummary) => {
  exportMonthlyAttendance(dailySummary, employees, `${from}_to_${to}`, overallSummary);
};

// Employee list export (office wise)
export const exportEmployees = (employees, label = 'Employees') => {
  const data = employees.map(e => ({
    'Employee Code': e.employeeCode,
    Name: e.name,
    Email: e.email,
    Phone: e.phone,
    Designation: e.designation,
    Department: e.department || '—',
    Office: e.officeId?.name || '—',
    'Joining Date': e.joiningDate ? new Date(e.joiningDate).toLocaleDateString('en-IN') : '—',
    'Monthly Salary': e.monthlySalary || 0,
    'Work Start': e.workingHours?.startTime || '—',
    'Work End': e.workingHours?.endTime || '—',
    'Weekly Off': (e.weeklyOff || []).map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', '),
    Gender: e.gender || '—',
    'Blood Group': e.bloodGroup || '—',
  }));
  exportToExcel([{ name: label, data }], label.replace(/\s+/g, '-'));
};

// Reports employee monthly export
export const exportEmployeeReport = (empReport, empName, month) => {
  const sheets = [];
  // Summary
  sheets.push({
    name: 'Summary',
    data: [{
      Employee: empName, Month: month,
      Present: empReport.summary.present,
      Absent: empReport.summary.absent,
      'Half Day': empReport.summary.halfDay,
      'Late Days': empReport.summary.lateDays,
      'Total Hours': empReport.summary.totalHoursWorked + 'h',
      'Avg Hours/Day': empReport.summary.averageHoursPerDay + 'h',
    }]
  });
  // Daily records
  sheets.push({
    name: 'Daily Records',
    data: empReport.records.map(r => ({
      Date: r.date,
      'Check In': r.checkInTime || '—',
      'Check Out': r.checkOutTime || '—',
      'Hours Worked': r.hoursWorked || '—',
      'Late By': r.isLate ? r.lateBy : '—',
      'Early Leave': r.isEarlyLeave ? r.earlyLeaveBy : '—',
      Status: r.status,
    }))
  });
  exportToExcel(sheets, `Report-${empName.replace(/\s+/g, '-')}-${month}`);
};
