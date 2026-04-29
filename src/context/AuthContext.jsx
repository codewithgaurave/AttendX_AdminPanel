import { createContext, useContext, useState } from 'react';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('token');
    const role  = localStorage.getItem('role');
    const user  = JSON.parse(localStorage.getItem('user') || 'null');
    return token ? { token, role, user } : null;
  });

  const login = (token, role, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('user', JSON.stringify(user));
    setAuth({ token, role, user });
  };

  const logout = () => {
    localStorage.clear();
    setAuth(null);
  };

  return <AuthCtx.Provider value={{ auth, login, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
