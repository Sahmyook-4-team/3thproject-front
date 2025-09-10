// @ts-nocheck
// 파일 경로: app/viewer/[patientid]/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { GET_PATIENT_WITH_STUDIES, GET_STUDY_DETAILS } from '@/graphql/queries';
import styles from './page.module.css';
import SeriesThumbnailItem from '@/components/SeriesThumbnailItem';

import * as csTools3d from '@cornerstonejs/tools';

import { FaAdjust, FaArrowsAlt, FaSearchPlus, FaRulerHorizontal, FaUndo, FaAngleLeft, FaFastBackward, FaPlay, FaFastForward, FaSquare, FaArrowsAltH, FaCommentAlt, FaCircle, FaSearch } from 'react-icons/fa';
const { PanTool, ZoomTool, WindowLevelTool, RectangleROITool, LengthTool, AngleTool, BidirectionalTool, ArrowAnnotateTool, CircleROITool, MagnifyTool } = csTools3d;

const DicomViewer = dynamic(() => import('@/components/DicomViewer'), {
  ssr: false,
  loading: () => <div className={styles.viewer}><p style={{ color: 'white' }}>뷰어 로딩 중...</p></div>,
});

interface SeriesInfo {
  seriesKey: string;
  modality: string;
  seriesnum: number;
  seriesdesc: string;
  imagecnt: number;
}

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
    patientid: string;
  };
}

