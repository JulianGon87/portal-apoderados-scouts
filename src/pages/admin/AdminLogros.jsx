import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useToast } from '../../components/Toast';

export default function AdminLogros() {
    const { user } = useAdminAuth();
    const { addToast } = useToast();

    const [logros, setLogros] = useState([]);
    const [alumnos, setAlumnos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        alumno_id: '',
        titulo: '',
        descripcion: '',
        fecha_obtencion: new Date().toISOString().split('T')[0],
        icono: '🏅'
    });

    const iconosDisponibles = ['🏅', '🏆', '⭐', '⚜️', '🔥', '⛺', '🧗', '🏊', '🚴', '🎨', '🎵', '🏥', '🌱', '🐾'];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Cargar logros con datos de alumno
            const { data: logrosData, error: logrosError } = await supabase
                .from('logros_alumno')
                .select(`
                    *,
                    alumnos (
                        id,
                        nombre,
                        apellidos_alumno,
                        seccion
                    )
                `)
                .order('fecha_obtencion', { ascending: false });

            if (logrosError) throw logrosError;
            setLogros(logrosData || []);

            // Cargar lista de alumnos para el selector
            const { data: alumnosData, error: alumnosError } = await supabase
                .from('alumnos')
                .select('id, nombre, apellidos_alumno, seccion')
                .order('nombre');

            if (alumnosError) throw alumnosError;
            setAlumnos(alumnosData || []);

        } catch (error) {
            console.error('Error al cargar datos:', error);
            addToast('Error al cargar datos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!formData.alumno_id) {
                addToast('Debes seleccionar un alumno', 'warning');
                return;
            }

            const { error } = await supabase
                .from('logros_alumno')
                .insert([formData]);

            if (error) throw error;

            addToast('Logro asignado exitosamente', 'success');
            setShowModal(false);
            setFormData({
                alumno_id: '',
                titulo: '',
                descripcion: '',
                fecha_obtencion: new Date().toISOString().split('T')[0],
                icono: '🏅'
            });
            fetchData();
        } catch (error) {
            console.error('Error al guardar logro:', error);
            addToast('Error al guardar: ' + error.message, 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este logro?')) return;

        try {
            const { error } = await supabase.from('logros_alumno').delete().eq('id', id);
            if (error) throw error;
            addToast('Logro eliminado', 'success');
            fetchData();
        } catch (error) {
            console.error('Error al eliminar:', error);
            addToast('Error al eliminar', 'error');
        }
    };

    const filteredLogros = logros.filter(logro =>
        logro.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        logro.alumnos?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        logro.alumnos?.apellidos_alumno.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Designación de Logros</h1>
                    <p className="text-gray-600 mt-1">Otorga insignias y reconocimientos a los alumnos</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-scout flex items-center gap-2"
                >
                    <span>🏆</span> Asignar Logro
                </button>
            </div>

            {/* Buscador */}
            <div className="card-glass p-4">
                <input
                    type="text"
                    placeholder="Buscar por logro o alumno..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                />
            </div>

            {/* Lista de Logros */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading && (
                    <div className="col-span-full text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-scout-blue mx-auto"></div>
                    </div>
                )}

                {!loading && filteredLogros.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <p className="text-4xl mb-2">🏅</p>
                        <p className="text-gray-500">No hay logros registrados</p>
                    </div>
                )}

                {!loading && filteredLogros.length > 0 && filteredLogros.map((logro) => (
                    <div key={logro.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all relative group">
                        <button
                            onClick={() => handleDelete(logro.id)}
                            className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            title="Eliminar logro"
                        >
                            ✕
                        </button>
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center text-2xl flex-shrink-0">
                                {logro.icono}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">{logro.titulo}</h3>
                                <p className="text-sm text-gray-600 mb-2">{logro.descripcion}</p>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="font-medium text-scout-blue bg-blue-50 px-2 py-0.5 rounded-full">
                                        {logro.alumnos?.nombre} {logro.alumnos?.apellidos_alumno}
                                    </span>
                                    <span className="text-gray-400">
                                        {new Date(logro.fecha_obtencion).toLocaleDateString('es-CL')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl animate-fade-in-up">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Asignar Nuevo Logro</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="alumno_id" className="block text-sm font-medium text-gray-700 mb-1">Alumno</label>
                                <select
                                    id="alumno_id"
                                    name="alumno_id"
                                    required
                                    value={formData.alumno_id}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                                >
                                    <option value="">Seleccionar alumno...</option>
                                    {alumnos.map(alumno => (
                                        <option key={alumno.id} value={alumno.id}>
                                            {alumno.nombre} {alumno.apellidos_alumno} ({alumno.seccion})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-1">Título del Logro</label>
                                <input
                                    id="titulo"
                                    type="text"
                                    name="titulo"
                                    required
                                    placeholder="Ej: Promesa Scout, Especialidad Cocina..."
                                    value={formData.titulo}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                                />
                            </div>

                            <div>
                                <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <textarea
                                    id="descripcion"
                                    name="descripcion"
                                    rows="2"
                                    required
                                    placeholder="Detalles del logro obtenido..."
                                    value={formData.descripcion}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="fecha_obtencion" className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                                    <input
                                        id="fecha_obtencion"
                                        type="date"
                                        name="fecha_obtencion"
                                        required
                                        value={formData.fecha_obtencion}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="icono" className="block text-sm font-medium text-gray-700 mb-1">Icono</label>
                                    <select
                                        id="icono"
                                        name="icono"
                                        value={formData.icono}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue text-xl"
                                    >
                                        {iconosDisponibles.map(icon => (
                                            <option key={icon} value={icon}>{icon}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-scout-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Asignar Logro
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
