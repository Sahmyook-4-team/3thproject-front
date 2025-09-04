// @ts-nocheck
// 파일 경로: app/viewer/[patientid]/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { GET_PATIENT_WITH_STUDIES, GET_STUDY_DETAILS } from '@/graphql/queries';
import styles from './page.module.css';

import * as csTools3d from '@cornerstonejs/tools';
import { FaAdjust, FaArrowsAlt, FaSearchPlus, FaRulerHorizontal, FaUndo, FaAngleLeft, FaFastBackward, FaPlay, FaFastForward } from 'react-icons/fa';
const { PanTool, ZoomTool, WindowLevelTool } = csTools3d;

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

  if (loading) return <div className={styles.container}><p>로딩 중...</p></div>;
  if (error) return <div className={styles.container}><p>오류 발생: {error.message}</p></div>;
  if (!data?.patient) return <div className={styles.container}><p>환자 정보를 찾을 수 없습니다. (ID: {patientId})</p></div>;

  const { patient } = data;
  const currentStudy = studyIdToLoad 
    ? patient.studies.find(study => study.studyKey === studyIdToLoad)
    : patient.studies[0];

  const handleToolClick = (toolName: string | null) => {
    if (toolName) {
      setActiveTool(toolName);
    } else {
      alert('이 기능은 현재 준비 중입니다.');
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}><span>Visi</span>Doc</div>
        
        <div className={styles.toolbar}>
           <button className={styles.toolButton} onClick={() => handleToolClick(null)} title="work list (준비 중)"><FaFastBackward /></button>
           <button className={styles.toolButton} onClick={() => handleToolClick(null)} title="next (준비 중)"><FaPlay /></button>
           <button className={styles.toolButton} onClick={() => handleToolClick(null)} title="scroll (준비 중)"><FaFastForward /></button>
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
           <button className={styles.toolButton} onClick={() => handleToolClick(null)} title="길이 측정 (준비 중)"><FaRulerHorizontal /></button>
           <button className={styles.toolButton} onClick={() => handleToolClick(null)} title="각도 측정 (준비 중)"><FaAngleLeft /></button>
           <button className={styles.toolButton} onClick={() => handleToolClick(null)} title="초기화 (준비 중)"><FaUndo /></button>
        </div>
        
        <div className={styles.actions}></div>
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
            {seriesList.map((series) => (
              <button
                key={series.seriesKey}
                className={`${styles.thumbnailItem} ${selectedSeriesKey === series.seriesKey ? styles.activeThumbnail : ''}`}
                onClick={() => setSelectedSeriesKey(series.seriesKey)}
              >
                <div className={styles.thumbnailImage}>
                  <span>{series.modality}</span>
                </div>
                <div className={styles.thumbnailDesc}>
                  {series.seriesnum}. {series.seriesdesc || 'No Description'} ({series.imagecnt}장)
                </div>
              </button>
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