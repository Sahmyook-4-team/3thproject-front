// src/app/main/page.tsx
'use client';

import { useState } from 'react';
import styles from './main.module.css';

// TypeScript를 위한 임시 데이터 타입 정의
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

// ✅ 함수 이름이 대문자 'M'으로 시작하는지 확인!
export default function MainPage() {
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);

  const handleRowClick = (study: Study) => {
    setSelectedStudy(study);
  };

  return (
    <div className={styles.container}>
      {/* ======================= 왼쪽 사이드바 ======================= */}
      <aside className={styles.sidebar}>
        <h1 className={styles.logo}>PACS<span>PLUS</span></h1>
        
        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <label>검사일자</label>
            <div className={styles.dateRange}>
              <input type="date" className={styles.input} defaultValue="2025-08-19" />
              <span>~</span>
              <input type="date" className={styles.input} defaultValue="2025-08-19" />
            </div>
          </div>
          <div className={styles.filterGroup}>
            <label>검사장비</label>
            <select className={styles.select}>
              <option>전체</option>
              <option>CT</option>
              <option>MR</option>
              <option>XA</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Verify</label>
            <select className={styles.select}>
              <option>전체</option>
            </select>
          </div>
          <div className={styles.buttonGroup} style={{marginTop: 'auto'}}>
            <button className={styles.button} style={{width: '100%'}}>조회</button>
            <button className={styles.button} style={{width: '100%', marginTop: '0.5rem'}}>재설정</button>
          </div>
        </div>
      </aside>

      {/* ======================= 오른쪽 메인 콘텐츠 ======================= */}
      <main className={styles.mainContent}>
        <section className={`${styles.panel} ${styles.searchPanel}`}>
          <h2 className={styles.panelTitle}>검색</h2>
          <div className={styles.inputGroup}>
            <input type="text" placeholder="환자 아이디" className={styles.input} />
            <input type="text" placeholder="환자 이름" className={styles.input} />
            <button className={styles.button}>오늘</button>
            <button className={styles.button}>1주일</button>
            <button className={`${styles.button} ${styles.redButton}`}>검색</button>
          </div>
        </section>

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