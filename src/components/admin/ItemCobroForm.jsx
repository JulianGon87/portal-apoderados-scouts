import React, { useState } from 'react';
import { supabase } from '../../supabase/client';

/**
 * Formulario para crear/editar items de cobro
 */
const ItemCobroForm = ({ item, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        tipo_item: item?.tipo_item || 'cuota_mensual',
        descripcion: item?.descripcion || '',
        monto: item?.monto || '',
        anio: item?.anio || new Date().getFullYear(),
        mes: item?.mes || '',
        seccion: item?.seccion || '', // '' = todos
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validaciones
        if (!formData.descripcion.trim()) {
            setError('La descripción es requerida');
            return;
        }

        if (!formData.monto || formData.monto <= 0) {
            setError('El monto debe ser mayor a 0');
            return;
        }

        if (formData.tipo_item === 'cuota_mensual' && !formData.mes) {
            setError('El mes es requerido para cuotas mensuales');
            return;
        }

        try {
            setLoading(true);

            const dataToSave = {
                tipo_item: formData.tipo_item,
                descripcion: formData.descripcion.trim(),
                monto: parseFloat(formData.monto),
                anio: parseInt(formData.anio),
                mes: formData.tipo_item === 'cuota_mensual' ? parseInt(formData.mes) : null,
                seccion: formData.seccion || null, // NULL = todos
            };

            if (item) {
                // Editar item existente
                const { error: updateError } = await supabase
                    .from('items_pago')
                    .update(dataToSave)
                    .eq('id', item.id);

                if (updateError) throw updateError;
                alert('Item actualizado exitosamente');
            } else {
                // Crear nuevo item
                const { error: insertError } = await supabase
                    .from('items_pago')
                    .insert([dataToSave]);

                if (insertError) throw insertError;
                alert('Item creado exitosamente');
            }

            onSuccess();
        } catch (err) {
            console.error('Error al guardar item:', err);
            setError('Error al guardar el item: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                    <p className="text-red-700 text-sm">{error}</p>
                </div>
            )}

            {/* Tipo de Item */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Item <span className="text-red-500">*</span>
                </label>
                <select
                    name="tipo_item"
                    value={formData.tipo_item}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                >
                    <option value="cuota_mensual">Cuota Mensual</option>
                    <option value="rifa">Rifa</option>
                    <option value="evento">Evento</option>
                    <option value="campamento">Campamento</option>
                    <option value="parche">Parche</option>
                </select>
            </div>

            {/* Descripción */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleChange}
                    required
                    placeholder="Ej: Cuota Enero 2024"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                />
            </div>

            {/* Monto */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto (CLP) <span className="text-red-500">*</span>
                </label>
                <input
                    type="number"
                    name="monto"
                    value={formData.monto}
                    onChange={handleChange}
                    required
                    min="1"
                    step="1"
                    placeholder="5000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                />
            </div>

            {/* Año */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Año <span className="text-red-500">*</span>
                </label>
                <select
                    name="anio"
                    value={formData.anio}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                >
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                </select>
            </div>

            {/* Mes (solo para cuotas mensuales) */}
            {formData.tipo_item === 'cuota_mensual' && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mes <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="mes"
                        value={formData.mes}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                    >
                        <option value="">Seleccionar mes</option>
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

            {/* Sección */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aplicar a
                </label>
                <select
                    name="seccion"
                    value={formData.seccion}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                >
                    <option value="">Todas las secciones</option>
                    <option value="manada">Manada</option>
                    <option value="tropa">Tropa</option>
                    <option value="compañia">Compañía</option>
                    <option value="comunidad">Comunidad</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                    Selecciona una sección específica o deja en "Todas las secciones"
                </p>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                    disabled={loading}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="flex-1 btn-scout"
                    disabled={loading}
                >
                    {loading ? 'Guardando...' : item ? 'Actualizar' : 'Crear Item'}
                </button>
            </div>
        </form>
    );
};

export default ItemCobroForm;
