import React, { useState, useEffect } from 'react';
import { XIcon } from './icons';

interface CreateWareModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, color: string) => Promise<void>;
}

const THEME_COLORS = [
    { name: 'Purple', value: 'purple', lightGradient: 'linear-gradient(135deg, #faf5ff, #f5f3ff)', darkGradient: 'linear-gradient(135deg, rgba(88, 28, 135, 0.2), rgba(79, 70, 229, 0.2))', borderColor: '#e9d5ff', borderColorDark: '#581c87', hoverBorder: '#c084fc', hoverBorderDark: '#a855f7' },
    { name: 'Blue', value: 'blue', lightGradient: 'linear-gradient(135deg, #eff6ff, #ecfeff)', darkGradient: 'linear-gradient(135deg, rgba(30, 64, 175, 0.2), rgba(6, 182, 212, 0.2))', borderColor: '#bfdbfe', borderColorDark: '#1e3a8a', hoverBorder: '#60a5fa', hoverBorderDark: '#3b82f6' },
    { name: 'Green', value: 'green', lightGradient: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', darkGradient: 'linear-gradient(135deg, rgba(20, 83, 45, 0.2), rgba(5, 150, 105, 0.2))', borderColor: '#bbf7d0', borderColorDark: '#14532d', hoverBorder: '#4ade80', hoverBorderDark: '#22c55e' },
    { name: 'Orange', value: 'orange', lightGradient: 'linear-gradient(135deg, #fff7ed, #fffbeb)', darkGradient: 'linear-gradient(135deg, rgba(154, 52, 18, 0.2), rgba(180, 83, 9, 0.2))', borderColor: '#fed7aa', borderColorDark: '#9a3412', hoverBorder: '#fb923c', hoverBorderDark: '#f97316' },
    { name: 'Pink', value: 'pink', lightGradient: 'linear-gradient(135deg, #fdf2f8, #fff1f2)', darkGradient: 'linear-gradient(135deg, rgba(157, 23, 77, 0.2), rgba(225, 29, 72, 0.2))', borderColor: '#fbcfe8', borderColorDark: '#9d174d', hoverBorder: '#f472b6', hoverBorderDark: '#ec4899' },
    { name: 'Teal', value: 'teal', lightGradient: 'linear-gradient(135deg, #f0fdfa, #ecfeff)', darkGradient: 'linear-gradient(135deg, rgba(19, 78, 74, 0.2), rgba(6, 182, 212, 0.2))', borderColor: '#99f6e4', borderColorDark: '#134e4a', hoverBorder: '#2dd4bf', hoverBorderDark: '#14b8a6' },
    { name: 'Red', value: 'red', lightGradient: 'linear-gradient(135deg, #fef2f2, #fff1f2)', darkGradient: 'linear-gradient(135deg, rgba(153, 27, 27, 0.2), rgba(225, 29, 72, 0.2))', borderColor: '#fecaca', borderColorDark: '#991b1b', hoverBorder: '#f87171', hoverBorderDark: '#ef4444' },
    { name: 'Indigo', value: 'indigo', lightGradient: 'linear-gradient(135deg, #eef2ff, #eff6ff)', darkGradient: 'linear-gradient(135deg, rgba(55, 48, 163, 0.2), rgba(30, 64, 175, 0.2))', borderColor: '#c7d2fe', borderColorDark: '#3730a3', hoverBorder: '#818cf8', hoverBorderDark: '#6366f1' },
    { name: 'Violet', value: 'violet', lightGradient: 'linear-gradient(135deg, #f5f3ff, #faf5ff)', darkGradient: 'linear-gradient(135deg, rgba(109, 40, 217, 0.2), rgba(88, 28, 135, 0.2))', borderColor: '#ddd6fe', borderColorDark: '#6d28d9', hoverBorder: '#a78bfa', hoverBorderDark: '#8b5cf6' },
    { name: 'Cyan', value: 'cyan', lightGradient: 'linear-gradient(135deg, #ecfeff, #e0f2fe)', darkGradient: 'linear-gradient(135deg, rgba(14, 116, 144, 0.2), rgba(30, 64, 175, 0.2))', borderColor: '#a5f3fc', borderColorDark: '#0e7490', hoverBorder: '#22d3ee', hoverBorderDark: '#06b6d4' },
    { name: 'Emerald', value: 'emerald', lightGradient: 'linear-gradient(135deg, #ecfdf5, #f0fdf4)', darkGradient: 'linear-gradient(135deg, rgba(5, 150, 105, 0.2), rgba(20, 83, 45, 0.2))', borderColor: '#a7f3d0', borderColorDark: '#059669', hoverBorder: '#34d399', hoverBorderDark: '#10b981' },
    { name: 'Amber', value: 'amber', lightGradient: 'linear-gradient(135deg, #fffbeb, #fff7ed)', darkGradient: 'linear-gradient(135deg, rgba(180, 83, 9, 0.2), rgba(154, 52, 18, 0.2))', borderColor: '#fde68a', borderColorDark: '#b45309', hoverBorder: '#fbbf24', hoverBorderDark: '#f59e0b' },
    { name: 'Rose', value: 'rose', lightGradient: 'linear-gradient(135deg, #fff1f2, #fdf2f8)', darkGradient: 'linear-gradient(135deg, rgba(225, 29, 72, 0.2), rgba(157, 23, 77, 0.2))', borderColor: '#fecdd3', borderColorDark: '#e11d48', hoverBorder: '#fb7185', hoverBorderDark: '#f43f5e' },
    { name: 'Lime', value: 'lime', lightGradient: 'linear-gradient(135deg, #f7fee7, #f0fdf4)', darkGradient: 'linear-gradient(135deg, rgba(101, 163, 13, 0.2), rgba(20, 83, 45, 0.2))', borderColor: '#d9f99d', borderColorDark: '#65a30d', hoverBorder: '#84cc16', hoverBorderDark: '#65a30d' },
    { name: 'Fuchsia', value: 'fuchsia', lightGradient: 'linear-gradient(135deg, #fdf4ff, #faf5ff)', darkGradient: 'linear-gradient(135deg, rgba(192, 38, 211, 0.2), rgba(109, 40, 217, 0.2))', borderColor: '#f5d0fe', borderColorDark: '#c026d3', hoverBorder: '#e879f9', hoverBorderDark: '#d946ef' },
    { name: 'Sky', value: 'sky', lightGradient: 'linear-gradient(135deg, #f0f9ff, #ecfeff)', darkGradient: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(14, 116, 144, 0.2))', borderColor: '#bae6fd', borderColorDark: '#0ea5e9', hoverBorder: '#38bdf8', hoverBorderDark: '#0ea5e9' },
    { name: 'Yellow', value: 'yellow', lightGradient: 'linear-gradient(135deg, #fefce8, #fffbeb)', darkGradient: 'linear-gradient(135deg, rgba(161, 98, 7, 0.2), rgba(180, 83, 9, 0.2))', borderColor: '#fef08a', borderColorDark: '#a16207', hoverBorder: '#facc15', hoverBorderDark: '#eab308' },
    { name: 'Slate', value: 'slate', lightGradient: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', darkGradient: 'linear-gradient(135deg, rgba(51, 65, 85, 0.2), rgba(30, 41, 59, 0.2))', borderColor: '#cbd5e1', borderColorDark: '#334155', hoverBorder: '#94a3b8', hoverBorderDark: '#64748b' },
    { name: 'Gray', value: 'gray', lightGradient: 'linear-gradient(135deg, #f9fafb, #f3f4f6)', darkGradient: 'linear-gradient(135deg, rgba(75, 85, 99, 0.2), rgba(55, 65, 81, 0.2))', borderColor: '#d1d5db', borderColorDark: '#4b5563', hoverBorder: '#9ca3af', hoverBorderDark: '#6b7280' },
];

export const CreateWareModal: React.FC<CreateWareModalProps> = ({
    isOpen,
    onClose,
    onCreate
}) => {
    const [name, setName] = useState('');
    const [selectedColor, setSelectedColor] = useState(THEME_COLORS[0].value);
    const [isCreating, setIsCreating] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const checkDarkMode = () => {
                setIsDarkMode(document.documentElement.classList.contains('dark') || 
                    window.matchMedia('(prefers-color-scheme: dark)').matches);
            };
            checkDarkMode();
            const observer = new MutationObserver(checkDarkMode);
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['class']
            });
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', checkDarkMode);
            return () => {
                observer.disconnect();
                mediaQuery.removeEventListener('change', checkDarkMode);
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsCreating(true);
        try {
            await onCreate(name.trim(), selectedColor);
            setName('');
            setSelectedColor(THEME_COLORS[0].value);
            onClose();
        } catch (error) {
            console.error('Error creating WARE:', error);
            alert('Failed to create WARE. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" data-modal>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700/50">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New WARE</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            WARE Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter WARE name..."
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                            autoFocus
                            disabled={isCreating}
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Theme Color
                        </label>
                        <div className="grid grid-cols-6 gap-1.5">
                            {THEME_COLORS.map(color => {
                                const isSelected = selectedColor === color.value;
                                return (
                                    <button
                                        key={color.value}
                                        type="button"
                                        onClick={() => setSelectedColor(color.value)}
                                        disabled={isCreating}
                                        className={`relative h-10 rounded-lg border-2 transition-all ${
                                            isSelected
                                                ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                        style={{
                                            background: isDarkMode ? color.darkGradient : color.lightGradient,
                                            borderColor: isSelected 
                                                ? (isDarkMode ? color.hoverBorderDark : color.hoverBorder)
                                                : (isDarkMode ? color.borderColorDark : color.borderColor)
                                        }}
                                        title={color.name}
                                    >
                                        {isSelected && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <svg className="w-6 h-6 text-gray-900 dark:text-white drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Select a color theme for your WARE
                        </p>
                    </div>

                    <div className="flex items-center gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                            disabled={isCreating}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isCreating || !name.trim()}
                        >
                            {isCreating ? 'Creating...' : 'Create WARE'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

