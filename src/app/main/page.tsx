'use client';

import { useState } from 'react';
import styles from './main.module.css';
import { useRouter } from 'next/navigation';

// ✅ 1. 인터페이스(설계도)를 실제 데이터와 똑같이 수정했습니다.
interface Study {
  id: string;
  patientId: string;
  patientName: string;
  modality: string;
  description: string;
  date: string;
  status: string;
  report: {
    comment: string;
    conclusion: string;
    reader1: string;
  };
}

// Spring API에서 받아올 데이터라고 가정한 임시 데이터
const placeholderData: Study[] = [
  { id: 'S001', patientId: 'P001', patientName: '홍길동', modality: 'CT', description: 'Abdomen CT', date: '2025-08-19', status: '판독완료', report: { comment: '정상 소견입니다.', conclusion: '특이사항 없음.', reader1: '김의사' } },
  { id: 'S002', patientId: 'P002', patientName: '이순신', modality: 'MR', description: 'Brain MRI', date: '2025-08-18', status: '판독대기', report: { comment: '판독 대기 중...', conclusion: '', reader1: '' } },
  { id: 'S003', patientId: 'P001', patientName: '홍길동', modality: 'XA', description: 'Coronary Angio', date: '2024-05-10', status: '판독완료', report: { comment: '경미한 협착 관찰됨.', conclusion: '추적 관찰 요망.', reader1: '박선생' } },
];

export default function MainPage() {
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const router = useRouter();

  const handleRowClick = (study: Study) => {
    setSelectedStudy(study);
  };

  const handleDoubleClick = (studyId: string) => {
    // ✅ 2. 폴더명을 [studyId]로 만들었으니, 주소도 studyId를 사용합니다.
    router.push(`/viewer/${studyId}`);
  };

  return (
    <div className={styles.container}>
      {/* (중간 코드는 생략, 이전과 동일합니다) */}
      <aside className={styles.sidebar}>
        {/* ... */}
      </aside>
      <main className={styles.mainContent}>
        <section className={`${styles.panel} ${styles.resultsPanel}`}>
          <h2 className={styles.panelTitle}>총 검사 건수 : {placeholderData.length}</h2>
          <table>
            <thead>
              <tr>
                <th>환자 아이디</th>
                <th>환자 이름</th>
                <th>검사장비</th>
                <th>검사설명</th>
                <th>검사일시</th>
                <th>판독상태</th>
              </tr>
            </thead>
            <tbody>
              {placeholderData.map((study) => (
                <tr 
                  key={study.id} 
                  onClick={() => handleRowClick(study)}
                  onDoubleClick={() => handleDoubleClick(study.id)}
                  className={selectedStudy?.id === study.id ? styles.selectedRow : ''}
                >
                  <td>{study.patientId}</td>
                  <td>{study.patientName}</td>
                  <td>{study.modality}</td>
                  <td>{study.description}</td>
                  <td>{study.date}</td>
                  <td>{study.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        
        <div className={styles.bottomSection}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>과거 검사 이력</h2>
            {selectedStudy ? (
              <div>
                <p><strong>환자 아이디:</strong> {selectedStudy.patientId}</p>
                <p><strong>환자 이름:</strong> {selectedStudy.patientName}</p>
              </div>
            ) : (
              <p className={styles.placeholderText}>검사를 선택하면 환자의 과거 이력을 볼 수 있습니다.</p>
            )}
          </section>

          <section className={`${styles.panel} ${styles.reportPanel}`}>
            <h2 className={styles.panelTitle}>리포트</h2>
            {selectedStudy ? (
              <>
                <div>
                  <label>[코멘트]</label>
                  <textarea className={styles.reportTextarea} value={selectedStudy.report.comment} readOnly />
                </div>
                <div style={{marginTop: '1rem'}}>
                  <label>[결론]</label>
                  <textarea className={styles.reportTextarea} value={selectedStudy.report.conclusion} readOnly />
                </div>
                 <div style={{marginTop: '1rem'}}>
                  <label>예비판독의1</label>
                  <input type="text" className={styles.input} value={selectedStudy.report.reader1} readOnly />
                </div>
              </>
            ) : (
              <p className={styles.placeholderText}>검사를 선택하면 리포트 내용을 볼 수 있습니다.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}