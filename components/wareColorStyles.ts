/**
 * Helper functions to get WARE color styles for inline styling
 */

export interface WareColorStyle {
    background: string;
    backgroundDark: string;
    borderColor: string;
    borderColorDark: string;
    borderColorHover: string;
    borderColorHoverDark: string;
    iconBg: string;
    iconBgDark: string;
    iconColor: string;
    iconColorDark: string;
    buttonBg: string;
    buttonBgHover: string;
}

const COLOR_STYLES: Record<string, WareColorStyle> = {
    purple: {
        background: 'linear-gradient(135deg, #faf5ff, #f5f3ff)',
        backgroundDark: 'linear-gradient(135deg, rgba(88, 28, 135, 0.2), rgba(79, 70, 229, 0.2))',
        borderColor: '#e9d5ff',
        borderColorDark: '#581c87',
        borderColorHover: '#c084fc',
        borderColorHoverDark: '#a855f7',
        iconBg: '#f3e8ff',
        iconBgDark: 'rgba(88, 28, 135, 0.4)',
        iconColor: '#9333ea',
        iconColorDark: '#c084fc',
        buttonBg: '#9333ea',
        buttonBgHover: '#7e22ce'
    },
    blue: {
        background: 'linear-gradient(135deg, #eff6ff, #ecfeff)',
        backgroundDark: 'linear-gradient(135deg, rgba(30, 64, 175, 0.2), rgba(6, 182, 212, 0.2))',
        borderColor: '#bfdbfe',
        borderColorDark: '#1e3a8a',
        borderColorHover: '#60a5fa',
        borderColorHoverDark: '#3b82f6',
        iconBg: '#dbeafe',
        iconBgDark: 'rgba(30, 64, 175, 0.4)',
        iconColor: '#2563eb',
        iconColorDark: '#60a5fa',
        buttonBg: '#2563eb',
        buttonBgHover: '#1d4ed8'
    },
    green: {
        background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
        backgroundDark: 'linear-gradient(135deg, rgba(20, 83, 45, 0.2), rgba(5, 150, 105, 0.2))',
        borderColor: '#bbf7d0',
        borderColorDark: '#14532d',
        borderColorHover: '#4ade80',
        borderColorHoverDark: '#22c55e',
        iconBg: '#dcfce7',
        iconBgDark: 'rgba(20, 83, 45, 0.4)',
        iconColor: '#16a34a',
        iconColorDark: '#4ade80',
        buttonBg: '#16a34a',
        buttonBgHover: '#15803d'
    },
    orange: {
        background: 'linear-gradient(135deg, #fff7ed, #fffbeb)',
        backgroundDark: 'linear-gradient(135deg, rgba(154, 52, 18, 0.2), rgba(180, 83, 9, 0.2))',
        borderColor: '#fed7aa',
        borderColorDark: '#9a3412',
        borderColorHover: '#fb923c',
        borderColorHoverDark: '#f97316',
        iconBg: '#fed7aa',
        iconBgDark: 'rgba(154, 52, 18, 0.4)',
        iconColor: '#ea580c',
        iconColorDark: '#fb923c',
        buttonBg: '#ea580c',
        buttonBgHover: '#c2410c'
    },
    pink: {
        background: 'linear-gradient(135deg, #fdf2f8, #fff1f2)',
        backgroundDark: 'linear-gradient(135deg, rgba(157, 23, 77, 0.2), rgba(225, 29, 72, 0.2))',
        borderColor: '#fbcfe8',
        borderColorDark: '#9d174d',
        borderColorHover: '#f472b6',
        borderColorHoverDark: '#ec4899',
        iconBg: '#fce7f3',
        iconBgDark: 'rgba(157, 23, 77, 0.4)',
        iconColor: '#db2777',
        iconColorDark: '#f472b6',
        buttonBg: '#db2777',
        buttonBgHover: '#be185d'
    },
    teal: {
        background: 'linear-gradient(135deg, #f0fdfa, #ecfeff)',
        backgroundDark: 'linear-gradient(135deg, rgba(19, 78, 74, 0.2), rgba(6, 182, 212, 0.2))',
        borderColor: '#99f6e4',
        borderColorDark: '#134e4a',
        borderColorHover: '#2dd4bf',
        borderColorHoverDark: '#14b8a6',
        iconBg: '#ccfbf1',
        iconBgDark: 'rgba(19, 78, 74, 0.4)',
        iconColor: '#0d9488',
        iconColorDark: '#2dd4bf',
        buttonBg: '#0d9488',
        buttonBgHover: '#0f766e'
    },
    red: {
        background: 'linear-gradient(135deg, #fef2f2, #fff1f2)',
        backgroundDark: 'linear-gradient(135deg, rgba(153, 27, 27, 0.2), rgba(225, 29, 72, 0.2))',
        borderColor: '#fecaca',
        borderColorDark: '#991b1b',
        borderColorHover: '#f87171',
        borderColorHoverDark: '#ef4444',
        iconBg: '#fee2e2',
        iconBgDark: 'rgba(153, 27, 27, 0.4)',
        iconColor: '#dc2626',
        iconColorDark: '#f87171',
        buttonBg: '#dc2626',
        buttonBgHover: '#b91c1c'
    },
    indigo: {
        background: 'linear-gradient(135deg, #eef2ff, #eff6ff)',
        backgroundDark: 'linear-gradient(135deg, rgba(55, 48, 163, 0.2), rgba(30, 64, 175, 0.2))',
        borderColor: '#c7d2fe',
        borderColorDark: '#3730a3',
        borderColorHover: '#818cf8',
        borderColorHoverDark: '#6366f1',
        iconBg: '#e0e7ff',
        iconBgDark: 'rgba(55, 48, 163, 0.4)',
        iconColor: '#4f46e5',
        iconColorDark: '#818cf8',
        buttonBg: '#4f46e5',
        buttonBgHover: '#4338ca'
    },
    violet: {
        background: 'linear-gradient(135deg, #f5f3ff, #faf5ff)',
        backgroundDark: 'linear-gradient(135deg, rgba(109, 40, 217, 0.2), rgba(88, 28, 135, 0.2))',
        borderColor: '#ddd6fe',
        borderColorDark: '#6d28d9',
        borderColorHover: '#a78bfa',
        borderColorHoverDark: '#8b5cf6',
        iconBg: '#ede9fe',
        iconBgDark: 'rgba(109, 40, 217, 0.4)',
        iconColor: '#7c3aed',
        iconColorDark: '#a78bfa',
        buttonBg: '#7c3aed',
        buttonBgHover: '#6d28d9'
    },
    cyan: {
        background: 'linear-gradient(135deg, #ecfeff, #e0f2fe)',
        backgroundDark: 'linear-gradient(135deg, rgba(14, 116, 144, 0.2), rgba(30, 64, 175, 0.2))',
        borderColor: '#a5f3fc',
        borderColorDark: '#0e7490',
        borderColorHover: '#22d3ee',
        borderColorHoverDark: '#06b6d4',
        iconBg: '#cffafe',
        iconBgDark: 'rgba(14, 116, 144, 0.4)',
        iconColor: '#0891b2',
        iconColorDark: '#22d3ee',
        buttonBg: '#0891b2',
        buttonBgHover: '#0e7490'
    },
    emerald: {
        background: 'linear-gradient(135deg, #ecfdf5, #f0fdf4)',
        backgroundDark: 'linear-gradient(135deg, rgba(5, 150, 105, 0.2), rgba(20, 83, 45, 0.2))',
        borderColor: '#a7f3d0',
        borderColorDark: '#059669',
        borderColorHover: '#34d399',
        borderColorHoverDark: '#10b981',
        iconBg: '#d1fae5',
        iconBgDark: 'rgba(5, 150, 105, 0.4)',
        iconColor: '#047857',
        iconColorDark: '#34d399',
        buttonBg: '#047857',
        buttonBgHover: '#059669'
    },
    amber: {
        background: 'linear-gradient(135deg, #fffbeb, #fff7ed)',
        backgroundDark: 'linear-gradient(135deg, rgba(180, 83, 9, 0.2), rgba(154, 52, 18, 0.2))',
        borderColor: '#fde68a',
        borderColorDark: '#b45309',
        borderColorHover: '#fbbf24',
        borderColorHoverDark: '#f59e0b',
        iconBg: '#fef3c7',
        iconBgDark: 'rgba(180, 83, 9, 0.4)',
        iconColor: '#d97706',
        iconColorDark: '#fbbf24',
        buttonBg: '#d97706',
        buttonBgHover: '#b45309'
    },
    rose: {
        background: 'linear-gradient(135deg, #fff1f2, #fdf2f8)',
        backgroundDark: 'linear-gradient(135deg, rgba(225, 29, 72, 0.2), rgba(157, 23, 77, 0.2))',
        borderColor: '#fecdd3',
        borderColorDark: '#e11d48',
        borderColorHover: '#fb7185',
        borderColorHoverDark: '#f43f5e',
        iconBg: '#ffe4e6',
        iconBgDark: 'rgba(225, 29, 72, 0.4)',
        iconColor: '#be185d',
        iconColorDark: '#fb7185',
        buttonBg: '#be185d',
        buttonBgHover: '#e11d48'
    },
    lime: {
        background: 'linear-gradient(135deg, #f7fee7, #f0fdf4)',
        backgroundDark: 'linear-gradient(135deg, rgba(101, 163, 13, 0.2), rgba(20, 83, 45, 0.2))',
        borderColor: '#d9f99d',
        borderColorDark: '#65a30d',
        borderColorHover: '#84cc16',
        borderColorHoverDark: '#65a30d',
        iconBg: '#ecfccb',
        iconBgDark: 'rgba(101, 163, 13, 0.4)',
        iconColor: '#4d7c0f',
        iconColorDark: '#84cc16',
        buttonBg: '#4d7c0f',
        buttonBgHover: '#65a30d'
    },
    fuchsia: {
        background: 'linear-gradient(135deg, #fdf4ff, #faf5ff)',
        backgroundDark: 'linear-gradient(135deg, rgba(192, 38, 211, 0.2), rgba(109, 40, 217, 0.2))',
        borderColor: '#f5d0fe',
        borderColorDark: '#c026d3',
        borderColorHover: '#e879f9',
        borderColorHoverDark: '#d946ef',
        iconBg: '#fae8ff',
        iconBgDark: 'rgba(192, 38, 211, 0.4)',
        iconColor: '#a21caf',
        iconColorDark: '#e879f9',
        buttonBg: '#a21caf',
        buttonBgHover: '#c026d3'
    },
    sky: {
        background: 'linear-gradient(135deg, #f0f9ff, #ecfeff)',
        backgroundDark: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(14, 116, 144, 0.2))',
        borderColor: '#bae6fd',
        borderColorDark: '#0ea5e9',
        borderColorHover: '#38bdf8',
        borderColorHoverDark: '#0ea5e9',
        iconBg: '#e0f2fe',
        iconBgDark: 'rgba(14, 165, 233, 0.4)',
        iconColor: '#0284c7',
        iconColorDark: '#38bdf8',
        buttonBg: '#0284c7',
        buttonBgHover: '#0ea5e9'
    },
    yellow: {
        background: 'linear-gradient(135deg, #fefce8, #fffbeb)',
        backgroundDark: 'linear-gradient(135deg, rgba(161, 98, 7, 0.2), rgba(180, 83, 9, 0.2))',
        borderColor: '#fef08a',
        borderColorDark: '#a16207',
        borderColorHover: '#facc15',
        borderColorHoverDark: '#eab308',
        iconBg: '#fef9c3',
        iconBgDark: 'rgba(161, 98, 7, 0.4)',
        iconColor: '#854d0e',
        iconColorDark: '#facc15',
        buttonBg: '#854d0e',
        buttonBgHover: '#a16207'
    },
    slate: {
        background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
        backgroundDark: 'linear-gradient(135deg, rgba(51, 65, 85, 0.2), rgba(30, 41, 59, 0.2))',
        borderColor: '#cbd5e1',
        borderColorDark: '#334155',
        borderColorHover: '#94a3b8',
        borderColorHoverDark: '#64748b',
        iconBg: '#f1f5f9',
        iconBgDark: 'rgba(51, 65, 85, 0.4)',
        iconColor: '#475569',
        iconColorDark: '#94a3b8',
        buttonBg: '#475569',
        buttonBgHover: '#334155'
    },
    gray: {
        background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)',
        backgroundDark: 'linear-gradient(135deg, rgba(75, 85, 99, 0.2), rgba(55, 65, 81, 0.2))',
        borderColor: '#d1d5db',
        borderColorDark: '#4b5563',
        borderColorHover: '#9ca3af',
        borderColorHoverDark: '#6b7280',
        iconBg: '#f3f4f6',
        iconBgDark: 'rgba(75, 85, 99, 0.4)',
        iconColor: '#4b5563',
        iconColorDark: '#9ca3af',
        buttonBg: '#4b5563',
        buttonBgHover: '#374151'
    }
};

export const getWareColorStyle = (color: string = 'purple'): WareColorStyle => {
    return COLOR_STYLES[color] || COLOR_STYLES.purple;
};
