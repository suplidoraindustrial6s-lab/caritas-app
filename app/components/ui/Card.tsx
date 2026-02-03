import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
}

export function Card({ children, className = '', title }: CardProps) {
    return (
        <div className={`bg-white rounded-2xl shadow-sm border border-border/50 overflow-hidden ${className}`}>
            {title && (
                <div className="px-6 py-4 border-b border-border/50 bg-muted/20">
                    <h3 className="font-semibold text-lg text-primary">{title}</h3>
                </div>
            )}
            <div className="p-6">
                {children}
            </div>
        </div>
    );
}
