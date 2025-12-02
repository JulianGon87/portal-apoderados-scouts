import React from 'react';

/**
 * Card reutilizable para mostrar métricas en el dashboard
 */
const StatsCard = ({
    title,
    value,
    icon,
    trend,
    color = 'blue',
    subtitle
}) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        green: 'bg-green-50 text-green-600 border-green-200',
        yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
        red: 'bg-red-50 text-red-600 border-red-200',
        purple: 'bg-purple-50 text-purple-600 border-purple-200',
    };

    const iconBgColors = {
        blue: 'bg-blue-100',
        green: 'bg-green-100',
        yellow: 'bg-yellow-100',
        red: 'bg-red-100',
        purple: 'bg-purple-100',
    };

    return (
        <div className={`card-glass p-4 border-l-4 ${colorClasses[color]}`}>
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    {subtitle && (
                        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
                    )}
                </div>
                {icon && (
                    <div className={`${iconBgColors[color]} p-3 rounded-full`}>
                        <span className="text-2xl">{icon}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatsCard;
