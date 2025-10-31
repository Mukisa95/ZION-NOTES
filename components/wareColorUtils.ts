/**
 * Utility functions for WARE color themes
 */

export const getWareColorClasses = (color: string = 'purple') => {
    const colorMap: Record<string, {
        gradient: string;
        gradientDark: string;
        border: string;
        borderHover: string;
        borderDark: string;
        borderHoverDark: string;
        iconBg: string;
        iconBgDark: string;
        iconText: string;
        iconTextDark: string;
        buttonBg: string;
        buttonHover: string;
    }> = {
        purple: {
            gradient: 'from-purple-50 to-indigo-50',
            gradientDark: 'from-purple-900/20 to-indigo-900/20',
            border: 'border-purple-200',
            borderHover: 'border-purple-400',
            borderDark: 'dark:border-purple-700',
            borderHoverDark: 'dark:border-purple-500',
            iconBg: 'bg-purple-100',
            iconBgDark: 'dark:bg-purple-900/40',
            iconText: 'text-purple-600',
            iconTextDark: 'dark:text-purple-400',
            buttonBg: 'bg-purple-600',
            buttonHover: 'hover:bg-purple-700'
        },
        blue: {
            gradient: 'from-blue-50 to-cyan-50',
            gradientDark: 'from-blue-900/20 to-cyan-900/20',
            border: 'border-blue-200',
            borderHover: 'border-blue-400',
            borderDark: 'dark:border-blue-700',
            borderHoverDark: 'dark:border-blue-500',
            iconBg: 'bg-blue-100',
            iconBgDark: 'dark:bg-blue-900/40',
            iconText: 'text-blue-600',
            iconTextDark: 'dark:text-blue-400',
            buttonBg: 'bg-blue-600',
            buttonHover: 'hover:bg-blue-700'
        },
        green: {
            gradient: 'from-green-50 to-emerald-50',
            gradientDark: 'from-green-900/20 to-emerald-900/20',
            border: 'border-green-200',
            borderHover: 'border-green-400',
            borderDark: 'dark:border-green-700',
            borderHoverDark: 'dark:border-green-500',
            iconBg: 'bg-green-100',
            iconBgDark: 'dark:bg-green-900/40',
            iconText: 'text-green-600',
            iconTextDark: 'dark:text-green-400',
            buttonBg: 'bg-green-600',
            buttonHover: 'hover:bg-green-700'
        },
        orange: {
            gradient: 'from-orange-50 to-amber-50',
            gradientDark: 'from-orange-900/20 to-amber-900/20',
            border: 'border-orange-200',
            borderHover: 'border-orange-400',
            borderDark: 'dark:border-orange-700',
            borderHoverDark: 'dark:border-orange-500',
            iconBg: 'bg-orange-100',
            iconBgDark: 'dark:bg-orange-900/40',
            iconText: 'text-orange-600',
            iconTextDark: 'dark:text-orange-400',
            buttonBg: 'bg-orange-600',
            buttonHover: 'hover:bg-orange-700'
        },
        pink: {
            gradient: 'from-pink-50 to-rose-50',
            gradientDark: 'from-pink-900/20 to-rose-900/20',
            border: 'border-pink-200',
            borderHover: 'border-pink-400',
            borderDark: 'dark:border-pink-700',
            borderHoverDark: 'dark:border-pink-500',
            iconBg: 'bg-pink-100',
            iconBgDark: 'dark:bg-pink-900/40',
            iconText: 'text-pink-600',
            iconTextDark: 'dark:text-pink-400',
            buttonBg: 'bg-pink-600',
            buttonHover: 'hover:bg-pink-700'
        },
        teal: {
            gradient: 'from-teal-50 to-cyan-50',
            gradientDark: 'from-teal-900/20 to-cyan-900/20',
            border: 'border-teal-200',
            borderHover: 'border-teal-400',
            borderDark: 'dark:border-teal-700',
            borderHoverDark: 'dark:border-teal-500',
            iconBg: 'bg-teal-100',
            iconBgDark: 'dark:bg-teal-900/40',
            iconText: 'text-teal-600',
            iconTextDark: 'dark:text-teal-400',
            buttonBg: 'bg-teal-600',
            buttonHover: 'hover:bg-teal-700'
        },
        red: {
            gradient: 'from-red-50 to-rose-50',
            gradientDark: 'from-red-900/20 to-rose-900/20',
            border: 'border-red-200',
            borderHover: 'border-red-400',
            borderDark: 'dark:border-red-700',
            borderHoverDark: 'dark:border-red-500',
            iconBg: 'bg-red-100',
            iconBgDark: 'dark:bg-red-900/40',
            iconText: 'text-red-600',
            iconTextDark: 'dark:text-red-400',
            buttonBg: 'bg-red-600',
            buttonHover: 'hover:bg-red-700'
        },
        indigo: {
            gradient: 'from-indigo-50 to-blue-50',
            gradientDark: 'from-indigo-900/20 to-blue-900/20',
            border: 'border-indigo-200',
            borderHover: 'border-indigo-400',
            borderDark: 'dark:border-indigo-700',
            borderHoverDark: 'dark:border-indigo-500',
            iconBg: 'bg-indigo-100',
            iconBgDark: 'dark:bg-indigo-900/40',
            iconText: 'text-indigo-600',
            iconTextDark: 'dark:text-indigo-400',
            buttonBg: 'bg-indigo-600',
            buttonHover: 'hover:bg-indigo-700'
        }
    };
    return colorMap[color] || colorMap.purple;
};

