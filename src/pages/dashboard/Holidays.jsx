import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { toast } from '../../components/Toast';
import Swal from 'sweetalert2';
import { Plus, Trash2, CalendarDays, Gift } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Holidays() {
  const [holidays, setHolidays] = useState([]);
  const [form, setForm] = useState({ name: '', date: '', type: 'public' });
  const [year, setYear] = useState(new Date().getFullYear());

  const load = () => api.get(`/admin/holidays?year=${year}`).then(r => setHolidays(r.data));
  useEffect(() => { load(); }, [year]);

  const save = async () => {
    if (!form.name || !form.date) return toast('Name and date required');
    try {
      await api.post('/admin/holidays', form);
      toast('Holiday added ✓'); setForm({ name: '', date: '', type: 'public' }); load();
    } catch (e) { toast(e.response?.data?.message || 'Error'); }
  };

  const del = async (id, name) => {
    const r = await Swal.fire({
      title: `Delete "${name}"?`, icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#c84b2f',
      cancelButtonColor: '#5a5248', confirmButtonText: 'Delete',
      background: '#faf7f2', color: '#1a1612',
    });
    if (!r.isConfirmed) return;
    await api.delete(`/admin/holidays/${id}`);
    toast('Holiday deleted'); load();
  };

  // Group by month
  const grouped = {};
  holidays.forEach(h => {
    const m = parseInt(h.date.split('-')[1]) - 1;
    if (!grouped[m]) grouped[m] = [];
    grouped[m].push(h);
  });

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Holidays</div>
        <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 16 }}>Manage public holidays — employees won't be marked absent on these days</div>
      </div>

      {/* Year selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setYear(y => y - 1)} style={{ width: 32, height: 32, border: '1.5px solid var(--border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', color: 'var(--ink2)' }}>←</button>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800 }}>{year}</div>
        <button onClick={() => setYear(y => y + 1)} style={{ width: 32, height: 32, border: '1.5px solid var(--border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', color: 'var(--ink2)' }}>→</button>
        <span style={{ fontSize: 12, color: 'var(--ink2)', fontFamily: 'DM Mono, monospace' }}>{holidays.length} holidays</span>
      </div>

      {/* Add form */}
      <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 4, padding: 20, marginBottom: 28 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Add Holiday</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Holiday Name *</label>
              <input className="form-inp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Diwali" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Date *</label>
              <input className="form-inp" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0, minWidth: 160 }}>
              <label>Type</label>
              <select className="form-inp" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="public">Public Holiday</option>
                <option value="optional">Optional Holiday</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={save} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 42 }}>
              <Plus size={15} />Add Holiday
            </button>
          </div>
        </div>
      </div>

      {/* Holiday list grouped by month */}
      {Object.keys(grouped).length === 0 && (
        <div className="empty-state">
          <Gift size={36} style={{ margin: '0 auto 10px', display: 'block', color: 'var(--ink2)' }} />
          <div>No holidays added for {year}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 16 }}>
        {Object.entries(grouped).map(([m, list]) => (
          <div key={m} style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ background: 'var(--ink)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarDays size={14} color="var(--accent)" />
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--bg)' }}>{MONTHS[m]}</span>
              <span style={{ fontSize: 11, color: '#666', fontFamily: 'DM Mono, monospace', marginLeft: 'auto' }}>{list.length} holiday{list.length > 1 ? 's' : ''}</span>
            </div>
            {list.map(h => {
              const dow = new Date(h.date).getDay();
              return (
                <div key={h._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid rgba(216,208,192,0.4)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 4, background: h.type === 'public' ? 'var(--accent)' : 'var(--accent2)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1 }}>{h.date.split('-')[2]}</span>
                    <span style={{ fontSize: 9, opacity: 0.8 }}>{DAYS[dow]}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{h.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink2)', marginTop: 2 }}>
                      <span style={{ background: h.type === 'public' ? '#e8f5ee' : '#e8f0fe', border: `1px solid ${h.type === 'public' ? '#b8dcc8' : '#b0c8f0'}`, color: h.type === 'public' ? 'var(--success)' : 'var(--accent2)', padding: '1px 6px', borderRadius: 2, fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>
                        {h.type === 'public' ? 'Public' : 'Optional'}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => del(h._id, h.name)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink2)', padding: 4 }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--ink2)'}>
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
