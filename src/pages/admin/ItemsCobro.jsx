import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import useAdminAuth from '../../hooks/useAdminAuth';
import ItemCobroForm from '../../components/admin/ItemCobroForm';

/**
 * Página para gestionar items de cobro
 * Permite crear, editar, eliminar y listar items de cobro
 */
const ItemsCobro = () => {
    const { hasPermission } = useAdminAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [filters, setFilters] = useState({
        tipo: '',
        anio: new Date().getFullYear(),
        search: ''
    });

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupId)) {
                newSet.delete(groupId);
            } else {
                newSet.add(groupId);
            }
            return newSet;
        });
    };

    // Cargar items de cobro
    useEffect(() => {
        fetchItems();
    }, [filters]);

    const fetchItems = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('items_pago')
                .select('*')
                .order('created_at', { ascending: false });

            // Aplicar filtros
            if (filters.tipo) {
                query = query.eq('tipo_item', filters.tipo);
            }
            if (filters.anio) {
                query = query.eq('anio', filters.anio);
            }
            if (filters.search) {
                query = query.ilike('descripcion', `%${filters.search}%`);
            }

            const { data, error } = await query;

            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            console.error('Error al cargar items:', error);
        } finally {
            setLoading(false);
        }
    };

    // Agrupar cuotas mensuales
    const groupItems = (items) => {
        const grouped = [];
        const processed = new Set();

        items.forEach(item => {
            if (processed.has(item.id)) return;

            // Si es cuota mensual, buscar items relacionados
            if (item.tipo_item === 'cuota_mensual') {
                const relatedItems = items.filter(i =>
                    i.tipo_item === 'cuota_mensual' &&
                    i.descripcion === item.descripcion &&
                    i.anio === item.anio &&
                    i.seccion === item.seccion &&
                    i.monto === item.monto &&
                    !processed.has(i.id)
                );

                // Marcar como procesados
                relatedItems.forEach(i => processed.add(i.id));

                // Si hay más de 1, agrupar
                if (relatedItems.length > 1) {
                    const months = relatedItems.map(i => i.mes).sort((a, b) => a - b);
                    grouped.push({
                        ...item,
                        isGroup: true,
                        groupedItems: relatedItems,
                        months: months,
                        monthRange: `${getMonthName(months[0])} - ${getMonthName(months[months.length - 1])}`
                    });
                } else {
                    grouped.push(item);
                }
            } else {
                // No es cuota mensual, agregar directamente
                processed.add(item.id);
                grouped.push(item);
            }
        });

        return grouped;
    };

    const getMonthName = (monthNumber) => {
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return months[monthNumber - 1] || monthNumber;
    };

    const handleCreate = () => {
        setEditingItem(null);
        setShowForm(true);
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setShowForm(true);
    };

    const handleDelete = async (itemId) => {
        if (!hasPermission('eliminar_items_cobro')) {
            alert('No tienes permisos para eliminar items de cobro');
            return;
        }

        if (!confirm('¿Estás seguro de eliminar este item de cobro?')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('items_pago')
                .delete()
                .eq('id', itemId);

            if (error) throw error;

            alert('Item eliminado exitosamente');
            fetchItems();
        } catch (error) {
            console.error('Error al eliminar item:', error);
            alert('Error al eliminar el item');
        }
    };

    const handleDeleteGroup = async (groupedItems) => {
        if (!hasPermission('eliminar_items_cobro')) {
            alert('No tienes permisos para eliminar items de cobro');
            return;
        }

        const monthNames = groupedItems.map(i => getMonthName(i.mes)).join(', ');
        if (!confirm(`¿Estás seguro de eliminar todos los items de este grupo?\n\nSe eliminarán ${groupedItems.length} items (${monthNames})`)) {
            return;
        }

        try {
            const ids = groupedItems.map(i => i.id);
            const { error } = await supabase
                .from('items_pago')
                .delete()
                .in('id', ids);

            if (error) throw error;

            alert(`${groupedItems.length} items eliminados exitosamente`);
            fetchItems();
        } catch (error) {
            console.error('Error al eliminar grupo:', error);
            alert('Error al eliminar el grupo de items');
        }
    };

    const handleFormSuccess = () => {
        setShowForm(false);
        setEditingItem(null);
        fetchItems();
    };

    const getTipoLabel = (tipo) => {
        const labels = {
            cuota_mensual: 'Cuota Mensual',
            rifa: 'Rifa',
            evento: 'Evento',
            campamento: 'Campamento',
            parche: 'Parche'
        };
        return labels[tipo] || tipo;
    };

    const getTipoBadgeColor = (tipo) => {
        const colors = {
            cuota_mensual: 'bg-blue-100 text-blue-800',
            rifa: 'bg-purple-100 text-purple-800',
            evento: 'bg-green-100 text-green-800',
            campamento: 'bg-yellow-100 text-yellow-800',
            parche: 'bg-pink-100 text-pink-800'
        };
        return colors[tipo] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Items de Cobro</h1>
                    <p className="text-gray-600 mt-1">Gestiona los items de cobro del sistema</p>
                </div>
                {hasPermission('crear_items_cobro') && (
                    <button
                        onClick={handleCreate}
                        className="btn-scout flex items-center gap-2"
                    >
                        <span>➕</span>
                        Crear Item
                    </button>
                )}
            </div>

            {/* Filtros */}
            <div className="card-glass p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Búsqueda */}
                    <div>
                        <label htmlFor="search-items" className="block text-sm font-medium text-gray-700 mb-1">
                            Buscar
                        </label>
                        <input
                            id="search-items"
                            name="search"
                            type="text"
                            placeholder="Buscar por descripción..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                        />
                    </div>

                    {/* Tipo */}
                    <div>
                        <label htmlFor="filter-tipo" className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo
                        </label>
                        <select
                            id="filter-tipo"
                            name="tipo"
                            value={filters.tipo}
                            onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                        >
                            <option value="">Todos</option>
                            <option value="cuota_mensual">Cuota Mensual</option>
                            <option value="rifa">Rifa</option>
                            <option value="evento">Evento</option>
                            <option value="campamento">Campamento</option>
                            <option value="parche">Parche</option>
                        </select>
                    </div>

                    {/* Año */}
                    <div>
                        <label htmlFor="filter-anio" className="block text-sm font-medium text-gray-700 mb-1">
                            Año
                        </label>
                        <select
                            id="filter-anio"
                            name="anio"
                            value={filters.anio}
                            onChange={(e) => setFilters({ ...filters, anio: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                        >
                            <option value="">Todos</option>
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Modal de Formulario */}
            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {editingItem ? 'Editar Item' : 'Crear Nuevo Item'}
                                </h2>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>
                            <ItemCobroForm
                                item={editingItem}
                                onSuccess={handleFormSuccess}
                                onCancel={() => setShowForm(false)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Lista de Items */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scout-blue mx-auto"></div>
                    <p className="text-gray-600 mt-4">Cargando items...</p>
                </div>
            ) : items.length === 0 ? (
                <div className="card-glass p-12 text-center">
                    <span className="text-6xl mb-4 block">📋</span>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No hay items de cobro</h3>
                    <p className="text-gray-600">
                        {filters.search || filters.tipo || filters.anio
                            ? 'No se encontraron items con los filtros aplicados'
                            : 'Crea tu primer item de cobro para comenzar'}
                    </p>
                </div>
            ) : (() => {
                const groupedItems = groupItems(items);
                return groupedItems.length === 0 ? (
                    <div className="card-glass p-12 text-center">
                        <span className="text-6xl mb-4 block">📋</span>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No hay items de cobro</h3>
                        <p className="text-gray-600">
                            {filters.search || filters.tipo || filters.anio
                                ? 'No se encontraron items con los filtros aplicados'
                                : 'Crea tu primer item de cobro para comenzar'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {groupedItems.map((item, index) => (
                            <div key={item.isGroup ? `group-${item.id}` : item.id} className="card-glass overflow-hidden">
                                {/* Main item card */}
                                <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getTipoBadgeColor(item.tipo_item)}`}>
                                                {getTipoLabel(item.tipo_item)}
                                            </span>
                                            {item.seccion && (
                                                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-800">
                                                    🏕️ {item.seccion}
                                                </span>
                                            )}
                                            {!item.seccion && (
                                                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-600">
                                                    🌍 Todos
                                                </span>
                                            )}
                                            {item.isGroup && (
                                                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                                                    📅 {item.groupedItems.length} meses
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900">{item.descripcion}</h3>
                                        <div className="flex gap-4 mt-2 text-sm text-gray-600">
                                            <div>
                                                <span className="font-medium">Monto:</span> ${item.monto.toLocaleString('es-CL')}
                                            </div>
                                            <div>
                                                <span className="font-medium">Año:</span> {item.anio}
                                            </div>
                                            {item.isGroup ? (
                                                <div>
                                                    <span className="font-medium">Meses:</span> {item.monthRange}
                                                </div>
                                            ) : item.mes && (
                                                <div>
                                                    <span className="font-medium">Mes:</span> {getMonthName(item.mes)}
                                                </div>
                                            )}
                                        </div>
                                        {item.isGroup && (
                                            <div className="mt-3 text-xs text-gray-500">
                                                <span className="font-medium">Total grupo:</span> ${(item.monto * item.groupedItems.length).toLocaleString('es-CL')}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        {item.isGroup && (
                                            <button
                                                onClick={() => toggleGroup(item.id)}
                                                className="px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title={expandedGroups.has(item.id) ? "Colapsar" : "Expandir para editar"}
                                            >
                                                {expandedGroups.has(item.id) ? '🔼 Colapsar' : '🔽 Ver meses'}
                                            </button>
                                        )}
                                        {!item.isGroup && hasPermission('editar_items_cobro') && (
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                ✏️
                                            </button>
                                        )}
                                        {!item.isGroup && hasPermission('eliminar_items_cobro') && (
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                        {item.isGroup && hasPermission('eliminar_items_cobro') && (
                                            <button
                                                onClick={() => handleDeleteGroup(item.groupedItems)}
                                                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar grupo completo"
                                            >
                                                🗑️ Eliminar todos
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded individual items */}
                                {item.isGroup && expandedGroups.has(item.id) && (
                                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                                        <p className="text-sm font-medium text-gray-700 mb-3">Items individuales:</p>
                                        <div className="space-y-2">
                                            {item.groupedItems.map(individualItem => (
                                                <div key={individualItem.id} className="bg-white p-3 rounded-lg flex justify-between items-center">
                                                    <div className="text-sm">
                                                        <span className="font-medium text-gray-900">{getMonthName(individualItem.mes)}</span>
                                                        <span className="text-gray-500 ml-2">- ${individualItem.monto.toLocaleString('es-CL')}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {hasPermission('editar_items_cobro') && (
                                                            <button
                                                                onClick={() => handleEdit(individualItem)}
                                                                className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors text-sm"
                                                                title="Editar"
                                                            >
                                                                ✏️ Editar
                                                            </button>
                                                        )}
                                                        {hasPermission('eliminar_items_cobro') && (
                                                            <button
                                                                onClick={() => handleDelete(individualItem.id)}
                                                                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors text-sm"
                                                                title="Eliminar"
                                                            >
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                );
            })()}

            {/* Resumen */}
            {items.length > 0 && (
                <div className="card-glass p-4 bg-gray-50">
                    <p className="text-sm text-gray-600">
                        Mostrando <span className="font-bold">{items.length}</span> item(s) de cobro
                    </p>
                </div>
            )}
        </div>
    );
};

export default ItemsCobro;
