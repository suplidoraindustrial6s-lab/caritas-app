import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'outline';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
    const variants = {
        default: "bg-primary/10 text-primary border-primary/20",
        success: "bg-emerald-100 text-emerald-800 border-emerald-200",
        warning: "bg-amber-100 text-amber-800 border-amber-200",
        error: "bg-red-100 text-red-800 border-red-200",
        outline: "bg-transparent border-gray-300 text-gray-600",
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]}`}>
            {children}
        </span>
    );
}
