'use client';

import { useState } from 'react';
import styles from './login.module.css';
import { useAuth } from '../../context/AuthContext';
import api from '../utils/api';

// 1. 응답 데이터의 타입을 정의
interface LoginResponse {
  grantType: string;
  accessToken: string;
}


export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      // 2. api.post<LoginResponse> 처럼 제네릭으로 타입을 지정
      const response = await api.post<LoginResponse>('/api/auth/login', {
        userid: userId,
        password: password,
      });
      
      // 이제 TypeScript는 response.data가 LoginResponse 타입임을 알고 있습니다.
      // 따라서 .accessToken에 접근해도 오류가 발생하지 않습니다.
      if (response.data.accessToken) {
        login(response.data.accessToken);
      }
    } catch (err) {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.loginWrapper}>
        <h1 className={styles.logo}><span>VisiDoc</span></h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* ▼▼▼ 이 input 필드들이 실제 UI에 필요합니다 ▼▼▼ */}
          <input
            id="userId"
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className={styles.input}
            placeholder="아이디"
            required
          />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            placeholder="비밀번호"
            required
          />
          {/* ▲▲▲ 여기까지 ▲▲▲ */}
          {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
          <button type="submit" className={styles.loginButton}>로그인 테스트</button>
        </form>
      </div>
    </main>
  );
}