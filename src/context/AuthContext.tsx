// src/context/AuthContext.tsx

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

interface DecodedUser {
  sub: string;
  auth: string;
  exp: number;
  username: string;
}

// 1. --- [핵심 수정 1] ---
// 최종 user 객체의 타입에 username을 추가합니다.
interface User {
  id: string;
  role: string;
  username: string; // <-- 이 줄을 추가하세요!
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const decodedUser: DecodedUser = jwtDecode(token);
        if (decodedUser.exp * 1000 > Date.now()) {
          // 2. --- [핵심 수정 2] ---
          // setUser를 호출할 때 username도 함께 저장합니다.
          setUser({ id: decodedUser.sub, role: decodedUser.auth, username: decodedUser.username });
        } else {
          localStorage.removeItem('accessToken');
        }
      } catch (e) {
        localStorage.removeItem('accessToken');
      }
    }
  }, []);

  const login = (token: string) => {
    localStorage.setItem('accessToken', token);
    const decodedUser: DecodedUser = jwtDecode(token);
    const role = decodedUser.auth;
    
    // 3. --- [핵심 수정 3] ---
    // 여기서도 setUser를 호출할 때 username을 함께 저장합니다.
    setUser({ id: decodedUser.sub, role, username: decodedUser.username });

    if (role.includes('ROLE_ADMIN')) {
      router.push('/admin');
    } else {
      router.push('/main');
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};