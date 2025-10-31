import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TableControlsProps {
  tableEl: HTMLTableElement;
  editorRef: React.RefObject<HTMLDivElement>;
  onUpdate: () => void;
}

export const TableControls: React.FC<TableControlsProps> = ({ tableEl, editorRef, onUpdate }) => {
  const [handles, setHandles] = useState<{ left: number; colIndex: number }[]>([]);
  const currentHandle = useRef<{ colIndex: number; startX: number; startWidth: number } | null>(null);

  const updateHandles = () => {
    if (!tableEl || !editorRef.current) return;
    const editorRect = editorRef.current.getBoundingClientRect();
    const firstRow = tableEl.rows[0];
    if (!firstRow) return;

    const newHandles = Array.from(firstRow.cells).slice(0, -1).map((cell, index) => {
      // FIX: Cast the 'cell' element to HTMLTableCellElement to resolve type error.
      const cellRect = (cell as HTMLTableCellElement).getBoundingClientRect();
      return {
        left: cellRect.right - editorRect.left + editorRef.current!.scrollLeft,
        colIndex: index,
      };
    });
    setHandles(newHandles);
  };

  useEffect(() => {
    updateHandles();
    const observer = new ResizeObserver(updateHandles);
    observer.observe(tableEl);
    editorRef.current?.addEventListener('scroll', updateHandles);

    return () => {
      observer.disconnect();
      editorRef.current?.removeEventListener('scroll', updateHandles);
    };
  }, [tableEl]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, colIndex: number) => {
    e.preventDefault();
    const firstRow = tableEl.rows[0];
    const column = firstRow.cells[colIndex];
    currentHandle.current = {
      colIndex,
      startX: e.clientX,
      startWidth: column.offsetWidth,
    };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!currentHandle.current) return;
      const dx = moveEvent.clientX - currentHandle.current.startX;
      const newWidth = currentHandle.current.startWidth + dx;
      if (newWidth > 30) { // Min width
          column.style.width = `${newWidth}px`;
          updateHandles();
      }
    };
    
    const handleMouseUp = () => {
      currentHandle.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      onUpdate();
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (!editorRef.current) return null;

  return createPortal(
    <div data-control-element>
      {handles.map(({ left, colIndex }) => (
        <div
          key={colIndex}
          className="col-resize-handle"
          style={{
            left: left - 2.5,
            top: tableEl.offsetTop,
            height: tableEl.offsetHeight,
          }}
          onMouseDown={(e) => handleMouseDown(e, colIndex)}
        />
      ))}
    </div>,
    editorRef.current
  );
};
