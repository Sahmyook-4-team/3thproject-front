'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './login.module.css';

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('로그인 정보:', { userId, password });
  };

  return (
    // main 태그가 전체 화면을 차지하고 컨텐츠를 중앙 정렬합니다.
    <main className={styles.container}>
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
    </main>
  );
}