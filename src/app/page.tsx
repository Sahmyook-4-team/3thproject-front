import { redirect } from 'next/navigation';

export default function HomePage() {
  // 루트 페이지 접근 시 바로 로그인 페이지로 보냄
  redirect('/login');
}