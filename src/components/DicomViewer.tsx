// @ts-nocheck

import React, { useEffect, useRef } from 'react';
import { Enums, init as coreInit, RenderingEngine } from '@cornerstonejs/core';
import { init as dicomImageLoaderInit } from '@cornerstonejs/dicom-image-loader';
import { init, Enums as toolsEnums, ToolGroupManager } from '@cornerstonejs/tools';
import * as csTools3d from '@cornerstonejs/tools';
import styles from './DicomViewer.module.css';

const { PanTool, ZoomTool, StackScrollTool, WindowLevelTool } = csTools3d;

const API_BASE_URL = 'http://localhost:8080/api';
const ENCODED_PATH_EXAMPLE = 'MjAyNTA4XDEyXE1TMDAwM1xDUlwxXC9DUi4xLjIuMzkyLjIwMDAzNi45MTA3LjUwMC4zMDQuODE3LjIwMjAwMzMwLjk1ODM1LjEwODE3LmRjbQ%3D%3D';

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
      <input type="file" id="file" onChange={handleFileChange} />
      <div
        id="content"
        ref={elementRef}
        style={{ width: '500px', height: '500px', backgroundColor: 'purple', marginTop: '10px' }}
      ></div>
    </div>
  );

}
