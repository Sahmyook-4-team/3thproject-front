// @ts-nocheck
// 파일: DicomViewer.tsx

import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_STUDY_DETAILS } from '../graphql/queries';
import CornerstoneViewer from './CornerstoneViewer';
import styles from './DicomViewer.module.css';
// dicom-parser를 import합니다. (기존 단일 컴포넌트 코드처럼)
import * as dicomParser from 'dicom-parser';

const API_BASE_URL = 'http://localhost:8080/api';

export default function DicomViewer({ studyKey }: StudyViewerProps) {
  const [seriesList, setSeriesList] = useState([]);
  const [selectedSeriesKey, setSelectedSeriesKey] = useState(null);
  const [imageIds, setImageIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // ... (GraphQL 쿼리 및 useEffect는 동일)
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
        // 1. 이미지 경로 목록 가져오기
        const listUrl = `${API_BASE_URL}/v1/studies/keys/${studyKey}/${selectedSeriesKey}`;
        const listResponse = await fetch(listUrl, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        });
        if (!listResponse.ok) throw new Error('이미지 목록 fetch 실패');
        const result = await listResponse.json();
        if (!result.data || result.data.length === 0) return;

        // 2. 각 경로에 대해 실제 이미지 파일(ArrayBuffer)을 fetch
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

        // --- [핵심 디버깅 코드] ---
        // 첫 번째 ArrayBuffer가 유효한 DICOM인지 검사합니다.
        if (arrayBuffers.length > 0) {
            console.log('--- 데이터 검증 시작 ---');
            try {
                const byteArray = new Uint8Array(arrayBuffers[0]);
                // 이 라인에서 오류가 발생하면, 서버 데이터가 DICOM이 아닙니다.
                const dataSet = dicomParser.parseDicom(byteArray);
                console.log('✅ 데이터 검증 성공! Modality:', dataSet.string('x00080060'));
            } catch (err) {
                console.error('❌ 데이터 검증 실패! 서버가 유효한 DICOM 파일을 보내지 않았습니다.', err);
                // 서버가 보낸 내용을 텍스트로 확인해봅니다.
                const textDecoder = new TextDecoder('utf-8');
                const errorText = textDecoder.decode(arrayBuffers[0]);
                console.error('서버 응답 내용:', errorText);
                // 여기서 함수를 중단시켜 더 이상 진행하지 않도록 할 수 있습니다.
                setIsLoading(false);
                return; 
            }
            console.log('--- 데이터 검증 끝 ---');
        }
        // --- [디버깅 코드 끝] ---

        // 3. 받아온 ArrayBuffer들로 blob URL을 생성
        const newImageIds = arrayBuffers.map(buffer => {
          const blob = new Blob([buffer], { type: 'application/dicom' });
          const url = URL.createObjectURL(blob);
          return `dicomweb:${url}`;
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

  if (gqlLoading) return <p>시리즈 목록 로딩 중...</p>;
  if (gqlError) return <p>오류: {gqlError.message}</p>;

  return (
    <div className={styles.studyContainer}>
      <div className={styles.seriesSidebar}>
        {/* ... (사이드바 UI) */}
      </div>
      <div className={styles.viewerContainer}>
        {isLoading && <div className={styles.loadingOverlay}>이미지 로딩 중...</div>}
        <CornerstoneViewer imageIds={imageIds} />
      </div>
    </div>
  );
}