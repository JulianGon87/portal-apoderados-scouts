import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../supabase/client';

const MONTH_NAMES = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const TicketPagoForm = ({ alumno, items, pagos = [], tickets = [], onSuccess, onCancel }) => {
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    // Calcular deudas pendientes al inicio
    const deudasPendientes = useMemo(() => {
        return items.filter(item => {
            // 1. Verificar si ya está pagado
            const isPaid = pagos.some(p =>
                p.estado === 'PAGADO' &&
                p.anio === item.anio &&
                (item.tipo_item === 'cuota_mensual' ? p.mes === item.mes : true) &&
                (p.tipo_item === item.tipo_item || (!p.tipo_item && item.tipo_item === 'cuota_mensual'))
            );

            if (isPaid) return false;

            // 2. Verificar si ya tiene un ticket pendiente informado
            const hasPendingTicket = tickets.some(t =>
                t.estado === 'pendiente' &&
                (t.item_id === item.id) // Coincidencia exacta por ID
            );

            return !hasPendingTicket;
        }).sort((a, b) => {
            // Ordenar: primero por mes (si existe), luego por descripción
            if (a.mes && b.mes) return a.mes - b.mes;
            return 0;
        });
    }, [items, pagos, tickets]);

    const [formData, setFormData] = useState({
        fecha_pago: new Date().toISOString().split('T')[0],
        comentario: ''
    });
    const [file, setFile] = useState(null);

    // Calcular monto total basado en la selección
    const totalMonto = useMemo(() => {
        return deudasPendientes
            .filter(item => selectedIds.includes(item.id))
            .reduce((sum, item) => sum + item.monto, 0);
    }, [deudasPendientes, selectedIds]);

    const handleCheckboxChange = (id) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(item => item !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.length === deudasPendientes.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(deudasPendientes.map(d => d.id));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!file) {
            alert('Debes subir un comprobante de pago');
            return;
        }

        if (selectedIds.length === 0) {
            alert('Debes seleccionar al menos una deuda a pagar');
            return;
        }

        try {
            setLoading(true);

            // 1. Subir imagen (una sola vez para todos los tickets)
            const fileExt = file.name.split('.').pop();
            const fileName = `${alumno.id}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('comprobantes')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('comprobantes')
                .getPublicUrl(filePath);

            // 2. Crear Tickets (uno por cada deuda seleccionada)
            const ticketsToInsert = selectedIds.map(id => {
                const item = deudasPendientes.find(d => d.id === id);
                return {
                    alumno_id: alumno.id,
                    tipo_item: item.tipo_item,
                    item_id: item.id,
                    monto: item.monto,
                    fecha_pago: formData.fecha_pago,
                    comprobante_url: publicUrl,
                    estado: 'pendiente',
                    comentario_admin: formData.comentario
                };
            });

            const { error: ticketError } = await supabase
                .from('tickets_pago')
                .insert(ticketsToInsert);

            if (ticketError) throw ticketError;

            alert(`Se han informado ${ticketsToInsert.length} pago(s) exitosamente.`);
            onSuccess();

        } catch (error) {
            console.error('Error al crear ticket:', error);
            alert('Error al informar el pago: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (deudasPendientes.length === 0) {
        return (
            <div className="text-center py-6">
                <div className="text-green-500 text-5xl mb-4">🎉</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">¡Estás al día!</h3>
                <p className="text-gray-600 mb-6">No tienes deudas pendientes para informar.</p>
                <button
                    onClick={onCancel}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                    Cerrar
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            <div>
                <div className="flex justify-between items-center mb-1">
                    <span className="block text-sm font-medium text-gray-700">
                        Selecciona las deudas a pagar
                    </span>
                    <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-xs text-scout-blue hover:underline font-medium"
                    >
                        {selectedIds.length === deudasPendientes.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                    </button>
                </div>

                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg divide-y divide-gray-100 bg-gray-50">
                    {deudasPendientes.map(item => (
                        <label
                            key={item.id}
                            className={`flex items-center p-2 hover:bg-blue-50 cursor-pointer transition-colors ${selectedIds.includes(item.id) ? 'bg-blue-50/50' : ''}`}
                        >
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(item.id)}
                                onChange={() => handleCheckboxChange(item.id)}
                                className="w-4 h-4 text-scout-blue rounded border-gray-300 focus:ring-scout-blue"
                            />
                            <div className="ml-3 flex-1">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-gray-800 text-sm">
                                        {item.descripcion}
                                    </span>
                                    <span className="font-bold text-gray-700 text-sm">
                                        ${item.monto.toLocaleString('es-CL')}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 flex gap-2">
                                    <span className="capitalize">{item.tipo_item.replace('_', ' ')}</span>
                                    {item.mes && (
                                        <span className="font-semibold text-scout-blue">
                                            • {MONTH_NAMES[item.mes]}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </label>
                    ))}
                </div>
                <p className="text-right text-xs text-gray-500 mt-1">
                    {selectedIds.length} ítem(s) seleccionado(s)
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
                <div className="bg-blue-50 p-2 rounded-lg border border-blue-100 text-center">
                    <span className="block text-blue-800 text-[10px] font-bold uppercase tracking-wide">Total a Pagar</span>
                    <span className="block text-lg font-bold text-blue-900">
                        ${totalMonto.toLocaleString('es-CL')}
                    </span>
                </div>

                <div>
                    <label htmlFor="fecha_pago" className="block text-xs font-medium text-gray-700 mb-1">
                        Fecha Transferencia
                    </label>
                    <input
                        id="fecha_pago"
                        type="date"
                        value={formData.fecha_pago}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setFormData({ ...formData, fecha_pago: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                        required
                    />
                </div>
            </div>

            <div>
                <label htmlFor="comprobante" className="block text-xs font-medium text-gray-700 mb-1">
                    Comprobante (Imagen o PDF)
                </label>
                <div className="mt-1 flex justify-center px-4 py-2 border-2 border-gray-300 border-dashed rounded-lg hover:border-scout-blue transition-colors cursor-pointer bg-white relative">
                    <input
                        id="comprobante"
                        type="file"
                        onChange={(e) => setFile(e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept="image/*,.pdf"
                        required
                    />
                    <div className="space-y-0.5 text-center">
                        <span className="text-xl">📎</span>
                        <div className="flex text-xs text-gray-600 justify-center">
                            <span className="font-medium text-scout-blue truncate max-w-[200px]">
                                {file ? file.name : 'Sube un archivo'}
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-500">PNG, JPG, PDF hasta 5MB</p>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={loading}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="flex-1 px-3 py-2 text-sm bg-scout-blue text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                    disabled={loading || selectedIds.length === 0}
                >
                    {loading ? (
                        <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Enviando...
                        </>
                    ) : (
                        `Informar Pago ($${totalMonto.toLocaleString('es-CL')})`
                    )}
                </button>
            </div>
        </form>
    );
};

TicketPagoForm.propTypes = {
    alumno: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    }).isRequired,
    items: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        anio: PropTypes.number,
        mes: PropTypes.number,
        tipo_item: PropTypes.string,
        monto: PropTypes.number,
        descripcion: PropTypes.string,
    })).isRequired,
    pagos: PropTypes.array,
    tickets: PropTypes.array,
    onSuccess: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};

export default TicketPagoForm;
