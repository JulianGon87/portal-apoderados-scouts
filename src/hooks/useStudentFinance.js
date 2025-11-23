import { useMemo } from 'react';

// Meses que se muestran en la UI (todo el año)
const MONTHS = [
    { id: 1, name: 'Enero' },
    { id: 2, name: 'Febrero' },
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

/**
 * Hook que calcula el estado financiero de un alumno.
 * - Agrupa cuotas mensuales por mes y permite varios ítems por mismo mes.
 * - Calcula deuda total y cantidad de ítems pendientes.
 */
export const useStudentFinance = (items = [], pagos = []) => {
    return useMemo(() => {
        // 1️⃣ Marcar cada ítem como pagado / no pagado
        const itemsWithStatus = items.map(item => ({
            ...item,
            isPaid: pagos.some(p => {
                if (p.estado !== 'PAGADO') return false;

                // PRIORIDAD 1: Coincidencia exacta por ID (Lógica robusta)
                if (p.item_id) {
                    return p.item_id === item.id;
                }

                // PRIORIDAD 2: Compatibilidad con pagos antiguos (Legacy)
                // Solo si el pago NO tiene ID asociado, intentamos calzarlo por fecha/tipo Y MONTO.
                // Agregamos validación de monto para evitar falsos positivos con deudas nuevas.
                return (
                    !p.item_id && // Solo si el pago no está vinculado a nada más
                    p.anio === item.anio &&
                    (item.tipo_item === 'cuota_mensual' ? p.mes === item.mes : true) &&
                    (p.tipo_item === item.tipo_item || (!p.tipo_item && item.tipo_item === 'cuota_mensual')) &&
                    p.monto === item.monto // NUEVO: El monto debe coincidir para asumir el pago
                );
            }),
        }));

        // 2️⃣ Filtrar solo cuotas mensuales y ordenar por mes
        const cuotasMensuales = itemsWithStatus
            .filter(i => i.tipo_item === 'cuota_mensual')
            .sort((a, b) => a.mes - b.mes);

        // 3️⃣ Agrupar por mes → cada mes contiene un array de ítems
        const mensualDetails = MONTHS.map(month => {
            const itemsDelMes = cuotasMensuales.filter(c => c.mes === month.id);
            return {
                monthId: month.id,
                monthName: month.name,
                // Si no hay ítems, la lista queda vacía y la UI mostrará "Sin cuotas asignadas"
                items: itemsDelMes.map(i => ({
                    id: i.id,
                    descripcion: i.descripcion,
                    monto: i.monto,
                    isPaid: i.isPaid,
                    seccion: i.seccion,
                })),
            };
        });

        // 4️⃣ Otros pagos (no mensuales)
        const otrosPagos = itemsWithStatus.filter(i => i.tipo_item !== 'cuota_mensual');

        // 5️⃣ Cálculo de deuda total
        const deudaCuotas = cuotasMensuales
            .filter(i => !i.isPaid)
            .reduce((acc, i) => acc + i.monto, 0);
        const deudaOtros = otrosPagos
            .filter(i => !i.isPaid)
            .reduce((acc, i) => acc + i.monto, 0);
        const totalDebt = deudaCuotas + deudaOtros;

        // 6️⃣ Conteo de ítems pendientes (todos los ítems, no solo uno por mes)
        const pendingCount = itemsWithStatus.filter(i => !i.isPaid).length;

        return {
            paymentGroups: {
                mensual: { details: mensualDetails },
                otros: otrosPagos,
            },
            totalDebt,
            pendingCount,
        };
    }, [items, pagos]);
};
