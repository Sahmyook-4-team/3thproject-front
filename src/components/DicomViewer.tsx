// @ts-nocheck
// 파일 경로: src/components/DicomViewer.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import CornerstoneViewer from './CornerstoneViewer';
import styles from './DicomViewer.module.css';

// Cornerstone Tools는 CornerstoneViewer에서 사용하므로 여기선 참조만 합니다.
import * as csTools3d from '@cornerstonejs/tools';
const { PanTool, ZoomTool, WindowLevelTool } = csTools3d;

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080') + '/api';
const TOOL_GROUP_ID = 'CT_TOOLGROUP';

// Props로 studyKey, activeTool, selectedSeriesKey를 받습니다.
export default function DicomViewer({ studyKey, activeTool, selectedSeriesKey }) {
  const [imageIds, setImageIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // 🚨🚨🚨 activeTool 상태를 여기서 만들던 useState를 완전히 삭제했습니다. 🚨🚨🚨
  const [startImageIndex, setStartImageIndex] = useState(0);
  const cornerstoneViewerRef = useRef(null);
  const viewerRef = useRef(null);

  // 부모로부터 받은 selectedSeriesKey가 변경될 때마다 해당 시리즈의 이미지들을 로드합니다.
  useEffect(() => {
    if (!selectedSeriesKey || !studyKey) return;

    const fetchAndLoadImages = async () => {
      setIsLoading(true);
      imageIds.forEach(id => {
        const url = id.split(':')[1];
        if (url) URL.revokeObjectURL(url);
      });
      setImageIds([]);
      setStartImageIndex(0);

      try {
        const listUrl = `${API_BASE_URL}/v1/studies/keys/${studyKey}/${selectedSeriesKey}`;
        const listResponse = await fetch(listUrl, { headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` } });
        if (!listResponse.ok) throw new Error('이미지 목록 fetch 실패');
        
        const result = await listResponse.json();
        if (!result.data || result.data.length === 0) {
            setImageIds([]);
            return;
        };
        
        const imagePromises = result.data.map(encodedPath => {
          const imageUrl = `${API_BASE_URL}/images/encoded-view?encodedPath=${encodedPath}`;
          return fetch(imageUrl, { headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` } })
            .then(res => {
              if (!res.ok) throw new Error(`이미지 파일 fetch 실패: ${encodedPath}`);
              return res.arrayBuffer();
            });
        });
        
        const arrayBuffers = await Promise.all(imagePromises);
        
        const newImageIds = arrayBuffers.map(buffer => {
          const blob = new Blob([buffer], { type: 'application/dicom' });
          const url = URL.createObjectURL(blob);
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


  const handleNextImage = useCallback(() => {
    if (imageIds.length > 0) {
      setStartImageIndex((prevIndex) => (prevIndex + 1) % imageIds.length);
    }
  }, [imageIds.length]);

  const handlePreviousImage = useCallback(() => {
    if (imageIds.length > 0) {
      setStartImageIndex((prevIndex) => (prevIndex - 1 + imageIds.length) % imageIds.length);
    }
  }, [imageIds.length]);


  useEffect(() => {
    const viewerElement = viewerRef.current;
    const handleWheel = (event) => {
      event.preventDefault();
      if (event.deltaY > 0) {
        handleNextImage();
      } else {
        handlePreviousImage();
      }
    };
    if (viewerElement) {
      viewerElement.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (viewerElement) {
        viewerElement.removeEventListener('wheel', handleWheel);
      }
    };
  }, [handleNextImage, handlePreviousImage]);


  return (
    // DicomViewer는 이제 studyContainer와 viewerContainer만 가집니다.
    <div className={styles.studyContainer}>
      <div ref={viewerRef} className={styles.viewerContainer}>
        {/* 🚨🚨🚨 ViewerPage로 책임이 넘어간 내부 툴바 UI를 완전히 삭제했습니다. 🚨🚨🚨 */}

        {isLoading && <div className={styles.loadingOverlay}>이미지 로딩 중...</div>}
        <CornerstoneViewer
          ref={cornerstoneViewerRef}
          imageIds={imageIds}
          toolGroupId={TOOL_GROUP_ID}
          activeTool={activeTool} // 부모로부터 받은 activeTool을 그대로 전달
          startImageIndex={startImageIndex}
          onNextImage={handleNextImage}
          onPreviousImage={handlePreviousImage}
        />
      </div>
    </div>
  );
}