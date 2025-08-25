'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

// JWT 토큰에 담긴 정보의 타입 정의
interface DecodedUser {
  sub: string;
  auth: string;
  exp: number;
}

// Context에서 제공할 유저 정보 타입
interface User {
  id: string;
  role: string;
}

// Context가 제공할 값들의 타입 정의
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
          setUser({ id: decodedUser.sub, role: decodedUser.auth });
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
    
    setUser({ id: decodedUser.sub, role });

    // 역할에 따라 다른 페이지로 리디렉션
    if (role.includes('ROLE_ADMIN')) {
      router.push('/admin');
    } else {
      router.push('/main'); // STAFF는 /main으로
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