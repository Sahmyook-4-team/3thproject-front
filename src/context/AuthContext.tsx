'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface DecodedUser {
  sub: string;
  auth: string;
  exp: number;
  username: string;
}

interface User {
  id: string;
  role: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  stompClient: Client | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const [stompClient, setStompClient] = useState<Client | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const decodedUser: DecodedUser = jwtDecode(token);
        if (decodedUser.exp * 1000 > Date.now()) {
          setUser({ id: decodedUser.sub, role: decodedUser.auth, username: decodedUser.username });
        } else {
          localStorage.removeItem('accessToken');
        }
      } catch (e) {
        localStorage.removeItem('accessToken');
      }
    }
  }, []);

  // [핵심] 로그인/로그아웃 시에만 WebSocket을 연결/해제하는 전역 관리자
  useEffect(() => {
    if (user && !stompClient) {
      const client = new Client({
        webSocketFactory: () => new SockJS(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/ws`),
        reconnectDelay: 5000,
      });

      client.onConnect = () => {
        console.log('Global WebSocket Connected!');
        client.publish({
            destination: '/app/chat.addUser',
            body: JSON.stringify({ 
              userid: user.id, 
              username: user.username, 
              userRole: user.role 
            })
        });
      };

      client.activate();
      setStompClient(client);
    }

    if (!user && stompClient) {
      stompClient.deactivate();
      setStompClient(null);
      console.log('Global WebSocket Disconnected!');
    }
  }, [user]); // user 상태가 바뀔 때만 실행!


  const login = (token: string) => {
    localStorage.setItem('accessToken', token);
    const decodedUser: DecodedUser = jwtDecode(token);
    const role = decodedUser.auth;
    
    setUser({ id: decodedUser.sub, role, username: decodedUser.username });

    if (role.includes('ROLE_ADMIN')) {
      router.push('/admin');
    } else {
      router.push('/main');
    }
  };

  const logout = () => {
    stompClient?.deactivate();
    localStorage.removeItem('accessToken');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, stompClient }}>
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