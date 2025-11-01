import React, { useState, useEffect, useRef } from 'react';
import { AlignLeftIcon, AlignCenterIcon, AlignRightIcon, AlignJustifyIcon, ChevronDownIcon } from './icons';

interface AlignmentPickerProps {
    onSelect: (alignment: 'justifyLeft' | 'justifyCenter' | 'justifyRight' | 'justifyFull') => void;
    currentAlignment?: 'justifyLeft' | 'justifyCenter' | 'justifyRight' | 'justifyFull';
}

export const AlignmentPicker: React.FC<AlignmentPickerProps> = ({ onSelect, currentAlignment = 'justifyLeft' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const alignmentOptions = [
        { 
            label: 'Align Left', 
            value: 'justifyLeft' as const, 
            icon: <AlignLeftIcon className="h-4 w-4" />,
            preview: 'Left aligned text' 
        },
        { 
            label: 'Align Center', 
            value: 'justifyCenter' as const, 
            icon: <AlignCenterIcon className="h-4 w-4" />,
            preview: 'Center aligned text' 
        },
        { 
            label: 'Align Right', 
            value: 'justifyRight' as const, 
            icon: <AlignRightIcon className="h-4 w-4" />,
            preview: 'Right aligned text' 
        },
        { 
            label: 'Justify', 
            value: 'justifyFull' as const, 
            icon: <AlignJustifyIcon className="h-4 w-4" />,
            preview: 'Fully justified text' 
        },
    ];

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

    const handleAlignmentSelect = (alignment: typeof alignmentOptions[0]) => {
        onSelect(alignment.value);
        setIsOpen(false);
    };

    const currentOption = alignmentOptions.find(opt => opt.value === currentAlignment) || alignmentOptions[0];

    return (
        <div className="relative" ref={menuRef}>
            <button
                onMouseDown={(e) => {
                    e.preventDefault();
                    setIsOpen(!isOpen);
                }}
                className="flex items-center gap-1 p-1.5 rounded text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                title="Text Alignment"
            >
                {currentOption.icon}
                <ChevronDownIcon className="h-3 w-3" />
            </button>

            {isOpen && (
                <div 
                    className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[180px] animate-fade-in-fast"
                    style={{ marginTop: '4px' }}
                >
                    {alignmentOptions.map((option) => (
                        <button
                            key={option.value}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleAlignmentSelect(option);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors ${
                                currentAlignment === option.value 
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                                    : 'text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            <div className="flex-shrink-0">
                                {option.icon}
                            </div>
                            <div className="flex-1 text-left">
                                <div className="font-medium">{option.label}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {option.preview}
                                </div>
                            </div>
                            {currentAlignment === option.value && (
                                <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

