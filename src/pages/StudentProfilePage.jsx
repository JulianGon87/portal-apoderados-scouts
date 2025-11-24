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
                .select('*, items_pago(descripcion, mes)')
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
    }, [slug, navigate]); // Eliminamos 'alumno' de las dependencias para evitar loops, ya que lo usamos solo para el check inicial

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
            {/* Header / Portada */}
            <div className="bg-gradient-to-r from-scout-green to-scout-blue text-white pb-12 pt-8 px-4 shadow-lg">
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={() => navigate('/home')}
                        className="mb-6 flex items-center gap-2 text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-all font-medium backdrop-blur-sm border border-white/10 shadow-sm"
                    >
                        ← Volver al Inicio
                    </button>

                    <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 pb-4">
                        <div className="relative group">
                            <div className="w-32 h-32 md:w-40 md:h-40 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-5xl border-4 border-white/30 shadow-xl overflow-hidden transition-all duration-300">
                                {alumno.foto_url ? (
                                    <img src={alumno.foto_url} alt="Foto de perfil" className="w-full h-full object-cover" />
                                ) : (
                                    '👦'
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 bg-white text-scout-blue p-1.5 rounded-full shadow-lg cursor-pointer hover:bg-gray-100 transition-colors" title="Cambiar foto">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        <div className="text-center md:text-left flex-grow w-full md:w-auto mt-4 md:mt-0">
                            <h1 className="text-xl md:text-3xl font-bold font-display leading-tight break-words">{alumno.nombre} {alumno.apellidos_alumno}</h1>
                            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 text-white/90">
                                <span className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full text-sm backdrop-blur-sm" title="Sección">
                                    🏕️ <span className="opacity-75 mr-1">Sección:</span> {alumno.seccion || 'Sin Sección'}
                                </span>
                                <span className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full text-sm backdrop-blur-sm" title="RUT">
                                    📋 <span className="opacity-75 mr-1">RUT:</span> {formatRut(alumno.rut_alumno)}
                                </span>
                                <span className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full text-sm backdrop-blur-sm" title="Curso">
                                    🎓 <span className="opacity-75 mr-1">Curso:</span> {alumno.curso}
                                </span>
                            </div>
                        </div>

                        {/* Estado General Badge + Botón Pagar */}
                        <div className="flex flex-col gap-3 items-end">
                            <div className={`px-4 py-2 rounded-xl backdrop-blur-md border border-white/20 shadow-lg ${totalDebt === 0 ? 'bg-green-500/20 text-green-50' : 'bg-red-500/20 text-red-50'
                                }`}>
                                <p className="text-[10px] uppercase tracking-wider font-bold opacity-80">Estado Financiero</p>
                                <p className="text-lg font-bold mt-0.5">
                                    {totalDebt === 0 ? '✅ Al Día' : `$${totalDebt.toLocaleString('es-CL')} Deuda`}
                                </p>
                            </div>
                            {pendingCount > 0 && (
                                <button
                                    onClick={() => setShowTicketForm(true)}
                                    className="bg-white text-scout-blue px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-blue-50 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    💸 Informar Pago
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="max-w-4xl mx-auto px-4 -mt-8">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden min-h-[500px]">

                    {/* Tabs Principales */}
                    <div className="flex border-b border-gray-200">
                        <button
                            className={`flex-1 py-4 text-center font-medium text-lg transition-colors ${activeTab === 'logros'
                                ? 'text-scout-blue border-b-2 border-scout-blue bg-blue-50/30'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            onClick={() => setActiveTab('logros')}
                        >
                            🏆 Logros
                        </button>
                        <button
                            className={`flex-1 py-4 text-center font-medium text-lg transition-colors ${activeTab === 'pagos'
                                ? 'text-scout-blue border-b-2 border-scout-blue bg-blue-50/30'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            onClick={() => setActiveTab('pagos')}
                        >
                            💰 Historial de Pagos
                        </button>
                    </div>

                    <div className="p-6 md:p-8">
                        {activeTab === 'pagos' && (
                            <div className="animate-fade-in">
                                {/* Sub-tabs para Pagos */}
                                <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg w-fit mx-auto md:mx-0 overflow-x-auto">
                                    <button
                                        onClick={() => setPaymentTab('mensual')}
                                        className={`px-6 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${paymentTab === 'mensual'
                                            ? 'bg-white text-scout-blue shadow-sm'
                                            : 'text-gray-600 hover:text-gray-800'
                                            }`}
                                    >
                                        Cuotas Mensuales
                                    </button>
                                    <button
                                        onClick={() => setPaymentTab('otros')}
                                        className={`px-6 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${paymentTab === 'otros'
                                            ? 'bg-white text-scout-blue shadow-sm'
                                            : 'text-gray-600 hover:text-gray-800'
                                            }`}
                                    >
                                        Otros Pagos
                                    </button>
                                    <button
                                        onClick={() => setPaymentTab('tickets')}
                                        className={`px-6 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${paymentTab === 'tickets'
                                            ? 'bg-white text-scout-blue shadow-sm'
                                            : 'text-gray-600 hover:text-gray-800'
                                            }`}
                                    >
                                        Solicitudes ({tickets.filter(t => t.estado === 'pendiente').length})
                                    </button>
                                </div>

                                {paymentTab === 'mensual' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {paymentGroups.mensual.details
                                            .filter(month => month.items && month.items.length > 0)
                                            .map((month) => (
                                                <div key={month.monthId} className="p-4 rounded-xl border bg-white shadow-sm">
                                                    <h3 className="font-bold text-lg mb-2 text-gray-800">{month.monthName}</h3>
                                                    <ul className="space-y-2">
                                                        {month.items.map((item) => (
                                                            <li
                                                                key={item.id}
                                                                className={`flex justify-between items-center p-2 rounded ${item.isPaid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`w-2 h-2 rounded-full ${item.isPaid ? 'bg-green-600' : 'bg-red-600'}`} />
                                                                    <span className="font-medium text-gray-800 text-sm">{item.descripcion}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="font-bold text-sm">${item.monto.toLocaleString('es-CL')}</span>
                                                                    <span className={`ml-2 text-xs font-semibold ${item.isPaid ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {item.isPaid ? 'Pagado' : 'Pendiente'}
                                                                    </span>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                    </div>
                                )}

                                {paymentTab === 'otros' && (
                                    <div className="space-y-4">
                                        {paymentGroups.otros.length === 0 ? (
                                            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                                <p className="text-4xl mb-2">📭</p>
                                                <p className="text-gray-500 font-medium">No hay otros pagos registrados.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-4">
                                                {paymentGroups.otros.map((pago, index) => (
                                                    <div key={index} className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow flex justify-between items-center">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl">
                                                                {pago.tipo_item === 'campamento' ? '⛺' :
                                                                    pago.tipo_item === 'evento' ? '🎉' :
                                                                        pago.tipo_item === 'rifa' ? '🎟️' : '🏷️'}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-gray-800 text-lg capitalize">
                                                                    {pago.tipo_item.replace('_', ' ')}
                                                                </h4>
                                                                <p className="text-gray-600">{pago.descripcion}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xl font-bold text-gray-800">
                                                                ${pago.monto.toLocaleString('es-CL')}
                                                            </p>
                                                            <span className={`inline-block text-xs px-2 py-1 rounded-full font-bold mt-1 ${pago.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                {pago.isPaid ? 'PAGADO' : 'PENDIENTE'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {paymentTab === 'tickets' && (
                                    <div className="space-y-4">
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
                                            <div className="grid grid-cols-1 gap-4">
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
                                                }, {})).map((group) => (
                                                    <div key={group.id} className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div>
                                                                <div className="flex flex-wrap gap-2 mb-2">
                                                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${group.estado === 'aprobado' ? 'bg-green-100 text-green-800' :
                                                                        group.estado === 'rechazado' ? 'bg-red-100 text-red-800' :
                                                                            'bg-yellow-100 text-yellow-800'
                                                                        }`}>
                                                                        {group.estado}
                                                                    </span>
                                                                    {group.items.length > 1 && (
                                                                        <span className="inline-block px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                                                            {group.items.length} ítems
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <h4 className="font-bold text-gray-800 text-lg">
                                                                    {group.items.length > 1 ? 'Pago Agrupado' : group.tipo_item.replace('_', ' ')}
                                                                </h4>
                                                            </div>
                                                            <p className="text-xl font-bold text-gray-800">
                                                                ${group.totalMonto.toLocaleString('es-CL')}
                                                            </p>
                                                        </div>

                                                        {/* Lista de ítems del grupo */}
                                                        <div className="mb-3 bg-gray-50 rounded-lg p-3 text-sm">
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

                                                        <div className="text-sm text-gray-600 flex justify-between items-center pt-2 border-t border-gray-100">
                                                            <span>📅 {new Date(group.fecha_pago).toLocaleDateString('es-CL')}</span>
                                                            {group.comprobante_url && (
                                                                <a href={group.comprobante_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 font-medium">
                                                                    📎 Ver Comprobante
                                                                </a>
                                                            )}
                                                        </div>

                                                        {group.comentario_admin && (
                                                            <div className="mt-3 p-3 bg-red-50 rounded-lg text-sm text-red-700 border-l-4 border-red-300">
                                                                <span className="font-bold block text-xs uppercase mb-1">Observación Admin:</span>
                                                                {group.comentario_admin}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {logros.map((logro) => (
                                            <div key={logro.id} className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-lg transition-all flex items-start gap-4 group">
                                                <div className="w-14 h-14 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform">
                                                    {logro.icono || '🏅'}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-800 text-lg">{logro.titulo}</h4>
                                                    <p className="text-gray-600 text-sm mb-2">{logro.descripcion}</p>
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
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
