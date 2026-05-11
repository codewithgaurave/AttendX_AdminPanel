import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import { Eye, EyeOff, LogIn } from 'lucide-react';

export default function Login() {
  const [form, setForm] = useState({ phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.phone || !form.password) {
      return toast('Please fill all fields');
    }

    console.log('Starting login process...');
    const success = await login(form.phone, form.password, 'admin');
    console.log('Login result:', success);
    
    if (success) {
      console.log('Login successful, navigating to dashboard...');
      navigate('/dashboard');
    } else {
      console.log('Login failed');
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, var(--ink) 0%, #2a2520 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      <div style={{
        background: 'var(--bg)',
        borderRadius: 8,
        padding: 40,
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {/* Back button */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: '1.5px solid var(--border)',
                borderRadius: 4,
                padding: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--ink2)',
                fontSize: 12,
                fontWeight: 600,
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = 'var(--ink)';
                e.target.style.color = 'var(--ink)';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = 'var(--border)';
                e.target.style.color = 'var(--ink2)';
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 'bold' }}>←</span>
              Back to Home
            </button>
          </div>
          
          <div style={{ 
            fontFamily: 'Syne, sans-serif', 
            fontSize: 28, 
            fontWeight: 800, 
            color: 'var(--ink)',
            marginBottom: 8
          }}>
            Atten<span style={{ color: 'var(--accent)' }}>Zo</span>
          </div>
          <div style={{ fontSize: 14, color: 'var(--ink2)' }}>
            Admin Portal
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Phone Number</label>
            <input
              className="form-inp"
              type="tel"
              placeholder="Enter your phone number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-inp"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                disabled={loading}
                style={{ paddingRight: 45 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ink2)'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: 8,
              marginTop: 24
            }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16 }} />
                Signing in...
              </>
            ) : (
              <>
                <LogIn size={16} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div style={{ 
          textAlign: 'center', 
          marginTop: 24, 
          fontSize: 12, 
          color: 'var(--ink2)' 
        }}>
          Admin access only • Contact SuperAdmin for support
        </div>
      </div>
    </div>
  );
}