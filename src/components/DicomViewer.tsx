'use client';

import React, { useEffect, useRef } from 'react';
import {
  Enums,
  init as coreInit,
  RenderingEngine,
  StackViewport,
  getRenderingEngine,
  eventTarget, // 이벤트 타겟 추가
} from '@cornerstonejs/core';
import {
  init as dicomImageLoaderInit
} from '@cornerstonejs/dicom-image-loader';

import dicomParser from 'dicom-parser';
import { init as csToolsInit } from '@cornerstonejs/tools';
import styles from './DicomViewer.module.css';

const API_BASE_URL = 'http://localhost:8080/api';
const ENCODED_PATH_EXAMPLE = 'MjAyNTA4XDEyXE1TMDAwM1xDUlwxXC9DUi4xLjIuMzkyLjIwMDAzNi45MTA3LjUwMC4zMDQuODE3LjIwMjAwMzMwLjk1ODM1LjEwODE3LmRjbQ%3D%3D';

interface DicomViewerProps {
  patientId: string;
  studyId?: string;
}

export default function DicomViewer({ patientId, studyId }: DicomViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderingEngineId = 'dicom-viewer-engine-' + patientId;
    const viewportId = 'CT_AXIAL_VIEWPORT-' + patientId;
    let renderingEngine: RenderingEngine | undefined;

    // --- [디버깅 추가] 이미지 로드 이벤트 리스너 ---
    const handleImageLoaded = (e: any) => {
      console.log('Cornerstone Image Loaded:', e.detail);
    };
    const handleImageLoadFailed = (e: any) => {
      console.error('Cornerstone Image Load Failed:', e.detail);
    };

    const initViewer = async () => {
      if (!viewerRef.current) return;
      if (!viewerRef.current.clientWidth || !viewerRef.current.clientHeight) {
        console.warn('뷰어 div의 크기가 0입니다. CSS에서 width와 height를 설정했는지 확인하세요.');
        return;
      }

      try {
        // DICOM 파일 검증
        try {
          // TODO: Replace with actual API call using patientId and studyId
          const imagePath = ENCODED_PATH_EXAMPLE;
          const imageUrl = `${API_BASE_URL}/images/encoded-view?encodedPath=${imagePath}`;
          const response = await fetch(imageUrl, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
          });

          if (!response.ok) {
            // 서버가 4xx, 5xx 에러를 보낸 경우
            const errorBody = await response.text(); // 에러 메시지를 확인하기 위해 text로 읽음
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
          }

          // --- [수정 제안] Content-Type 헤더 확인 ---
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/dicom')) {
            console.warn('응답이 DICOM 파일이 아닐 수 있습니다. Content-Type:', contentType);
            // 만약 JSON 에러가 오는 경우를 대비해 추가적인 분기 처리를 할 수 있습니다.
          }

          const arrayBuffer = await response.arrayBuffer();
          // --- [수정 제안] Array Buffer 확인 ---
          if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            throw new Error('ArrayBuffer가 비어있거나 null입니다.');
          }

          const byteArray = new Uint8Array(arrayBuffer);
          const dataSet = dicomParser.parseDicom(byteArray);

          console.log('DICOM 파일 검증 성공:', {
            sopClassUid: dataSet.string('x00080016'),
            modality: dataSet.string('x00080060'),
            rows: dataSet.uint16('x00280010'),
            columns: dataSet.uint16('x00280011')
          });
        } catch (parseError) {
          console.error('DICOM 파일 검증 실패:', parseError);
          return; // 검증 실패 시 뷰어 초기화 중단
        }

        await coreInit();
        await csToolsInit();

        await dicomImageLoaderInit({
          beforeSend: (xhr: XMLHttpRequest, imageId: string) => {
            console.log('Intercepting request for imageId:', imageId);
            const token = localStorage.getItem('accessToken');
            if (token) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
          }
        });


        renderingEngine = getRenderingEngine(renderingEngineId);
        if (!renderingEngine) {
          renderingEngine = new RenderingEngine(renderingEngineId);
        }

        const viewportInput = {
          viewportId: viewportId,
          element: viewerRef.current,
          type: Enums.ViewportType.STACK,
        };
        renderingEngine.enableElement(viewportInput);

        // --- [수정 제안 1] 뷰포트 리사이즈 호출 ---
        renderingEngine.resize(true, true);

        const viewport = renderingEngine.getViewport(viewportId) as StackViewport;

        const imageId = `wadors:${API_BASE_URL}/images/encoded-view?encodedPath=${ENCODED_PATH_EXAMPLE}`;

        await viewport.setStack([imageId]);

        // --- [수정 제안 2] 수동으로 VOI 설정 ---
        // 이 값은 실제 DICOM 이미지에 맞게 조절해야 합니다.
        // 예를 들어, CT 이미지의 뼈를 보려면 { lower: 200, upper: 1000 } 등으로 설정합니다.
        const voi = { windowWidth: 400, windowCenter: 40 }; // 복부 CT의 일반적인 값
        const voiRange = { lower: voi.windowCenter - voi.windowWidth / 2, upper: voi.windowCenter + voi.windowWidth / 2 };
        viewport.setProperties({ voiRange });

        renderingEngine.render();
        console.log("API를 통해 DICOM 파일 렌더링 성공!");

      } catch (error) {
        console.error('DICOM 뷰어 초기화 또는 파일 로딩 중 오류 발생:', error);
      }
    };

    // 이벤트 리스너 등록
    eventTarget.addEventListener(Enums.Events.IMAGE_LOADED, handleImageLoaded);
    eventTarget.addEventListener(Enums.Events.IMAGE_LOAD_FAILED, handleImageLoadFailed);

    initViewer();

    return () => {
      // 이벤트 리스너 정리
      eventTarget.removeEventListener(Enums.Events.IMAGE_LOADED, handleImageLoaded);
      eventTarget.removeEventListener(Enums.Events.IMAGE_LOAD_FAILED, handleImageLoadFailed);

      try {
        if (renderingEngine) {
          renderingEngine.destroy();
        }
      } catch (e) {
        console.warn("렌더링 엔진 정리 중 오류:", e);
      }
    };

  }, [patientId]);

  return <div ref={viewerRef} className={styles.viewer} />;
}
