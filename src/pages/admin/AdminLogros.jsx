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
        alumno_ids: [],
        titulo: '',
        descripcion: '',
        fecha_obtencion: new Date().toISOString().split('T')[0],
        icono: '🏅'
    });
    const [sectionFilter, setSectionFilter] = useState('TODAS');
    const [studentSearch, setStudentSearch] = useState('');

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
            if (formData.alumno_ids.length === 0) {
                addToast('Debes seleccionar al menos un alumno', 'warning');
                return;
            }

            const inserts = formData.alumno_ids.map(id => ({
                alumno_id: id,
                titulo: formData.titulo,
                descripcion: formData.descripcion,
                fecha_obtencion: formData.fecha_obtencion,
                icono: formData.icono
            }));

            const { error } = await supabase
                .from('logros_alumno')
                .insert(inserts);

            if (error) throw error;

            addToast('Logros asignados exitosamente', 'success');
            setShowModal(false);
            setFormData({
                alumno_ids: [],
                titulo: '',
                descripcion: '',
                fecha_obtencion: new Date().toISOString().split('T')[0],
                icono: '🏅'
            });
            setSectionFilter('TODAS');
            setStudentSearch('');
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

            {/* Modal - Improved Responsiveness */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl w-full max-w-lg shadow-xl animate-fade-in-up max-h-[90vh] overflow-y-auto flex flex-col">

                        <div className="p-5 sm:p-6 border-b border-gray-100 sticky top-0 bg-white z-10 flex justify-between items-center">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Asignar Nuevo Logro</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-5 sm:p-6 space-y-5">
                            <form id="logroForm" onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Alumnos Destinatarios</label>

                                    {/* Filtros de Sección - Scrollable Horizontal */}
                                    <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
                                        {['TODAS', 'MANADA', 'TROPA', 'COMPAÑÍA', 'RUTA'].map(sec => (
                                            <button
                                                key={sec}
                                                type="button"
                                                onClick={() => setSectionFilter(sec)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shadow-sm border border-transparent
                                                    ${sectionFilter === sec
                                                        ? 'bg-scout-blue text-white shadow-md transform scale-105'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-scout-blue hover:text-scout-blue'}`}
                                            >
                                                {sec}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Buscador de Alumnos */}
                                    <div className="relative mb-2">
                                        <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
                                        <input
                                            type="text"
                                            placeholder="Buscar alumno..."
                                            value={studentSearch}
                                            onChange={(e) => setStudentSearch(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-scout-blue focus:border-transparent outline-none transition-shadow"
                                        />
                                    </div>

                                    {/* Lista de Selección */}
                                    <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto bg-gray-50 custom-scrollbar">
                                        {alumnos
                                            .filter(a => (sectionFilter === 'TODAS' || a.seccion?.toUpperCase() === sectionFilter))
                                            .filter(a => `${a.nombre} ${a.apellidos_alumno}`.toLowerCase().includes(studentSearch.toLowerCase()))
                                            .length === 0 ? (
                                            <p className="text-xs text-gray-500 text-center py-2">No se encontraron alumnos</p>
                                        ) : (
                                            <div className="divide-y divide-gray-100">
                                                <div className="flex items-center justify-between px-3 py-2 bg-gray-100 sticky top-0 z-10 border-b border-gray-200">
                                                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                                                        {formData.alumno_ids.length} seleccionados
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const visibleIds = alumnos
                                                                .filter(a => (sectionFilter === 'TODAS' || a.seccion?.toUpperCase() === sectionFilter))
                                                                .filter(a => `${a.nombre} ${a.apellidos_alumno}`.toLowerCase().includes(studentSearch.toLowerCase()))
                                                                .map(a => a.id);

                                                            const allSelected = visibleIds.every(id => formData.alumno_ids.includes(id));

                                                            if (allSelected) {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    alumno_ids: prev.alumno_ids.filter(id => !visibleIds.includes(id))
                                                                }));
                                                            } else {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    alumno_ids: [...new Set([...prev.alumno_ids, ...visibleIds])]
                                                                }));
                                                            }
                                                        }}
                                                        className="text-xs text-scout-blue hover:underline"
                                                    >
                                                        {alumnos
                                                            .filter(a => (sectionFilter === 'TODAS' || a.seccion?.toUpperCase() === sectionFilter))
                                                            .filter(a => `${a.nombre} ${a.apellidos_alumno}`.toLowerCase().includes(studentSearch.toLowerCase()))
                                                            .every(a => formData.alumno_ids.includes(a.id)) ? 'Deseleccionar todos' : 'Seleccionar todos'}
                                                    </button>
                                                </div>
                                                {alumnos
                                                    .filter(a => (sectionFilter === 'TODAS' || a.seccion?.toUpperCase() === sectionFilter))
                                                    .filter(a => `${a.nombre} ${a.apellidos_alumno}`.toLowerCase().includes(studentSearch.toLowerCase()))
                                                    .map(alumno => (
                                                        <label key={alumno.id} className={`flex items-center gap-3 p-3 cursor-pointer transition-all hover:bg-white
                                                                ${formData.alumno_ids.includes(alumno.id) ? 'bg-blue-50' : ''}
                                                            `}>
                                                            <div className="relative flex items-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.alumno_ids.includes(alumno.id)}
                                                                    onChange={() => {
                                                                        setFormData(prev => {
                                                                            const isSelected = prev.alumno_ids.includes(alumno.id);
                                                                            return {
                                                                                ...prev,
                                                                                alumno_ids: isSelected
                                                                                    ? prev.alumno_ids.filter(id => id !== alumno.id)
                                                                                    : [...prev.alumno_ids, alumno.id]
                                                                            };
                                                                        });
                                                                    }}
                                                                    className="w-5 h-5 rounded border-gray-300 text-scout-blue focus:ring-scout-blue transition-all"
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold text-gray-900 truncate">
                                                                    {alumno.nombre} {alumno.apellidos_alumno}
                                                                </p>
                                                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                                                    <span className={`w-2 h-2 rounded-full inline-block
                                                                            ${alumno.seccion === 'MANADA' ? 'bg-yellow-400' :
                                                                            alumno.seccion === 'TROPA' ? 'bg-green-500' :
                                                                                alumno.seccion === 'COMPAÑÍA' ? 'bg-blue-500' :
                                                                                    alumno.seccion === 'RUTA' ? 'bg-red-500' : 'bg-gray-300'
                                                                        }`}></span>
                                                                    {alumno.seccion || 'Sin Sección'}
                                                                </p>
                                                            </div>
                                                        </label>
                                                    ))
                                                }
                                            </div>
                                        )
                                        }
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="titulo" className="block text-sm font-bold text-gray-700 mb-1">Título del Logro</label>
                                    <input
                                        id="titulo"
                                        type="text"
                                        name="titulo"
                                        required
                                        placeholder="Ej: Promesa Scout..."
                                        value={formData.titulo}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="descripcion" className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
                                    <textarea
                                        id="descripcion"
                                        name="descripcion"
                                        rows="2"
                                        required
                                        placeholder="Detalles del logro..."
                                        value={formData.descripcion}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent outline-none transition-all resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="fecha_obtencion" className="block text-sm font-bold text-gray-700 mb-1">Fecha</label>
                                        <input
                                            id="fecha_obtencion"
                                            type="date"
                                            name="fecha_obtencion"
                                            required
                                            value={formData.fecha_obtencion}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="icono" className="block text-sm font-bold text-gray-700 mb-1">Icono</label>
                                        <select
                                            id="icono"
                                            name="icono"
                                            value={formData.icono}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue text-xl"
                                        >
                                            {iconosDisponibles.map(icon => (
                                                <option key={icon} value={icon}>{icon}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="p-5 sm:p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3 sticky bottom-0 z-10">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                form="logroForm"
                                className="px-6 py-2 bg-scout-blue text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg transform active:scale-95 font-bold"
                            >
                                Asignar Logro
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
