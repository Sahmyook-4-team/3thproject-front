// src/app/viewer/[patientId]/page.tsx (문법 오류 수정 최종 버전)
'use client'; 

import React, { useEffect, useRef } from 'react';
import * as cornerstone from '@cornerstonejs/core';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';
import styles from './viewer.module.css';

const EXAMPLE_DICOM_IMAGE_ID = 'wadouri:/CR.1.2.410.200083.1175458114504992085651348633473017254452396828623.dcm';

export default function ViewerPage({ params }: { params: { patientId: string } }) {
  const viewerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    let isLoaderInitialized = false;
    const renderingEngineId = 'dicom-viewer-engine-' + params.patientId;
    const viewportId = 'CT_AXIAL_VIEWPORT-' + params.patientId;
    let renderingEngine: cornerstone.RenderingEngine;

    const initializeLoader = () => {
      if (isLoaderInitialized) return;
      try {
        cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
        cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
        cornerstoneWADOImageLoader.webWorkerManager.initialize({
          maxWebWorkers: navigator.hardwareConcurrency || 1,
          startWebWorkersOnDemand: true,
          webWorkerPath: '/_next/static/chunks/cornerstoneWADOImageLoaderWebWorker.bundle.min.js',
          taskConfiguration: {
            decodeTask: {
              initializeCodecsOnStartup: false,
            },
          },
        });
        isLoaderInitialized = true;
        console.log("WADO Loader 및 웹 워커 초기화 성공!");
      } catch(e) {
        console.error("WADO Loader 초기화 중 오류 발생:", e);
      }
    };

    const initViewer = async () => {
      if (!viewerRef.current) return;

      await cornerstone.init();
      initializeLoader();
      
      renderingEngine = new cornerstone.RenderingEngine(renderingEngineId);

      const viewportInput = {
        viewportId: viewportId,
        element: viewerRef.current,
        type: cornerstone.Enums.ViewportType.STACK,
      };
      renderingEngine.enableElement(viewportInput);
      
      const viewport = renderingEngine.getViewport(viewportId) as cornerstone.StackViewport;

      try {
        await viewport.setStack([EXAMPLE_DICOM_IMAGE_ID]);
        renderingEngine.render();
        console.log("로컬 DICOM 파일 렌더링 성공!");
      } catch (error) {
        console.error('로컬 DICOM 파일 로딩 오류:', error);
      }
    };

    initViewer();

    return () => {
      try {
        if (renderingEngine) {
          renderingEngine.destroy();
        }
      } catch (e) { /* 오류 방지 */ }
    };
  }, [params.patientId]);
  
  // ✅ 여기가 문제였습니다! 주석을 실제 코드로 되돌렸습니다.
  const patientInfo = {
    'S001': { name: '홍길동', dob: '1980-01-01', studyDate: '2025-08-19 10:30' },
    'S002': { name: '이순신', dob: '1975-04-28', studyDate: '2025-08-18 14:00' },
    'S003': { name: '홍길동', dob: '1980-01-01', studyDate: '2024-05-10 12:00' },
  };
  const currentPatient = patientInfo[params.patientId as keyof typeof patientInfo] || { name: '알 수 없음', dob: 'N/A', studyDate: 'N/A' };


  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>PACS<span>PLUS</span></div>
        <div className={styles.actions}>(아이콘 툴바 영역)</div>
      </header>
      <main className={styles.mainContent}>
        <aside className={styles.sidebar}>
          <div className={styles.infoBlock}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>환자 ID</span>
              <span className={styles.infoValue}>{params.patientId}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>환자 이름</span>
              <span className={styles.infoValue}>{currentPatient.name}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>생년월일</span>
              <span className={styles.infoValue}>{currentPatient.dob}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>검사 일시</span>
              <span className={styles.infoValue}>{currentPatient.studyDate}</span>
            </div>
          </div>
        </aside>
        <div className={styles.viewerContainer}>
          <div ref={viewerRef} className={styles.viewer} />
        </div>
      </main>
    </div>
  );
}