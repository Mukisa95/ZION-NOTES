import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CropIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, TrashIcon } from './icons';

interface ImageControlsProps {
  imageEl: HTMLImageElement;
  editorRef: React.RefObject<HTMLDivElement>;
  onUpdate: () => void;
  onCropRequest: (imageEl: HTMLImageElement) => void;
}

export const ImageControls: React.FC<ImageControlsProps> = ({ imageEl, editorRef, onUpdate, onCropRequest }) => {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const isResizing = useRef(false);

  const updatePosition = () => {
    if (!imageEl || !editorRef.current) return;
    const editorRect = editorRef.current.getBoundingClientRect();
    const imageRect = imageEl.getBoundingClientRect();
    setPos({
      top: imageRect.top - editorRect.top + editorRef.current.scrollTop,
      left: imageRect.left - editorRect.left + editorRef.current.scrollLeft,
      width: imageRect.width,
      height: imageRect.height,
    });
  };

  useEffect(() => {
    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    observer.observe(imageEl);
    editorRef.current?.addEventListener('scroll', updatePosition);

    return () => {
      observer.disconnect();
      editorRef.current?.removeEventListener('scroll', updatePosition);
    };
  }, [imageEl]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = imageEl.width;
    const startHeight = imageEl.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizing.current) return;
        const dx = moveEvent.clientX - startX;
        const newWidth = startWidth + dx;
        if (newWidth > 20) { // Min width
            imageEl.style.width = `${newWidth}px`;
            imageEl.style.height = 'auto';
        }
        updatePosition();
    };

    const handleMouseUp = () => {
        isResizing.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        onUpdate();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  
  const handleAlign = (align: 'left' | 'center' | 'right') => {
    if (align === 'left') {
        imageEl.style.float = 'left';
        imageEl.style.marginRight = '1em';
        imageEl.style.marginBottom = '0.5em';
        imageEl.style.marginLeft = '0';
    } else if (align === 'right') {
        imageEl.style.float = 'right';
        imageEl.style.marginLeft = '1em';
        imageEl.style.marginBottom = '0.5em';
        imageEl.style.marginRight = '0';
    } else { // center
        imageEl.style.float = 'none';
        imageEl.style.display = 'block';
        imageEl.style.marginLeft = 'auto';
        imageEl.style.marginRight = 'auto';
        imageEl.style.marginBottom = '0.5em';
    }
    onUpdate();
  };

  const handleDelete = () => {
    imageEl.remove();
    onUpdate();
  }

  if (!editorRef.current) return null;
  
  return createPortal(
    <div
      data-control-element
      className="absolute border-2 border-blue-500 pointer-events-none"
      style={{ top: pos.top, left: pos.left, width: pos.width, height: pos.height }}
    >
      <div className="resize-handle resize-handle-br pointer-events-auto" onMouseDown={handleMouseDown} />
      
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 shadow-lg rounded-lg flex items-center p-1 pointer-events-auto border border-gray-200 dark:border-gray-700">
        <button onClick={() => onCropRequest(imageEl)} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><CropIcon className="h-5 w-5"/></button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
        <button onClick={() => handleAlign('left')} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><AlignLeftIcon className="h-5 w-5"/></button>
        <button onClick={() => handleAlign('center')} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><AlignCenterIcon className="h-5 w-5"/></button>
        <button onClick={() => handleAlign('right')} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><AlignRightIcon className="h-5 w-5"/></button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
        <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded"><TrashIcon className="h-5 w-5"/></button>
      </div>
    </div>,
    editorRef.current
  );
};