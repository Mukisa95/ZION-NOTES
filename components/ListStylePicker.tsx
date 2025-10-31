import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from './icons';

interface ListStylePickerProps {
    type: 'bullet' | 'number';
    onSelect: (style: string) => void;
    buttonIcon: React.ReactNode;
    buttonTitle: string;
}

export const ListStylePicker: React.FC<ListStylePickerProps> = ({ type, onSelect, buttonIcon, buttonTitle }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const bulletStyles = [
        { label: 'Solid Circle', value: 'disc', preview: '● Item' },
        { label: 'Hollow Circle', value: 'circle', preview: '○ Item' },
        { label: 'Square', value: 'square', preview: '■ Item' },
        { label: 'Checkmark', value: "'✓ '", preview: '✓ Item' },
        { label: 'Arrow', value: "'➤ '", preview: '➤ Item' },
        { label: 'Diamond', value: "'◆ '", preview: '◆ Item' },
        { label: 'Star', value: "'★ '", preview: '★ Item' },
    ];

    const numberStyles = [
        { label: 'Numbers', value: 'decimal', preview: '1. Item\n2. Item' },
        { label: 'Numbers with Parenthesis', value: 'custom-paren', preview: '1) Item\n2) Item', format: '%d) ' },
        { label: 'Numbers in Parenthesis', value: 'custom-both', preview: '(1) Item\n(2) Item', format: '(%d) ' },
        { label: 'Lowercase Letters', value: 'lower-alpha', preview: 'a. Item\nb. Item' },
        { label: 'Uppercase Letters', value: 'upper-alpha', preview: 'A. Item\nB. Item' },
        { label: 'Lowercase Roman', value: 'lower-roman', preview: 'i. Item\nii. Item' },
        { label: 'Uppercase Roman', value: 'upper-roman', preview: 'I. Item\nII. Item' },
    ];

    const styles = type === 'bullet' ? bulletStyles : numberStyles;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const handleStyleSelect = (style: typeof styles[0]) => {
        onSelect(style.value);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            <div className="flex">
                <button
                    onMouseDown={(e) => { e.preventDefault(); onSelect('default'); }}
                    className="p-2 rounded-l-md text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title={buttonTitle}
                >
                    {buttonIcon}
                </button>
                <button
                    onMouseDown={(e) => { e.preventDefault(); setIsOpen(!isOpen); }}
                    className="p-2 rounded-r-md border-l border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Choose style"
                >
                    <ChevronDownIcon className="h-4 w-4" />
                </button>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 animate-fade-in-fast">
                    <div className="p-2 max-h-80 overflow-y-auto">
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-2">
                            {type === 'bullet' ? 'Bullet Styles' : 'Numbering Styles'}
                        </div>
                        {styles.map((style) => (
                            <button
                                key={style.value}
                                onMouseDown={(e) => { e.preventDefault(); handleStyleSelect(style); }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                            >
                                <div className="font-medium">{style.label}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono whitespace-pre-line mt-1">
                                    {style.preview}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

