import { useState, useCallback, useRef, useEffect } from 'react';

interface UseImageZoomOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
}

interface UseImageZoomReturn {
  zoom: number;
  position: { x: number; y: number };
  isDragging: boolean;
  handleWheel: (e: React.WheelEvent) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  resetZoom: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export function useImageZoom(options: UseImageZoomOptions = {}): UseImageZoomReturn {
  const {
    minZoom = 0.1,
    maxZoom = 10,
    zoomStep = 0.1,
  } = options;

  const [zoom, setZoom] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const initialPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    // Get mouse position and rect before state updates
    const target = e.currentTarget;
    if (!target) return;
    
    const rect = target.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Determine zoom direction and amount
    const delta = -e.deltaY;
    const zoomChange = delta > 0 ? zoomStep : -zoomStep;
    
    setZoom((prevZoom) => {
      const newZoom = Math.max(minZoom, Math.min(maxZoom, prevZoom + zoomChange));
      
      // Adjust position to zoom towards mouse cursor
      if (newZoom !== prevZoom) {
        const zoomRatio = newZoom / prevZoom;
        
        setPosition((prevPos) => ({
          x: mouseX - (mouseX - prevPos.x) * zoomRatio,
          y: mouseY - (mouseY - prevPos.y) * zoomRatio,
        }));
      }
      
      return newZoom;
    });
  }, [minZoom, maxZoom, zoomStep]);

  // Handle mouse down for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only allow dragging when zoomed in
    if (zoom <= 1) return;
    
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPositionRef.current = position;
  }, [zoom, position]);

  // Handle mouse move for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;
      
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      
      setPosition({
        x: initialPositionRef.current.x + dx,
        y: initialPositionRef.current.y + dy,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Reset zoom and position
  const resetZoom = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Zoom in
  const zoomIn = useCallback(() => {
    setZoom((prevZoom) => Math.min(maxZoom, prevZoom + zoomStep));
  }, [maxZoom, zoomStep]);

  // Zoom out
  const zoomOut = useCallback(() => {
    setZoom((prevZoom) => {
      const newZoom = Math.max(minZoom, prevZoom - zoomStep);
      // Reset position when zooming out to 1 or below
      if (newZoom <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, [minZoom, zoomStep]);

  // Reset position when zoom changes to 1 or below
  useEffect(() => {
    if (zoom <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [zoom]);

  return {
    zoom,
    position,
    isDragging,
    handleWheel,
    handleMouseDown,
    resetZoom,
    zoomIn,
    zoomOut,
  };
}
