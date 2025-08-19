'use client';

import { useState } from 'react';
import styles from './login.module.css';

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('로그인 정보:', { userId, password });
  };

  return (
    <main className={styles.container}>
      {/* 이 div가 로고와 폼을 중앙으로 정렬하는 역할을 합니다. */}
      <div className={styles.loginWrapper}>
        
        {/* 'PLUS'를 <span>으로 감싸서 색상을 다르게 적용합니다. */}
        <h1 className={styles.logo}>PACS<span>PLUS</span></h1>

        <form onSubmit={handleSubmit} className={styles.form}>
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
          <div className={styles.checkboxGroup}>
            <input type="checkbox" id="rememberMe" />
            <label htmlFor="rememberMe">로그인 상태 유지</label>
          </div>
          <button type="submit" className={styles.loginButton}>
            로그인
          </button>
        </form>
      </div>
    </main>
  );
}