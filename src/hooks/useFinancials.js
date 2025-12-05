import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/client';

export const useFinancials = (filters = {}) => {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({
        ingresosPortal: 0,
        ingresosExtra: 0,
        totalIngresos: 0,
        totalEgresos: 0,
        balance: 0
    });
    const [movements, setMovements] = useState([]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const { section, month, year } = filters;

            // 1. Fetch Pagos (Ingresos del Portal)
            let pagosQuery = supabase
                .from('pagos')
                .select('monto, fecha_pago, alumno:alumnos(seccion)')
                .eq('estado', 'PAGADO');

            if (year) {
                const startDate = `${year}-01-01`;
                const endDate = `${year}-12-31`;
                pagosQuery = pagosQuery.gte('fecha_pago', startDate).lte('fecha_pago', endDate);
            }

            // Note: Month filtering for pagos is tricky if we want precise dates, 
            // but for now let's assume we filter by the date of payment.
            if (month && year) {
                // Construct date range for the month
                const start = new Date(year, month - 1, 1).toISOString().split('T')[0];
                const end = new Date(year, month, 0).toISOString().split('T')[0];
                pagosQuery = pagosQuery.gte('fecha_pago', start).lte('fecha_pago', end);
            }

            const { data: pagosData, error: pagosError } = await pagosQuery;
            if (pagosError) throw pagosError;

            // Filter by section in JS because of the join complexity or if RLS allows
            // Ideally we would filter in DB but 'alumnos' relation filtering might be needed.
            // For simplicity and small data, filtering in JS for section.
            let filteredPagos = pagosData;
            if (section && section !== 'todas') {
                filteredPagos = pagosData.filter(p =>
                    p.alumno?.seccion?.toLowerCase() === section.toLowerCase()
                );
            }

            const ingresosPortal = filteredPagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);

            // 2. Fetch Movimientos Financieros (Ingresos Extra y Egresos)
            let movQuery = supabase
                .from('movimientos_financieros')
                .select('*')
                .order('fecha', { ascending: false });

            if (section && section !== 'todas') {
                movQuery = movQuery.eq('seccion', section);
            }
            if (year) {
                const startDate = `${year}-01-01`;
                const endDate = `${year}-12-31`;
                movQuery = movQuery.gte('fecha', startDate).lte('fecha', endDate);
            }
            if (month && year) {
                const start = new Date(year, month - 1, 1).toISOString().split('T')[0];
                const end = new Date(year, month, 0).toISOString().split('T')[0];
                movQuery = movQuery.gte('fecha', start).lte('fecha', end);
            }

            const { data: movData, error: movError } = await movQuery;
            if (movError) throw movError;

            const ingresosExtra = movData
                .filter(m => m.tipo === 'ingreso')
                .reduce((sum, m) => sum + (Number(m.monto) || 0), 0);

            const totalEgresos = movData
                .filter(m => m.tipo === 'egreso')
                .reduce((sum, m) => sum + (Number(m.monto) || 0), 0);

            setSummary({
                ingresosPortal,
                ingresosExtra,
                totalIngresos: ingresosPortal + ingresosExtra,
                totalEgresos,
                balance: (ingresosPortal + ingresosExtra) - totalEgresos
            });

            setMovements(movData);

        } catch (error) {
            console.error('Error fetching financials:', error);
        } finally {
            setLoading(false);
        }
    }, [JSON.stringify(filters)]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const addMovement = async (movement) => {
        const { data, error } = await supabase
            .from('movimientos_financieros')
            .insert([movement])
            .select()
            .single();

        if (error) throw error;

        // Refresh data
        fetchData();
        return data;
    };

    return { loading, summary, movements, addMovement, refresh: fetchData };
};
