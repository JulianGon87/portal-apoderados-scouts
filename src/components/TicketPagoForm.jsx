import React, { useState } from 'react';
import { supabase } from '../supabase/client';

const TicketPagoForm = ({ alumno, items, onSuccess, onCancel }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        tipo_item: 'cuota_mensual',
        item_id: '',
        monto: '',
        fecha_pago: new Date().toISOString().split('T')[0],
        comentario: ''
    });
    const [file, setFile] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!file) {
            alert('Debes subir un comprobante de pago');
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
                    item_id: formData.item_id || null,
                    monto: parseInt(formData.monto),
                    fecha_pago: formData.fecha_pago,
                    comprobante_url: publicUrl,
                    estado: 'pendiente',
                    comentario_admin: formData.comentario // Usamos este campo temporalmente para notas del usuario si es necesario, o crear uno nuevo
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

    // Filtrar items según el tipo seleccionado para el dropdown específico
    const itemsFiltrados = items.filter(i => i.tipo_item === formData.tipo_item);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    ¿Qué estás pagando?
                </label>
                <select
                    value={formData.tipo_item}
                    onChange={(e) => setFormData({ ...formData, tipo_item: e.target.value, item_id: '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                    required
                >
                    <option value="cuota_mensual">Cuota Mensual</option>
                    <option value="rifa">Rifa</option>
                    <option value="evento">Evento</option>
                    <option value="campamento">Campamento</option>
                    <option value="parche">Parche</option>
                    <option value="otro">Otro</option>
                </select>
            </div>

            {/* Selector de Item Específico (si hay items disponibles para ese tipo) */}
            {itemsFiltrados.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Selecciona el detalle (Opcional)
                    </label>
                    <select
                        value={formData.item_id}
                        onChange={(e) => {
                            const item = items.find(i => i.id === e.target.value);
                            setFormData({
                                ...formData,
                                item_id: e.target.value,
                                monto: item ? item.monto : formData.monto
                            });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                    >
                        <option value="">-- Seleccionar --</option>
                        {itemsFiltrados.map(item => (
                            <option key={item.id} value={item.id}>
                                {item.descripcion} - ${item.monto.toLocaleString('es-CL')}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto Pagado
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                        type="number"
                        value={formData.monto}
                        onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                        placeholder="5000"
                        required
                        min="1"
                    />
                </div>
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
