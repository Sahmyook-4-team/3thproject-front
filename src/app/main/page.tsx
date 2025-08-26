'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
// 1. useMutation을 import 합니다.
import { useLazyQuery, useMutation } from '@apollo/client';
import { GET_PATIENT_WITH_STUDIES } from '@/graphql/queries';
// 2. 소견서 저장을 위한 Mutation을 import 합니다.
import { CREATE_OR_UPDATE_REPORT } from '@/graphql/mutations';
import styles from './main.module.css';

// DB 스키마와 GraphQL 쿼리에 맞춰 TypeScript 타입 정의
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
  report: Report | null; // 리포트가 없을 수도 있으므로 null 허용
}

interface Patient {
  pid: string;
  pname: string;
  studies: Study[];
}

export default function MainPage() {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();

  // --- 상태 관리 ---
  const [searchInput, setSearchInput] = useState({ patientId: '', patientName: '' });
  const [patientData, setPatientData] = useState<Patient | null>(null);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  // 3. 소견서 입력을 위한 상태를 추가합니다.
  const [reportContentInput, setReportContentInput] = useState('');

  // --- GraphQL 데이터 fetching ---
  const [searchPatient, { loading, error, data }] = useLazyQuery(GET_PATIENT_WITH_STUDIES);

  // 4. 소견서 저장을 위한 useMutation Hook을 추가합니다.
  const [saveReport, { loading: saving, error: saveError }] = useMutation(
    CREATE_OR_UPDATE_REPORT,
    {
      // 저장이 성공하면, 현재 환자 데이터를 다시 불러와 화면을 갱신합니다.
      refetchQueries: [
        {
          query: GET_PATIENT_WITH_STUDIES,
          variables: { pid: patientData?.pid },
        },
      ],
    }
  );

  // 페이지 보호 로직
  useEffect(() => {
    if (isAuthenticated === false) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // 검색 결과가 도착하면 상태에 저장
  useEffect(() => {
    if (data && data.patient) {
      setPatientData(data.patient);
      setSelectedStudy(null); // 새로운 환자 검색 시 선택 초기화
    }
  }, [data]);

  // 5. 선택된 검사가 바뀌면, 해당 검사의 소견서 내용을 입력 상태에 반영합니다.
  useEffect(() => {
    if (selectedStudy) {
      setReportContentInput(selectedStudy.report?.reportContent ?? '');
    } else {
      setReportContentInput(''); // 선택 해제 시 내용 비우기
    }
  }, [selectedStudy]);
  
  // --- 이벤트 핸들러 ---
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

  // 6. 소견서 관련 이벤트 핸들러들을 추가합니다.
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

  // 판독 상태를 한글로 변환하는 함수
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

  // --- UI 렌더링 ---
  return (
    <div className={styles.container}>
      {/* 왼쪽 사이드바 */}
      <aside className={styles.sidebar}>
        {/* ... */}
      </aside>

      <main className={styles.mainContent}>
        {/* 상단 검색 패널 */}
        <section className={`${styles.panel} ${styles.searchPanel}`}>
          {/* ... */}
            <input
              type="text"
              name="patientId"
              placeholder="환자 아이디"
              className={styles.input}
              value={searchInput.patientId}
              onChange={handleSearchInputChange}
            />
            <input
              type="text"
              name="patientName"
              placeholder="환자 이름"
              className={styles.input}
              value={searchInput.patientName}
              onChange={handleSearchInputChange}
            />
            <button className={`${styles.button} ${styles.redButton}`} onClick={handleSearch} disabled={loading}>
              {loading ? '검색중...' : '검색'}
            </button>
        </section>

        {/* 중간 검사 결과 패널 */}
        <section className={`${styles.panel} ${styles.resultsPanel}`}>
          {/* ... */}
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
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>과거 검사 이력</h2>
            {patientData ? (
              <div>
                <p><strong>환자 아이디:</strong> {patientData.pid}</p>
                <p><strong>환자 이름:</strong> {patientData.pname}</p>
                <table className={styles.historyTable}>
                  <thead>
                    <tr>
                      <th>검사장비</th>
                      <th>검사설명</th>
                      <th>검사일시</th>
                      <th>판독상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientData.studies.map((study) => (
                      <tr key={study.studyKey}>
                        <td>{study.modality}</td>
                        <td>{study.studydesc}</td>
                        <td>{`${study.studydate} ${study.studytime}`}</td>
                        <td>{formatReportStatus(study.report?.reportStatus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.placeholderText}>환자를 검색하면 과거 이력을 볼 수 있습니다.</p>
            )}
          </section>

          {/* 7. 리포트 UI 패널 전체를 수정합니다. */}
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
  );
}