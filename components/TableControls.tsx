import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TableControlsProps {
  tableEl: HTMLTableElement;
  editorRef: React.RefObject<HTMLDivElement>;
  onUpdate: () => void;
}

export const TableControls: React.FC<TableControlsProps> = ({ tableEl, editorRef, onUpdate }) => {
  const [handles, setHandles] = useState<{ left: number; colIndex: number }[]>([]);
  const [toolbarPosition, setToolbarPosition] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [activeCell, setActiveCell] = useState<HTMLTableCellElement | null>(null);
  const currentHandle = useRef<{ colIndex: number; startX: number; startWidth: number } | null>(null);

  const updateHandles = () => {
    if (!tableEl || !editorRef.current) return;
    const editorRect = editorRef.current.getBoundingClientRect();
    const tableRect = tableEl.getBoundingClientRect();
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
    setToolbarPosition({
      left: Math.max(8, tableRect.left - editorRect.left + editorRef.current.scrollLeft),
      top: Math.max(8, tableRect.top - editorRect.top + editorRef.current.scrollTop - 42),
    });
  };

  useEffect(() => {
    updateHandles();
    const observer = new ResizeObserver(updateHandles);
    observer.observe(tableEl);
    editorRef.current?.addEventListener('scroll', updateHandles);

    const handleSelection = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const cell = target.closest('td, th') as HTMLTableCellElement | null;
      if (cell && tableEl.contains(cell)) {
        setActiveCell(cell);
      }
    };

    tableEl.addEventListener('mousedown', handleSelection);
    setActiveCell(tableEl.querySelector('td, th'));

    return () => {
      observer.disconnect();
      editorRef.current?.removeEventListener('scroll', updateHandles);
      tableEl.removeEventListener('mousedown', handleSelection);
    };
  }, [tableEl]);

  const getCell = (): HTMLTableCellElement | null => {
    if (activeCell && tableEl.contains(activeCell)) return activeCell;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let node: Node | null = selection.getRangeAt(0).commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
      const cell = (node as HTMLElement | null)?.closest?.('td, th') as HTMLTableCellElement | null;
      if (cell && tableEl.contains(cell)) return cell;
    }
    return tableEl.querySelector('td, th');
  };

  const normalizeRowCells = (row: HTMLTableRowElement) => {
    Array.from(row.cells).forEach(cell => {
      const htmlCell = cell as HTMLElement;
      htmlCell.style.border ||= '1px solid #d1d5db';
      htmlCell.style.padding ||= '6px 8px';
      htmlCell.style.minWidth ||= '48px';
      htmlCell.style.verticalAlign ||= 'top';
    });
  };

  const createCell = (tagName: 'td' | 'th' = 'td') => {
    const cell = document.createElement(tagName);
    cell.innerHTML = '<br>';
    cell.style.border = '1px solid #d1d5db';
    cell.style.padding = '6px 8px';
    cell.style.minWidth = '48px';
    cell.style.verticalAlign = 'top';
    return cell;
  };

  const commit = () => {
    Array.from(tableEl.rows).forEach(normalizeRowCells);
    tableEl.style.borderCollapse = 'collapse';
    tableEl.style.tableLayout = 'fixed';
    if (!tableEl.style.width) tableEl.style.width = '100%';
    updateHandles();
    onUpdate();
  };

  const getCellPosition = (cell: HTMLTableCellElement) => ({
    rowIndex: cell.parentElement ? Array.from(tableEl.rows).indexOf(cell.parentElement as HTMLTableRowElement) : -1,
    cellIndex: cell.cellIndex,
  });

  const insertRow = (where: 'above' | 'below') => {
    const cell = getCell();
    if (!cell) return;
    const { rowIndex } = getCellPosition(cell);
    const sourceRow = tableEl.rows[rowIndex];
    const insertIndex = where === 'above' ? rowIndex : rowIndex + 1;
    const newRow = tableEl.insertRow(insertIndex);
    Array.from(sourceRow.cells).forEach(sourceCell => {
      const tag = sourceCell.tagName === 'TH' && insertIndex === 0 ? 'th' : 'td';
      const newCell = createCell(tag as 'td' | 'th');
      newCell.colSpan = sourceCell.colSpan;
      newRow.appendChild(newCell);
    });
    setActiveCell(newRow.cells[0] || null);
    commit();
  };

  const insertColumn = (where: 'left' | 'right') => {
    const cell = getCell();
    if (!cell) return;
    const targetIndex = cell.cellIndex + (where === 'right' ? 1 : 0);
    Array.from(tableEl.rows).forEach((row, rowIndex) => {
      const referenceCell = row.cells[Math.min(targetIndex, row.cells.length - 1)];
      const tag = referenceCell?.tagName === 'TH' || rowIndex === 0 ? 'th' : 'td';
      const newCell = createCell(tag as 'td' | 'th');
      if (targetIndex >= row.cells.length) {
        row.appendChild(newCell);
      } else {
        row.insertBefore(newCell, row.cells[targetIndex]);
      }
    });
    setActiveCell(tableEl.rows[cell.parentElement ? (cell.parentElement as HTMLTableRowElement).rowIndex : 0]?.cells[targetIndex] || null);
    commit();
  };

  const deleteRow = () => {
    const cell = getCell();
    if (!cell || tableEl.rows.length <= 1) return;
    const { rowIndex } = getCellPosition(cell);
    tableEl.deleteRow(rowIndex);
    setActiveCell(tableEl.rows[Math.max(0, rowIndex - 1)]?.cells[0] || null);
    commit();
  };

  const deleteColumn = () => {
    const cell = getCell();
    if (!cell) return;
    const index = cell.cellIndex;
    const maxCells = Math.max(...Array.from(tableEl.rows).map(row => row.cells.length));
    if (maxCells <= 1) return;
    Array.from(tableEl.rows).forEach(row => {
      if (row.cells[index]) row.deleteCell(index);
    });
    setActiveCell(tableEl.rows[0]?.cells[Math.max(0, index - 1)] || null);
    commit();
  };

  const mergeRight = () => {
    const cell = getCell();
    const next = cell?.nextElementSibling as HTMLTableCellElement | null;
    if (!cell || !next) return;
    cell.colSpan += next.colSpan || 1;
    cell.innerHTML = `${cell.innerHTML}${cell.textContent?.trim() && next.textContent?.trim() ? '<br>' : ''}${next.innerHTML}`;
    next.remove();
    setActiveCell(cell);
    commit();
  };

  const splitCell = () => {
    const cell = getCell();
    if (!cell || cell.colSpan <= 1) return;
    const span = cell.colSpan;
    cell.colSpan = 1;
    for (let i = 1; i < span; i += 1) {
      cell.parentElement?.insertBefore(createCell(cell.tagName === 'TH' ? 'th' : 'td'), cell.nextSibling);
    }
    setActiveCell(cell);
    commit();
  };

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
          let colgroup = tableEl.querySelector('colgroup');
          if (!colgroup) {
            colgroup = document.createElement('colgroup');
            Array.from(firstRow.cells).forEach(cell => {
              const col = document.createElement('col');
              col.style.width = `${(cell as HTMLTableCellElement).offsetWidth}px`;
              colgroup!.appendChild(col);
            });
            tableEl.insertBefore(colgroup, tableEl.firstChild);
          }
          const col = colgroup.children[currentHandle.current.colIndex] as HTMLElement | undefined;
          if (col) col.style.width = `${newWidth}px`;
          Array.from(tableEl.rows).forEach(row => {
            const rowCell = row.cells[currentHandle.current!.colIndex] as HTMLElement | undefined;
            if (rowCell) rowCell.style.width = `${newWidth}px`;
          });
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
      <div
        className="table-command-bar"
        style={{ left: toolbarPosition.left, top: toolbarPosition.top }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <button type="button" onClick={() => insertRow('above')} title="Insert row above">Row +</button>
        <button type="button" onClick={() => insertRow('below')} title="Insert row below">Row below</button>
        <button type="button" onClick={() => insertColumn('left')} title="Insert column left">Col +</button>
        <button type="button" onClick={() => insertColumn('right')} title="Insert column right">Col right</button>
        <button type="button" onClick={mergeRight} title="Merge selected cell with the cell to the right">Merge</button>
        <button type="button" onClick={splitCell} title="Split a horizontally merged cell">Split</button>
        <button type="button" onClick={deleteRow} title="Delete current row">Del row</button>
        <button type="button" onClick={deleteColumn} title="Delete current column">Del col</button>
      </div>
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
