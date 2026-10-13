import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const verifyUser = async () => {
      const storedUser = localStorage.getItem('queueless_user');
      if (storedUser) {
        try {
          const userObj = JSON.parse(storedUser);
          // Verify token by fetching profile
          const res = await fetch('/api/users/profile', {
            headers: { 'Authorization': `Bearer ${userObj.token}` }
          });
          
          if (res.ok) {
            const profile = await res.json();
            setUser({ ...profile, token: userObj.token });
          } else {
            // Token invalid or expired
            localStorage.removeItem('queueless_user');
            setUser(null);
          }
        } catch (e) {
          localStorage.removeItem('queueless_user');
          setUser(null);
        }
      }
      setLoading(false);
    };
    verifyUser();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      let data = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        await response.text();
        if (!response.ok) {
          throw new Error('Unable to sign in right now. Please try again.');
        }
      }
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      setUser(data);
      localStorage.setItem('queueless_user', JSON.stringify(data));
      return { success: true, role: data.role };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      
      let data = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        if (!response.ok) {
          throw new Error('Unable to create your account right now. Please try again.');
        }
      }
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      // Auto login after register, default role is 'customer'
      setUser({ ...data, role: 'customer' });
      localStorage.setItem('queueless_user', JSON.stringify({ ...data, role: 'customer' }));
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('queueless_user');
    // Optional: Call backend logout
    fetch('/api/users/logout', { method: 'POST' }).catch(() => {});
  };

  const updateUser = (updatedFields) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('queueless_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
