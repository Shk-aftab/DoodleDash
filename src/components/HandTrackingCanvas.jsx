import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import * as yoha from '@handtracking.io/yoha';
import { InitializeCursor, SetCursorColor, SetCursorPosition, SetCursorVisibility } from '../cursor';

const HandTrackingCanvas = forwardRef(({ onSketchChange, disabled }, ref) => {
  const trackingCanvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [timeSpentDrawing, setTimeSpentDrawing] = useState(0);
  const contextRef = useRef(null);

  useEffect(() => {
    console.log("Initializing HandTrackingCanvas");
    InitializeCursor();
    initializeCanvas();
    initializeHandTracking();

    // Add resize event listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleResize = () => {
    initializeCanvas();
  };

  const initializeCanvas = () => {
    const canvas = drawingCanvasRef.current;
    const trackingCanvas = trackingCanvasRef.current;
    const container = canvas.parentElement;
    
    // Set canvas width to container width
    const containerWidth = container.clientWidth;
    
    // Calculate height based on 4:3 aspect ratio
    const containerHeight = (containerWidth * 3) / 4;
    
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    trackingCanvas.width = containerWidth;
    trackingCanvas.height = containerHeight;
    
    // Update container height
    container.style.height = `${containerHeight}px`;
    
    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = 'black';
    context.lineWidth = 10;
    contextRef.current = context;
    
    console.log("Canvas initialized", canvas.width, canvas.height);
  };

  const initializeHandTracking = async () => {
    try {
      console.log("Initializing hand tracking");
      const modelFiles = await yoha.DownloadMultipleYohaTfjsModelBlobs(
        '/models/box/model.json', 
        '/models/lan/model.json', 
        (rec, total) => {
          console.log('Download progress: ' + (rec / total) * 100 + '%');
        }
      );
      const streamRes = await yoha.CreateMaxFpsMaxResStream();
      if (streamRes.error) {
        console.error('Error setting up video stream:', streamRes.error);
        return;
      }
      const video = yoha.CreateVideoElementFromStream(streamRes.stream);
      yoha.StartTfjsWebglEngine({padding: 0.05, mirrorX: true}, video, modelFiles, handleHandTracking);
      console.log("Hand tracking initialized");
    } catch (error) {
      console.error('Error initializing hand tracking:', error);
    }
  };

  const handleHandTracking = (res) => {
    if (!res || !res.coordinates) {
      console.error('Invalid hand tracking result:', res);
      return;
    }

    const thresholds = yoha.RecommendedHandPoseProbabilityThresholds;

    if (res.isHandPresentProb < thresholds.IS_HAND_PRESENT) {
      SetCursorVisibility(false);
      if (isDrawingRef.current) {
        stopDrawing();
      }
      return;
    }

    SetCursorVisibility(true);
    drawHandSkeleton(res.coordinates);
    const cursorPos = computeCursorPosition(res.coordinates);
    SetCursorPosition(cursorPos[0], cursorPos[1]);

    const isPinching = isPinchGesture(res.coordinates);
    // console.log("Is pinching:", isPinching, "Is drawing:", isDrawingRef.current);

    if (res.poses.fistProb > thresholds.FIST) {
      SetCursorColor('red');
      clearCanvas();
    } else if (isPinching) {
      SetCursorColor('green');
      if (!isDrawingRef.current) {
        startDrawing(cursorPos);
      } else {
        draw(cursorPos);
      }
    } else {
      SetCursorColor('blue');
      if (isDrawingRef.current) {
        stopDrawing();
      }
    }

    if (disabled) return;
  };

  const isPinchGesture = (coordinates) => {
    const indexTip = coordinates[7];
    const thumbTip = coordinates[3];
    const distance = Math.sqrt(
      Math.pow(indexTip[0] - thumbTip[0], 2) + Math.pow(indexTip[1] - thumbTip[1], 2)
    );
    return distance < 0.03;
  };

  const computeCursorPosition = (coordinates) => {
    const x = (coordinates[3][0] + coordinates[7][0]) / 2;
    const y = (coordinates[3][1] + coordinates[7][1]) / 2;
    const canvas = drawingCanvasRef.current;
    const rect = canvas.getBoundingClientRect();

    return [
      x * rect.width,
      y * rect.height
    ];
  };

  const drawHandSkeleton = (coordinates) => {
    const ctx = trackingCanvasRef.current.getContext('2d');
    const canvas = trackingCanvasRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255, 0, 0, 1)';
    ctx.lineWidth = 2;

    const JOINT_LINKS = [
      [1],
      [2],
      [3],
      [],
      [5],
      [6],
      [7],
      [],
      [9],
      [10],
      [11],
      [],
      [13],
      [14],
      [15],
      [],
      [17],
      [18],
      [19],
      [],
      [0, 4, 8, 12, 16]
    ];

    for (let i = 0; i < coordinates.length; ++i) {
      const [x, y] = coordinates[i];

      for (const coordIndex of JOINT_LINKS[i]) {
        const [nextX, nextY] = coordinates[coordIndex];
        ctx.beginPath();
        ctx.moveTo(x * canvas.width, y * canvas.height);
        ctx.lineTo(nextX * canvas.width, nextY * canvas.height);
        ctx.stroke();
      }

      // Draw point
      ctx.beginPath();
      ctx.arc(x * canvas.width, y * canvas.height, 3, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.fill();
    }
  };

  const startDrawing = ([x, y]) => {
    // console.log("Starting drawing at", x, y);
    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    isDrawingRef.current = true;
  };
  
  const draw = ([x, y]) => {
    if (!isDrawingRef.current) return;
    // console.log("Drawing to", x, y);
    
    const lastPoint = contextRef.current.currentPosition || [x, y];
    const newPoint = [x, y];
    const midPoint = [(lastPoint[0] + newPoint[0]) / 2, (lastPoint[1] + newPoint[1]) / 2];
    
    contextRef.current.quadraticCurveTo(lastPoint[0], lastPoint[1], midPoint[0], midPoint[1]);
    contextRef.current.stroke();
    
    contextRef.current.currentPosition = newPoint;
    
    setTimeSpentDrawing(prev => prev + 16);
    onSketchChange();
  };
  
  const stopDrawing = () => {
    console.log("Stopping drawing");
    contextRef.current.closePath();
    isDrawingRef.current = false;
    contextRef.current.currentPosition = null;
  };

  const clearCanvas = () => {
    // console.log("Clearing canvas");
    contextRef.current.clearRect(0, 0, window.innerWidth, window.innerHeight);
    isDrawingRef.current = false;
    setTimeSpentDrawing(0);
    onSketchChange();
  };

  const getCanvasData = () => {
    const canvas = drawingCanvasRef.current;
    const context = canvas.getContext('2d');
    return context.getImageData(0, 0, canvas.width, canvas.height);
  };

  useImperativeHandle(ref, () => ({
    getCanvasData,
    clearCanvas,
    getTimeSpentDrawing: () => timeSpentDrawing,
  }));

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
      <canvas
        ref={drawingCanvasRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0)' }}
      />
      <canvas
        ref={trackingCanvasRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      />
    </div>
  );
});

HandTrackingCanvas.displayName = 'HandTrackingCanvas';

export default HandTrackingCanvas;