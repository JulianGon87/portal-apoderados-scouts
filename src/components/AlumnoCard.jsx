import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

const MONTHS = [
    { id: 3, name: 'Marzo' },
    { id: 4, name: 'Abril' },
    { id: 5, name: 'Mayo' },
    { id: 6, name: 'Junio' },
    { id: 7, name: 'Julio' },
    { id: 8, name: 'Agosto' },
    { id: 9, name: 'Septiembre' },
    { id: 10, name: 'Octubre' },
    { id: 11, name: 'Noviembre' },
    { id: 12, name: 'Diciembre' },
];

const CUOTA_VALUE = 5000;

const AlumnoCard = ({ alumno, pagos = [] }) => {
    const navigate = useNavigate();
    const items = alumno.items || [];

    const { paymentGroups, totalDebt, pendingCount } = useMemo(() => {
        const currentYear = new Date().getFullYear();

        // 1. Mapear items a estado de pago
        const itemsWithStatus = items.map(item => {
            // Buscar si existe un pago con estado PAGADO para este item
            // Coincidencia por: tipo, año, mes (si aplica) y monto aproximado
            const isPaid = pagos.some(p =>
                p.estado === 'PAGADO' &&
                p.anio === item.anio &&
                (item.tipo_item === 'cuota_mensual' ? p.mes === item.mes : true) &&
                // Si es cuota mensual, el tipo puede no estar en pagos antiguos, así que asumimos cuota si tiene mes
                (p.tipo_item === item.tipo_item || (!p.tipo_item && item.tipo_item === 'cuota_mensual'))
            );

            return {
                ...item,
                isPaid
            };
        });

        // 2. Agrupar Cuotas Mensuales
        const cuotasMensuales = itemsWithStatus
            .filter(i => i.tipo_item === 'cuota_mensual')
            .sort((a, b) => a.mes - b.mes);

        // Rellenar meses faltantes para visualización (opcional, pero bueno para UX)
        const mensualDetails = MONTHS.map(month => {
            const itemParaMes = cuotasMensuales.find(c => c.mes === month.id);

            if (itemParaMes) {
                return {
                    monthId: month.id,
                    monthName: month.name,
                    isPaid: itemParaMes.isPaid,
                    amount: itemParaMes.monto,
                    hasItem: true
                };
            }

            // Si no hay item para este mes, no es cobrable aún o no existe cobro
            return {
                monthId: month.id,
                monthName: month.name,
                isPaid: false, // Irrelevante si hasItem es false
                hasItem: false
            };
        });

        // 3. Agrupar Otros Pagos
        const otrosPagos = itemsWithStatus.filter(i => i.tipo_item !== 'cuota_mensual');

        // 4. Calcular Deuda
        // Solo sumar items que existen y no están pagados
        const deudaCuotas = cuotasMensuales.filter(i => !i.isPaid).reduce((acc, i) => acc + i.monto, 0);
        const deudaOtros = otrosPagos.filter(i => !i.isPaid).reduce((acc, i) => acc + i.monto, 0);

        const totalDebt = deudaCuotas + deudaOtros;
        const pendingCount = itemsWithStatus.filter(i => !i.isPaid).length;

        return {
            paymentGroups: {
                mensual: { details: mensualDetails },
                otros: otrosPagos
            },
            totalDebt,
            pendingCount
        };
    }, [items, pagos]);

    const handleCardClick = () => {
        // Fallback a ID si no hay slug (para compatibilidad durante migración)
        const identifier = alumno.slug || alumno.id;
        navigate(`/alumno/${identifier}`);
    };

    return (
        <div className="card-glass p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="text-xl font-semibold text-gray-800 line-clamp-1" title={alumno.nombre}>
                        {alumno.nombre}
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
