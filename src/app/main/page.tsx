'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLazyQuery, useMutation } from '@apollo/client';

import { SEARCH_PATIENTS } from '@/graphql/queries'; 
import { CREATE_OR_UPDATE_REPORT } from '@/graphql/mutations';
import styles from './main.module.css';

// --- TypeScript 타입 정의 (기존과 동일) ---
interface Author {
  username: string;
}
interface Report {
  reportId: string;
  reportContent: string;
  reportStatus: string;
  author: Author;
}
interface Study {
  studyKey: string;
  studydesc: string;
  studydate: string;
  studytime: string;
  modality: string;
  seriescnt: number;
  imagecnt: number;
  report: Report | null;
}
interface Patient {
  pid: string;
  pname: string;
  studies: Study[];
}

export default function MainPage() {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();

  // --- 상태 관리, Hooks, 핸들러 등 모든 로직은 기존과 동일합니다 ---
  const [searchInput, setSearchInput] = useState({ patientId: '', patientName: '' });
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [reportContentInput, setReportContentInput] = useState('');

  const [search, { loading, error, data }] = useLazyQuery(SEARCH_PATIENTS);

  const [saveReport, { loading: saving, error: saveError }] = useMutation(
    CREATE_OR_UPDATE_REPORT,
    {
      onCompleted: () => {
        alert('소견서가 저장되었습니다.');
        handleSearch(true);
      },
      onError: (err) => {
        console.error('소견서 저장 실패:', err);
        alert(`소견서 저장에 실패했습니다: ${err.message}`);
      }
    }
  );

  useEffect(() => {
    if (isAuthenticated === false) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (data && data.searchPatients) {
      const patients = data.searchPatients;
      setSearchResults(patients);
      if (patients.length === 1) {
        setSelectedPatient(patients[0]);
      } else {
        setSelectedPatient(null);
        setSelectedStudy(null);
      }
    }
  }, [data]);

  useEffect(() => {
    if (selectedStudy) {
      setReportContentInput(selectedStudy.report?.reportContent ?? '');
    } else {
      setReportContentInput('');
    }
  }, [selectedStudy]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchInput(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSearch = (isRefetch = false) => {
    if (!isRefetch && !searchInput.patientId && !searchInput.patientName) {
      alert('환자 아이디 또는 이름을 입력해주세요.');
      return;
    }
    search({
      variables: {
        pid: searchInput.patientId,
        pname: searchInput.patientName,
        studyDateStart: dateRange.start || null,
        studyDateEnd: dateRange.end || null,
      },
    });
  };

  const handlePatientRowClick = (patient: Patient) => {
    setSelectedPatient(patient);
    setSelectedStudy(null);
  };
  
  const handleStudyRowClick = (study: Study) => {
    setSelectedStudy(study);
  };

  const handleReportContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReportContentInput(e.target.value);
  };

  const handleSaveReport = () => {
    if (!selectedStudy) {
      alert('저장할 검사를 선택해주세요.');
      return;
    }
    saveReport({
      variables: {
        studyKey: Number(selectedStudy.studyKey), 
        reportContent: reportContentInput,
        reportStatus: 'DRAFT',
      },
    });
  };

  const formatReportStatus = (status: string | null | undefined) => {
    if (!status) return '판독대기';
    switch (status) {
      case 'DRAFT': return '작성중';
      case 'FINAL': return '판독완료';
      case 'CORRECTED': return '수정완료';
      default: return '판독대기';
    }
  };

  if (isAuthenticated === null || !isAuthenticated) {
    return <div>Loading...</div>;
  }

  // --- [핵심] JSX 렌더링 구조 수정 ---
  return (
    <div className={styles.container}>
      {/* 왼쪽 사이드바 (변경 없음) */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>PACS<span>PLUS</span></div>
        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <label>검사일자</label>
            <div className={styles.dateRange}>
              <input type="date" name="start" className={styles.input} value={dateRange.start} onChange={handleDateChange} />
              <span>~</span>
              <input type="date" name="end" className={styles.input} value={dateRange.end} onChange={handleDateChange} />
            </div>
          </div>
          <div className={styles.filterGroup}>
            <label>검사장비</label>
            <select className={styles.select}>
              <option>ALL</option>
            </select>
          </div>
        </div>
      </aside>
      
      {/* 오른쪽 콘텐츠 전체 (변경 없음) */}
      <div className={styles.rightContent}>
        <header className={styles.header}>
            <div></div>
            <div className={styles.userInfo}>
                <span>{user?.username} 님 ({user?.role})</span>
                <button onClick={logout} className={`${styles.button} ${styles.logoutButton}`}>
                로그아웃
                </button>
            </div>
        </header>

        {/* 메인 콘텐츠 (변경 없음) */}
        <main className={styles.mainContent}>
          <section className={`${styles.panel} ${styles.searchPanel}`}>
            <h2 className={styles.panelTitle}>검색</h2>
            <div className={styles.inputGroup}>
              <input type="text" name="patientId" placeholder="환자 아이디" className={styles.input} value={searchInput.patientId} onChange={handleSearchInputChange} />
              <input type="text" name="patientName" placeholder="환자 이름" className={styles.input} value={searchInput.patientName} onChange={handleSearchInputChange} />
              <button className={`${styles.button} ${styles.redButton}`} onClick={() => handleSearch()} disabled={loading}>
                {loading ? '검색중...' : '검색'}
              </button>
            </div>
          </section>

          {/* [변경] 인라인 스타일을 제거하고 CSS 클래스(.leftColumn, .rightColumn)를 사용 */}
          <div className={styles.bottomSection}>
            
            {/* 왼쪽 컬럼: 환자 목록 + 검사 목록 */}
            <div className={styles.leftColumn}>
              
              {/* 환자 검색 결과 패널 */}
              {/* [변경] 환자 목록 패널에 고정 높이를 제어할 .patientListPanel 클래스 추가 */}
              <section className={`${styles.panel} ${styles.resultsPanel} ${styles.patientListPanel}`}>
                <h2 className={styles.panelTitle}>환자 검색 결과 : {searchResults.length} 명</h2>
                <div className={styles.tableContainer}>
                  <table>
                    <thead><tr><th>환자 아이디</th><th>환자 이름</th><th>검사 수</th></tr></thead>
                    <tbody>
                      {searchResults.map((patient) => (
                        <tr key={patient.pid} onClick={() => handlePatientRowClick(patient)}
                            className={selectedPatient?.pid === patient.pid ? styles.selectedRow : ''}>
                          <td>{patient.pid}</td>
                          <td>{patient.pname}</td>
                          <td>{patient.studies.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 선택된 환자의 검사 목록 패널 */}
          {/* [변경] .studyListPanel 클래스를 추가하여 남은 공간을 채우도록 설정 */}
          <section className={`${styles.panel} ${styles.resultsPanel} ${styles.studyListPanel}`}>
            <h2 className={styles.panelTitle}>총 검사 건수 : {selectedPatient?.studies?.length ?? 0}</h2>
                <div className={styles.tableContainer}>
                  <table>
                    <thead><tr><th>검사장비</th><th>검사설명</th><th>검사일시</th><th>판독상태</th></tr></thead>
                    <tbody>
                      {selectedPatient?.studies.map((study) => (
                        <tr key={study.studyKey} onClick={() => handleStudyRowClick(study)}
                            className={selectedStudy?.studyKey === study.studyKey ? styles.selectedRow : ''}>
                          <td>{study.modality}</td>
                          <td>{study.studydesc}</td>
                          <td>{`${study.studydate} ${study.studytime || ''}`.trim()}</td>
                          <td>{formatReportStatus(study.report?.reportStatus)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
            
            {/* 오른쪽 컬럼: 상세 정보 + 리포트 */}
            <div className={styles.rightColumn}>
                {/* 상세 정보 패널 */}
                <section className={styles.panel}>
                  <h2 className={styles.panelTitle}>상세 정보</h2>
                  {selectedStudy ? (
                    <div>
                      <div className={styles.patientInfo}>
                          <p className={styles.infoItem}><strong>환자 아이디:</strong> {selectedPatient?.pid}</p>
                          <p className={styles.infoItem}><strong>환자 이름:</strong> {selectedPatient?.pname}</p>
                      </div>
                      <table className={styles.historyTable}>
                          <thead><tr><th>검사장비</th><th>검사설명</th><th>검사일시</th><th>판독상태</th><th>시리즈</th><th>이미지</th></tr></thead>
                          <tbody>
                              <tr>
                                  <td>{selectedStudy.modality}</td>
                                  <td>{selectedStudy.studydesc}</td>
                                  <td>{`${selectedStudy.studydate} ${selectedStudy.studytime || ''}`.trim()}</td>
                                  <td>{formatReportStatus(selectedStudy.report?.reportStatus)}</td>
                                  <td>{selectedStudy.seriescnt}</td>
                                  <td>{selectedStudy.imagecnt}</td>
                              </tr>
                          </tbody>
                      </table>
                    </div>
                  ) : (<p className={styles.placeholderText}>검사를 선택하면 상세 정보를 볼 수 있습니다.</p>)}
                </section>
                
                {/* 리포트 패널 */}
                <section className={`${styles.panel} ${styles.reportPanel}`}>
                   <h2 className={styles.panelTitle}>리포트</h2>
                   {selectedStudy ? (
                    <>
                      <div>
                          <label>[코멘트/결론]</label>
                          <textarea className={styles.reportTextarea} value={reportContentInput}
                              onChange={handleReportContentChange} placeholder="소견을 입력하세요..." disabled={saving} />
                      </div>
                      <div style={{ marginTop: '1rem' }}>
                          <label>판독의</label>
                          <input type="text" className={styles.input}
                              value={selectedStudy.report?.author?.username ?? user?.username ?? '미지정'} readOnly />
                      </div>
      
                      <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                          <button className={`${styles.button} ${styles.blueButton}`}
                              onClick={handleSaveReport} disabled={saving}>
                              {saving ? '저장 중...' : '저장'}
                          </button>
                      </div>
                      {saveError && <p style={{ color: 'red', marginTop: '1rem' }}>저장 실패: {saveError.message}</p>}
                    </>
                   ) : (<p className={styles.placeholderText}>검사를 선택하면 리포트 내용을 볼 수 있습니다.</p>)}
                </section>
            </div>
          </div>

          {error && <p style={{ color: 'red', marginTop: '1rem' }}>데이터 로딩 실패: {error.message}</p>}
        </main>
      </div>
    </div>
  );
}
