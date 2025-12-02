import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import TicketPagoForm from '../components/TicketPagoForm';

import { useStudentFinance } from '../hooks/useStudentFinance';

const formatRut = (rut) => {
    if (!rut) return '';
    // Asegurar que sea string y eliminar puntos/guiones
    const cleanRut = String(rut).replace(/[^0-9kK]/g, '');
    if (cleanRut.length < 2) return rut;

    const body = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1).toUpperCase();

    // Formatear cuerpo con puntos
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    return `${formattedBody}-${dv}`;
};

const getStatusColor = (estado) => {
    if (estado === 'aprobado') return 'bg-green-100 text-green-800';
    if (estado === 'rechazado') return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
};

export default function StudentProfilePage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [alumno, setAlumno] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('logros');
    const [paymentTab, setPaymentTab] = useState('mensual');
    const [items, setItems] = useState([]);
    const [logros, setLogros] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [showTicketForm, setShowTicketForm] = useState(false);

    const fetchAlumnoData = React.useCallback(async () => {
        try {
            if (!alumno) setLoading(true);

            let query = supabase
                .from('alumnos')
                .select('*, pagos(*)')
                .single();

            if (/^\d+$/.test(slug)) {
                query = query.eq('id', slug);
            } else {
                query = query.eq('slug', slug);
            }

            const { data, error } = await query;

            if (error) throw error;
            setAlumno(data);

            const currentYear = new Date().getFullYear();
            const { data: itemsData, error: itemsError } = await supabase
                .from('items_pago')
                .select('*')
                .eq('anio', currentYear);

            if (itemsError) console.error('Error al cargar items:', itemsError);

            const applicableItems = (itemsData || []).filter(item =>
                !item.seccion || item.seccion === data.seccion
            );
            setItems(applicableItems);

            const { data: logrosData, error: logrosError } = await supabase
                .from('logros_alumno')
                .select('*')
                .eq('alumno_id', data.id)
                .order('fecha_obtencion', { ascending: false });

            if (logrosError) console.error('Error al cargar logros:', logrosError);
            setLogros(logrosData || []);

            const { data: ticketsData, error: ticketsError } = await supabase
                .from('tickets_pago')
                .select('*, items_pago(descripcion, mes, anio)')
                .eq('alumno_id', data.id)
                .order('created_at', { ascending: false });

            if (ticketsError) console.error('Error al cargar tickets:', ticketsError);
            setTickets(ticketsData || []);

        } catch (error) {
            console.error('Error al cargar alumno:', error);
            navigate('/home');
        } finally {
            setLoading(false);
        }
    }, [slug, navigate]);

    useEffect(() => {
        if (slug) fetchAlumnoData();
    }, [slug, fetchAlumnoData]);

    const handleTicketSuccess = () => {
        setShowTicketForm(false);
        fetchAlumnoData(); // Recarga suave de datos
    };

    const { paymentGroups, totalDebt, pendingCount } = useStudentFinance(items, alumno?.pagos);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scout-blue"></div>
            </div>
        );
    }

    if (!alumno) return null;

    return (
        <div className="min-h-full bg-gray-50 pb-12">
            {/* Header / Portada Compacto */}
            <div className="bg-gradient-to-r from-scout-green to-scout-blue text-white pb-10 pt-6 px-4 shadow-lg">
                <div className="max-w-5xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">

                        {/* Columna 1: Avatar */}
                        <div className="relative group flex-shrink-0">
                            <div className="w-32 h-32 md:w-40 md:h-40 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-6xl md:text-7xl border-4 border-white/30 shadow-xl overflow-hidden transition-all duration-300">
                                {alumno.foto_url ? (
                                    <img src={alumno.foto_url} alt="Foto de perfil" className="w-full h-full object-cover" />
                                ) : (
                                    '👦'
                                )}
                            </div>
                            <label className="absolute bottom-2 right-2 bg-white text-scout-blue p-2 rounded-full shadow-lg cursor-pointer hover:bg-gray-100 transition-colors transform hover:scale-110" title="Cambiar foto">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;

                                        try {
                                            setLoading(true);
                                            const fileExt = file.name.split('.').pop();
                                            const fileName = `${alumno.id}-${Date.now()}.${fileExt}`;
                                            const filePath = `${fileName}`;

                                            const { error: uploadError } = await supabase.storage
                                                .from('avatars')
                                                .upload(filePath, file);

                                            if (uploadError) throw uploadError;

                                            const { data: { publicUrl } } = supabase.storage
                                                .from('avatars')
                                                .getPublicUrl(filePath);

                                            const { error: updateError } = await supabase
                                                .from('alumnos')
                                                .update({ foto_url: publicUrl })
                                                .eq('id', alumno.id);

                                            if (updateError) throw updateError;

                                            setAlumno({ ...alumno, foto_url: publicUrl });
                                        } catch (error) {
                                            console.error('Error subiendo imagen:', error);
                                            alert('Error al subir la imagen');
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                />
                            </label>
                        </div>

                        {/* Columna 2: Información Personal */}
                        <div className="flex-grow text-center md:text-left space-y-3">
                            <div>
                                <h1 className="text-2xl md:text-4xl font-bold font-display leading-tight tracking-tight">
                                    {alumno.nombre} {alumno.apellidos_alumno}
                                </h1>
                                <p className="text-white/80 text-sm md:text-base font-medium mt-1">
                                    Perfil del Alumno
                                </p>
                            </div>

                            <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                <span className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium backdrop-blur-sm border border-white/10 shadow-sm">
                                    🏕️ <span className="opacity-75">Sección:</span> {alumno.seccion || 'Sin Sección'}
                                </span>
                                <span className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium backdrop-blur-sm border border-white/10 shadow-sm">
                                    📋 <span className="opacity-75">RUT:</span> {formatRut(alumno.rut_alumno)}
                                </span>
                                <span className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium backdrop-blur-sm border border-white/10 shadow-sm">
                                    🎓 <span className="opacity-75">Curso:</span> {alumno.curso}
                                </span>
                            </div>
                        </div>

                        {/* Columna 3: Estado Financiero (Card Flotante) */}
                        <div className="w-full md:w-auto flex flex-col gap-3 min-w-[200px]">
                            <div className={`p-4 rounded-xl backdrop-blur-md border border-white/20 shadow-xl text-center transition-transform hover:scale-105 ${totalDebt === 0
                                ? 'bg-gradient-to-br from-green-500/30 to-green-600/30 text-white'
                                : 'bg-gradient-to-br from-red-500/30 to-red-600/30 text-white'
                                }`}>
                                <p className="text-[10px] uppercase tracking-widest font-bold opacity-90 mb-1">Estado Financiero</p>
                                <p className="text-xl md:text-2xl font-bold">
                                    {totalDebt === 0 ? '✅ Al Día' : `$${totalDebt.toLocaleString('es-CL')}`}
                                </p>
                                {totalDebt > 0 && <p className="text-xs opacity-90 font-medium">Deuda Total</p>}
                            </div>

                            {pendingCount > 0 && (
                                <button
                                    onClick={() => setShowTicketForm(true)}
                                    className="w-full bg-white text-scout-blue px-4 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-50 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                                >
                                    <span>💸</span>
                                    <span className="group-hover:underline decoration-2 underline-offset-2">Informar Pago</span>
                                </button>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="max-w-4xl mx-auto px-2 md:px-4 -mt-6 md:-mt-8">
                <div className="bg-white rounded-xl shadow-xl overflow-hidden min-h-[500px]">

                    {/* Tabs Principales */}
                    <div className="flex border-b border-gray-200">
                        <button
                            className={`flex-1 py-3 text-center font-medium text-sm md:text-lg transition-colors ${activeTab === 'logros'
                                ? 'text-scout-blue border-b-2 border-scout-blue bg-blue-50/30'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            onClick={() => setActiveTab('logros')}
                        >
                            🏆 Logros
                        </button>
                        <button
                            className={`flex-1 py-3 text-center font-medium text-sm md:text-lg transition-colors ${activeTab === 'pagos'
                                ? 'text-scout-blue border-b-2 border-scout-blue bg-blue-50/30'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            onClick={() => setActiveTab('pagos')}
                        >
                            💰 Historial
                        </button>
                    </div>

                    <div className="p-4 md:p-8">
                        {activeTab === 'pagos' && (
                            <div className="animate-fade-in">
                                {/* Sub-tabs para Pagos */}
                                <div className="grid grid-cols-3 gap-1 mb-4 md:mb-6 bg-gray-100 p-1 rounded-xl w-full md:w-fit mx-auto md:mx-0">
                                    <button
                                        onClick={() => setPaymentTab('mensual')}
                                        className={`py-2 px-1 rounded-lg text-xs md:text-sm font-medium transition-all flex items-center justify-center ${paymentTab === 'mensual'
                                            ? 'bg-white text-scout-blue shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        Cuotas
                                    </button>
                                    <button
                                        onClick={() => setPaymentTab('otros')}
                                        className={`py-2 px-1 rounded-lg text-xs md:text-sm font-medium transition-all flex items-center justify-center ${paymentTab === 'otros'
                                            ? 'bg-white text-scout-blue shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        Otros Pagos
                                    </button>
                                    <button
                                        onClick={() => setPaymentTab('tickets')}
                                        className={`py-2 px-1 rounded-lg text-xs md:text-sm font-medium transition-all flex items-center justify-center gap-1 ${paymentTab === 'tickets'
                                            ? 'bg-white text-scout-blue shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        Solicitudes
                                    </button>
                                </div>

                                {paymentTab === 'mensual' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                        {paymentGroups.mensual.details
                                            .filter(month => month.items && month.items.length > 0)
                                            .map((month) => (
                                                <div key={month.monthId} className="p-3 md:p-4 rounded-xl border bg-white shadow-sm">
                                                    <h3 className="font-bold text-base md:text-lg mb-2 text-gray-800">{month.monthName}</h3>
                                                    <ul className="space-y-2">
                                                        {month.items.map((item) => {
                                                            // Buscar si existe un ticket rechazado para este ítem
                                                            const rejectedTicket = tickets.find(t =>
                                                                t.item_id === item.id && t.estado === 'rechazado'
                                                            );

                                                            return (
                                                                <li
                                                                    key={item.id}
                                                                    className={`flex flex-col p-2 rounded border ${item.isPaid ? 'bg-green-50 border-green-200' :
                                                                        rejectedTicket ? 'bg-red-50 border-red-200' :
                                                                            'bg-gray-50 border-gray-200'
                                                                        }`}
                                                                >
                                                                    <div className="flex justify-between items-center w-full">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`w-2 h-2 rounded-full ${item.isPaid ? 'bg-green-600' :
                                                                                rejectedTicket ? 'bg-red-600' :
                                                                                    'bg-gray-400'
                                                                                }`} />
                                                                            <span className="font-medium text-gray-800 text-sm">{item.descripcion}</span>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <span className="font-bold text-sm">${item.monto.toLocaleString('es-CL')}</span>
                                                                            <span className={`ml-2 text-[10px] md:text-xs font-semibold ${item.isPaid ? 'text-green-600' :
                                                                                rejectedTicket ? 'text-red-600' :
                                                                                    'text-gray-500'
                                                                                }`}>
                                                                                {item.isPaid ? 'Pagado' : rejectedTicket ? 'RECHAZADO' : 'Pendiente'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    {rejectedTicket && rejectedTicket.comentario_admin && (
                                                                        <div className="mt-2 text-xs text-red-700 bg-red-100/50 p-1.5 rounded border border-red-100">
                                                                            <span className="font-bold">Motivo:</span> {rejectedTicket.comentario_admin}
                                                                        </div>
                                                                    )}
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            ))}
                                    </div>
                                )}

                                {paymentTab === 'otros' && (
                                    <div className="space-y-3 md:space-y-4">
                                        {paymentGroups.otros.length === 0 ? (
                                            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                                <p className="text-4xl mb-2">📭</p>
                                                <p className="text-gray-500 font-medium">No hay otros pagos registrados.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-3 md:gap-4">
                                                {paymentGroups.otros.map((pago) => {
                                                    // Buscar si existe un ticket rechazado para este ítem
                                                    const rejectedTicket = tickets.find(t =>
                                                        t.item_id === pago.id && t.estado === 'rechazado'
                                                    );

                                                    return (
                                                        <div key={pago.id} className={`bg-white p-3 md:p-5 rounded-xl border hover:shadow-md transition-shadow flex flex-col gap-2 md:gap-3 ${rejectedTicket ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
                                                            }`}>
                                                            <div className="flex justify-between items-center w-full">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-xl md:text-2xl ${rejectedTicket ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'
                                                                        }`}>
                                                                        {pago.tipo_item === 'campamento' ? '⛺' :
                                                                            pago.tipo_item === 'evento' ? '🎉' :
                                                                                pago.tipo_item === 'rifa' ? '🎟️' : '🏷️'}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-bold text-gray-800 text-base md:text-lg capitalize leading-tight">
                                                                            {pago.tipo_item.replace('_', ' ')}
                                                                        </h4>
                                                                        <p className="text-gray-600 text-xs md:text-sm">{pago.descripcion}</p>
                                                                        {pago.fecha_limite && (
                                                                            <p className="text-xs text-scout-blue font-medium mt-0.5 flex items-center gap-1">
                                                                                📅 {new Date(pago.fecha_limite + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-base md:text-xl font-bold text-gray-800">
                                                                        ${pago.monto.toLocaleString('es-CL')}
                                                                    </p>
                                                                    <span className={`inline-block text-[10px] md:text-xs px-2 py-0.5 rounded-full font-bold mt-1 ${pago.isPaid ? 'bg-green-100 text-green-700' :
                                                                        rejectedTicket ? 'bg-red-100 text-red-700' :
                                                                            'bg-gray-100 text-gray-700'
                                                                        }`}>
                                                                        {pago.isPaid ? 'PAGADO' : rejectedTicket ? 'RECHAZADO' : 'PENDIENTE'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {rejectedTicket && rejectedTicket.comentario_admin && (
                                                                <div className="w-full bg-red-50 p-2 md:p-3 rounded-lg text-xs md:text-sm text-red-700 border border-red-100">
                                                                    <span className="font-bold block text-[10px] uppercase mb-1">Motivo del rechazo:</span>
                                                                    {rejectedTicket.comentario_admin}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {paymentTab === 'tickets' && (
                                    <div className="space-y-3 md:space-y-4">
                                        {tickets.length === 0 ? (
                                            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                                <p className="text-4xl mb-2">🎫</p>
                                                <p className="text-gray-500 font-medium">No has informado pagos aún.</p>
                                                <button
                                                    onClick={() => setShowTicketForm(true)}
                                                    className="mt-4 text-scout-blue font-bold hover:underline"
                                                >
                                                    Informar un pago ahora
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-3 md:gap-4">
                                                {Object.values(tickets.reduce((acc, ticket) => {
                                                    // Agrupar por URL del comprobante o por ID si no tiene (para mostrar individuales)
                                                    // Usamos una clave compuesta para mayor seguridad: URL + Fecha
                                                    const key = ticket.comprobante_url
                                                        ? `${ticket.comprobante_url}-${new Date(ticket.created_at).toDateString()}`
                                                        : ticket.id;

                                                    if (!acc[key]) {
                                                        acc[key] = {
                                                            ...ticket,
                                                            items: [],
                                                            totalMonto: 0,
                                                            ids: []
                                                        };
                                                    }
                                                    acc[key].items.push(ticket);
                                                    acc[key].totalMonto += ticket.monto;
                                                    acc[key].ids.push(ticket.id);
                                                    // Si alguno del grupo está rechazado, el grupo se marca con alerta, pero mantenemos el estado del ticket principal para el color
                                                    return acc;
                                                }, {})).map((group) => {
                                                    // Ordenar ítems: primero por año/mes (si existe), luego otros
                                                    group.items.sort((a, b) => {
                                                        const getSortValue = (item) => {
                                                            if (item.items_pago?.mes) {
                                                                // Año * 100 + Mes (ej: 202501, 202512)
                                                                // Si no hay año en items_pago, usamos el año actual como fallback o 0
                                                                const year = item.items_pago.anio || new Date().getFullYear();
                                                                return year * 100 + item.items_pago.mes;
                                                            }
                                                            // Ítems sin mes (rifas, eventos) van al final (o al principio si prefieres)
                                                            // Usamos un valor alto para que vayan al final
                                                            return 999999;
                                                        };

                                                        const valA = getSortValue(a);
                                                        const valB = getSortValue(b);

                                                        if (valA !== valB) return valA - valB;
                                                        return a.id - b.id; // Desempate estable
                                                    });

                                                    const isRejected = group.estado === 'rechazado';

                                                    return (
                                                        <div key={group.id} className={`bg-white p-3 md:p-5 rounded-xl border hover:shadow-md transition-shadow ${isRejected ? 'border-red-300 bg-red-50/10' : 'border-gray-200'}`}>
                                                            <div className="flex justify-between items-start mb-2 md:mb-3">
                                                                <div>
                                                                    <div className="flex flex-wrap gap-2 mb-1 md:mb-2">
                                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider ${getStatusColor(group.estado)}`}>
                                                                            {group.estado}
                                                                        </span>
                                                                        {group.items.length > 1 && (
                                                                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold bg-blue-100 text-blue-800">
                                                                                {group.items.length} ítems
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <h4 className="font-bold text-gray-800 text-base md:text-lg">
                                                                        {group.items.length > 1 ? 'Pago Agrupado' : group.tipo_item.replace('_', ' ')}
                                                                    </h4>
                                                                </div>
                                                                <p className="text-base md:text-xl font-bold text-gray-800">
                                                                    ${group.totalMonto.toLocaleString('es-CL')}
                                                                </p>
                                                            </div>

                                                            {/* Lista de ítems del grupo */}
                                                            <div className="mb-2 md:mb-3 bg-gray-50 rounded-lg p-2 md:p-3 text-xs md:text-sm">
                                                                <ul className="space-y-1">
                                                                    {group.items.map((item, idx) => {
                                                                        // Determinar qué mostrar entre paréntesis
                                                                        let detalle = '';
                                                                        if (item.items_pago) {
                                                                            detalle = item.items_pago.descripcion;
                                                                            // Si es cuota mensual y la descripción es genérica, intentamos usar el mes si tenemos un mapa de meses o si viene en el objeto
                                                                            if (item.tipo_item === 'cuota_mensual' && item.items_pago.mes) {
                                                                                const monthName = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][item.items_pago.mes - 1];
                                                                                if (monthName) detalle = monthName;
                                                                            }
                                                                        }

                                                                        return (
                                                                            <li key={idx} className="flex justify-between text-gray-600">
                                                                                <span className="capitalize">
                                                                                    • {item.tipo_item.replace('_', ' ')}
                                                                                    {detalle && <span className="text-gray-400 ml-1">({detalle})</span>}
                                                                                </span>
                                                                                <span>${item.monto.toLocaleString('es-CL')}</span>
                                                                            </li>
                                                                        );
                                                                    })}
                                                                </ul>
                                                            </div>

                                                            <div className="text-xs md:text-sm text-gray-600 flex justify-between items-center pt-2 border-t border-gray-100">
                                                                <span>📅 {new Date(group.fecha_pago).toLocaleDateString('es-CL')}</span>
                                                                {group.comprobante_url && (
                                                                    <a href={group.comprobante_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 font-medium">
                                                                        📎 Ver Comprobante
                                                                    </a>
                                                                )}
                                                            </div>

                                                            {isRejected && (
                                                                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                                                                    <div className="flex items-start gap-2">
                                                                        <span className="text-lg">⚠️</span>
                                                                        <div className="w-full">
                                                                            <p className="text-red-800 font-bold text-sm">Solicitud Rechazada</p>
                                                                            <div className="mt-1 space-y-1">
                                                                                {group.items.filter(t => t.estado === 'rechazado').length > 0 ? (
                                                                                    group.items.filter(t => t.estado === 'rechazado').map((ticket, idx) => {
                                                                                        let itemName = ticket.tipo_item.replace('_', ' ');
                                                                                        if (ticket.items_pago) {
                                                                                            if (ticket.tipo_item === 'cuota_mensual' && ticket.items_pago.mes) {
                                                                                                const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                                                                                                const mName = monthNames[ticket.items_pago.mes - 1];
                                                                                                itemName = mName ? `Cuota ${mName}` : ticket.items_pago.descripcion;
                                                                                            } else {
                                                                                                itemName = ticket.items_pago.descripcion;
                                                                                            }
                                                                                        }
                                                                                        return (
                                                                                            <p key={idx} className="text-red-700 text-sm">
                                                                                                <span className="font-semibold capitalize">• {itemName}:</span> {ticket.comentario_admin || 'Sin motivo especificado'}
                                                                                            </p>
                                                                                        );
                                                                                    })
                                                                                ) : (
                                                                                    <p className="text-red-700 text-sm">{group.comentario_admin || 'No se especificó un motivo.'}</p>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-red-600/80 text-xs mt-2 font-medium">Por favor verifica los datos y envía una nueva solicitud.</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'logros' && (
                            <div className="animate-fade-in">
                                {logros.length === 0 ? (
                                    <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
                                            🏆
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">Aún no hay logros registrados</h3>
                                        <p className="text-gray-500 max-w-md mx-auto">
                                            Aquí aparecerán las insignias, adelantos y reconocimientos especiales que obtenga el alumno.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                        {logros.map((logro) => (
                                            <div key={logro.id} className="bg-white p-3 md:p-5 rounded-xl border border-gray-200 hover:shadow-lg transition-all flex items-start gap-3 md:gap-4 group">
                                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center text-2xl md:text-3xl shadow-sm group-hover:scale-110 transition-transform">
                                                    {logro.icono || '🏅'}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-800 text-base md:text-lg">{logro.titulo}</h4>
                                                    <p className="text-gray-600 text-xs md:text-sm mb-2">{logro.descripcion}</p>
                                                    <span className="inline-flex items-center gap-1 text-[10px] md:text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                                                        📅 {new Date(logro.fecha_obtencion).toLocaleDateString('es-CL')}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Ticket de Pago */}
            {showTicketForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Informar Pago</h2>
                                <button
                                    onClick={() => setShowTicketForm(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                            <TicketPagoForm
                                alumno={alumno}
                                items={items}
                                pagos={alumno.pagos || []}
                                tickets={tickets}
                                onSuccess={handleTicketSuccess}
                                onCancel={() => setShowTicketForm(false)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
