'use client'; // 페이지 자체는 클라이언트 컴포넌트로 유지할 수 있습니다.

import dynamic from 'next/dynamic';
import styles from './page.module.css';

// DicomViewer 컴포넌트를 dynamic import로 불러오고, ssr을 false로 설정합니다.
const DicomViewer = dynamic(() => import('@/components/DicomViewer'), {
  ssr: false,
  // 로딩 중에 보여줄 컴포넌트 (선택 사항)
  loading: () => <div className={styles.viewer}><p style={{ color: 'white' }}>뷰어 로딩 중...</p></div>,
});

export default function ViewerPage({ params }: { params: { patientId: string } }) {
  const patientInfo = {
    'S001': { name: '홍길동', dob: '1980-01-01', studyDate: '2025-08-19 10:30' },
    'S002': { name: '이순신', dob: '1975-04-28', studyDate: '2025-08-18 14:00' },
    'S003': { name: '홍길동', dob: '1980-01-01', studyDate: '2024-05-10 12:00' },
  };
  const currentPatient = patientInfo[params.patientId as keyof typeof patientInfo] || { name: '알 수 없음', dob: 'N/A', studyDate: 'N/A' };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>PACS<span>PLUS</span></div>
        <div className={styles.actions}>(아이콘 툴바 영역)</div>
      </header>
      <main className={styles.mainContent}>
        <aside className={styles.sidebar}>
          <div className={styles.infoBlock}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>환자 ID</span>
              <span className={styles.infoValue}>{params.patientId}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>환자 이름</span>
              <span className={styles.infoValue}>{currentPatient.name}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>생년월일</span>
              <span className={styles.infoValue}>{currentPatient.dob}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>검사 일시</span>
              <span className={styles.infoValue}>{currentPatient.studyDate}</span>
            </div>
          </div>
        </aside>
        <div className={styles.viewerContainer}>
          {/* Dynamic으로 불러온 뷰어 컴포넌트를 사용하고 patientId를 props로 전달합니다. */}
          <DicomViewer patientId={params.patientId} />
        </div>
      </main>
    </div>
  );
}