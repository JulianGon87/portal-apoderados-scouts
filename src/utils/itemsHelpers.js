import { supabase } from '../supabase/client';

/**
 * Obtiene items de cobro aplicables a un alumno según su sección
 * @param {string} seccionAlumno - Sección del alumno (manada, tropa, compañia, comunidad)
 * @param {number} anio - Año de los items (por defecto año actual)
 * @returns {Promise<Array>} Items aplicables
 */
export const getApplicableItems = async (seccionAlumno, anio = new Date().getFullYear()) => {
    try {
        let query = supabase
            .from('items_pago')
            .select('*')
            .eq('anio', anio)
            .order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        // Filtrar en memoria por ahora para manejar la lógica de NULL o coincidencia
        // Esto es más flexible que hacerlo solo en SQL si la lógica se complica
        const items = data.filter(item => {
            // Si seccion es NULL, aplica a todos
            if (!item.seccion) return true;
            // Si tiene sección, debe coincidir con la del alumno
            return item.seccion === seccionAlumno;
        });

        return items;
    } catch (error) {
        console.error('Error al obtener items aplicables:', error);
        return [];
    }
};

/**
 * Calcula el estado de pago de un item para un alumno
 * @param {Object} item - Item de cobro
 * @param {Array} pagos - Lista de pagos del alumno
 * @returns {Object} Estado del item { pagado: boolean, montoPagado: number, estado: string }
 */
export const getItemPaymentStatus = (item, pagos) => {
    // Buscar pagos relacionados con este item
    // Nota: En la fase actual, como no hay relación directa ID a ID entre items_pago y pagos (tabla antigua),
    // hacemos una aproximación basada en descripción o tipo.
    // En el futuro (Fase 5), esto será por ID directo.

    // Por ahora, asumimos que no hay pagos enlazados directamente a items nuevos
    // Esta función se expandirá en la Fase 5
    return {
        pagado: false,
        montoPagado: 0,
        estado: 'pendiente'
    };
};

/**
 * Agrupa items por tipo para visualización
 * @param {Array} items - Lista de items
 * @returns {Object} Items agrupados por tipo
 */
export const groupItemsByType = (items) => {
    return items.reduce((acc, item) => {
        const tipo = item.tipo_item;
        if (!acc[tipo]) {
            acc[tipo] = [];
        }
        acc[tipo].push(item);
        return acc;
    }, {});
};

/**
 * Obtiene el label legible para un tipo de item
 * @param {string} tipo - Tipo de item
 * @returns {string} Label legible
 */
export const getTipoLabel = (tipo) => {
    const labels = {
        cuota_mensual: 'Cuota Mensual',
        rifa: 'Rifa',
        evento: 'Evento',
        campamento: 'Campamento',
        parche: 'Parche'
    };
    return labels[tipo] || tipo;
};

/**
 * Obtiene el color del badge para un tipo de item
 * @param {string} tipo - Tipo de item
 * @returns {string} Clases CSS para el badge
 */
export const getTipoBadgeColor = (tipo) => {
    const colors = {
        cuota_mensual: 'bg-blue-100 text-blue-800',
        rifa: 'bg-purple-100 text-purple-800',
        evento: 'bg-green-100 text-green-800',
        campamento: 'bg-yellow-100 text-yellow-800',
        parche: 'bg-pink-100 text-pink-800'
    };
    return colors[tipo] || 'bg-gray-100 text-gray-800';
};
