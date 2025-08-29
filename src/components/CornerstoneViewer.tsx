// @ts-nocheck
// 파일: src/components/CornerstoneViewer.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Enums, init as coreInit, RenderingEngine } from '@cornerstonejs/core';
import { init as dicomImageLoaderInit } from '@cornerstonejs/dicom-image-loader';
import * as csTools3d from '@cornerstonejs/tools';

const { PanTool, ZoomTool, StackScrollTool, WindowLevelTool, ToolGroupManager, Enums: csToolsEnums } = csTools3d;

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
}

export default function CornerstoneViewer({ imageIds, toolGroupId }: CornerstoneViewerProps) {
  const elementRef = useRef(null);
  const [viewport, setViewport] = useState(null);

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
        csTools3d.addTool(PanTool);
        csTools3d.addTool(ZoomTool);
        csTools3d.addTool(StackScrollTool);
        csTools3d.addTool(WindowLevelTool);
        toolGroup.addTool(PanTool.toolName);
        toolGroup.addTool(ZoomTool.toolName);
        toolGroup.addTool(StackScrollTool.toolName);
        toolGroup.addTool(WindowLevelTool.toolName);

        // --- [핵심 수정] ---
        // 모든 도구의 기본 상태를 여기서 명확하게 설정합니다.
        
        // 1. 휠 스크롤은 항상 StackScroll로 활성화
        toolGroup.setToolActive(StackScrollTool.toolName);

        // 2. 다른 마우스 버튼들도 고정된 역할로 활성화
        toolGroup.setToolActive(ZoomTool.toolName, { bindings: [{ mouseButton: csToolsEnums.MouseBindings.Secondary }] }); // 오른쪽 클릭
        toolGroup.setToolActive(PanTool.toolName, { bindings: [{ mouseButton: csToolsEnums.MouseBindings.Auxiliary }] }); // 휠 클릭

        // 3. 왼쪽 버튼의 기본값은 WindowLevel로 설정
        toolGroup.setToolActive(WindowLevelTool.toolName, { bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }] });
      }
      
      toolGroup.addViewport(viewportId, renderingEngineId);
      
      const createdViewport = renderingEngine.getViewport(viewportId);
      setViewport(createdViewport);
    };

    initialize();

    return () => {
      renderingEngine?.destroy();
      ToolGroupManager.destroyToolGroup(toolGroupId);
    };
  }, [toolGroupId]);

  // 렌더링 useEffect (indexOf 오류 방지를 위해 try/catch 유지)
  useEffect(() => {
    if (!viewport || !imageIds) return;
    const renderImageStack = async () => {
      try {
        await viewport.setStack(imageIds);
      } catch (error) {
        console.warn("Ignoring non-critical cornerstone metadata error:", error);
      }
      if (imageIds.length > 0) {
        viewport.render();
      }
    };
    renderImageStack();
  }, [viewport, imageIds]);

  return (
    <div 
      ref={elementRef} 
      style={{ width: '80vmin', height: '80vmin', backgroundColor: 'black' }}
    />
  );
}