import React from 'react';

const SkeletonAlumnoCard = () => {
    return (
        <div className="bg-white rounded-2xl p-5 pt-6 shadow-sm border border-stone-100 overflow-hidden relative">
            {/* Indicador Superior Skeleton */}
            <div className="absolute left-0 top-0 right-0 h-1.5 bg-stone-200 animate-pulse" />

            <div className="flex flex-col h-full animate-pulse">
                {/* Cabecera Skeleton */}
                <div className="flex justify-between items-start gap-4 mb-3">
                    <div className="flex-1 space-y-2">
                        {/* Badge Sección */}
                        <div className="h-4 w-20 bg-stone-200 rounded-full" />
                        {/* Nombre */}
                        <div className="h-6 w-3/4 bg-stone-200 rounded" />
                    </div>

                    {/* Estado Cuenta Skeleton */}
                    <div className="flex flex-col items-end space-y-1">
                        <div className="h-7 w-24 bg-stone-200 rounded" />
                        <div className="h-3 w-16 bg-stone-100 rounded" />
                    </div>
                </div>

                {/* Badges Items Skeleton */}
                <div className="flex gap-2 mb-4 overflow-hidden">
                    <div className="h-6 w-24 bg-stone-100 rounded-lg" />
                    <div className="h-6 w-20 bg-stone-100 rounded-lg" />
                    <div className="h-6 w-16 bg-stone-100 rounded-lg" />
                </div>

                {/* Footer Skeleton */}
                <div className="mt-auto pt-3 border-t border-stone-50 flex justify-between items-center">
                    <div className="h-3 w-32 bg-stone-100 rounded" />
                    <div className="h-4 w-4 bg-stone-100 rounded-full" />
                </div>
            </div>
        </div>
    );
};

export default SkeletonAlumnoCard;
