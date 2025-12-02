import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../../supabase/client';

// Opciones de meses para cuotas mensuales
const MONTH_OPTIONS = [
    { id: 1, name: 'Enero' },
    { id: 2, name: 'Febrero' },
    { id: 3, name: 'Marzo' },
    { id: 4, name: 'Abril' },
    { id: 5, name: 'Mayo' },
    { id: 6, name: 'Junio' },
    { id: 7, name: 'Julio' },
    { id: 8, name: 'Agosto' },
    { id: 9, name: 'Septiembre' },
    { id: 10, name: 'Octubre' },
    { id: 11, name: 'Noviembre' },
    { id: 12, name: 'Diciembre' },
];

/**
 * Formulario para crear/editar items de cobro.
 * Para "cuota_mensual" permite seleccionar varios meses y crea un registro por cada mes.
 */
const ItemCobroForm = ({ item = null, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        tipo_item: item?.tipo_item || 'cuota_mensual',
        descripcion: item?.descripcion || '',
        monto: item?.monto || '',
        anio: item?.anio || new Date().getFullYear(),
        // Si el item ya tiene mes (edición) lo guardamos como un solo mes seleccionado
        meses: item?.mes ? [item.mes] : [],
        seccion: item?.seccion || '', // '' = todas
        fecha_limite: item?.fecha_limite || '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const toggleMonth = (id) => {
        setFormData((prev) => {
            const meses = prev.meses.includes(id)
                ? prev.meses.filter((m) => m !== id)
                : [...prev.meses, id];
            return { ...prev, meses };
        });
    };

    const validateForm = () => {
        if (!formData.descripcion.trim()) return 'La descripción es requerida';
        if (!formData.monto || Number(formData.monto) <= 0) return 'El monto debe ser mayor a 0';
        if (formData.tipo_item === 'cuota_mensual' && formData.meses.length === 0) return 'Debe seleccionar al menos un mes';
        return null;
    };

    const getCreatorId = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No hay usuario autenticado');

        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', user.id)
            .single();

        if (userError) throw userError;
        return userData.id;
    };

    const createItems = async (baseData, creatorId) => {
        if (formData.tipo_item === 'cuota_mensual') {
            const itemsToInsert = formData.meses.map((m) => ({
                ...baseData,
                mes: parseInt(m, 10),
                created_by: creatorId
            }));
            const { error } = await supabase.from('items_pago').insert(itemsToInsert);
            if (error) throw error;
        } else {
            const dataToInsert = {
                ...baseData,
                mes: null,
                created_by: creatorId
            };
            const { error } = await supabase.from('items_pago').insert([dataToInsert]);
            if (error) throw error;
        }
    };

    const updateItem = async (baseData) => {
        const dataToUpdate = {
            ...baseData,
            mes: formData.tipo_item === 'cuota_mensual' ? parseInt(formData.meses[0] || 0, 10) : null,
        };
        const { error } = await supabase.from('items_pago').update(dataToUpdate).eq('id', item.id);
        if (error) throw error;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        const baseData = {
            tipo_item: formData.tipo_item,
            descripcion: formData.descripcion.trim(),
            monto: parseFloat(formData.monto),
            anio: parseInt(formData.anio, 10),
            seccion: formData.seccion || null,
            fecha_limite: formData.fecha_limite || null,
        };

        try {
            setLoading(true);

            if (item) {
                await updateItem(baseData);
                alert('Item actualizado exitosamente');
            } else {
                const creatorId = await getCreatorId();
                await createItems(baseData, creatorId);
                alert('Item creado exitosamente');
            }
            onSuccess();
        } catch (err) {
            console.error('Error al guardar item:', err.message);
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

            {/* Fila 1: Tipo, Año y Fecha */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label htmlFor="tipo_item" className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo <span className="text-red-500">*</span>
                    </label>
                    <select
                        id="tipo_item"
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

                <div>
                    <label htmlFor="anio" className="block text-sm font-medium text-gray-700 mb-1">
                        Año de Cobro <span className="text-red-500">*</span>
                    </label>
                    <select
                        id="anio"
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
                    <p className="text-xs text-gray-500 mt-1">Año fiscal del cobro</p>
                </div>

                <div>
                    <label htmlFor="fecha_limite" className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha del Evento
                    </label>
                    <input
                        id="fecha_limite"
                        type="date"
                        name="fecha_limite"
                        value={formData.fecha_limite}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Opcional: Fecha real de la actividad</p>
                </div>
            </div>

            {/* Fila 2: Descripción */}
            <div>
                <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción <span className="text-red-500">*</span>
                </label>
                <input
                    id="descripcion"
                    type="text"
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleChange}
                    required
                    placeholder="Ej: Cuota Enero 2024"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                />
            </div>

            {/* Fila 3: Monto y Sección */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="monto" className="block text-sm font-medium text-gray-700 mb-1">
                        Monto <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                        <input
                            id="monto"
                            type="number"
                            name="monto"
                            value={formData.monto}
                            onChange={handleChange}
                            required
                            min="1"
                            step="1"
                            placeholder="5000"
                            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="seccion" className="block text-sm font-medium text-gray-700 mb-1">Sección</label>
                    <select
                        id="seccion"
                        name="seccion"
                        value={formData.seccion}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                    >
                        <option value="">Todas</option>
                        <option value="manada">Manada</option>
                        <option value="tropa">Tropa</option>
                        <option value="compañia">Compañía</option>
                        <option value="comunidad">Comunidad</option>
                    </select>
                </div>
            </div>

            {/* Meses (solo para cuota mensual) */}
            {formData.tipo_item === 'cuota_mensual' && (
                <fieldset className="border border-gray-200 rounded-lg p-3">
                    <legend className="text-sm font-medium text-gray-700 px-2">
                        Meses a generar
                    </legend>
                    <div className="grid grid-rows-3 grid-flow-col gap-x-4 gap-y-1 mt-1">
                        {MONTH_OPTIONS.map((m) => (
                            <label key={m.id} htmlFor={`mes-${m.id}`} className="inline-flex items-center hover:bg-gray-50 rounded px-1 cursor-pointer">
                                <input
                                    id={`mes-${m.id}`}
                                    type="checkbox"
                                    checked={formData.meses.includes(m.id)}
                                    onChange={() => toggleMonth(m.id)}
                                    className="form-checkbox h-4 w-4 text-scout-blue rounded border-gray-300"
                                />
                                <span className="ml-2 text-sm text-gray-700">{m.name}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
            )}

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

ItemCobroForm.propTypes = {
    item: PropTypes.shape({
        id: PropTypes.number,
        tipo_item: PropTypes.string,
        descripcion: PropTypes.string,
        monto: PropTypes.number,
        anio: PropTypes.number,
        mes: PropTypes.number,
        seccion: PropTypes.string,
    }),
    onSuccess: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};



export default ItemCobroForm;
