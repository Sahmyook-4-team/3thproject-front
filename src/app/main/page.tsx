'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLazyQuery, useMutation } from '@apollo/client';
import Link from 'next/link';
// [수정 1] useMainState를 중괄호 {} 안에 넣어 named import 방식으로 가져옵니다.
import { useMainState } from '@/context/MainStateContext';

import { SEARCH_PATIENTS } from '@/graphql/queries'; 
import { CREATE_OR_UPDATE_REPORT } from '@/graphql/mutations';
import styles from './main.module.css';

// --- TypeScript 타입 정의 (이 타입들은 MainStateContext.tsx에도 동일하게 있어야 합니다) ---
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

interface SearchPatientsQueryData {
  searchPatients: Patient[];
}

export default function MainPage() {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();

  // [수정 2] 전역 상태 관리를 위해 useMainState 훅을 사용합니다.
  const {
    searchResults,
    setSearchResults,
    selectedPatient,
    setSelectedPatient,
    selectedStudy,
    setSelectedStudy,
    searchInput,
    setSearchInput,
  } = useMainState();

  // [수정 3] 중복 선언되던 useState들을 모두 삭제했습니다.
  // 아래 state들은 이 페이지에서만 사용되므로 그대로 둡니다.
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [reportContentInput, setReportContentInput] = useState('');
  const [selectedModality, setSelectedModality] = useState('ALL');

  const [search, { loading, error, data }] = useLazyQuery<SearchPatientsQueryData>(SEARCH_PATIENTS);

  const [saveReport, { loading: saving, error: saveError }] = useMutation(
    CREATE_OR_UPDATE_REPORT,
    {
      onCompleted: (data) => {
        alert('소견서가 저장되었습니다.');
        const updatedReport = data.createOrUpdateReport;
        if (!updatedReport || !selectedStudy || !selectedPatient) return; 

        const newSelectedStudy = { ...selectedStudy, report: updatedReport };
        setSelectedStudy(newSelectedStudy);

        const newSearchResults = searchResults.map((patient: Patient) => { // [수정 4] 타입 명시
          if (patient.pid === selectedPatient.pid) {
            return {
              ...patient,
              studies: patient.studies.map((study: Study) => // [수정 4] 타입 명시
                study.studyKey === selectedStudy.studyKey ? newSelectedStudy : study
              )
            };
          }
          return patient;
        });
        setSearchResults(newSearchResults);

        const updatedPatient = newSearchResults.find((p: Patient) => p.pid === selectedPatient.pid); // [수정 4] 타입 명시
        if(updatedPatient) {
            setSelectedPatient(updatedPatient);
        }
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

      if (selectedPatient) {
        const updatedPatient = patients.find((p: Patient) => p.pid === selectedPatient.pid); // [수정 4] 타입 명시
        setSelectedPatient(updatedPatient || null);
        if (selectedStudy && updatedPatient) {
          const updatedStudy = updatedPatient.studies.find((s: Study) => s.studyKey === selectedStudy.studyKey); // [수정 4] 타입 명시
          setSelectedStudy(updatedStudy || null);
        }
      }
    }
  }, [data, setSearchResults, selectedPatient, setSelectedPatient, selectedStudy, setSelectedStudy]);

  useEffect(() => {
    if (selectedStudy) {
      setReportContentInput(selectedStudy.report?.reportContent ?? '');
    } else {
      setReportContentInput('');
    }
  }, [selectedStudy]);

  const isInitialMount = useRef(true); 

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false; 
      return;
    }
    if (searchResults.length > 0 || (searchInput.patientId || searchInput.patientName)) {
      handleSearch(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedModality]); 


  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchInput(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };
  
  const handleModalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModality(e.target.value);
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
        modality: selectedModality,
      },
    });
  };

  const handlePatientRowClick = (patient: Patient) => { // [수정 4] 타입 명시
    setSelectedPatient(patient);
    setSelectedStudy(null);
  };
  
  const handleStudyRowClick = (study: Study) => { // [수정 4] 타입 명시
    setSelectedStudy(study);
  };
  
  const handleStudyRowDoubleClick = (study: Study) => { // [수정 4] 타입 명시
    if (!selectedPatient) return;
    router.push(`/viewer/${selectedPatient.pid}?studyId=${study.studyKey}`);
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

  return (
    <div className={styles.container}>
      {/* 왼쪽 사이드바 */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}><span>VisiDoc</span></div>
        <div className={styles.filterSection}>
         <div className={`${styles.filterGroup} ${styles.dateFilter}`}>
            <label>검사일자</label>
            <div className={styles.dateRange}>
              <label className={styles.subLabel}>시작일</label>
              <input 
                type="date" 
                name="start" 
                className={styles.input} 
                value={dateRange.start} 
                onChange={handleDateChange}
              />


              <label className={styles.subLabel}>종료일</label>
              <input 
                type="date" 
                name="end" 
                className={styles.input} 
                value={dateRange.end} 
                onChange={handleDateChange}
              />
            </div>
          </div>
          <div className={styles.filterGroup}>
            <label>검사장비</label>
            <select className={styles.select} value={selectedModality} onChange={handleModalityChange}>
              <option value="ALL">ALL</option>
              <option value="CT">CT</option>
              <option value="MR">MR</option>
              <option value="CR">CR</option>
              <option value="XA">XA</option>
            </select>
          </div>
        </div>
      </aside>
      
      <div className={styles.rightContent}>
        <header className={styles.header}>
            <div>
              <Link href="/chat" className={styles.chatLinkButton}>채팅</Link>
            </div>
            <div className={styles.userInfo}>
                <span>{user?.username} 님</span>
                <button onClick={logout} className={`${styles.button} ${styles.logoutButton}`}>
                로그아웃
                </button>
            </div>
        </header>

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

          <div className={styles.bottomSection}>
            <div className={styles.leftColumn}>
              <section className={`${styles.panel} ${styles.resultsPanel} ${styles.patientListPanel}`}>
                <h2 className={styles.panelTitle}>환자 검색 결과 : {searchResults.length} 명</h2>
                <div className={styles.tableContainer}>
                  <table>
                    <thead><tr><th>환자 아이디</th><th>환자 이름</th><th>검사 수</th></tr></thead>
                    <tbody>
                      {searchResults.map((patient: Patient) => ( // [수정 4] 타입 명시
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

              <section className={`${styles.panel} ${styles.resultsPanel} ${styles.studyListPanel}`}>
                <h2 className={styles.panelTitle}>총 검사 건수 : {selectedPatient?.studies?.length ?? 0}</h2>
                <div className={styles.tableContainer}>
                  <table>
                    <thead><tr><th>검사장비</th><th>검사설명</th><th>검사일시</th><th>판독상태</th></tr></thead>
                    <tbody>
                      {selectedPatient?.studies.map((study: Study) => ( // [수정 4] 타입 명시
                        <tr key={study.studyKey} 
                            onClick={() => handleStudyRowClick(study)}
                            onDoubleClick={() => handleStudyRowDoubleClick(study)}
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
            
            <div className={styles.rightColumn}>
                <section className={styles.panel}>
                  <h2 className={styles.panelTitle}>상세 정보</h2>
                  {selectedStudy ? (
                    <div>
                      <div className={styles.patientInfo}>
                          <p className={styles.infoItem}><strong>환자 아이디:</strong> {selectedPatient?.pid}</p>
                          <p className={styles.infoItem}><strong>환자 이름:</strong> {selectedPatient?.pname}</p>
                      </div>
                            <div className={styles.detailTableContainer}>
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
                    </div>
                  ) : (<p className={styles.placeholderText}>검사를 선택하면 상세 정보를 볼 수 있습니다.</p>)}
                </section>
                
                <section className={`${styles.panel} ${styles.reportPanel}`}>
                   <h2 className={styles.panelTitle}>리포트</h2>
                   {selectedStudy ? (
                    <>
                      <div className={styles.reportContentArea}>
                          <label>[코멘트/결론]</label>
                          <textarea className={styles.reportTextarea} value={reportContentInput}
                              onChange={handleReportContentChange} placeholder="소견을 입력하세요." disabled={saving} />
                      </div>
                      <div style={{ marginTop: '1rem' }}>
                          <label>판독의</label>
                          <input type="text" className={styles.input}
                              value={
                                selectedStudy.report?.author?.username ??
                                user?.username ??
                                '미정'
                              } 
                              readOnly
                          />
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