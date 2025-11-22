import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useToast } from '../../components/Toast';
import * as XLSX from 'xlsx';

export default function AdminAprobaciones() {
    const { hasPermission, isLoading: authLoading, user } = useAdminAuth(['aprobar_pagos', 'ver_metricas']);
    const { addToast } = useToast();

    // State
    const [activeTab, setActiveTab] = useState('pendientes'); // pendientes, aprobados, rechazados
    const [pagos, setPagos] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSeccion, setFilterSeccion] = useState('todos');
    const [filterTipo, setFilterTipo] = useState('todos');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedItems, setSelectedItems] = useState([]);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [approvingId, setApprovingId] = useState(null);
    const [stats, setStats] = useState({ aprobados: 0, rechazados: 0, montoTotal: 0 });

    const itemsPerPage = 20;

    // Fetch data on mount
    useEffect(() => {
        if (!authLoading) {
            fetchData();
        }
    }, [authLoading]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, filterSeccion, filterTipo, searchTerm]);



    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch pagos aprobados con info de quién aprobó
            const { data: pagosData, error: pagosError } = await supabase
                .from('pagos')
                .select(`
                    *,
                    alumnos (
                        id,
                        nombre,
                        apellidos_alumno,
                        rut_alumno,
                        seccion
                    )
                `)
                .eq('estado', 'PAGADO')
                .order('fecha_pago', { ascending: false });

            if (pagosError) throw pagosError;

            // Fetch tickets pendientes y rechazados
            const { data: ticketsData, error: ticketsError } = await supabase
                .from('tickets_pago')
                .select(`
                    *,
                    alumnos (
                        id,
                        nombre,
                        apellidos_alumno,
                        rut_alumno,
                        seccion
                    )
                `)
                .in('estado', ['pendiente', 'rechazado'])
                .order('created_at', { ascending: false });

            if (ticketsError) throw ticketsError;

            setPagos(pagosData || []);
            setTickets(ticketsData || []);
            calculateStats(pagosData, ticketsData);
        } catch (error) {
            console.error('Error al cargar datos:', error);
            addToast('Error al cargar datos: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (pagosData, ticketsData) => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const aprobadosEsteMes = pagosData.filter(p => {
            const date = new Date(p.fecha_aprobacion || p.fecha_pago);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).length;

        const rechazadosEsteMes = ticketsData.filter(t => {
            const date = new Date(t.created_at);
            return t.estado === 'rechazado' && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).length;

        const montoTotal = pagosData
            .filter(p => {
                const date = new Date(p.fecha_aprobacion || p.fecha_pago);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            })
            .reduce((sum, p) => sum + (p.monto || 0), 0);

        setStats({ aprobados: aprobadosEsteMes, rechazados: rechazadosEsteMes, montoTotal });
    };

    // Get items based on active tab
    const getTabItems = () => {
        switch (activeTab) {
            case 'pendientes':
                return tickets
                    .filter(t => t.estado === 'pendiente')
                    .map(t => ({ ...t, source: 'ticket' }));
            case 'aprobados':
                return pagos.map(p => ({ ...p, source: 'pago' }));
            case 'rechazados':
                return tickets
                    .filter(t => t.estado === 'rechazado')
                    .map(t => ({ ...t, source: 'ticket' }));
            default:
                return [];
        }
    };

    // Apply filters
    const filteredItems = getTabItems().filter(item => {
        const matchSearch = searchTerm === '' ||
            item.alumnos?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.alumnos?.apellidos_alumno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.alumnos?.rut_alumno?.includes(searchTerm);

        const matchSeccion = filterSeccion === 'todos' || item.alumnos?.seccion === filterSeccion;
        const matchTipo = filterTipo === 'todos' || item.tipo_item === filterTipo;

        return matchSearch && matchSeccion && matchTipo;
    });

    // Pagination
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = filteredItems.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl/Cmd + A: Select all pending tickets
            if ((e.ctrlKey || e.metaKey) && e.key === 'a' && activeTab === 'pendientes') {
                e.preventDefault();
                const pendingIds = filteredItems
                    .filter(item => item.source === 'ticket' && item.estado === 'pendiente')
                    .map(item => item.id);
                setSelectedItems(pendingIds);
                addToast('Todos los tickets pendientes seleccionados', 'info');
            }

            // Ctrl/Cmd + Enter: Approve selected
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && selectedItems.length > 0) {
                e.preventDefault();
                handleApproveSelected();
            }

            // Esc: Close modal
            if (e.key === 'Escape' && showPreviewModal) {
                setShowPreviewModal(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTab, selectedItems, showPreviewModal, filteredItems]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const pendingIds = paginatedItems
                .filter(item => item.source === 'ticket' && item.estado === 'pendiente')
                .map(item => item.id);
            setSelectedItems(pendingIds);
        } else {
            setSelectedItems([]);
        }
    };

    const handleSelectItem = (id) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const approveTicketTransaction = async (ticket) => {
        try {
            console.log('Procesando aprobación para ticket:', ticket);

            // Preparar datos del pago
            const fechaPagoDate = new Date(ticket.fecha_pago);
            const pagoData = {
                alumno_id: ticket.alumno_id,
                monto: Number(ticket.monto),
                estado: 'PAGADO',
                tipo_item: ticket.tipo_item,
                item_id: ticket.item_id || null,
                fecha_pago: ticket.fecha_pago,
                anio: fechaPagoDate.getFullYear(), // Agregamos el año requerido
                mes: ticket.tipo_item === 'cuota_mensual' ? (fechaPagoDate.getMonth() + 1) : null, // Opcional: agregar mes si es cuota
                metodo_pago: 'transferencia',
                comprobante_url: ticket.comprobante_url,
                aprobado_por: user?.id,
                fecha_aprobacion: new Date().toISOString()
            };

            // Crear pago
            const { error: pagoError } = await supabase
                .from('pagos')
                .insert(pagoData);

            if (pagoError) {
                console.error('Error Supabase al insertar pago:', JSON.stringify(pagoError));
                throw new Error(`Error DB Pagos: ${pagoError.message}`);
            }

            // Actualizar ticket
            const { error: ticketError } = await supabase
                .from('tickets_pago')
                .update({ estado: 'aprobado' })
                .eq('id', ticket.id);

            if (ticketError) {
                console.error('Error Supabase al actualizar ticket:', JSON.stringify(ticketError));
                throw new Error(`Error DB Tickets: ${ticketError.message}`);
            }
        } catch (error) {
            // Re-lanzar el error con más contexto si es posible
            console.error('Error en transacción de aprobación:', error);
            throw error;
        }
    };

    const handleApproveSingle = async (ticket) => {
        setApprovingId(ticket.id);
        try {
            await approveTicketTransaction(ticket);

            addToast('✅ Ticket aprobado exitosamente', 'success');
            setShowPreviewModal(false);
            fetchData();
        } catch (error) {
            console.error('Error al aprobar ticket:', error);
            addToast('Error al aprobar ticket: ' + error.message, 'error');
        } finally {
            setApprovingId(null);
        }
    };

    const handleApproveSelected = async () => {
        if (selectedItems.length === 0) return;

        if (!confirm(`¿Aprobar ${selectedItems.length} ticket(s) seleccionado(s)?`)) return;

        setLoading(true);
        try {
            let successCount = 0;
            let errorCount = 0;

            for (const ticketId of selectedItems) {
                const ticket = tickets.find(t => t.id === ticketId);
                if (!ticket) continue;

                try {
                    await approveTicketTransaction(ticket);
                    successCount++;
                } catch (error) {
                    console.error(`Error al aprobar ticket ${ticketId}:`, error);
                    errorCount++;
                }
            }

            if (successCount > 0) {
                addToast(`✅ ${successCount} ticket(s) aprobado(s) exitosamente`, 'success');
            }
            if (errorCount > 0) {
                addToast(`⚠️ ${errorCount} ticket(s) fallaron al aprobar`, 'warning');
            }

            setSelectedItems([]);
            fetchData();
        } catch (error) {
            console.error('Error en aprobación masiva:', error);
            addToast('Error al aprobar tickets: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = () => {
        const dataToExport = filteredItems.map(item => ({
            'Fecha': new Date(item.created_at).toLocaleDateString('es-CL'),
            'Alumno': `${item.alumnos?.nombre || ''} ${item.alumnos?.apellidos_alumno || ''}`,
            'RUT': item.alumnos?.rut_alumno || '',
            'Sección': item.alumnos?.seccion || '',
            'Tipo': item.tipo_item,
            'Monto': item.monto,
            'Estado': item.estado,
            'Fecha Aprobación': item.fecha_aprobacion ? new Date(item.fecha_aprobacion).toLocaleDateString('es-CL') : '-'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, activeTab.charAt(0).toUpperCase() + activeTab.slice(1));
        XLSX.writeFile(wb, `${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
        addToast('📊 Archivo Excel exportado', 'success');
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scout-blue"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Aprobación de Pagos</h1>
                <p className="text-gray-600">Gestiona tickets pendientes y visualiza el historial de aprobaciones</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-600 font-medium">Aprobados este mes</p>
                    <p className="text-2xl font-bold text-green-700">{stats.aprobados}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-600 font-medium">Rechazados este mes</p>
                    <p className="text-2xl font-bold text-red-700">{stats.rechazados}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-600 font-medium">Monto Total Aprobado</p>
                    <p className="text-2xl font-bold text-blue-700">${stats.montoTotal.toLocaleString('es-CL')}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px">
                        <button
                            onClick={() => setActiveTab('pendientes')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pendientes'
                                ? 'border-scout-blue text-scout-blue'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Pendientes ({tickets.filter(t => t.estado === 'pendiente').length})
                        </button>
                        <button
                            onClick={() => setActiveTab('aprobados')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'aprobados'
                                ? 'border-scout-blue text-scout-blue'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Aprobados ({pagos.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('rechazados')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'rechazados'
                                ? 'border-scout-blue text-scout-blue'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Rechazados ({tickets.filter(t => t.estado === 'rechazado').length})
                        </button>
                    </nav>
                </div>

                {/* Filters */}
                <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <input
                            type="text"
                            placeholder="Buscar por nombre o RUT..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                        />
                        <select
                            value={filterSeccion}
                            onChange={(e) => setFilterSeccion(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                        >
                            <option value="todos">Todas las secciones</option>
                            <option value="manada">Manada</option>
                            <option value="tropa">Tropa</option>
                            <option value="compañia">Compañía</option>
                            <option value="comunidad">Comunidad</option>
                        </select>
                        <select
                            value={filterTipo}
                            onChange={(e) => setFilterTipo(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                        >
                            <option value="todos">Todos los tipos</option>
                            <option value="cuota_mensual">Cuota Mensual</option>
                            <option value="rifa">Rifa</option>
                            <option value="evento">Evento</option>
                            <option value="campamento">Campamento</option>
                            <option value="parche">Parche</option>
                        </select>
                        {hasPermission('ver_metricas') && (
                            <button
                                onClick={exportToExcel}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                            >
                                📊 Exportar Excel
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedItems.length > 0 && hasPermission('aprobar_pagos') && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
                    <span className="text-blue-700 font-medium">
                        {selectedItems.length} ticket(s) seleccionado(s)
                    </span>
                    <button
                        onClick={handleApproveSelected}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        ✓ Aprobar Seleccionados
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {activeTab === 'pendientes' && hasPermission('aprobar_pagos') && (
                                    <th className="px-4 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={selectedItems.length > 0 && selectedItems.length === paginatedItems.filter(i => i.source === 'ticket' && i.estado === 'pendiente').length}
                                            className="rounded"
                                        />
                                    </th>
                                )}
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alumno</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sección</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                                {activeTab === 'aprobados' && (
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Aprobación</th>
                                )}
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {paginatedItems.map((item) => (
                                <tr key={`${item.source}-${item.id}`} className="hover:bg-gray-50">
                                    {activeTab === 'pendientes' && hasPermission('aprobar_pagos') && (
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.includes(item.id)}
                                                onChange={() => handleSelectItem(item.id)}
                                                className="rounded"
                                            />
                                        </td>
                                    )}
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                        {new Date(item.source === 'pago' ? (item.fecha_pago || item.fecha_aprobacion) : item.created_at).toLocaleDateString('es-CL')}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm font-medium text-gray-900">
                                            {item.alumnos?.nombre} {item.alumnos?.apellidos_alumno}
                                        </div>
                                        <div className="text-sm text-gray-500">{item.alumnos?.rut_alumno}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 capitalize">
                                        {item.alumnos?.seccion || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 capitalize">
                                        {item.tipo_item?.replace('_', ' ')}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                        ${item.monto?.toLocaleString('es-CL')}
                                    </td>
                                    {activeTab === 'aprobados' && (
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {item.fecha_aprobacion ? new Date(item.fecha_aprobacion).toLocaleDateString('es-CL') : '-'}
                                        </td>
                                    )}
                                    <td className="px-4 py-3 text-sm flex gap-2">
                                        {activeTab === 'pendientes' && hasPermission('aprobar_pagos') && (
                                            <button
                                                onClick={() => {
                                                    setSelectedTicket(item);
                                                    setShowPreviewModal(true);
                                                }}
                                                className="text-green-600 hover:text-green-800 font-medium"
                                                disabled={approvingId === item.id}
                                            >
                                                {approvingId === item.id ? '⏳' : '✓ Aprobar'}
                                            </button>
                                        )}
                                        {item.comprobante_url && (
                                            <a
                                                href={item.comprobante_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                📎 Ver
                                            </a>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredItems.length)} de {filteredItems.length} resultados
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                            >
                                Anterior
                            </button>
                            <span className="px-3 py-1 text-sm text-gray-700">
                                Página {currentPage} de {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {showPreviewModal && selectedTicket && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold text-gray-800">Aprobar Pago</h3>
                                <button
                                    onClick={() => setShowPreviewModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">Información del Alumno</h4>
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p><span className="font-medium">Nombre:</span> {selectedTicket.alumnos?.nombre} {selectedTicket.alumnos?.apellidos_alumno}</p>
                                        <p><span className="font-medium">RUT:</span> {selectedTicket.alumnos?.rut_alumno}</p>
                                        <p><span className="font-medium">Sección:</span> {selectedTicket.alumnos?.seccion}</p>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">Detalles del Pago</h4>
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p><span className="font-medium">Tipo:</span> {selectedTicket.tipo_item?.replace('_', ' ')}</p>
                                        <p><span className="font-medium">Monto:</span> ${selectedTicket.monto?.toLocaleString('es-CL')}</p>
                                        <p><span className="font-medium">Fecha:</span> {new Date(selectedTicket.created_at).toLocaleDateString('es-CL')}</p>
                                    </div>
                                </div>

                                {selectedTicket.comprobante_url && (
                                    <div>
                                        <h4 className="font-semibold text-gray-700 mb-2">Comprobante</h4>
                                        <div className="border border-gray-200 rounded-lg p-2">
                                            <img
                                                src={selectedTicket.comprobante_url}
                                                alt="Comprobante"
                                                className="w-full h-auto rounded"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowPreviewModal(false)}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleApproveSingle(selectedTicket)}
                                    disabled={approvingId === selectedTicket.id}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                    {approvingId === selectedTicket.id ? '⏳ Aprobando...' : '✓ Confirmar Aprobación'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
