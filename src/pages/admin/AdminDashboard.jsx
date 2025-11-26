import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatsCard from '../../components/admin/StatsCard';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { supabase } from '../../supabase/client';

/**
 * Dashboard principal del panel de administración
 * Muestra métricas, resumen y acciones rápidas
 */
const AdminDashboard = () => {
    const navigate = useNavigate();
    const { hasPermission, isLoading: authLoading } = useAdminAuth(['ver_dashboard', 'ver_metricas']);
    const [stats, setStats] = useState({
        totalRecaudado: 0,
        ticketsPendientes: 0,
        pagosAprobar: 0,
        deudaTotal: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const currentYear = new Date().getFullYear();
                const currentMonth = new Date().getMonth() + 1;

                // 1. Total recaudado del mes actual
                const { data: pagosData, error: pagosError } = await supabase
                    .from('pagos')
                    .select('monto')
                    .eq('estado', 'PAGADO')
                    .gte('fecha_pago', `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`);

                if (pagosError) throw pagosError;

                const totalRecaudado = pagosData?.reduce((sum, pago) => sum + (pago.monto || 0), 0) || 0;

                // 2. Tickets pendientes de revisión
                const { count: ticketsPendientes, error: ticketsError } = await supabase
                    .from('tickets_pago')
                    .select('*', { count: 'exact', head: true })
                    .eq('estado', 'PENDIENTE');

                if (ticketsError) throw ticketsError;

                // 3. Pagos esperando aprobación
                const { count: pagosAprobar, error: aprobarError } = await supabase
                    .from('tickets_pago')
                    .select('*', { count: 'exact', head: true })
                    .in('estado', ['PENDIENTE', 'RECHAZADO']);

                if (aprobarError) throw aprobarError;

                // 4. Deuda total pendiente
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
                    .select('item_id, alumno_id, monto')
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

                setStats({
                    totalRecaudado,
                    ticketsPendientes: ticketsPendientes || 0,
                    pagosAprobar: pagosAprobar || 0,
                    deudaTotal
                });

                // 5. Actividad reciente
                const activity = [];

                // Últimos 3 tickets
                const { data: recentTickets, error: ticketsRecentError } = await supabase
                    .from('tickets_pago')
                    .select(`
                        id,
                        monto_total,
                        created_at,
                        alumno:alumnos(nombre, apellidos)
                    `)
                    .order('created_at', { ascending: false })
                    .limit(3);

                if (!ticketsRecentError && recentTickets) {
                    recentTickets.forEach(ticket => {
                        activity.push({
                            type: 'ticket',
                            icon: '🎫',
                            title: `Nuevo ticket #${ticket.id}`,
                            subtitle: `${ticket.alumno?.nombre} ${ticket.alumno?.apellidos} - $${ticket.monto_total?.toLocaleString('es-CL')}`,
                            timestamp: ticket.created_at
                        });
                    });
                }

                // Últimos 3 items
                const { data: recentItems, error: itemsRecentError } = await supabase
                    .from('items_pago')
                    .select('id, descripcion, monto, created_at, seccion, created_by')
                    .order('created_at', { ascending: false })
                    .limit(3);

                if (!itemsRecentError && recentItems) {
                    const creatorIds = [...new Set(recentItems.map(item => item.created_by).filter(Boolean))];

                    let creatorsMap = {};
                    if (creatorIds.length > 0) {
                        const { data: creatorsData } = await supabase
                            .from('users')
                            .select('id, nombre')
                            .in('id', creatorIds);

                        if (creatorsData) {
                            creatorsMap = Object.fromEntries(
                                creatorsData.map(u => [u.id, u.nombre])
                            );
                        }
                    }

                    recentItems.forEach(item => {
                        const creatorName = item.created_by && creatorsMap[item.created_by]
                            ? creatorsMap[item.created_by]
                            : 'Sistema';

                        activity.push({
                            type: 'item',
                            icon: '💰',
                            title: `Item creado: ${item.descripcion}`,
                            subtitle: `$${item.monto?.toLocaleString('es-CL')} - ${item.seccion || 'Todos'} - Por ${creatorName}`,
                            timestamp: item.created_at
                        });
                    });
                }

                activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setRecentActivity(activity.slice(0, 6));

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            fetchDashboardData();
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
                    title="Total Recaudado (Mes)"
                    value={`$${stats.totalRecaudado.toLocaleString('es-CL')}`}
                    icon="💵"
                    color="green"
                    subtitle={`${new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}`}
                    trend={{ value: '+12%', label: 'vs mes anterior', isPositive: true }}
                />

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
                        {recentActivity.map((activity, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
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
