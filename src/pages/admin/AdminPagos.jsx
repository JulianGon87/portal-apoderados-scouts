import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabase/client';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useToast } from '../../components/Toast';
import * as XLSX from 'xlsx';

export default function AdminPagos() {
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
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectingId, setRejectingId] = useState(null);
    const [filterMonth, setFilterMonth] = useState('todos');

    // Edit State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [editFormData, setEditFormData] = useState({
        monto: '',
        fecha_pago: '',
        tipo_item: '',
        mes: '',
        descripcion: ''
    });

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
    }, [activeTab, filterSeccion, filterTipo, filterMonth, searchTerm]);

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
                    ),
                    items_pago (
                        mes,
                        descripcion
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
                    ),
                    items_pago (
                        mes,
                        descripcion
                    )
                `)
                .in('estado', ['pendiente', 'rechazado'])
                .order('created_at', { ascending: false });

            if (ticketsError) throw ticketsError;

            setPagos(pagosData || []);
            setTickets(ticketsData || []);
            calculateStats(pagosData, ticketsData);
        } catch (error) {
            console.error('Error al cargar datos:', error.message);
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
    const filteredItems = useMemo(() => {
        return getTabItems().filter(item => {
            const matchSearch = searchTerm === '' ||
                item.alumnos?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.alumnos?.apellidos_alumno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.alumnos?.rut_alumno?.includes(searchTerm);

            const matchSeccion = filterSeccion === 'todos' || item.alumnos?.seccion === filterSeccion;
            const matchTipo = filterTipo === 'todos' || item.tipo_item === filterTipo;

            let matchMonth = true;
            if (filterMonth !== 'todos') {
                // Helper para parsear fechas evitando el shift de zona horaria
                const parseDateLocal = (dateStr) => {
                    if (!dateStr) return new Date();
                    // Si es solo fecha YYYY-MM-DD
                    if (dateStr.length === 10 && dateStr.includes('-')) {
                        const [year, month, day] = dateStr.split('-').map(Number);
                        return new Date(year, month - 1, day);
                    }
                    return new Date(dateStr);
                };

                const dateStr = item.source === 'pago' ? (item.fecha_pago || item.fecha_aprobacion) : item.created_at;
                const date = parseDateLocal(dateStr);

                matchMonth = date.getMonth() === parseInt(filterMonth);
            }

            return matchSearch && matchSeccion && matchTipo && matchMonth;
        });
    }, [activeTab, pagos, tickets, searchTerm, filterSeccion, filterTipo, filterMonth]);

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
            if (e.key === 'Escape') {
                if (showPreviewModal) setShowPreviewModal(false);
                if (showRejectModal) setShowRejectModal(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTab, selectedItems, showPreviewModal, showRejectModal, filteredItems]);

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
                aprobado_por: null, // Dejamos null temporalmente para evitar error de FK si el usuario no está en tabla users
                fecha_aprobacion: new Date().toISOString()
            };

            // Crear pago
            const { error: pagoError } = await supabase
                .from('pagos')
                .insert(pagoData);

            if (pagoError) {
                console.error('Error Supabase al insertar pago:', pagoError.message);
                throw new Error(`Error DB Pagos: ${pagoError.message}`);
            }

            // Actualizar ticket
            const { error: ticketError } = await supabase
                .from('tickets_pago')
                .update({ estado: 'aprobado' })
                .eq('id', ticket.id);

            if (ticketError) {
                console.error('Error Supabase al actualizar ticket:', ticketError.message);
                throw new Error(`Error DB Tickets: ${ticketError.message}`);
            }
        } catch (error) {
            // Re-lanzar el error con más contexto si es posible
            console.error('Error en transacción de aprobación:', error.message);
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
            console.error('Error al aprobar ticket:', error.message);
            addToast('Error al aprobar ticket: ' + error.message, 'error');
        } finally {
            setApprovingId(null);
        }
    };

    const handleReject = (ticket) => {
        setRejectingId(ticket.id);
        setRejectReason('');
        setShowRejectModal(true);
        // Si venimos del preview modal, lo cerramos o lo mantenemos abajo? Mejor cerrarlo para evitar conflictos visuales
        setShowPreviewModal(false);
    };

    const confirmReject = async () => {
        if (!rejectReason.trim()) {
            addToast('Debes ingresar un motivo para el rechazo', 'warning');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('tickets_pago')
                .update({
                    estado: 'rechazado',
                    comentario_admin: rejectReason
                })
                .eq('id', rejectingId);

            if (error) throw error;

            addToast('Ticket rechazado correctamente', 'success');
            setShowRejectModal(false);
            setRejectingId(null);
            fetchData();
        } catch (error) {
            console.error('Error al rechazar ticket:', error.message);
            addToast('Error al rechazar ticket: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveSelected = () => {
        if (selectedItems.length === 0) return;
        setShowConfirmModal(true);
    };

    const confirmApproveSelected = async () => {
        setShowConfirmModal(false);

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
                    console.error(`Error aprobando ticket ${ticketId}:`, error.message);
                    errorCount++;
                }
            }

            if (successCount > 0) {
                addToast(`✅ ${successCount} tickets aprobados correctamente`, 'success');
            }
            if (errorCount > 0) {
                addToast(`⚠️ ${errorCount} tickets fallaron al aprobar`, 'warning');
            }

            setSelectedItems([]);
            fetchData();
        } catch (error) {
            console.error('Error en aprobación masiva:', error.message);
            addToast('Error general en aprobación masiva', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = () => {
        const dataToExport = filteredItems.map(item => ({
            Fecha: new Date(item.source === 'pago' ? (item.fecha_pago || item.fecha_aprobacion) : item.created_at).toLocaleDateString('es-CL'),
            Alumno: `${item.alumnos?.nombre} ${item.alumnos?.apellidos_alumno}`,
            RUT: item.alumnos?.rut_alumno,
            Sección: item.alumnos?.seccion,
            Tipo: item.tipo_item,
            Monto: item.monto,
            Estado: item.estado,
            'Motivo Rechazo': item.comentario_admin || ''
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Pagos");
        XLSX.writeFile(wb, `Pagos_Scout_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const getItemDescription = (item) => {
        let description = item.tipo_item?.replace('_', ' ');
        const details = item.items_pago;

        if (details) {
            if (item.tipo_item === 'cuota_mensual' && details.mes) {
                const monthName = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][details.mes - 1];
                if (monthName) {
                    return (
                        <span>
                            {description} <span className="text-gray-500 font-medium">({monthName})</span>
                        </span>
                    );
                }
            }
            if (details.descripcion) {
                return (
                    <span>
                        {description} <span className="text-gray-500">({details.descripcion})</span>
                    </span>
                );
            }
        }
        return description;
    };

    // Edit Handlers
    const handleEditClick = (item) => {
        setEditingItem(item);
        setEditFormData({
            monto: item.monto || '',
            fecha_pago: item.fecha_pago ? item.fecha_pago.split('T')[0] : '',
            tipo_item: item.tipo_item || 'cuota_mensual',
            mes: item.items_pago?.mes || '',
            descripcion: item.items_pago?.descripcion || ''
        });
        setShowEditModal(true);
    };

    const handleEditSave = async () => {
        if (!editingItem) return;

        try {
            setLoading(true);
            const updates = {
                monto: Number(editFormData.monto),
                fecha_pago: editFormData.fecha_pago,
                tipo_item: editFormData.tipo_item
            };

            // Update main table (pagos or tickets_pago)
            const table = editingItem.source === 'pago' ? 'pagos' : 'tickets_pago';
            const { error: mainError } = await supabase
                .from(table)
                .update(updates)
                .eq('id', editingItem.id);

            if (mainError) throw mainError;

            // If it's a monthly fee, update or link correct item_pago
            if (editFormData.tipo_item === 'cuota_mensual' && editFormData.mes) {
                // Find correct item_pago for this month/year
                // Assuming current year for simplicity, or use existing item year
                const year = editingItem.items_pago?.anio || new Date().getFullYear();

                const { data: itemPago, error: itemError } = await supabase
                    .from('items_pago')
                    .select('id')
                    .eq('mes', editFormData.mes)
                    .eq('anio', year)
                    .eq('tipo_item', 'cuota_mensual')
                    .single();

                if (!itemError && itemPago) {
                    await supabase
                        .from(table)
                        .update({ item_id: itemPago.id })
                        .eq('id', editingItem.id);
                }
            }

            addToast('Registro actualizado correctamente', 'success');
            setShowEditModal(false);
            fetchData();

        } catch (error) {
            console.error('Error updating item:', error.message);
            addToast('Error al actualizar: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return <div className="p-8 text-center">Cargando panel de administración...</div>;
    }

    if (!hasPermission('aprobar_pagos') && !hasPermission('ver_metricas')) {
        return <div className="p-8 text-center text-red-600">No tienes permisos para ver esta sección.</div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Gestión de Pagos</h1>
                    <p className="text-gray-500">Administra y aprueba los pagos de los apoderados</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportExcel}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <span>📊</span> Exportar Excel
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-gray-500 text-sm mb-1">Aprobados (Este Mes)</div>
                    <div className="text-2xl font-bold text-green-600">{stats.aprobados}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-gray-500 text-sm mb-1">Rechazados (Este Mes)</div>
                    <div className="text-2xl font-bold text-red-600">{stats.rechazados}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-gray-500 text-sm mb-1">Monto Total (Este Mes)</div>
                    <div className="text-2xl font-bold text-scout-blue">${stats.montoTotal.toLocaleString('es-CL')}</div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Buscar por nombre, apellido o RUT..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                        <select
                            value={filterSeccion}
                            onChange={(e) => setFilterSeccion(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                        >
                            <option value="todos">Todas las Secciones</option>
                            <option value="manada">Manada</option>
                            <option value="tropa">Tropa</option>
                            <option value="compania">Compañía</option>
                            <option value="avanzada">Avanzada</option>
                            <option value="clan">Clan</option>
                        </select>
                        <select
                            value={filterTipo}
                            onChange={(e) => setFilterTipo(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                        >
                            <option value="todos">Todos los Tipos</option>
                            <option value="cuota_mensual">Cuota Mensual</option>
                            <option value="rifa">Rifa</option>
                            <option value="evento">Evento</option>
                        </select>
                        <select
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
                        >
                            <option value="todos">Todos los Meses</option>
                            <option value="0">Enero</option>
                            <option value="1">Febrero</option>
                            <option value="2">Marzo</option>
                            <option value="3">Abril</option>
                            <option value="4">Mayo</option>
                            <option value="5">Junio</option>
                            <option value="6">Julio</option>
                            <option value="7">Agosto</option>
                            <option value="8">Septiembre</option>
                            <option value="9">Octubre</option>
                            <option value="10">Noviembre</option>
                            <option value="11">Diciembre</option>
                        </select>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('pendientes')}
                        className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'pendientes' ? 'text-scout-blue' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Pendientes
                        {activeTab === 'pendientes' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-scout-blue"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('aprobados')}
                        className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'aprobados' ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Aprobados
                        {activeTab === 'aprobados' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-600"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('rechazados')}
                        className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'rechazados' ? 'text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Rechazados
                        {activeTab === 'rechazados' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></div>}
                    </button>
                </div>
            </div>

            {/* Content Table/List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {activeTab === 'pendientes' && hasPermission('aprobar_pagos') && (
                                    <th className="px-6 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={paginatedItems.length > 0 && selectedItems.length === paginatedItems.filter(i => i.source === 'ticket' && i.estado === 'pendiente').length}
                                            className="h-4 w-4 rounded border-gray-300 text-scout-blue focus:ring-scout-blue"
                                        />
                                    </th>
                                )}
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Alumno</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {paginatedItems.length > 0 ? (
                                paginatedItems.map((item) => (
                                    <tr key={`${item.source}-${item.id}`} className="hover:bg-gray-50 transition-colors">
                                        {activeTab === 'pendientes' && hasPermission('aprobar_pagos') && (
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.includes(item.id)}
                                                    onChange={() => handleSelectItem(item.id)}
                                                    className="h-4 w-4 rounded border-gray-300 text-scout-blue focus:ring-scout-blue"
                                                />
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {new Date(item.source === 'pago' ? (item.fecha_pago || item.fecha_aprobacion) : item.created_at).toLocaleDateString('es-CL')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{item.alumnos?.nombre} {item.alumnos?.apellidos_alumno}</div>
                                            <div className="text-xs text-gray-500">{item.alumnos?.rut_alumno}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {getItemDescription(item)}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                            ${item.monto?.toLocaleString('es-CL')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.estado === 'PAGADO' || item.estado === 'aprobado' ? 'bg-green-100 text-green-800' :
                                                item.estado === 'rechazado' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {item.estado === 'PAGADO' ? 'APROBADO' : item.estado.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {item.comprobante_url && (
                                                <a
                                                    href={item.comprobante_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                >
                                                    Ver Comprobante
                                                </a>
                                            )}

                                            {hasPermission('aprobar_pagos') && (
                                                <button
                                                    onClick={() => handleEditClick(item)}
                                                    className="text-gray-600 hover:text-gray-800 text-sm font-medium px-2"
                                                    title="Editar"
                                                >
                                                    ✏️
                                                </button>
                                            )}

                                            {activeTab === 'pendientes' && hasPermission('aprobar_pagos') && (
                                                <>
                                                    <button
                                                        onClick={() => handleReject(item)}
                                                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                    >
                                                        Rechazar
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedTicket(item);
                                                            setShowPreviewModal(true);
                                                        }}
                                                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm font-medium transition-colors shadow-sm"
                                                        disabled={approvingId === item.id}
                                                    >
                                                        {approvingId === item.id ? '...' : 'Aprobar'}
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                        No se encontraron registros
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden">
                    {paginatedItems.map((item) => (
                        <div key={`${item.source}-${item.id}`} className="p-4 space-y-3 bg-white border-b border-gray-100 last:border-0">
                            {/* Header: Checkbox + Fecha + Estado */}
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    {activeTab === 'pendientes' && hasPermission('aprobar_pagos') && (
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.includes(item.id)}
                                            onChange={() => handleSelectItem(item.id)}
                                            className="h-5 w-5 rounded border-gray-300 text-scout-blue focus:ring-scout-blue"
                                        />
                                    )}
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">
                                            {new Date(item.source === 'pago' ? (item.fecha_pago || item.fecha_aprobacion) : item.created_at).toLocaleDateString('es-CL')}
                                        </p>
                                        <p className="text-xs text-gray-500 capitalize">{item.tipo_item.replace('_', ' ')}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.estado === 'PAGADO' || item.estado === 'aprobado' ? 'bg-green-100 text-green-800' :
                                    item.estado === 'rechazado' ? 'bg-red-100 text-red-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {item.estado === 'PAGADO' ? 'APROBADO' : item.estado.toUpperCase()}
                                </span>
                            </div>

                            {/* Info Alumno */}
                            <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-xs text-gray-500">Alumno:</span>
                                    <span className="text-sm font-medium text-gray-900">{item.alumnos?.nombre} {item.alumnos?.apellidos_alumno}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-gray-500">RUT:</span>
                                    <span className="text-xs text-gray-700">{item.alumnos?.rut_alumno}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-gray-500">Sección:</span>
                                    <span className="text-xs text-gray-700 capitalize">{item.alumnos?.seccion || '-'}</span>
                                </div>
                            </div>

                            {/* Monto y Detalles */}
                            <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                                <span className="text-sm text-gray-500">Monto:</span>
                                <span className="text-lg font-bold text-scout-blue">${item.monto?.toLocaleString('es-CL')}</span>
                            </div>

                            {/* Motivo Rechazo (si aplica) */}
                            {activeTab === 'rechazados' && item.comentario_admin && (
                                <div className="bg-red-50 p-2 rounded text-xs text-red-700 italic border border-red-100">
                                    "{item.comentario_admin}"
                                </div>
                            )}

                            {/* Acciones */}
                            <div className="flex justify-end gap-2 pt-2">
                                {item.comprobante_url && (
                                    <a
                                        href={item.comprobante_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 border border-blue-200"
                                    >
                                        📎 Ver Comprobante
                                    </a>
                                )}

                                {hasPermission('aprobar_pagos') && (
                                    <>
                                        <button
                                            onClick={() => handleEditClick(item)}
                                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 border border-gray-300"
                                        >
                                            ✏️ Editar
                                        </button>

                                        {activeTab === 'pendientes' && (
                                            <>
                                                <button
                                                    onClick={() => handleReject(item)}
                                                    className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 border border-red-200"
                                                >
                                                    ✕ Rechazar
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedTicket(item);
                                                        setShowPreviewModal(true);
                                                    }}
                                                    className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 shadow-sm"
                                                    disabled={approvingId === item.id}
                                                >
                                                    {approvingId === item.id ? '⏳' : '✓ Aprobar'}
                                                </button>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
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
                                        <p><span className="font-medium">Tipo:</span> {getItemDescription(selectedTicket)}</p>
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
                                    onClick={() => handleReject(selectedTicket)}
                                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                                >
                                    ✕ Rechazar
                                </button>
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

            {/* Modal de Confirmación Masiva */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
                        <div className="flex items-center gap-3 mb-4 text-green-600">
                            <span className="text-2xl">⚡</span>
                            <h3 className="text-xl font-bold text-gray-900">Confirmar Aprobación</h3>
                        </div>
                        <p className="text-gray-600 mb-6 text-lg">
                            ¿Estás seguro de aprobar <span className="font-bold text-gray-900">{selectedItems.length}</span> ticket(s) seleccionado(s)?
                        </p>
                        <div className="bg-blue-50 p-4 rounded-lg mb-6 text-sm text-blue-800">
                            Esta acción registrará los pagos oficialmente en el sistema y notificará a los apoderados.
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmApproveSelected}
                                className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-lg shadow-green-200 transition-all active:scale-95"
                            >
                                Sí, Aprobar Todo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Rechazo */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
                        <div className="flex items-center gap-3 mb-4 text-red-600">
                            <span className="text-2xl">🚫</span>
                            <h3 className="text-xl font-bold text-gray-900">Rechazar Ticket</h3>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Por favor indica el motivo del rechazo. Este mensaje será visible para el apoderado.
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-6 h-32 resize-none"
                            placeholder="Ej: El comprobante no es legible, el monto no coincide..."
                            autoFocus
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmReject}
                                className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-lg shadow-red-200 transition-all active:scale-95"
                            >
                                Confirmar Rechazo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Edición */}
            {showEditModal && editingItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3 text-scout-blue">
                                <span className="text-2xl">✏️</span>
                                <h3 className="text-xl font-bold text-gray-900">Editar Registro</h3>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <div className="space-y-4">
                            {/* Info Alumno (Solo lectura) */}
                            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 mb-4">
                                <p><strong>Alumno:</strong> {editingItem.alumnos?.nombre} {editingItem.alumnos?.apellidos_alumno}</p>
                                <p><strong>RUT:</strong> {editingItem.alumnos?.rut_alumno}</p>
                            </div>

                            {/* Campos Editables */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Pago</label>
                                <input
                                    type="date"
                                    value={editFormData.fecha_pago}
                                    onChange={(e) => setEditFormData({ ...editFormData, fecha_pago: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                                <input
                                    type="number"
                                    value={editFormData.monto}
                                    onChange={(e) => setEditFormData({ ...editFormData, monto: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Ítem</label>
                                <select
                                    value={editFormData.tipo_item}
                                    onChange={(e) => setEditFormData({ ...editFormData, tipo_item: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                                >
                                    <option value="cuota_mensual">Cuota Mensual</option>
                                    <option value="rifa">Rifa</option>
                                    <option value="evento">Evento</option>
                                    <option value="campamento">Campamento</option>
                                    <option value="parche">Parche</option>
                                </select>
                            </div>

                            {editFormData.tipo_item === 'cuota_mensual' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mes Correspondiente</label>
                                    <select
                                        value={editFormData.mes}
                                        onChange={(e) => setEditFormData({ ...editFormData, mes: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                                    >
                                        <option value="">Seleccionar mes...</option>
                                        <option value="1">Enero</option>
                                        <option value="2">Febrero</option>
                                        <option value="3">Marzo</option>
                                        <option value="4">Abril</option>
                                        <option value="5">Mayo</option>
                                        <option value="6">Junio</option>
                                        <option value="7">Julio</option>
                                        <option value="8">Agosto</option>
                                        <option value="9">Septiembre</option>
                                        <option value="10">Octubre</option>
                                        <option value="11">Noviembre</option>
                                        <option value="12">Diciembre</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleEditSave}
                                className="px-5 py-2.5 bg-scout-blue text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-200 transition-all active:scale-95"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
