'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
// axios import는 이 파일에서 더 이상 필요 없습니다.

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
    } catch (error) { // error는 'unknown' 타입입니다.
      let errorMessage = '사용자 생성 중 알 수 없는 오류가 발생했습니다.';

      // ▼▼▼ [핵심] 'any' 없이 에러 타입을 확인하는 로직 ▼▼▼
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
        // 이 if문을 통과했다면, error.response.data.message가 존재하고 문자열임이 보장됩니다.
        errorMessage = (error.response.data as ErrorResponse).message;
      }
      
      alert(errorMessage);
    }
  };

  if (!isAuthenticated || !user?.role.includes('ROLE_ADMIN')) {
    return <div>Loading or Access Denied...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
        <h1>관리자 페이지</h1>
        <div>
          <span>{user?.id} 님</span>
          <button onClick={logout} style={{ marginLeft: '1rem', cursor: 'pointer', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}>로그아웃</button>
        </div>
      </header>

      <main style={{ marginTop: '2rem' }}>
        <h2 style={{ borderBottom: '2px solid #333', paddingBottom: '0.5rem' }}>새로운 사용자 생성</h2>
        <form onSubmit={handleUserCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', marginTop: '1rem', border: '1px solid #ddd', borderRadius: '8px', background: '#f9f9f9' }}>
          <input name="userid" value={newUser.userid} onChange={handleInputChange} placeholder="사용자 아이디 (e.g., doctor_kim)" required style={{ padding: '10px' }} />
          <input name="username" value={newUser.username} onChange={handleInputChange} placeholder="사용자 이름 (e.g., 김의사)" required style={{ padding: '10px' }} />
          <input name="password" type="password" value={newUser.password} onChange={handleInputChange} placeholder="초기 비밀번호" required style={{ padding: '10px' }} />
          <input name="userRole" value={newUser.userRole} onChange={handleInputChange} placeholder="역할 (STAFF 또는 ADMIN)" required style={{ padding: '10px' }} />
          <button type="submit" style={{ padding: '12px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>사용자 생성</button>
        </form>
      </main>
    </div>
  );
}