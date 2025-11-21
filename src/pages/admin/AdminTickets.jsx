import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { useAdminAuth } from '../../hooks/useAdminAuth';

const AdminTickets = () => {
    const { hasPermission, isLoading: authLoading } = useAdminAuth(['gestionar_tickets', 'aprobar_pagos']);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pendiente'); // pendiente, aprobado, rechazado, todos
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        if (!authLoading) {
            fetchTickets();
        }
    }, [filter, authLoading]);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            let query = supabase
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
                        id,
                        descripcion,
                        mes,
                        anio
                    )
                `)
                .order('created_at', { ascending: false });

            if (filter !== 'todos') {
                query = query.eq('estado', filter);
            }

            const { data, error } = await query;

            if (error) throw error;
            setTickets(data || []);
        } catch (error) {
            console.error('Error al cargar tickets:', error);
            alert('Error al cargar tickets');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (ticket) => {
        if (!window.confirm('¿Estás seguro de aprobar este pago? Se registrará oficialmente.')) return;

        try {
            setProcessingId(ticket.id);

            // 1. Crear registro en tabla pagos
            // Si el ticket tiene un item_id específico, usamos esos datos.
            // Si es cuota mensual genérica, necesitamos deducir el mes/año o pedirlo (por ahora asumimos que el ticket tiene la info correcta o el admin edita después)
            // Simplificación: Creamos el pago con la info del ticket.

            const pagoData = {
                alumno_id: ticket.alumno_id,
                monto: ticket.monto,
                fecha_pago: ticket.fecha_pago,
                metodo_pago: 'transferencia',
                estado: 'aprobado',
                tipo_item: ticket.tipo_item,
                item_id: ticket.item_id,
                comprobante_url: ticket.comprobante_url,
                descripcion: ticket.items_pago ? ticket.items_pago.descripcion : `Pago de ${ticket.tipo_item}`
            };

            // Si es cuota mensual y tenemos el item, sacamos mes/año
            if (ticket.items_pago) {
                pagoData.mes = ticket.items_pago.mes;
                pagoData.anio = ticket.items_pago.anio;
            } else {
                // Si no hay item específico, usamos fecha actual o del pago
                const date = new Date(ticket.fecha_pago);
                pagoData.mes = date.getMonth() + 1;
                pagoData.anio = date.getFullYear();
            }

            const { error: pagoError } = await supabase
                .from('pagos')
                .insert([pagoData]);

            if (pagoError) throw pagoError;

            // 2. Actualizar estado del ticket
            const { error: ticketError } = await supabase
                .from('tickets_pago')
                .update({
                    estado: 'aprobado',
                    updated_at: new Date()
                })
                .eq('id', ticket.id);

            if (ticketError) throw ticketError;

            // Recargar
            fetchTickets();
            alert('Pago aprobado exitosamente');

        } catch (error) {
            console.error('Error al aprobar:', error);
            alert('Error al aprobar el pago: ' + error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (ticket) => {
        const motivo = prompt('Ingresa el motivo del rechazo (opcional):');
        if (motivo === null) return; // Cancelado

        try {
            setProcessingId(ticket.id);

            const { error } = await supabase
                .from('tickets_pago')
                .update({
                    estado: 'rechazado',
                    comentario_admin: motivo,
                    updated_at: new Date()
                })
                .eq('id', ticket.id);

            if (error) throw error;

            fetchTickets();

        } catch (error) {
            console.error('Error al rechazar:', error);
            alert('Error al rechazar: ' + error.message);
        } finally {
            setProcessingId(null);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scout-blue"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Gestión de Tickets de Pago</h1>
                <div className="flex gap-2">
                    {['pendiente', 'aprobado', 'rechazado', 'todos'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f
                                ? 'bg-scout-blue text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scout-blue"></div>
                </div>
            ) : tickets.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
                    <p className="text-5xl mb-4">🎫</p>
                    <h3 className="text-xl font-bold text-gray-800">No hay tickets {filter === 'todos' ? '' : filter + 's'}</h3>
                    <p className="text-gray-500">Los apoderados informarán sus pagos aquí.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {tickets.map((ticket) => (
                        <div key={ticket.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row">
                            {/* Izquierda: Info */}
                            <div className="p-6 flex-grow">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${ticket.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                                                ticket.estado === 'aprobado' ? 'bg-green-100 text-green-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {ticket.estado}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                {new Date(ticket.created_at).toLocaleString('es-CL')}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900">
                                            {ticket.alumnos?.nombre} {ticket.alumnos?.apellidos_alumno}
                                        </h3>
                                        <p className="text-gray-600 text-sm">
                                            RUT: {ticket.alumnos?.rut_alumno} • Sección: {ticket.alumnos?.seccion || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-gray-900">
                                            ${ticket.monto.toLocaleString('es-CL')}
                                        </p>
                                        <p className="text-sm text-gray-500 capitalize">
                                            {ticket.tipo_item.replace('_', ' ')}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="block text-gray-500 text-xs uppercase font-bold">Fecha Pago</span>
                                            <span className="font-medium">{new Date(ticket.fecha_pago).toLocaleDateString('es-CL')}</span>
                                        </div>
                                        <div>
                                            <span className="block text-gray-500 text-xs uppercase font-bold">Detalle</span>
                                            <span className="font-medium">
                                                {ticket.items_pago ? ticket.items_pago.descripcion : 'Sin detalle específico'}
                                            </span>
                                        </div>
                                        {ticket.comentario_admin && (
                                            <div className="col-span-2 mt-2 pt-2 border-t border-gray-200">
                                                <span className="block text-gray-500 text-xs uppercase font-bold">Comentario Admin</span>
                                                <span className="text-red-600">{ticket.comentario_admin}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {ticket.estado === 'pendiente' && (
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleApprove(ticket)}
                                            disabled={processingId === ticket.id}
                                            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                                        >
                                            {processingId === ticket.id ? 'Procesando...' : '✅ Aprobar Pago'}
                                        </button>
                                        <button
                                            onClick={() => handleReject(ticket)}
                                            disabled={processingId === ticket.id}
                                            className="flex-1 bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                                        >
                                            ❌ Rechazar
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Derecha: Comprobante */}
                            <div className="bg-gray-100 p-4 md:w-1/3 flex flex-col justify-center items-center border-t md:border-t-0 md:border-l border-gray-200">
                                {ticket.comprobante_url ? (
                                    <>
                                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Comprobante</p>
                                        <a
                                            href={ticket.comprobante_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-full h-48 relative group overflow-hidden rounded-lg border border-gray-300 shadow-sm bg-white"
                                        >
                                            <img
                                                src={ticket.comprobante_url}
                                                alt="Comprobante"
                                                className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150?text=PDF/Error' }}
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                <span className="opacity-0 group-hover:opacity-100 bg-white/90 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                                                    🔍 Ver Original
                                                </span>
                                            </div>
                                        </a>
                                    </>
                                ) : (
                                    <div className="text-gray-400 text-center">
                                        <span className="text-4xl block mb-2">📄</span>
                                        <span className="text-sm">Sin comprobante</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminTickets;
