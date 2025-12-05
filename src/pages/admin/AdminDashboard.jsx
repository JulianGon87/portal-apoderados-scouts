import React, { useState, useEffect } from 'react';

import StatsCard from '../../components/admin/StatsCard';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { supabase } from '../../supabase/client';

/**
 * Helper para obtener estadísticas básicas
 */
const fetchBasicStats = async () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Fechas clave
    const startCurrent = new Date(currentYear, currentMonth, 1).toISOString();
    const startNext = new Date(currentYear, currentMonth + 1, 1).toISOString();

    // 1. Total recaudado del mes actual
    const { data: currentData, error: currentError } = await supabase
        .from('pagos')
        .select('monto')
        .eq('estado', 'PAGADO')
        .gte('fecha_pago', startCurrent)
        .lt('fecha_pago', startNext);

    if (currentError) throw currentError;
    const totalRecaudado = currentData?.reduce((sum, pago) => sum + (pago.monto || 0), 0) || 0;

    // 2. Tickets pendientes
    const { count: ticketsPendientes, error: ticketsError } = await supabase
        .from('tickets_pago')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'PENDIENTE');

    if (ticketsError) throw ticketsError;

    // 3. Pagos por aprobar
    const { count: pagosAprobar, error: aprobarError } = await supabase
        .from('tickets_pago')
        .select('*', { count: 'exact', head: true })
        .in('estado', ['PENDIENTE', 'RECHAZADO']);

    if (aprobarError) throw aprobarError;

    return { totalRecaudado, ticketsPendientes, pagosAprobar };
};

/**
 * Helper para calcular deuda total
 */
const calculateDebt = async (currentYear) => {
    const { data: itemsData, error: itemsError } = await supabase
        .from('items_pago')
        .select('monto, seccion')
        .eq('anio', currentYear);

    if (itemsError) throw itemsError;

    const { data: alumnosData, error: alumnosError } = await supabase
        .from('alumnos')
        .select('id, seccion');

    if (alumnosError) throw alumnosError;

    const { data: todosPagos, error: todosPagosError } = await supabase
        .from('pagos')
        .select('item_id, alumno_id')
        .eq('estado', 'PAGADO');

    if (todosPagosError) throw todosPagosError;

    let deudaTotal = 0;
    itemsData?.forEach(item => {
        const alumnosAplicables = alumnosData?.filter(alumno =>
            !item.seccion || item.seccion.toUpperCase() === (alumno.seccion || '').toUpperCase()
        ) || [];

        alumnosAplicables.forEach(alumno => {
            const yaPago = todosPagos?.some(pago =>
                pago.alumno_id === alumno.id && pago.item_id === item.id
            );
            if (!yaPago) {
                deudaTotal += item.monto || 0;
            }
        });
    });

    return deudaTotal;
};

/**
 * Helper para obtener actividad reciente
 */
const fetchActivity = async () => {
    const activity = [];

    // Tickets recientes
    const { data: recentTickets } = await supabase
        .from('tickets_pago')
        .select(`id, monto_total, created_at, alumno:alumnos(nombre, apellidos)`)
        .order('created_at', { ascending: false })
        .limit(3);

    if (recentTickets) {
        recentTickets.forEach(ticket => {
            activity.push({
                type: 'ticket',
                icon: '🎫',
                title: `Nuevo ticket #${ticket.id}`,
                subtitle: `${ticket.alumno?.nombre} ${ticket.alumno?.apellidos} - $${ticket.monto_total?.toLocaleString('es-CL')}`,
                timestamp: ticket.created_at,
                id: ticket.id
            });
        });
    }

    // Items recientes
    const { data: recentItems } = await supabase
        .from('items_pago')
        .select('id, descripcion, monto, created_at, seccion, created_by')
        .order('created_at', { ascending: false })
        .limit(3);

    if (recentItems) {
        const creatorIds = [...new Set(recentItems.map(item => item.created_by).filter(Boolean))];
        let creatorsMap = {};

        if (creatorIds.length > 0) {
            const { data: creatorsData } = await supabase
                .from('users')
                .select('id, nombre')
                .in('id', creatorIds);

            if (creatorsData) {
                creatorsMap = Object.fromEntries(creatorsData.map(u => [u.id, u.nombre]));
            }
        }

        recentItems.forEach(item => {
            const creatorName = creatorsMap[item.created_by] || 'Sistema';
            activity.push({
                type: 'item',
                icon: '💰',
                title: `Item creado: ${item.descripcion}`,
                subtitle: `$${item.monto?.toLocaleString('es-CL')} - ${item.seccion || 'Todos'} - Por ${creatorName}`,
                timestamp: item.created_at,
                id: item.id
            });
        });
    }

    return [...activity].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 6);
};

const AdminDashboard = () => {
    const { isLoading: authLoading } = useAdminAuth(['ver_dashboard', 'ver_metricas']);
    const [stats, setStats] = useState({
        totalRecaudado: 0,
        ticketsPendientes: 0,
        pagosAprobar: 0,
        deudaTotal: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const currentYear = new Date().getFullYear();

                const [basicStats, deudaTotal, activity] = await Promise.all([
                    fetchBasicStats(),
                    calculateDebt(currentYear),
                    fetchActivity()
                ]);

                setStats({
                    ...basicStats,
                    deudaTotal
                });
                setRecentActivity(activity);

            } catch (error) {
                console.error('Error loading dashboard:', error.message);
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            loadData();
        }
    }, [authLoading]);

    const getTimeAgo = (timestamp) => {
        const now = new Date();
        const past = new Date(timestamp);
        const diffInMinutes = Math.floor((now - past) / (1000 * 60));

        if (diffInMinutes < 1) return 'Hace un momento';
        if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;

        const diffInDays = Math.floor(diffInHours / 24);
        return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scout-blue"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 mt-1">Resumen general del sistema</p>
            </div>

            {/* Métricas Principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Tickets Pendientes"
                    value={stats.ticketsPendientes}
                    icon="🎫"
                    color="yellow"
                    subtitle="Requieren revisión"
                />

                <StatsCard
                    title="Pagos por Aprobar"
                    value={stats.pagosAprobar}
                    icon="✅"
                    color="blue"
                    subtitle="Esperando aprobación"
                />

                <StatsCard
                    title="Total Recaudado (Mes)"
                    value={`$${stats.totalRecaudado.toLocaleString('es-CL')}`}
                    icon="💵"
                    color="green"
                    subtitle={`${new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}`}
                />

                <StatsCard
                    title="Deuda Total Pendiente"
                    value={`$${stats.deudaTotal.toLocaleString('es-CL')}`}
                    icon="📊"
                    color="red"
                    subtitle="Todas las familias"
                />
            </div>

            {/* Actividad Reciente */}
            <div className="card-glass p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Actividad Reciente</h2>
                {recentActivity.length > 0 ? (
                    <div className="space-y-3">
                        {recentActivity.map((activity) => (
                            <div key={`${activity.type}-${activity.id}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className="flex items-center">
                                    <span className="text-2xl mr-3">{activity.icon}</span>
                                    <div>
                                        <p className="font-medium text-gray-900">{activity.title}</p>
                                        <p className="text-sm text-gray-600">{activity.subtitle}</p>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500">{getTimeAgo(activity.timestamp)}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No hay actividad reciente</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
