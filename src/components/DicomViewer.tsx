// @ts-nocheck
// 파일: src/components/DicomViewer.tsx

import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_STUDY_DETAILS } from '../graphql/queries'; // GraphQL 쿼리 경로
import CornerstoneViewer from './CornerstoneViewer';
import styles from './DicomViewer.module.css'; // 아래에 제공된 CSS 파일

// Cornerstone Tools에서 필요한 기능들을 가져옵니다.
import { ToolGroupManager, Enums as csToolsEnums } from '@cornerstonejs/tools';
import * as csTools3d from '@cornerstonejs/tools';

const { PanTool, ZoomTool, WindowLevelTool } = csTools3d;

const API_BASE_URL = 'http://localhost:8080/api';
const TOOL_GROUP_ID = 'CT_TOOLGROUP'; // 툴 그룹 ID를 상수로 관리

export default function DicomViewer({ studyKey }) {
  const [seriesList, setSeriesList] = useState([]);
  const [selectedSeriesKey, setSelectedSeriesKey] = useState(null);
  const [imageIds, setImageIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 현재 활성화된 도구를 추적하는 상태. 기본값은 WindowLevel
  const [activeTool, setActiveTool] = useState(WindowLevelTool.toolName);

  const { loading: gqlLoading, error: gqlError, data } = useQuery(GET_STUDY_DETAILS, {
    variables: { studyKey },
    skip: !studyKey,
  });

  useEffect(() => {
    if (data?.study?.series) {
      setSeriesList(data.study.series);
      if (data.study.series.length > 0) {
        setSelectedSeriesKey(data.study.series[0].seriesKey);
      }
    }
  }, [data]);

  useEffect(() => {
    if (!selectedSeriesKey) return;

    const fetchAndLoadImages = async () => {
      setIsLoading(true);
      setImageIds([]);

      try {
        const listUrl = `${API_BASE_URL}/v1/studies/keys/${studyKey}/${selectedSeriesKey}`;
        const listResponse = await fetch(listUrl, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        });
        if (!listResponse.ok) throw new Error('이미지 목록 fetch 실패');
        const result = await listResponse.json();
        if (!result.data || result.data.length === 0) return;

        const imagePromises = result.data.map(encodedPath => {
          const imageUrl = `${API_BASE_URL}/images/encoded-view?encodedPath=${encodedPath}`;
          return fetch(imageUrl, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
          }).then(res => {
            if (!res.ok) throw new Error(`이미지 파일 fetch 실패: ${encodedPath}`);
            return res.arrayBuffer();
          });
        });

        const arrayBuffers = await Promise.all(imagePromises);

        const newImageIds = arrayBuffers.map(buffer => {
          const blob = new Blob([buffer], { type: 'application/dicom' });
          const url = URL.createObjectURL(blob);
          // 오류 없는 이미지 로드를 위해 'wadouri:' 접두사를 사용합니다.
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

  // activeTool 상태가 변경될 때마다 Cornerstone의 활성 도구를 변경합니다.
  useEffect(() => {
    const toolGroup = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
    if (!toolGroup) return;

    // 모든 도구를 일단 수동(passive) 모드로 설정
    toolGroup.setToolPassive(WindowLevelTool.toolName);
    toolGroup.setToolPassive(PanTool.toolName);
    toolGroup.setToolPassive(ZoomTool.toolName);
    
    // 현재 선택된 도구만 마우스 왼쪽 버튼에 대해 활성화
    toolGroup.setToolActive(activeTool, {
      bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
    });
    
  }, [activeTool]);

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
        
        {/* 도구 선택을 위한 툴바 UI */}
        <div className={styles.toolbar}>
          <h3>도구</h3>
          <button 
            className={activeTool === WindowLevelTool.toolName ? styles.activeTool : ''}
            onClick={() => setActiveTool(WindowLevelTool.toolName)}
          >
            밝기/대조
          </button>
          <button 
            className={activeTool === PanTool.toolName ? styles.activeTool : ''}
            onClick={() => setActiveTool(PanTool.toolName)}
          >
            이동
          </button>
          <button 
            className={activeTool === ZoomTool.toolName ? styles.activeTool : ''}
            onClick={() => setActiveTool(ZoomTool.toolName)}
          >
            확대/축소
          </button>
        </div>
      </div>

      <div className={styles.viewerContainer}>
        {isLoading && <div className={styles.loadingOverlay}>이미지 로딩 중...</div>}
        <CornerstoneViewer imageIds={imageIds} toolGroupId={TOOL_GROUP_ID} />
      </div>
    </div>
  );
}