import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('eve_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.data);
        } catch (err) {
          console.warn('Session expired or invalid token:', err.message);
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    localStorage.setItem('eve_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const signup = async (payload) => {
    await api.signup(payload);
    return login(payload.email, payload.password);
  };

  const logout = () => {
    localStorage.removeItem('eve_token');
    setToken(null);
    setUser(null);
  };

  const loginDemo = async (type = 'patient') => {
    if (type === 'admin') {
      return login('admin@evehealthcare.com', 'Admin@12345');
    }
    return login('patient@example.com', 'Patient@12345');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, loginDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
