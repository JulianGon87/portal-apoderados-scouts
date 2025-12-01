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
        <div className="card-glass p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="text-xl font-semibold text-gray-800 line-clamp-1 uppercase" title={`${alumno.nombre} ${alumno.apellidos_alumno}`}>
                        {alumno.nombre} {alumno.apellidos_alumno}
                    </h4>
                    <p className="text-scout-blue font-medium mt-1 flex items-center gap-2">
                        <span className="text-xl">🏕️</span>
                        <span>{alumno.seccion || 'Sin Sección'}</span>
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Estado Cuenta</p>
                    {totalDebt === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold mt-1">
                            ✅ Al día
                        </span>
                    ) : (
                        <div className="mt-1">
                            <p className="text-2xl font-bold text-red-500">
                                ${totalDebt.toLocaleString('es-CL')}
                            </p>
                            <p className="text-xs text-red-400 font-medium">
                                {pendingCount} item{pendingCount === 1 ? '' : 's'} pendiente{pendingCount === 1 ? '' : 's'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Resumen de Otros Pagos (Mini badges) */}
            {paymentGroups.otros.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                    {paymentGroups.otros.slice(0, 3).map((p, i) => (
                        <span key={i} className={`text-[10px] px-2 py-1 rounded-full border truncate max-w-[120px] ${p.isPaid ? 'bg-green-50 text-green-700 border-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                            {p.tipo_item === 'campamento' ? '⛺' : p.tipo_item === 'evento' ? '🎉' : '🏷️'} {p.descripcion}
                        </span>
                    ))}
                    {paymentGroups.otros.length > 3 && (
                        <span className="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                            +{paymentGroups.otros.length - 3} más
                        </span>
                    )}
                </div>
            )}

            <div className="mt-auto pt-4">
                <button
                    onClick={handleCardClick}
                    className="w-full btn-scout text-sm py-2 flex items-center justify-center gap-2 group"
                >
                    <span>Ver Ficha Completa</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
            </div>
        </div>
    );
};

AlumnoCard.propTypes = {
    alumno: PropTypes.object.isRequired,
    pagos: PropTypes.array
};

export default AlumnoCard;
