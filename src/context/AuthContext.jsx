import { createContext, useContext, useState } from 'react';
import api from '../utils/api';
import { toast } from '../components/Toast';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('token');
    const role  = localStorage.getItem('role');
    const user  = JSON.parse(localStorage.getItem('user') || 'null');
    return token ? { token, role, user } : null;
  });

  const login = async (phoneOrEmail, password, expectedRole = 'admin') => {
    try {
      const loginData = {
        password,
        role: expectedRole,
        ...(expectedRole === 'admin' ? { phone: phoneOrEmail } : { email: phoneOrEmail })
      };
      
      const { data } = await api.post('/auth/login', loginData);
      
      if (data.user.role !== expectedRole) {
        toast(`Access denied. This portal is for ${expectedRole}s only.`);
        return false;
      }
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.user.role);
      localStorage.setItem('user', JSON.stringify(data.user));
      setAuth({ token: data.token, role: data.user.role, user: data.user });
      
      toast(`Welcome back, ${data.user.name}!`);
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast(message);
      return false;
    }
  };

  const logout = () => {
    localStorage.clear();
    setAuth(null);
  };

  return <AuthCtx.Provider value={{ auth, login, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
