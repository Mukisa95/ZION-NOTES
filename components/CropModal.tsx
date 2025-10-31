import React, { useState, useRef, useEffect } from 'react';
import { XIcon } from './icons';

interface CropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onApply: (newSrc: string) => void;
}

interface Point { x: number; y: number; }
interface CropRect { x: number; y: number; width: number; height: number; }

export const CropModal: React.FC<CropModalProps> = ({ isOpen, imageSrc, onClose, onApply }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState<CropRect>({ x: 10, y: 10, width: 100, height: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [startDrag, setStartDrag] = useState<Point>({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen && imageRef.current) {
        const image = imageRef.current;
        const container = containerRef.current;
        if(!container) return;

        const resetCrop = () => {
            const { width: imgWidth, height: imgHeight } = image.getBoundingClientRect();
            const initialSize = Math.min(imgWidth, imgHeight) * 0.8;
            setCrop({
                x: (imgWidth - initialSize) / 2,
                y: (imgHeight - initialSize) / 2,
                width: initialSize,
                height: initialSize,
            });
        };

        if (image.complete) {
            resetCrop();
        } else {
            image.onload = resetCrop;
        }
    }
  }, [isOpen, imageSrc]);

  if (!isOpen) return null;
  
  const getClientPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): Point => {
    if ('touches' in e) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, handle?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const pos = getClientPos(e);
    setStartDrag(pos);
    setIsDragging(true);
    setActiveHandle(handle || 'move');
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      
      const { left, top } = containerRef.current.getBoundingClientRect();
      const pos = getClientPos(e);
      const dx = pos.x - startDrag.x;
      const dy = pos.y - startDrag.y;
      
      setCrop(prev => {
        let { x, y, width, height } = prev;
        
        switch(activeHandle) {
          case 'move':
            x += dx; y += dy;
            break;
          case 'tl':
            x += dx; y += dy; width -= dx; height -= dy;
            break;
          case 'tr':
            y += dy; width += dx; height -= dy;
            break;
          case 'bl':
            x += dx; width -= dx; height += dy;
            break;
          case 'br':
            width += dx; height += dy;
            break;
        }

        // Clamp values
        const containerRect = containerRef.current?.getBoundingClientRect();
        if(!containerRect) return prev;
        x = Math.max(0, x);
        y = Math.max(0, y);
        width = Math.min(containerRect.width - x, width);
        height = Math.min(containerRect.height - y, height);

        return { x, y, width, height };
      });

      setStartDrag(pos);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setActiveHandle(null);
    };

    if(isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleMouseMove);
        window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, startDrag, activeHandle]);


  const handleApply = () => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) return;
    
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(
      image,
      crop.x * scaleY,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    onApply(canvas.toDataURL('image/png'));
  };

  return (
    <div data-modal="true" className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in-fast backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col transform transition-all duration-300 scale-95 animate-scale-in max-h-[90vh]">
        <header className="flex justify-between items-center p-4 border-b border-gray-700 text-white">
          <h2 className="text-lg font-semibold">Crop Image</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700"><XIcon className="h-6 w-6" /></button>
        </header>

        <div className="p-6 flex-1 flex justify-center items-center overflow-hidden">
            <div ref={containerRef} className="relative select-none" onMouseDown={(e) => handleMouseDown(e, 'move')}>
                <img ref={imageRef} src={imageSrc} className="max-w-full max-h-[70vh] block pointer-events-none" alt="Crop preview" />
                <div className="absolute inset-0 bg-black bg-opacity-50" style={{ clipPath: `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% ${crop.y}px, ${crop.x}px ${crop.y}px, ${crop.x}px ${crop.y + crop.height}px, ${crop.x + crop.width}px ${crop.y + crop.height}px, ${crop.x + crop.width}px ${crop.y}px, 0% ${crop.y}px)`}} />
                <div 
                    className="absolute border-2 border-dashed border-white cursor-move"
                    style={{ left: crop.x, top: crop.y, width: crop.width, height: crop.height }}
                >
                    <div onMouseDown={(e) => handleMouseDown(e, 'tl')} className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white rounded-full cursor-nwse-resize"></div>
                    <div onMouseDown={(e) => handleMouseDown(e, 'tr')} className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white rounded-full cursor-nesw-resize"></div>
                    <div onMouseDown={(e) => handleMouseDown(e, 'bl')} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white rounded-full cursor-nesw-resize"></div>
                    <div onMouseDown={(e) => handleMouseDown(e, 'br')} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white rounded-full cursor-nwse-resize"></div>
                </div>
            </div>
            <canvas ref={canvasRef} className="hidden"></canvas>
        </div>

        <footer className="p-4 border-t border-gray-700 flex justify-end">
          <button onClick={handleApply} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
            Apply Crop
          </button>
        </footer>
      </div>
    </div>
  );
};