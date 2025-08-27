'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLazyQuery, useMutation } from '@apollo/client';
import { GET_PATIENT_WITH_STUDIES } from '@/graphql/queries';
import { CREATE_OR_UPDATE_REPORT } from '@/graphql/mutations';
import styles from './main.module.css';

// TypeScript 타입 정의
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

  // 상태 관리
  const [searchInput, setSearchInput] = useState({ patientId: '', patientName: '' });
  const [patientData, setPatientData] = useState<Patient | null>(null);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [reportContentInput, setReportContentInput] = useState('');

  // GraphQL Hooks
  const [searchPatient, { loading, error, data }] = useLazyQuery(GET_PATIENT_WITH_STUDIES);
  const [saveReport, { loading: saving, error: saveError }] = useMutation(
    CREATE_OR_UPDATE_REPORT,
    {
      refetchQueries: [{ query: GET_PATIENT_WITH_STUDIES, variables: { pid: patientData?.pid } }],
    }
  );

  // useEffect Hooks
  useEffect(() => {
    if (isAuthenticated === false) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);
  useEffect(() => {
    if (data && data.patient) {
      setPatientData(data.patient);
      setSelectedStudy(null);
    }
  }, [data]);
  useEffect(() => {
    if (selectedStudy) {
      setReportContentInput(selectedStudy.report?.reportContent ?? '');
    } else {
      setReportContentInput('');
    }
  }, [selectedStudy]);

  // 이벤트 핸들러
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchInput(prev => ({ ...prev, [name]: value }));
  };
  const handleSearch = () => {
    if (searchInput.patientId) {
      searchPatient({ variables: { pid: searchInput.patientId } });
    } else {
      alert('환자 아이디를 입력해주세요.');
    }
  };
  const handleRowClick = (study: Study) => {
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
    })
      .then(() => {
        alert('소견서가 저장되었습니다.');
      })
      .catch((err) => {
        console.error('소견서 저장 실패:', err);
        alert(`소견서 저장에 실패했습니다: ${err.message}`);
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
        <div className={styles.logo}>
          PACS<span>PLUS</span>
        </div>
        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <label>검사일자</label>
            <div className={styles.dateRange}>
              <input type="date" className={styles.input} />
              <span>~</span>
              <input type="date" className={styles.input} />
            </div>
          </div>
          <div className={styles.filterGroup}>
            <label>검사장비</label>
            <select className={styles.select}>
              <option>ALL</option>
              <option>CT</option>
              <option>MR</option>
              <option>CR</option>
            </select>
          </div>
        </div>
      </aside>

      {/* 오른쪽 콘텐츠 전체 (헤더 + 메인) */}
      <div className={styles.rightContent}>
        {/* 상단 헤더 */}
        <header className={styles.header}>
          <div></div>
          <div className={styles.userInfo}>
            <span>{user?.username} 님 ({user?.role})</span>
            <button onClick={logout} className={`${styles.button} ${styles.logoutButton}`}>
              로그아웃
            </button>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className={styles.mainContent}>
          {/* 상단 검색 패널 */}
          <section className={`${styles.panel} ${styles.searchPanel}`}>
            <h2 className={styles.panelTitle}>검색</h2>
            <div className={styles.inputGroup}>
              <input
                type="text" name="patientId" placeholder="환자 아이디"
                className={styles.input} value={searchInput.patientId}
                onChange={handleSearchInputChange}
              />
              <input
                type="text" name="patientName" placeholder="환자 이름"
                className={styles.input} value={searchInput.patientName}
                onChange={handleSearchInputChange}
              />
              <button className={`${styles.button} ${styles.redButton}`} onClick={handleSearch} disabled={loading}>
                {loading ? '검색중...' : '검색'}
              </button>
            </div>
          </section>

          {/* 중간 검사 결과 패널 */}
          <section className={`${styles.panel} ${styles.resultsPanel}`}>
            <h2 className={styles.panelTitle}>
              총 검사 건수 : {patientData?.studies?.length ?? 0}
            </h2>
            <table>
              <thead>
                <tr>
                  <th>환자 아이디</th>
                  <th>환자 이름</th>
                  <th>검사장비</th>
                  <th>검사설명</th>
                  <th>검사일시</th>
                  <th>판독상태</th>
                  <th>시리즈</th>
                  <th>이미지</th>
                  <th>Verify</th>
                </tr>
              </thead>
              <tbody>
                {patientData?.studies.map((study) => (
                  <tr
                    key={study.studyKey}
                    onClick={() => handleRowClick(study)}
                    className={selectedStudy?.studyKey === study.studyKey ? styles.selectedRow : ''}
                  >
                    <td>{patientData.pid}</td>
                    <td>{patientData.pname}</td>
                    <td>{study.modality}</td>
                    <td>{study.studydesc}</td>
                    <td>{`${study.studydate} ${study.studytime}`}</td>
                    <td>{formatReportStatus(study.report?.reportStatus)}</td>
                    <td>{study.seriescnt}</td>
                    <td>{study.imagecnt}</td>
                    <td>-</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {error && <p style={{ color: 'red' }}>데이터 로딩 실패: {error.message}</p>}
          </section>
          
          {/* 하단 상세 정보 패널 */}
          <div className={styles.bottomSection}>
            {/* --- [핵심 수정] ---
                '과거 검사 이력'을 '상세 정보'로 변경하고, 선택된 검사가 있을 때만 표시하도록 수정 */}
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>상세 정보</h2>
              {selectedStudy ? (
                <div>
                  <div className={styles.patientInfo}>
                    <p className={styles.infoItem}><strong>환자 아이디:</strong> {patientData?.pid}</p>
                    <p className={styles.infoItem}><strong>환자 이름:</strong> {patientData?.pname}</p>
                  </div>
                  <table className={styles.historyTable}>
                    <thead>
                      <tr>
                        <th>검사장비</th>
                        <th>검사설명</th>
                        <th>검사일시</th>
                        <th>판독상태</th>
                        <th>시리즈</th>
                        <th>이미지</th>
                        <th>Verify</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{selectedStudy.modality}</td>
                        <td>{selectedStudy.studydesc}</td>
                        <td>{`${selectedStudy.studydate} ${selectedStudy.studytime}`}</td>
                        <td>{formatReportStatus(selectedStudy.report?.reportStatus)}</td>
                        <td>{selectedStudy.seriescnt}</td>
                        <td>{selectedStudy.imagecnt}</td>
                        <td>-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={styles.placeholderText}>위 목록에서 검사를 선택하면 상세 정보를 볼 수 있습니다.</p>
              )}
            </section>

            {/* 리포트 패널 (기존과 동일) */}
            <section className={`${styles.panel} ${styles.reportPanel}`}>
              <h2 className={styles.panelTitle}>리포트</h2>
              {selectedStudy ? (
                <>
                  <div>
                    <label>[코멘트/결론]</label>
                    <textarea
                      className={styles.reportTextarea}
                      value={reportContentInput}
                      onChange={handleReportContentChange}
                      placeholder="소견을 입력하세요..."
                      disabled={saving}
                    />
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <label>판독의</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={selectedStudy.report?.author?.username ?? user?.username ?? '미지정'}
                      readOnly
                    />
                  </div>
                  <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                    <button
                      className={`${styles.button} ${styles.blueButton}`}
                      onClick={handleSaveReport}
                      disabled={saving}
                    >
                      {saving ? '저장 중...' : '저장'}
                    </button>
                  </div>
                  {saveError && <p style={{ color: 'red', marginTop: '1rem' }}>저장 실패: {saveError.message}</p>}
                </>
              ) : (
                <p className={styles.placeholderText}>검사를 선택하면 리포트 내용을 볼 수 있습니다.</p>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}