export default function ViewerPage({ params }: PageProps) {
  const [activeTool, setActiveTool] = useState(WindowLevelTool.toolName);
  const [seriesList, setSeriesList] = useState<SeriesInfo[]>([]);
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);
  const [seriesWithThumbnails, setSeriesWithThumbnails] = useState([]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const studyIdFromUrl = searchParams.get('studyId');
  const patientId = params.patientid;

  const { loading, error, data } = useQuery<{ patient: PatientInfo }>(GET_PATIENT_WITH_STUDIES, {
    variables: { pid: patientId },
    skip: !patientId,
    fetchPolicy: 'network-only'
  });

  const studyIdToLoad = studyIdFromUrl || (data?.patient?.studies[0]?.studyKey);

  const { data: seriesData } = useQuery(GET_STUDY_DETAILS, {
    variables: { studyKey: studyIdToLoad },
    skip: !studyIdToLoad,
  });

  useEffect(() => {
    if (seriesData?.study?.series) {
      const fetchedSeries = seriesData.study.series;
      setSeriesList(fetchedSeries);
      if (!selectedSeriesKey && fetchedSeries.length > 0) {
        setSelectedSeriesKey(fetchedSeries[0].seriesKey);
      }
    }
  }, [seriesData]);

  useEffect(() => {
    // API 주소는 여기서도 필요합니다.
    const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080') + '/api';

    const fetchAllThumbnails = async () => {
      // Promise.all을 사용하여 모든 썸네일 요청을 병렬로 처리합니다.
      const enrichedSeries = await Promise.all(
        seriesList.map(async (series) => {
          // 시리즈에 이미지가 없으면 썸네일 URL 없이 바로 반환
          if (series.imagecnt === 0) {
            return { ...series, thumbnailUrl: null };
          }
          try {
            // 1. 각 시리즈의 첫 번째 이미지 경로 가져오기
            const listUrl = `${API_BASE_URL}/v1/studies/keys/${studyIdToLoad}/${series.seriesKey}`;
            const listResponse = await fetch(listUrl, { headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` } });
            const result = await listResponse.json();
            if (!result.data || result.data.length === 0) {
              return { ...series, thumbnailUrl: null };
            }
            const firstImageEncodedPath = result.data[0];

            // 2. 경로로 실제 이미지 파일(Blob) 가져오기
            const imageUrl = `${API_BASE_URL}/images/encoded-view?encodedPath=${firstImageEncodedPath}`;
            const imageResponse = await fetch(imageUrl, { headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` } });
            const imageBlob = await imageResponse.blob();

            // 3. Blob을 URL로 변환
            const thumbnailUrl = URL.createObjectURL(imageBlob);

            // 4. 기존 시리즈 정보에 thumbnailUrl을 추가하여 반환
            return { ...series, thumbnailUrl };
          } catch (error) {
            console.error(`썸네일 로딩 실패 (SeriesKey: ${series.seriesKey}):`, error);
            return { ...series, thumbnailUrl: null }; // 실패 시 URL은 null
          }
        })
      );
      setSeriesWithThumbnails(enrichedSeries);
    };

    if (seriesList.length > 0 && studyIdToLoad) {
      fetchAllThumbnails();
    }

    // 컴포넌트 언마운트 시 생성된 모든 Blob URL 해제
    return () => {
      seriesWithThumbnails.forEach(s => {
        if (s.thumbnailUrl) {
          URL.revokeObjectURL(s.thumbnailUrl);
        }
      });
    };
  }, [seriesList, studyIdToLoad]); // seriesList가 확정된 후에만 실행

  if (loading) return <div className={styles.container}><p>로딩 중...</p></div>;
  if (error) return <div className={styles.container}><p>오류 발생: {error.message}</p></div>;
  if (!data?.patient) return <div className={styles.container}><p>환자 정보를 찾을 수 없습니다. (ID: {patientId})</p></div>;

  const { patient } = data;
  const currentStudy = studyIdToLoad
    ? patient.studies.find(study => study.studyKey === studyIdToLoad)
    : patient.studies[0];

  const handleToolClick = (toolName: string | null) => {
    if (!toolName) {
      setActiveTool(null);
      return;
    }
    setActiveTool(toolName);
  };

  //뒤로가기 버튼을 위한 핸들러 함수
  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}><span>Visi</span>Doc</div>

        <div className={styles.toolbar}>
          {/* <button className={styles.toolButton} onClick={() => handleToolClick(null)} title="work list (준비 중)"><FaFastBackward /></button>
           <button className={styles.toolButton} onClick={() => handleToolClick(null)} title="next (준비 중)"><FaPlay /></button>
           <button className={styles.toolButton} onClick={() => handleToolClick(null)} title="scroll (준비 중)"><FaFastForward /></button> */}
          <button
            className={`${styles.toolButton} ${activeTool === WindowLevelTool.toolName ? styles.activeTool : ''}`}
            onClick={() => handleToolClick(WindowLevelTool.toolName)}
            title="밝기/대조 (W/L)">
            <FaAdjust />
          </button>
          <button
            className={`${styles.toolButton} ${activeTool === PanTool.toolName ? styles.activeTool : ''}`}
            onClick={() => handleToolClick(PanTool.toolName)}
            title="이동 (Pan)">
            <FaArrowsAlt />
          </button>
          <button
            className={`${styles.toolButton} ${activeTool === ZoomTool.toolName ? styles.activeTool : ''}`}
            onClick={() => handleToolClick(ZoomTool.toolName)}
            title="확대/축소 (Zoom)">
            <FaSearchPlus />
          </button>
          <button
            className={`${styles.toolButton} ${activeTool === MagnifyTool.toolName ? styles.activeTool : ''}`}
            onClick={() => handleToolClick(MagnifyTool.toolName)}
            title="돋보기">
            <FaSearch />
          </button>
          <button
            className={`${styles.toolButton} ${activeTool === LengthTool.toolName ? styles.activeTool : ''}`}
            onClick={() => handleToolClick(LengthTool.toolName)}
            title="길이 측정">
            <FaRulerHorizontal />
          </button>
          <button
            className={`${styles.toolButton} ${activeTool === BidirectionalTool.toolName ? styles.activeTool : ''}`}
            onClick={() => handleToolClick(BidirectionalTool.toolName)}
            title="양방향 측정">
            <FaArrowsAltH />
          </button>
          <button
            className={`${styles.toolButton} ${activeTool === AngleTool.toolName ? styles.activeTool : ''}`}
            onClick={() => handleToolClick(AngleTool.toolName)}
            title="각도 측정">
            <FaAngleLeft />
          </button>
          <button
            className={`${styles.toolButton} ${activeTool === RectangleROITool.toolName ? styles.activeTool : ''}`}
            onClick={() => handleToolClick(RectangleROITool.toolName)}
            title="사각형 ROI 그리기">
            <FaSquare />
          </button>
          <button
            className={`${styles.toolButton} ${activeTool === CircleROITool.toolName ? styles.activeTool : ''}`}
            onClick={() => handleToolClick(CircleROITool.toolName)}
            title="원형 ROI 그리기">
            <FaCircle />
          </button>
          <button
            className={`${styles.toolButton} ${activeTool === ArrowAnnotateTool.toolName ? styles.activeTool : ''}`}
            onClick={() => handleToolClick(ArrowAnnotateTool.toolName)}
            title="주석 추가">
            <FaCommentAlt />
          </button>
          <button
            className={`${styles.toolButton} ${activeTool === null ? styles.activeTool : ''}`}
            onClick={() => handleToolClick(null)}
            title="초기화">
            <FaUndo />
          </button>
        </div>

        <div className={styles.actions}></div>
        <div className={styles.headerLeft}>
          <button className={styles.backButton} onClick={handleGoBack} title="뒤로가기">
            <FaArrowLeft />
          </button>
        </div>
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
                  <span className={styles.infoValue}>{currentStudy.studydate} {currentStudy.studytime}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>검사 장비</span>
                  <span className={styles.infoValue}>{currentStudy.modality || 'N/A'}</span>
                </div>
              </>
            )}
          </div>

          <div className={styles.seriesThumbnails}>
            {/* seriesList 대신 seriesWithThumbnails를 사용합니다. */}
            {seriesWithThumbnails.map((series) => (
              <SeriesThumbnailItem
                key={series.seriesKey}
                series={series}
                // studyKey는 이제 필요 없습니다.
                isActive={selectedSeriesKey === series.seriesKey}
                onClick={() => setSelectedSeriesKey(series.seriesKey)}
                // 새로 가져온 썸네일 URL을 prop으로 전달합니다.
                thumbnailUrl={series.thumbnailUrl}
              />
            ))}
          </div>
        </aside>

        <div className={styles.viewerContainer}>
          <DicomViewer
            studyKey={studyIdToLoad}
            activeTool={activeTool}
            selectedSeriesKey={selectedSeriesKey}
          />
        </div>
      </main>
    </div>
  );
}