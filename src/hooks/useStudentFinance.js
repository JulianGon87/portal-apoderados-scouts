import { useMemo } from 'react';

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

export const useStudentFinance = (items = [], pagos = []) => {
    return useMemo(() => {
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

        // Rellenar meses faltantes para visualización
        const mensualDetails = MONTHS.map(month => {
            const itemParaMes = cuotasMensuales.find(c => c.mes === month.id);

            if (itemParaMes) {
                return {
                    monthId: month.id,
                    monthName: month.name,
                    isPaid: itemParaMes.isPaid,
                    amount: itemParaMes.monto,
                    hasItem: true,
                    descripcion: itemParaMes.descripcion
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
};
