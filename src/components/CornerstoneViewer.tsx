// @ts-nocheck
// 파일: CornerstoneViewer.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Enums, init as coreInit, RenderingEngine } from '@cornerstonejs/core';
import { init as dicomImageLoaderInit } from '@cornerstonejs/dicom-image-loader';
import * as csTools3d from '@cornerstonejs/tools';

const { PanTool, ZoomTool, StackScrollTool, WindowLevelTool, ToolGroupManager } = csTools3d;

// 가장 단순하고 깨끗한 초기화 함수
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
}

export default function CornerstoneViewer({ imageIds }: CornerstoneViewerProps) {
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
      
      const toolGroupId = 'CT_TOOLGROUP';
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
        toolGroup.setToolActive(StackScrollTool.toolName);
        toolGroup.setToolActive(PanTool.toolName, { bindings: [{ mouseButton: csTools3d.Enums.MouseBindings.Auxiliary }] });
        toolGroup.setToolActive(ZoomTool.toolName, { bindings: [{ mouseButton: csTools3d.Enums.MouseBindings.Secondary }] });
        toolGroup.setToolActive(WindowLevelTool.toolName, { bindings: [{ mouseButton: csTools3d.Enums.MouseBindings.Primary }] });
      }
      
      toolGroup.addViewport(viewportId, renderingEngineId);
      
      const createdViewport = renderingEngine.getViewport(viewportId);
      setViewport(createdViewport);
    };

    initialize();

    return () => {
      renderingEngine?.destroy();
      ToolGroupManager.destroyToolGroup('CT_TOOLGROUP');
    };
  }, []);

  useEffect(() => {
    if (!viewport || !imageIds) return;

    const renderImageStack = async () => {
      await viewport.setStack(imageIds);
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