import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabase/client';

const TicketPagoForm = ({ alumno, items, pagos = [], onSuccess, onCancel }) => {
    const [loading, setLoading] = useState(false);

    // Calcular deudas pendientes al inicio
    const deudasPendientes = useMemo(() => {
        return items.filter(item => {
            // Verificar si ya está pagado
            const isPaid = pagos.some(p =>
                p.estado === 'PAGADO' &&
                p.anio === item.anio &&
                (item.tipo_item === 'cuota_mensual' ? p.mes === item.mes : true) &&
                (p.tipo_item === item.tipo_item || (!p.tipo_item && item.tipo_item === 'cuota_mensual'))
            );
            return !isPaid;
        });
    }, [items, pagos]);

    const [formData, setFormData] = useState({
        tipo_item: '',
        item_id: '',
        monto: '',
        fecha_pago: new Date().toISOString().split('T')[0],
        comentario: ''
    });
    const [file, setFile] = useState(null);

    // Efecto para seleccionar automáticamente la primera deuda si existe
    useEffect(() => {
        if (deudasPendientes.length > 0 && !formData.item_id) {
            const primeraDeuda = deudasPendientes[0];
            setFormData(prev => ({
                ...prev,
                tipo_item: primeraDeuda.tipo_item,
                item_id: primeraDeuda.id,
                monto: primeraDeuda.monto
            }));
        }
    }, [deudasPendientes]);

    const handleDeudaChange = (e) => {
        const selectedId = e.target.value;
        if (!selectedId) return;

        const deuda = deudasPendientes.find(d => d.id === selectedId);
        if (deuda) {
            setFormData({
                ...formData,
                tipo_item: deuda.tipo_item,
                item_id: deuda.id,
                monto: deuda.monto
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!file) {
            alert('Debes subir un comprobante de pago');
            return;
        }

        if (!formData.item_id) {
            alert('Debes seleccionar una deuda a pagar');
            return;
        }

        try {
            setLoading(true);

            // 1. Subir imagen
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

            // 2. Crear Ticket
            const { error: ticketError } = await supabase
                .from('tickets_pago')
                .insert([{
                    alumno_id: alumno.id,
                    tipo_item: formData.tipo_item,
                    item_id: formData.item_id, // Ahora siempre tendrá ID
                    monto: parseInt(formData.monto),
                    fecha_pago: formData.fecha_pago,
                    comprobante_url: publicUrl,
                    estado: 'pendiente',
                    comentario_admin: formData.comentario
                }]);

            if (ticketError) throw ticketError;

            alert('Pago informado exitosamente. Espera la aprobación del administrador.');
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
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selecciona la deuda a pagar
                </label>
                <select
                    value={formData.item_id}
                    onChange={handleDeudaChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                    required
                >
                    {deudasPendientes.map(item => (
                        <option key={item.id} value={item.id}>
                            {item.descripcion} ({item.tipo_item.replace('_', ' ')}) - ${item.monto.toLocaleString('es-CL')}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto a Pagar
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                        type="number"
                        value={formData.monto}
                        readOnly // Hacemos el monto de solo lectura para evitar errores
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                </div>
                <p className="text-xs text-gray-500 mt-1">El monto corresponde al valor oficial de la deuda.</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Transferencia
                </label>
                <input
                    type="date"
                    value={formData.fecha_pago}
                    onChange={(e) => setFormData({ ...formData, fecha_pago: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comprobante (Imagen o PDF)
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-scout-blue transition-colors cursor-pointer bg-gray-50 relative">
                    <input
                        type="file"
                        onChange={(e) => setFile(e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept="image/*,.pdf"
                        required
                    />
                    <div className="space-y-1 text-center">
                        <span className="text-4xl">📎</span>
                        <div className="flex text-sm text-gray-600 justify-center">
                            <span className="font-medium text-scout-blue">
                                {file ? file.name : 'Sube un archivo'}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, PDF hasta 5MB</p>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={loading}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-scout-blue text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Enviando...
                        </>
                    ) : (
                        'Informar Pago'
                    )}
                </button>
            </div>
        </form>
    );
};

export default TicketPagoForm;
