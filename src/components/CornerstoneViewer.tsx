// @ts-nocheck
// 파일 경로: src/components/CornerstoneViewer.tsx

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Enums, init as coreInit, RenderingEngine } from '@cornerstonejs/core';
import { init as dicomImageLoaderInit } from '@cornerstonejs/dicom-image-loader';
import * as csTools3d from '@cornerstonejs/tools';

const { PanTool, ZoomTool, StackScrollTool, WindowLevelTool, ToolGroupManager, Enums: csToolsEnums } = csTools3d;

// Cornerstone 라이브러리 초기화 (한 번만 실행)
let isCornerstoneInitialized = false;
const initCornerstone = async () => {
  if (isCornerstoneInitialized) return;
  await coreInit();
  await dicomImageLoaderInit();
  await csTools3d.init();
  isCornerstoneInitialized = true;
};

interface CornerstoneViewerProps {
  imageIds: string[];
  toolGroupId: string;
  activeTool: string;
  startImageIndex?: number; // ?는 '선택적'이라는 의미입니다.
  onNextImage?: () => void;
  onPreviousImage?: () => void;
}

// 컴포넌트를 forwardRef로 감싸서 부모로부터 ref를 받을 수 있도록 합니다.
const CornerstoneViewer = forwardRef(({ imageIds, toolGroupId, activeTool, startImageIndex, onNextImage, onPreviousImage }: CornerstoneViewerProps, ref) => {
  const elementRef = useRef(null);
  const [viewport, setViewport] = useState(null);
  const toolGroupRef = useRef(null); // 툴 그룹의 인스턴스를 저장하기 위한 ref


  // --- [핵심 수정 1] ---
  // 휠 이벤트를 처리하는 useEffect를 분리합니다.
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleWheel = (event) => {
      // 이제 이 preventDefault는 오류를 일으키지 않습니다.
      event.preventDefault();
      if (event.deltaY > 0) {
        onNextImage();
      } else if (event.deltaY < 0) {
        onPreviousImage();
      }
    };

    // passive: false 옵션을 명시하여 이벤트 리스너를 등록합니다.
    element.addEventListener('wheel', handleWheel, { passive: false });

    // 컴포넌트가 사라질 때 이벤트 리스너를 반드시 제거합니다.
    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, [onNextImage, onPreviousImage]); // 이 함수들이 바뀔 때만 리스너를 다시 등록합니다.



  // 1. Cornerstone 엔진 및 뷰포트 초기화 (컴포넌트가 처음 생길 때 한 번만 실행)
  useEffect(() => {
    let renderingEngine;
    const initialize = async () => {
      await initCornerstone();

      const renderingEngineId = 'myRenderingEngine';
      renderingEngine = new RenderingEngine(renderingEngineId);

      const viewportId = 'CT_VIEWPORT';
      const element = elementRef.current;
      const viewportInput = { viewportId, element, type: Enums.ViewportType.STACK };
      renderingEngine.enableElement(viewportInput);

      let toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
      if (!toolGroup) {
        toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
        // 사용할 모든 도구를 추가만 합니다. 활성화는 다른 useEffect에서 담당합니다.
        csTools3d.addTool(PanTool);
        csTools3d.addTool(ZoomTool);
        csTools3d.addTool(StackScrollTool);
        csTools3d.addTool(WindowLevelTool);
        toolGroup.addTool(PanTool.toolName);
        toolGroup.addTool(ZoomTool.toolName);
        toolGroup.addTool(StackScrollTool.toolName);
        toolGroup.addTool(WindowLevelTool.toolName);
      }

      toolGroup.addViewport(viewportId, renderingEngineId);
      toolGroupRef.current = toolGroup; // 나중에 사용하기 위해 ref에 저장

      const createdViewport = renderingEngine.getViewport(viewportId);
      setViewport(createdViewport); // viewport가 준비되었음을 state에 알림
    };

    initialize();

    // 컴포넌트가 사라질 때 모든 리소스를 정리합니다.
    return () => {
      renderingEngine?.destroy();
      ToolGroupManager.destroyToolGroup(toolGroupId);
    };
  }, [toolGroupId]);

  // 2. 도구 상태 설정 (viewport가 준비되거나, activeTool이 바뀔 때 실행)
  useEffect(() => {
    const toolGroup = toolGroupRef.current;
    if (!toolGroup || !viewport) return; // 툴 그룹과 뷰포트가 모두 준비되었을 때만 실행

    // "항상 켜져 있어야 하는" 도구들을 활성화합니다.
    toolGroup.setToolActive(StackScrollTool.toolName); // 마우스 휠 스크롤
    toolGroup.setToolActive(ZoomTool.toolName, { bindings: [{ mouseButton: csToolsEnums.MouseBindings.Secondary }] }); // 오른쪽 클릭
    toolGroup.setToolActive(PanTool.toolName, { bindings: [{ mouseButton: csToolsEnums.MouseBindings.Auxiliary }] }); // 휠 클릭

    // "툴바에서 선택하는" 도구들의 상태를 설정합니다.
    const toolsForPrimaryMouseButton = [WindowLevelTool.toolName, PanTool.toolName, ZoomTool.toolName];
    toolsForPrimaryMouseButton.forEach(toolName => {
      if (toolName === activeTool) {
        toolGroup.setToolActive(toolName, { bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }] });
      } else {
        toolGroup.setToolPassive(toolName);
      }
    });
  }, [activeTool, viewport]); // viewport가 준비되거나 activeTool이 바뀔 때마다 도구 설정을 다시 적용

  // 3. 이미지 렌더링 (viewport가 준비되거나, imageIds가 바뀔 때 실행)
  useEffect(() => {
    if (!viewport || !imageIds) return;

    const renderImageStack = async () => {
      // imageIds가 비어있을 수도 있으므로 먼저 확인합니다.
      if (imageIds.length > 0) {
        try {
          // --- [핵심 수정 3] ---
          // setStack 함수에 두 번째 인자로 startImageIndex를 전달합니다.
          await viewport.setStack(imageIds, startImageIndex);
        } catch (error) {
          console.warn("Ignoring non-critical cornerstone metadata error:", error);
        }
        viewport.render();
      } else {
        // 이미지가 없으면 뷰포트를 비웁니다.
        // await viewport.setStack([]);
      }
    };

    renderImageStack();
  }, [viewport, imageIds, startImageIndex]);

  // 4. 부모가 ref를 통해 호출할 수 있는 함수들을 외부에 노출
  useImperativeHandle(ref, () => ({
    scroll: (delta: number) => { // delta는 1 또는 -1
      if (!viewport || !viewport.getImageIds()?.length) return;

      const { currentImageIdIndex, imageIds } = viewport;
      const numImages = imageIds.length;

      // 다음 인덱스 계산 (배열의 끝과 처음을 순환하도록)
      let newImageIdIndex = (currentImageIdIndex + delta) % numImages;
      if (newImageIdIndex < 0) {
        newImageIdIndex += numImages;
      }

      // 계산된 인덱스로 이미지를 변경합니다.
      viewport.setImageIdIndex(newImageIdIndex);
    },
  }));



  return (
    <div
      ref={elementRef}
      style={{ width: '80vmin', height: '80vmin', backgroundColor: 'black' }}
    />
  );
});

export default CornerstoneViewer;