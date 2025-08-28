// @ts-nocheck

import React, { useEffect, useRef } from 'react';
import { Enums, init as coreInit, RenderingEngine } from '@cornerstonejs/core';
import { init as dicomImageLoaderInit } from '@cornerstonejs/dicom-image-loader';
import { init, Enums as toolsEnums, ToolGroupManager } from '@cornerstonejs/tools';
import * as csTools3d from '@cornerstonejs/tools';
import styles from './DicomViewer.module.css';
import * as dicomParser from 'dicom-parser'; 

const { PanTool, ZoomTool, StackScrollTool, WindowLevelTool } = csTools3d;

const API_BASE_URL = 'http://localhost:8080/api';
const ENCODED_PATH_EXAMPLE = "MjAyNTA4XDEyXE1TMDAwNFxDVFwzXC9DVC4xLjMuMTIuMi4xMTA3LjUuMS40LjY1MjY2LjMwMDAwMDE4MTIyNzIxNTk1ODIzOTAwMDI2MzY3LmRjbQ==";

// Cornerstone 초기화를 위한 별도의 함수
// 컴포넌트 외부에서 한 번만 실행되도록 설정할 수 있습니다.
const initCornerstone = async () => {
  await coreInit();
  await dicomImageLoaderInit();
  await init();
};

// Cornerstone 초기화 상태를 추적하기 위한 변수
let isCornerstoneInitialized = false;

interface DicomViewerProps {
  patientId: string;
  studyId?: string;
}

export default function DicomViewer({ patientId, studyId }: DicomViewerProps) {
  const elementRef = useRef(null);
  const renderingEngineRef = useRef(null);
  const toolGroupRef = useRef(null);

  // 컴포넌트가 마운트될 때 Cornerstone를 초기화합니다.
  useEffect(() => {
    const initialize = async () => {
      if (!isCornerstoneInitialized) {
        await initCornerstone();
        isCornerstoneInitialized = true;
      }

      // 사용할 툴 등록
      csTools3d.addTool(PanTool);
      csTools3d.addTool(ZoomTool);
      csTools3d.addTool(StackScrollTool);
      csTools3d.addTool(WindowLevelTool);

      // 렌더링 엔진과 툴 그룹이 없으면 생성합니다.
      if (!renderingEngineRef.current) {
        const renderingEngineId = 'myRenderingEngine';
        renderingEngineRef.current = new RenderingEngine(renderingEngineId);

        const toolGroupId = 'ctToolGroup';
        toolGroupRef.current = ToolGroupManager.createToolGroup(toolGroupId);

        // 툴 그룹에 툴 추가
        toolGroupRef.current.addTool(PanTool.toolName);
        toolGroupRef.current.addTool(ZoomTool.toolName);
        toolGroupRef.current.addTool(StackScrollTool.toolName);
        toolGroupRef.current.addTool(WindowLevelTool.toolName);

        // 툴 모드 설정
        toolGroupRef.current.setToolActive(WindowLevelTool.toolName, {
          bindings: [{ mouseButton: toolsEnums.MouseBindings.Primary }],
        });
        toolGroupRef.current.setToolActive(PanTool.toolName, {
          bindings: [{ mouseButton: toolsEnums.MouseBindings.Primary, modifierKey: toolsEnums.KeyboardBindings.Ctrl }],
        });
        toolGroupRef.current.setToolActive(ZoomTool.toolName, {
          bindings: [{ mouseButton: toolsEnums.MouseBindings.Secondary }],
        });
        toolGroupRef.current.setToolActive(StackScrollTool.toolName);
      }
    };

    initialize();
    // 컴포넌트가 언마운트될 때 리소스를 정리합니다.
    return () => {
      if (renderingEngineRef.current) {
        renderingEngineRef.current.destroy();
        renderingEngineRef.current = null;
      }
      if (toolGroupRef.current) {
        ToolGroupManager.destroyToolGroup(toolGroupRef.current.id);
        toolGroupRef.current = null;
      }
    };
  }, []);






  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result;
        render(arrayBuffer);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleApiFetchAndRender = async () => {
    try {
      // 1. API 요청 URL 생성
      // TODO: 실제 patientId와 studyId를 사용하여 동적으로 경로를 생성해야 합니다.
      const imagePath = ENCODED_PATH_EXAMPLE;
      const imageUrl = `${API_BASE_URL}/images/encoded-view?encodedPath=${imagePath}`;

      console.log(`Requesting DICOM file from: ${imageUrl}`);

      // 2. fetch API를 사용하여 서버에 DICOM 파일 요청
      const response = await fetch(imageUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      // 3. HTTP 응답 상태 확인
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
      }

      // 4. 응답 본문을 ArrayBuffer(바이너리 데이터) 형태로 변환
      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('서버에서 받은 ArrayBuffer가 비어있습니다.');
      }

      // 5. (선택적) 받은 데이터가 실제 DICOM 파일인지 파싱하여 검증
      const byteArray = new Uint8Array(arrayBuffer);
      const dataSet = dicomParser.parseDicom(byteArray);
      console.log('API 응답 DICOM 파일 검증 성공:', dataSet.string('x00080060')); // Modality 태그

      // 6. 가져온 데이터로 렌더링 함수 호출
      // 성공적으로 ArrayBuffer를 가져왔으면, 이 데이터를 뷰어에 렌더링하도록 render 함수에 전달합니다.
      render(arrayBuffer);

    } catch (error) {
      console.error('API에서 DICOM 파일을 가져오는 중 오류 발생:', error);
      alert('파일을 불러오는 데 실패했습니다. 콘솔을 확인해주세요.');
    }
  };





  const render = async (arrayBuffer) => {
    if (!elementRef.current || !renderingEngineRef.current || !toolGroupRef.current) {
      return;
    }

    // 기존 뷰포트가 있다면 비활성화하고 제거합니다.
    const viewportId = 'CT_AXIAL_STACK';
    renderingEngineRef.current.disableElement(viewportId);

    // 이미지 ID 생성
    const url = URL.createObjectURL(new Blob([arrayBuffer]), { type: 'application/dicom' });
    const imageId = `dicomweb:${url}`;
    const imageIds = [imageId];

    const viewportInput = {
      viewportId,
      element: elementRef.current,
      type: Enums.ViewportType.STACK,
    };

    renderingEngineRef.current.enableElement(viewportInput);

    // 툴 그룹에 뷰포트 추가
    toolGroupRef.current.addViewport(viewportId, renderingEngineRef.current.id);

    const viewport = renderingEngineRef.current.getViewport(viewportId);
    await viewport.setStack(imageIds);
    viewport.render();
  };


  return (
    <div>
      {/* 사용자가 파일을 선택하는 대신, 버튼을 클릭하여 API 요청을 보냅니다. */}
      <button onClick={handleApiFetchAndRender} className={styles.fetchButton}>
        API에서 DICOM 파일 불러오기
      </button>
      <div
        id="content"
        ref={elementRef}
        style={{ width: '80vmin', height: '80vmin', backgroundColor: 'purple', marginTop: '10px' }}
      ></div>
    </div>
  );

}
