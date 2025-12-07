import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useStudentFinance } from '../hooks/useStudentFinance';

const AlumnoCard = ({ alumno, pagos = [] }) => {
    const navigate = useNavigate();
    const items = alumno.items || [];

    const { paymentGroups, totalDebt, pendingCount } = useStudentFinance(items, pagos);

    const handleCardClick = () => {
        // Fallback a ID si no hay slug (para compatibilidad durante migración)
        const identifier = alumno.slug || alumno.id;
        navigate(`/alumno/${identifier}`);
    };

    return (
        <div
            onClick={handleCardClick}
            className="group relative bg-white rounded-2xl p-4 shadow-sm border border-gray-100 transition-all active:scale-[0.98] cursor-pointer overflow-hidden"
        >
            {/* Indicador lateral de color (Estético) */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${totalDebt > 0 ? 'bg-red-500' : 'bg-scout-green'}`} />

            <div className="pl-3 flex flex-col h-full">
                {/* Cabecera: Nombre y Estado */}
                <div className="flex justify-between items-start gap-4 mb-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded-full">
                                {alumno.seccion || 'Sin Sección'}
                            </span>
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 leading-tight truncate pr-2">
                            {alumno.nombre} {alumno.apellidos_alumno?.split(' ')[0]}
                        </h4>
                    </div>

                    {/* Estado de Cuenta Compacto */}
                    <div className="flex-shrink-0 text-right">
                        {totalDebt === 0 ? (
                            <div className="flex flex-col items-end">
                                <span className="w-8 h-8 flex items-center justify-center bg-green-50 text-green-600 rounded-full mb-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </span>
                                <span className="text-[10px] font-bold text-green-700">Al día</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-end">
                                <span className="text-lg font-bold text-red-600 leading-none">
                                    ${totalDebt.toLocaleString('es-CL')}
                                </span>
                                <span className="text-[10px] text-red-400 font-medium mt-0.5">
                                    {pendingCount} pendiente{pendingCount !== 1 && 's'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Badges de Items (Scroll Horizontal en móvil) */}
                {paymentGroups.otros.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar mask-fade-right mb-1">
                        {paymentGroups.otros.map((p) => (
                            <span
                                key={p.id}
                                className={`
                                    flex-shrink-0 text-[10px] px-2.5 py-1 rounded-lg border font-medium truncate max-w-[140px] flex items-center gap-1.5
                                    ${p.isPaid
                                        ? 'bg-green-50 text-green-700 border-green-100'
                                        : 'bg-amber-50 text-amber-700 border-amber-100'}
                                `}
                            >
                                <span>{p.tipo_item === 'campamento' ? '⛺' : p.tipo_item === 'evento' ? '🎉' : '🏷️'}</span>
                                {p.descripcion}
                            </span>
                        ))}
                    </div>
                )}

                {/* Footer Tarjeta: Call to Action sutil */}
                <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400 group-hover:text-scout-blue transition-colors">
                    <span className="font-medium">Toca para ver detalles</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

AlumnoCard.propTypes = {
    alumno: PropTypes.object.isRequired,
    pagos: PropTypes.array
};

export default AlumnoCard;
