// @ts-nocheck
// 파일 경로: src/components/DicomViewer.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@apollo/client';
import { GET_STUDY_DETAILS } from '../graphql/queries'; // 사용자의 GraphQL 쿼리 파일 경로
import CornerstoneViewer from './CornerstoneViewer';
import styles from './DicomViewer.module.css'; // 아래에 제공될 CSS 파일 경로

// Cornerstone Tools에서 필요한 기능들을 가져옵니다.
import * as csTools3d from '@cornerstonejs/tools';
const { PanTool, ZoomTool, WindowLevelTool } = csTools3d;

const API_BASE_URL = 'http://localhost:8080/api';
// 자식과 공유할 툴 그룹 ID를 상수로 정의합니다.
const TOOL_GROUP_ID = 'CT_TOOLGROUP';

export default function DicomViewer({ studyKey }) {
  // --- 상태 관리 ---
  const [seriesList, setSeriesList] = useState([]);
  const [selectedSeriesKey, setSelectedSeriesKey] = useState(null);
  const [imageIds, setImageIds] = useState([]); // 최종적으로 Cornerstone에 전달될 이미지 주소 배열
  const [isLoading, setIsLoading] = useState(false);
  const [activeTool, setActiveTool] = useState(WindowLevelTool.toolName); // 툴바에서 선택된 도구
  const [startImageIndex, setStartImageIndex] = useState(0); // 이미지 인덱스
  // 자식 컴포넌트(CornerstoneViewer)의 함수를 호출하기 위한 "리모컨" 역할을 하는 ref
  const cornerstoneViewerRef = useRef(null);

  // --- 데이터 로딩 ---
  // GraphQL로 스터디의 시리즈 정보 가져오기
  const { loading: gqlLoading, error: gqlError, data } = useQuery(GET_STUDY_DETAILS, {
    variables: { studyKey },
    skip: !studyKey,
  });

  // GraphQL 데이터가 오면 시리즈 목록 상태 업데이트
  useEffect(() => {
    if (data?.study?.series) {
      setSeriesList(data.study.series);
      // 첫 번째 시리즈를 자동으로 선택
      if (data.study.series.length > 0) {
        setSelectedSeriesKey(data.study.series[0].seriesKey);
      }
    }
  }, [data]);

  // 사용자가 시리즈를 선택하면 해당 시리즈의 모든 이미지 파일을 다운로드
  useEffect(() => {
    if (!selectedSeriesKey) return;

    const fetchAndLoadImages = async () => {
      setIsLoading(true);
      // 기존에 생성된 URL 객체들을 메모리에서 해제하여 메모리 누수를 방지합니다.
      imageIds.forEach(id => {
        const url = id.split(':')[1]; // 'dicomweb:' 다음의 blob URL 추출
        if (url) URL.revokeObjectURL(url);
      });
      setImageIds([]);

      try {
        // 1. 백엔드에서 이미지 경로 목록을 가져옵니다.
        const listUrl = `${API_BASE_URL}/v1/studies/keys/${studyKey}/${selectedSeriesKey}`;
        const listResponse = await fetch(listUrl, { headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` } });
        if (!listResponse.ok) throw new Error('이미지 목록 fetch 실패');
        const result = await listResponse.json();
        if (!result.data || result.data.length === 0) return;
        
        // 2. 각 경로에 대해 실제 이미지 파일(ArrayBuffer)을 병렬로 다운로드합니다.
        const imagePromises = result.data.map(encodedPath => {
          const imageUrl = `${API_BASE_URL}/images/encoded-view?encodedPath=${encodedPath}`;
          return fetch(imageUrl, { headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` } })
            .then(res => {
              if (!res.ok) throw new Error(`이미지 파일 fetch 실패: ${encodedPath}`);
              return res.arrayBuffer();
            });
        });
        
        const arrayBuffers = await Promise.all(imagePromises);
        
        // 3. 다운로드된 바이너리 데이터로 Cornerstone이 이해할 수 있는 'blob' URL을 생성합니다.
        const newImageIds = arrayBuffers.map(buffer => {
          const blob = new Blob([buffer], { type: 'application/dicom' });
          const url = URL.createObjectURL(blob);
          // 'dicomweb:' 접두사는 이미지가 보였던, 안정적인 방식입니다.
          return `wadouri:${url}`;
        });
        setImageIds(newImageIds);
      } catch (e) {
        console.error("이미지 로딩 중 오류 발생:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndLoadImages();
  }, [selectedSeriesKey, studyKey]);


  const handleNextImage = () => {
    if (imageIds.length > 0) {
      setStartImageIndex((prevIndex) => (prevIndex + 1) % imageIds.length);
    }
  };
  const handlePreviousImage = () => {
    if (imageIds.length > 0) {
      setStartImageIndex((prevIndex) => (prevIndex - 1 + imageIds.length) % imageIds.length);
    }
  };


  // --- UI 렌더링 ---
  return (
    <div className={styles.studyContainer}>
      <div className={styles.seriesSidebar}>
        <h3>시리즈 목록</h3>
        <ul>
          {seriesList.map((series) => (
            <li key={series.seriesKey}>
              <button
                className={selectedSeriesKey === series.seriesKey ? styles.active : ''}
                onClick={() => setSelectedSeriesKey(series.seriesKey)}
              >
                ({series.modality}) {series.seriesnum}. {series.seriesdesc} ({series.imagecnt}장)
              </button>
            </li>
          ))}
        </ul>

        <div className={styles.toolbar}>
          <h3>도구</h3>
          <button className={activeTool === WindowLevelTool.toolName ? styles.activeTool : ''} onClick={() => setActiveTool(WindowLevelTool.toolName)}>밝기/대조</button>
          <button className={activeTool === PanTool.toolName ? styles.activeTool : ''} onClick={() => setActiveTool(PanTool.toolName)}>이동</button>
          <button className={activeTool === ZoomTool.toolName ? styles.activeTool : ''} onClick={() => setActiveTool(ZoomTool.toolName)}>확대/축소</button>
        </div>

        {/* 새로 추가된 이미지 탐색 툴바 */}
        <div className={styles.toolbar}>
          <h3>탐색</h3>
          <button onClick={handlePreviousImage}>이전 이미지</button>
          <button onClick={handleNextImage}>다음 이미지</button>
        </div>
      </div>

      <div className={styles.viewerContainer}>
        {isLoading && <div className={styles.loadingOverlay}>이미지 로딩 중...</div>}
        {/* 자식 컴포넌트에 ref와 필요한 props들을 전달합니다. */}
        <CornerstoneViewer
          ref={cornerstoneViewerRef}
          imageIds={imageIds}
          toolGroupId={TOOL_GROUP_ID}
          activeTool={activeTool}
          startImageIndex={startImageIndex}
          onNextImage={handleNextImage}
          onPreviousImage={handlePreviousImage}
        />
      </div>
    </div>
  );
}