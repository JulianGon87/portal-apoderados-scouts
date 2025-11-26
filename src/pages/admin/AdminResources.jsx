import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import useAdminAuth from '../../hooks/useAdminAuth';
import ResourceUploader from '../../components/admin/ResourceUploader';

const AdminResources = () => {
    const { hasPermission } = useAdminAuth();
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUploader, setShowUploader] = useState(false);
    const [filterUnidad, setFilterUnidad] = useState('todos');

    useEffect(() => {
        fetchResources();
    }, [filterUnidad]);

    const fetchResources = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('recursos_educativos')
                .select('*')
                .order('created_at', { ascending: false });

            if (filterUnidad !== 'todos') {
                query = query.eq('unidad', filterUnidad);
            }

            const { data, error } = await query;
            if (error) throw error;
            setResources(data || []);
        } catch (error) {
            console.error('Error fetching resources:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, fileUrl) => {
        if (!confirm('¿Estás seguro de eliminar este recurso?')) return;

        try {
            // 1. Eliminar de Storage
            if (fileUrl) {
                // Extraemos el path relativo del archivo desde la URL pública
                // La URL es tipo: .../storage/v1/object/public/recursos/carpeta/archivo.ext
                const pathParts = fileUrl.split('/recursos/');
                if (pathParts.length > 1) {
                    const storagePath = pathParts[1]; // "carpeta/archivo.ext"

                    const { error: storageError } = await supabase.storage
                        .from('recursos')
                        .remove([storagePath]);

                    if (storageError) {
                        console.error('Error deleting file from storage:', storageError);
                        // No detenemos el proceso, intentamos borrar el registro de BD de todas formas
                        // pero avisamos en consola.
                    }
                }
            }

            // 2. Eliminar de Base de Datos
            const { error } = await supabase
                .from('recursos_educativos')
                .delete()
                .eq('id', id);

            if (error) throw error;

            alert('Recurso eliminado correctamente');
            fetchResources();
        } catch (error) {
            console.error('Error deleting resource:', error);
            alert('Error al eliminar');
        }
    };

    const getIcon = (tipo) => {
        switch (tipo) {
            case 'ficha': return '📄';
            case 'cancion': return '🎵';
            case 'video': return '🎥';
            default: return '📦';
        }
    };

    const getUnidadBadge = (unidad) => {
        const colors = {
            manada: 'bg-yellow-100 text-yellow-800',
            tropa: 'bg-green-100 text-green-800',
            compañia: 'bg-blue-100 text-blue-800',
            avanzada: 'bg-red-100 text-red-800',
            clan: 'bg-gray-100 text-gray-800',
            general: 'bg-purple-100 text-purple-800'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${colors[unidad] || 'bg-gray-100'}`}>
                {unidad}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Biblioteca de Recursos</h1>
                    <p className="text-gray-600 mt-1">Gestiona el material educativo para los alumnos</p>
                </div>
                <button
                    onClick={() => setShowUploader(true)}
                    className="btn-scout flex items-center gap-2"
                >
                    <span>📤</span> Subir Material
                </button>
            </div>

            {/* Filtros */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {['todos', 'general', 'manada', 'tropa', 'compañia', 'avanzada', 'clan'].map(unidad => (
                    <button
                        key={unidad}
                        onClick={() => setFilterUnidad(unidad)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filterUnidad === unidad
                            ? 'bg-scout-blue text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                            }`}
                    >
                        {unidad.charAt(0).toUpperCase() + unidad.slice(1)}
                    </button>
                ))}
            </div>

            {/* Lista de Recursos */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scout-blue mx-auto"></div>
                </div>
            ) : resources.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                    <span className="text-4xl block mb-2">📚</span>
                    <p className="text-gray-500">No hay recursos en esta categoría</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {resources.map(resource => (
                        <div key={resource.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-3xl">{getIcon(resource.tipo)}</span>
                                    {getUnidadBadge(resource.unidad)}
                                </div>
                                <h3 className="font-bold text-gray-900 mb-1">{resource.titulo}</h3>
                                <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                                    {resource.descripcion || 'Sin descripción'}
                                </p>
                                <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                                    <a
                                        href={resource.url_archivo}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-scout-blue text-sm font-medium hover:underline flex items-center gap-1"
                                    >
                                        👁️ Ver archivo
                                    </a>
                                    <button
                                        onClick={() => handleDelete(resource.id, resource.url_archivo)}
                                        className="text-red-400 hover:text-red-600 p-1"
                                        title="Eliminar"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Uploader */}
            {showUploader && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Subir Nuevo Recurso</h2>
                        <ResourceUploader
                            onSuccess={() => {
                                setShowUploader(false);
                                fetchResources();
                            }}
                            onCancel={() => setShowUploader(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminResources;
