'use client';

import React, { useEffect, useRef } from 'react';
import { Enums, init as coreInit, RenderingEngine, StackViewport, getRenderingEngine } from '@cornerstonejs/core';
import * as cornerstone from '@cornerstonejs/core';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import { init as dicomImageLoaderInit } from '@cornerstonejs/dicom-image-loader';
import dicomParser from 'dicom-parser';
import { init as csToolsInit } from '@cornerstonejs/tools';
import styles from './DicomViewer.module.css'; 

// --- API 설정 (환경에 맞게 수정) ---
const API_BASE_URL = 'http://localhost:8080/api';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImF1dGgiOiJST0xFX0FETUlOIiwiZXhwIjoxNzU2MTA3NDU0fQ.Cy48bT_uo8bDvdH_bn1KFl8mgEAk9Qxa2osSf9w49iA';

// 예시 encodedPath
const ENCODED_PATH_EXAMPLE = 'MjAyNTA4XDEyXE1TMDAwM1xDUlwxXC9DUi4xLjIuMzkyLjIwMDAzNi45MTA3LjUwMC4zMDQuODE3LjIwMjAwMzMwLjk1ODM1LjEwODE3LmRjbQ%3D%3D';

interface DicomViewerProps {
  patientId: string;
}

export default function DicomViewer({ patientId }: DicomViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderingEngineId = 'dicom-viewer-engine-' + patientId;
    const viewportId = 'CT_AXIAL_VIEWPORT-' + patientId;
    let renderingEngine: RenderingEngine | undefined;

    const initViewer = async () => {
      if (!viewerRef.current) return;

      try {
        await coreInit();
        await dicomImageLoaderInit();
        await csToolsInit();

        cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
        cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
        
        cornerstoneWADOImageLoader.configure({
          beforeSend: (xhr: XMLHttpRequest) => {
            xhr.setRequestHeader('Authorization', AUTH_TOKEN);
          },
        });

        cornerstoneWADOImageLoader.webWorkerManager.initialize({
          maxWebWorkers: navigator.hardwareConcurrency || 1,
          startWebWorkersOnDemand: true,
          // 중요: webWorkerPath는 public 폴더를 기준으로 해야 할 수 있습니다. Next.js 환경에 맞게 조정이 필요할 수 있습니다.
          webWorkerPath: '/cornerstoneWADOImageLoaderWebWorker.bundle.min.js',
          taskConfiguration: {
            decodeTask: {
              initializeCodecsOnStartup: false,
            },
          },
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
        
        const viewport = renderingEngine.getViewport(viewportId) as StackViewport;
        
        const imageId = `wadors:${API_BASE_URL}/images/encoded-view?encodedPath=${ENCODED_PATH_EXAMPLE}`;

        await viewport.setStack([imageId]);
        renderingEngine.render();
        console.log("API를 통해 DICOM 파일 렌더링 성공!");

      } catch (error) {
        console.error('DICOM 뷰어 초기화 또는 파일 로딩 중 오류 발생:', error);
      }
    };

    initViewer();

    return () => {
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