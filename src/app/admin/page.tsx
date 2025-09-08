'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import api from '../utils/api';
import styles from './page.module.css'; // CSS 모듈 import

// 백엔드에서 보내주는 에러 응답의 데이터 타입을 정의합니다.
interface ErrorResponse {
  message: string;
}

export default function AdminPage() {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated === null) return;
    if (!isAuthenticated || !user?.role.includes('ROLE_ADMIN')) {
      alert('접근 권한이 없습니다.');
      router.push('/login');
    }
  }, [isAuthenticated, user, router]);

  const [newUser, setNewUser] = useState({
    userid: '',
    username: '',
    password: '',
    userRole: 'STAFF',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const handleUserCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/users', newUser);
      alert(`사용자 '${newUser.userid}'가 성공적으로 생성되었습니다.`);
      setNewUser({ userid: '', username: '', password: '', userRole: 'STAFF' });
    } catch (error) {
      let errorMessage = '사용자 생성 중 알 수 없는 오류가 발생했습니다.';
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'data' in error.response &&
        error.response.data &&
        typeof error.response.data === 'object' &&
        'message' in error.response.data &&
        typeof (error.response.data as ErrorResponse).message === 'string'
      ) {
        errorMessage = (error.response.data as ErrorResponse).message;
      }
      alert(errorMessage);
    }
  };

  if (!isAuthenticated || !user?.role.includes('ROLE_ADMIN')) {
    return <div>Loading or Access Denied...</div>;
  }

  // 참고: 두 번째 이미지에 있던 "사용자 채팅 페이지로 이동하기" 링크는
  // 첫 번째 목표 이미지 디자인에는 없어서 JSX에서 제외했습니다.
  // 필요하시면 <main> 태그 안쪽에 다시 추가하시면 됩니다.

  return (
    <div className={styles.container}>
      <main className={styles.content}>
        <h1 className={styles.logo}>VisiDoc</h1>
        
        <header className={styles.header}>
          <h2 className={styles.pageTitle}>관리자 페이지</h2>
          <div className={styles.userInfo}>
            <span>{user?.id} 님</span>
            <button onClick={logout} className={styles.logoutButton}>로그아웃</button>
          </div>
        </header>

        <div>
          <h3 className={styles.formTitle}>새로운 사용자 생성</h3>
          <form onSubmit={handleUserCreate} className={styles.form}>
            <input
              name="userid"
              value={newUser.userid}
              onChange={handleInputChange}
              placeholder="사용자 아이디 (e.g., doctor_kim)"
              required
              className={styles.input}
            />
            <input
              name="username"
              value={newUser.username}
              onChange={handleInputChange}
              placeholder="사용자 이름 (e.g., 김의사)"
              required
              className={styles.input}
            />
            <input
              name="password"
              type="password"
              value={newUser.password}
              onChange={handleInputChange}
              placeholder="초기 비밀번호"
              required
              className={styles.input}
            />
            <input
              name="userRole"
              value={newUser.userRole}
              onChange={handleInputChange}
              required
              className={styles.input}
            />
            <button type="submit" className={styles.submitButton}>
              사용자 생성
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}