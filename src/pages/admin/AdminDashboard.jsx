import React from 'react';
import StatsCard from '../../components/admin/StatsCard';
import { useAdminAuth } from '../../hooks/useAdminAuth';

/**
 * Dashboard principal del panel de administración
 * Muestra métricas, resumen y acciones rápidas
 */
const AdminDashboard = () => {
    const { hasPermission, isLoading: authLoading } = useAdminAuth(['ver_dashboard', 'ver_metricas']);

    // TODO: Obtener datos reales de Supabase
    const stats = {
        totalRecaudado: 1250000,
        ticketsPendientes: 12,
        pagosAprobar: 8,
        deudaTotal: 3450000
    };

    if (authLoading) {
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
                    subtitle="Noviembre 2024"
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

            {/* Acciones Rápidas */}
            <div className="card-glass p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button className="btn-scout flex items-center justify-center">
                        <span className="mr-2">➕</span>
                        Crear Item de Cobro
                    </button>
                    <button className="btn-scout flex items-center justify-center">
                        <span className="mr-2">🎫</span>
                        Ver Tickets Pendientes
                    </button>
                    <button className="btn-scout flex items-center justify-center">
                        <span className="mr-2">✅</span>
                        Revisar Aprobaciones
                    </button>
                </div>
            </div>

            {/* Actividad Reciente */}
            <div className="card-glass p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Actividad Reciente</h2>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                            <span className="text-2xl mr-3">🎫</span>
                            <div>
                                <p className="font-medium text-gray-900">Nuevo ticket #1234</p>
                                <p className="text-sm text-gray-600">Juan Pérez - $25,000</p>
                            </div>
                        </div>
                        <span className="text-xs text-gray-500">Hace 5 min</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                            <span className="text-2xl mr-3">✅</span>
                            <div>
                                <p className="font-medium text-gray-900">Pago aprobado #1230</p>
                                <p className="text-sm text-gray-600">María González - $15,000</p>
                            </div>
                        </div>
                        <span className="text-xs text-gray-500">Hace 15 min</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                            <span className="text-2xl mr-3">💰</span>
                            <div>
                                <p className="font-medium text-gray-900">Item creado: Cuota Diciembre</p>
                                <p className="text-sm text-gray-600">$5,000 - Todos los alumnos</p>
                            </div>
                        </div>
                        <span className="text-xs text-gray-500">Hace 1 hora</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
