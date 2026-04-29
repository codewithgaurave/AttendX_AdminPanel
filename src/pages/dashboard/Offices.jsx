import { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api';
import api from '../../utils/api';
import { toast } from '../../components/Toast';
import Swal from 'sweetalert2';
import { Plus, Pencil, Trash2, MapPin, Navigation, Search, Building2 } from 'lucide-react';

const GMAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const empty = { name: '', address: '', lat: '', long: '', radius: 100 };
const mapContainerStyle = { width: '100%', height: '340px', borderRadius: 4, border: '1.5px solid var(--border)' };
const defaultCenter = { lat: 28.6139, lng: 77.2090 }; // New Delhi

export default function Offices() {
  const [offices, setOffices] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [markerPos, setMarkerPos] = useState(null);
  const searchRef = useRef(null);
  const autocompleteRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GMAP_KEY,
    libraries: ['places'],
  });

  const load = () => api.get('/admin/offices').then(r => {
    setOffices(Array.isArray(r.data) ? r.data : []);
  }).catch(() => setOffices([]));
  useEffect(() => { load(); }, []);

  // Init Places Autocomplete on search input
  useEffect(() => {
    if (!isLoaded || !showModal || !searchRef.current) return;
    const timeout = setTimeout(() => {
      if (!searchRef.current || !window.google) return;
      const ac = new window.google.maps.places.Autocomplete(searchRef.current, { types: ['establishment', 'geocode'] });
      autocompleteRef.current = ac;
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (!place.geometry) return;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setMarkerPos({ lat, lng });
        setMapCenter({ lat, lng });
        setForm(f => ({ ...f, lat: lat.toFixed(6), long: lng.toFixed(6), address: place.formatted_address || place.name }));
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [isLoaded, showModal]);

  // Click on map to set location
  const onMapClick = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarkerPos({ lat, lng });
    setForm(f => ({ ...f, lat: lat.toFixed(6), long: lng.toFixed(6) }));
    // Reverse geocode
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        setForm(f => ({ ...f, address: results[0].formatted_address }));
        if (searchRef.current) searchRef.current.value = results[0].formatted_address;
      }
    });
  }, []);

  // Drag marker
  const onMarkerDrag = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarkerPos({ lat, lng });
    setForm(f => ({ ...f, lat: lat.toFixed(6), long: lng.toFixed(6) }));
  }, []);

  const onMarkerDragEnd = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        setForm(f => ({ ...f, address: results[0].formatted_address }));
        if (searchRef.current) searchRef.current.value = results[0].formatted_address;
      }
    });
  }, []);

  // Use my current location
  const detectLocation = () => {
    if (!navigator.geolocation) return toast('GPS not supported');
    toast('Detecting location…');
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setMarkerPos({ lat, lng });
      setMapCenter({ lat, lng });
      setForm(f => ({ ...f, lat: lat.toFixed(6), long: lng.toFixed(6) }));
      // Reverse geocode
      if (window.google) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results[0]) {
            setForm(f => ({ ...f, address: results[0].formatted_address }));
            if (searchRef.current) searchRef.current.value = results[0].formatted_address;
          }
        });
      }
      toast('✓ Location detected — adjust pin if needed');
    }, () => toast('Could not get location — please allow access'));
  };

  const openModal = (office = null) => {
    if (office) {
      setForm({ name: office.name, address: office.address || '', lat: office.lat, long: office.long, radius: office.radius });
      setEditId(office._id);
      setMarkerPos({ lat: office.lat, lng: office.long });
      setMapCenter({ lat: office.lat, lng: office.long });
    } else {
      setForm(empty);
      setEditId(null);
      setMarkerPos(null);
      setMapCenter(defaultCenter);
    }
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name || !form.lat || !form.long) return toast('Name aur location required hai');
    try {
      const payload = {
        name: form.name,
        address: form.address,
        lat: parseFloat(form.lat),
        long: parseFloat(form.long),
        radius: parseInt(form.radius)
      };
      if (editId) await api.put(`/admin/offices/${editId}`, payload);
      else await api.post('/admin/offices', payload);
      toast(editId ? 'Office updated ✓' : 'Office created ✓');
      setShowModal(false); setForm(empty); setEditId(null); setMarkerPos(null); load();
    } catch (e) { 
      console.error('Office save error:', e.response?.data);
      toast(e.response?.data?.message || 'Error'); 
    }
  };

  const clearAllOffices = async () => {
    try {
      const result = await api.delete('/admin/offices/clear-all');
      toast(`Cleared ${result.data.deletedCount} offices`);
      load();
    } catch (e) {
      console.error('Clear offices error:', e);
      toast('Error clearing offices');
    }
  };

  const del = async (id) => {
    const result = await Swal.fire({
      title: 'Delete Office?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c84b2f',
      cancelButtonColor: '#5a5248',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      background: '#faf7f2',
      color: '#1a1612',
    });
    if (!result.isConfirmed) return;
    await api.delete(`/admin/offices/${id}`);
    toast('Office deleted'); load();
  };

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Offices</div>
        <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 16 }}>Manage office locations and geofence radius</div>
        <button className="btn btn-primary btn-sm" onClick={() => openModal()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} />Add Office
        </button>
        <button className="btn btn-danger btn-sm" onClick={clearAllOffices} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
          Clear All (Debug)
        </button>
      </div>

      {/* Office Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 14 }}>
        {Array.isArray(offices) ? offices.map(o => (
          <div key={o._id} style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 4, padding: 18, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.boxShadow = '3px 3px 0 var(--ink)'; e.currentTarget.style.transform = 'translate(-1px,-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 4, background: 'var(--ink)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MapPin size={18} /></div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{o.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink2)', marginTop: 2 }}>Radius: <strong>{o.radius}m</strong></div>
              </div>
            </div>
            {o.address && <div style={{ fontSize: 12, color: 'var(--ink2)', marginBottom: 8, lineHeight: 1.5 }}>{o.address}</div>}
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--ink2)', marginBottom: 12 }}>
              {Number(o.lat).toFixed(4)}, {Number(o.long).toFixed(4)}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm" onClick={() => openModal(o)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Pencil size={12} />Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => del(o._id)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Trash2 size={12} />Delete</button>
            </div>
          </div>
        )) : null}
        {Array.isArray(offices) && offices.length === 0 && <div className="empty-state"><Building2 size={36} style={{ margin: '0 auto 10px', display: 'block', color: 'var(--ink2)' }} /><div>No offices yet — add one</div></div>}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay active" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 620 }}>
            <div className="modal-title">
              {editId ? 'Edit Office' : 'Add Office'}
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="form-group">
              <label>Office Name *</label>
              <input className="form-inp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Head Office" />
            </div>

            {/* Search box */}
            <div className="form-group">
              <label>Search Location</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input ref={searchRef} className="form-inp" placeholder="Search address or place name…" defaultValue={form.address} />
                <button className="btn btn-success btn-sm" style={{ flexShrink: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }} onClick={detectLocation}>
                  <Navigation size={13} />My Location
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink2)', marginTop: 6 }}>
                Search karo ya map pe click karo pin set karne ke liye — pin drag bhi kar sakte ho
              </div>
            </div>

            {/* Google Map */}
            <div style={{ marginBottom: 16 }}>
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={mapCenter}
                  zoom={markerPos ? 16 : 12}
                  onClick={onMapClick}
                  options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
                >
                  {markerPos && (
                    <>
                      <Marker
                        position={markerPos}
                        draggable
                        onDrag={onMarkerDrag}
                        onDragEnd={onMarkerDragEnd}
                        animation={window.google?.maps?.Animation?.DROP}
                      />
                      <Circle
                        center={markerPos}
                        radius={Number(form.radius) || 100}
                        options={{ fillColor: '#c84b2f', fillOpacity: 0.12, strokeColor: '#c84b2f', strokeOpacity: 0.6, strokeWeight: 2 }}
                      />
                    </>
                  )}
                </GoogleMap>
              ) : (
                <div style={{ ...mapContainerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface2)', fontSize: 13, color: 'var(--ink2)' }}>
                  Loading map…
                </div>
              )}
            </div>

            {/* Lat/Long display */}
            {markerPos && (
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '10px 14px', marginBottom: 16, fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--ink2)', display: 'flex', gap: 20 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />Lat: <strong style={{ color: 'var(--ink)' }}>{form.lat}</strong></span>
                <span>Long: <strong style={{ color: 'var(--ink)' }}>{form.long}</strong></span>
              </div>
            )}

            {/* Radius slider */}
            <div className="form-group">
              <label>Allowed Radius: <strong>{form.radius}m</strong></label>
              <input type="range" min={30} max={500} step={10} value={form.radius}
                onChange={e => setForm(f => ({ ...f, radius: +e.target.value }))}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer', marginTop: 8 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink2)', marginTop: 4 }}>
                <span>30m (strict)</span><span>500m (lenient)</span>
              </div>
            </div>

            <button className="btn btn-primary btn-full" onClick={save} disabled={!markerPos && !form.lat}>
              {editId ? 'Update Office' : 'Create Office'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
