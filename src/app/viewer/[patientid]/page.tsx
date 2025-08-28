'use client';

import { useQuery } from '@apollo/client';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { GET_PATIENT_WITH_STUDIES } from '@/graphql/queries';
import styles from './page.module.css';

// DicomViewer 컴포넌트를 dynamic import로 불러오고, ssr을 false로 설정합니다.
const DicomViewer = dynamic(() => import('@/components/DicomViewer'), {
  ssr: false,
  // 로딩 중에 보여줄 컴포넌트 (선택 사항)
  loading: () => <div className={styles.viewer}><p style={{ color: 'white' }}>뷰어 로딩 중...</p></div>,
});

interface PatientInfo {
  pid: string;
  pname: string;
  pbirthdate: string;
  studies: Array<{
    studyKey: string;
    studydate: string;
    studytime: string;
    modality: string;
  }>;
}

interface PageProps {
  params: { 
    patientid: string; // Note: This must match the folder name [patientid] exactly
  };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function ViewerPage({ params, searchParams }: PageProps) {
  const studyId = Array.isArray(searchParams.studyId) 
    ? searchParams.studyId[0] 
    : searchParams.studyId;
  
  const patientId = params.patientid; // Note the lowercase 'id' to match the folder name
  
  const { loading, error, data } = useQuery<{ patient: PatientInfo }>(GET_PATIENT_WITH_STUDIES, {
    variables: { pid: patientId },
    skip: !patientId,
    onCompleted: (data) => {
      console.log('GraphQL Response:', data);
    },
    onError: (error) => {
      console.error('GraphQL Error:', error);
    },
    fetchPolicy: 'network-only' // Always fetch fresh data
  });

  console.log('Patient ID from URL:', patientId);
  console.log('Study ID from URL:', studyId);

  if (loading) return <div className={styles.container}><p>로딩 중...</p></div>;
  if (error) return <div className={styles.container}><p>오류 발생: {error.message}</p></div>;
  if (!data?.patient) return <div className={styles.container}><p>환자 정보를 찾을 수 없습니다. (ID: {patientId})</p></div>;

  const { patient } = data;
  const currentStudy = studyId 
    ? patient.studies.find(study => study.studyKey === studyId)
    : patient.studies[0]; // 기본적으로 첫 번째 검사 정보를 보여줍니다。

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
              <span className={styles.infoValue}>{patient.pid}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>환자 이름</span>
              <span className={styles.infoValue}>{patient.pname || 'N/A'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>생년월일</span>
              <span className={styles.infoValue}>{patient.pbirthdate || 'N/A'}</span>
            </div>
            {currentStudy && (
              <>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>검사 일시</span>
                  <span className={styles.infoValue}>
                    {currentStudy.studydate} {currentStudy.studytime}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>검사 장비</span>
                  <span className={styles.infoValue}>{currentStudy.modality || 'N/A'}</span>
                </div>
              </>
            )}
          </div>
        </aside>
        <div className={styles.viewerContainer}>
          {/* Dynamic으로 불러온 뷰어 컴포넌트를 사용하고 patientId를 props로 전달합니다. */}
          <DicomViewer 
            patientId={params.patientid} 
            studyId={studyId || (patient.studies[0]?.studyKey)} 
          />
        </div>
      </main>
    </div>
  );
}