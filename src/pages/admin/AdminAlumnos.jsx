import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { useToast } from '../../components/Toast';

export default function AdminAlumnos() {
    const { addToast } = useToast();

    const [alumnos, setAlumnos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSeccion, setFilterSeccion] = useState('todos');
    const [showModal, setShowModal] = useState(false);
    const [editingAlumno, setEditingAlumno] = useState(null);

    // Estado para "Ver Ficha"
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewingAlumno, setViewingAlumno] = useState(null);

    // Estado para controlar si el apoderado ya existe en la BD
    const [apoderadoExistente, setApoderadoExistente] = useState(false);
    const [checkingApoderado, setCheckingApoderado] = useState(false);

    const [formData, setFormData] = useState({
        // Datos Apoderado
        rut_apoderado: '',
        nombre_apoderado: '',
        apellidos_apoderado: '',
        email_apoderado: '',
        telefono_apoderado: '',

        // Datos Alumno
        nombre: '',
        apellidos_alumno: '',
        rut_alumno: '',
        seccion: 'manada',
        curso: ''
    });

    // Función para limpiar y formatear RUT (12345678-9)
    const formatRut = (rut) => {
        if (!rut) return '';
        // Limpiar todo lo que no sea números o K
        let value = rut.replace(/[^\dkK]/g, '');
        // Si no hay valor, retornar vacío
        if (!value) return '';

        // Separar dígito verificador
        const dv = value.slice(-1).toUpperCase();
        const cuerpo = value.slice(0, -1);

        if (!cuerpo) return value; // Si es solo un dígito, devolverlo tal cual (aún escribiendo)

        return `${cuerpo}-${dv}`;
    };

    useEffect(() => {
        fetchAlumnos();
    }, []);

    const fetchAlumnos = async () => {
        try {
            setLoading(true);

            // 1. Cargar Alumnos
            const { data: alumnosData, error: alumnosError } = await supabase
                .from('alumnos')
                .select('*')
                .order('apellidos_alumno', { ascending: true });

            if (alumnosError) throw alumnosError;

            // 2. Extraer IDs de apoderados necesarios
            const apoderadoIds = [...new Set(alumnosData.map(a => a.apoderado_id).filter(Boolean))];

            let apoderadosMap = {};

            if (apoderadoIds.length > 0) {
                // 3. Cargar SOLO los apoderados necesarios (Estrategia .in)
                const { data: usersData, error: usersError } = await supabase
                    .from('users')
                    .select('*')
                    .in('id', apoderadoIds);

                if (usersError) {
                    console.error('Error cargando apoderados:', usersError);
                    addToast('Error cargando apoderados: ' + usersError.message, 'error');
                } else {
                    console.log(`Se buscaron ${apoderadoIds.length} IDs. Se encontraron ${usersData?.length} usuarios.`);
                    usersData.forEach(user => {
                        apoderadosMap[user.id] = user;
                    });
                }
            }

            // 4. Unir datos
            const alumnosCompletos = alumnosData.map(alumno => {
                const apoderado = apoderadosMap[alumno.apoderado_id];
                return {
                    ...alumno,
                    apoderado: apoderado || null
                };
            });

            setAlumnos(alumnosCompletos);
        } catch (error) {
            console.error('Error al cargar alumnos:', error);
            addToast('Error al cargar alumnos: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Verificar si el apoderado existe al perder el foco del RUT
    const handleRutApoderadoBlur = async () => {
        // Formatear lo que escribió el usuario
        const rutIngresado = formData.rut_apoderado;
        const rutFormateado = formatRut(rutIngresado);

        // Actualizar el campo visualmente con el formato correcto
        setFormData(prev => ({ ...prev, rut_apoderado: rutFormateado }));

        if (!rutFormateado || rutFormateado.length < 3) return;

        try {
            setCheckingApoderado(true);

            // Intentamos buscar por el RUT formateado (sin puntos, con guion)
            // Y también por si acaso está guardado "sucio" en la BD (tal cual lo escribió el usuario)
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .or(`rut.eq.${rutFormateado},rut.eq.${rutIngresado}`)
                .maybeSingle();

            if (error) {
                console.error('Error buscando apoderado:', error);
                return;
            }

            if (data) {
                // Apoderado existe
                setApoderadoExistente(true);
                setFormData(prev => ({
                    ...prev,
                    nombre_apoderado: data.nombre || '',
                    apellidos_apoderado: data.apellidos || '',
                    email_apoderado: data.email || '',
                    telefono_apoderado: data.telefono || '',
                    apoderado_id: data.id
                }));
                addToast('Apoderado encontrado. Datos cargados.', 'info');
            } else {
                // Apoderado no existe
                setApoderadoExistente(false);
                setFormData(prev => {
                    const { apoderado_id, ...rest } = prev;
                    return rest;
                });
            }
        } finally {
            setCheckingApoderado(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const rutAlumnoFormateado = formatRut(formData.rut_alumno);
            const rutApoderadoFormateado = formatRut(formData.rut_apoderado);

            // 1. Validar duplicidad de Alumno (por RUT) si es creación
            if (!editingAlumno) {
                const { data: existingAlumno } = await supabase
                    .from('alumnos')
                    .select('id')
                    .eq('rut_alumno', rutAlumnoFormateado)
                    .single();

                if (existingAlumno) {
                    addToast('Error: El RUT del alumno ya está registrado.', 'error');
                    return;
                }
            }

            let finalApoderadoId = formData.apoderado_id;

            // 2. Gestionar Apoderado
            if (!apoderadoExistente) {
                // Crear nuevo apoderado en tabla users
                const { data: newApoderado, error: apoderadoError } = await supabase
                    .from('users')
                    .insert([{
                        rut: rutApoderadoFormateado,
                        nombre: formData.nombre_apoderado,
                        apellidos: formData.apellidos_apoderado,
                        email: formData.email_apoderado,
                        telefono: formData.telefono_apoderado,
                        rol: 'apoderado'
                    }])
                    .select()
                    .single();

                if (apoderadoError) throw new Error('Error al crear apoderado: ' + apoderadoError.message);
                finalApoderadoId = newApoderado.id;
            }

            // 3. Crear/Actualizar Alumno
            const slugBase = `${formData.nombre}-${formData.apellidos_alumno}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const uniqueSlug = `${slugBase}-${Math.random().toString(36).slice(2, 7)}`;

            const dataToSave = {
                nombre: formData.nombre,
                apellidos_alumno: formData.apellidos_alumno,
                rut_alumno: rutAlumnoFormateado,
                seccion: formData.seccion,
                curso: formData.curso,
                apoderado_id: finalApoderadoId
            };

            if (editingAlumno) {
                const { error } = await supabase
                    .from('alumnos')
                    .update(dataToSave)
                    .eq('id', editingAlumno.id);
                if (error) throw error;
                addToast('Alumno actualizado exitosamente', 'success');
            } else {
                dataToSave.slug = uniqueSlug;
                const { error } = await supabase.from('alumnos').insert([dataToSave]);
                if (error) throw error;
                addToast('Alumno y vinculación creados exitosamente', 'success');
            }

            setShowModal(false);
            fetchAlumnos();
        } catch (error) {
            console.error('Error al guardar:', error);
            addToast('Error al guardar: ' + error.message, 'error');
        }
    };

    const handleEdit = (alumno) => {
        setEditingAlumno(alumno);
        setApoderadoExistente(true); // Al editar, asumimos que el apoderado ya existe

        setFormData({
            // Datos Alumno
            nombre: alumno.nombre,
            apellidos_alumno: alumno.apellidos_alumno,
            rut_alumno: alumno.rut_alumno,
            seccion: alumno.seccion || 'manada',
            curso: alumno.curso || '',

            // Datos Apoderado (cargados de la relación)
            rut_apoderado: alumno.apoderado?.rut || '',
            nombre_apoderado: alumno.apoderado?.nombre || '',
            apellidos_apoderado: alumno.apoderado?.apellidos || '',
            email_apoderado: alumno.apoderado?.email || '',
            telefono_apoderado: alumno.apoderado?.telefono || '',
            apoderado_id: alumno.apoderado_id
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este alumno? Esta acción no se puede deshacer.')) return;

        try {
            const { error } = await supabase.from('alumnos').delete().eq('id', id);
            if (error) throw error;
            addToast('Alumno eliminado', 'success');
            fetchAlumnos();
        } catch (error) {
            console.error('Error al eliminar:', error);
            addToast('Error al eliminar: ' + error.message, 'error');
        }
    };

    const handleNew = () => {
        setEditingAlumno(null);
        setApoderadoExistente(false);
        setFormData({
            rut_apoderado: '',
            nombre_apoderado: '',
            apellidos_apoderado: '',
            email_apoderado: '',
            telefono_apoderado: '',
            nombre: '',
            apellidos_alumno: '',
            rut_alumno: '',
            seccion: 'manada',
            curso: ''
        });
        setShowModal(true);
    };

    // --- NUEVAS FUNCIONES PARA VER FICHA ---
    const handleView = (alumno) => {
        setViewingAlumno(alumno);
        setShowViewModal(true);
    };

    const handleEditFromView = () => {
        handleEdit(viewingAlumno);
        setShowViewModal(false);
    };
    // ---------------------------------------

    const getSeccionBadgeColor = (seccion) => {
        switch (seccion) {
            case 'manada': return 'bg-yellow-100 text-yellow-800';
            case 'tropa': return 'bg-green-100 text-green-800';
            case 'compañia': return 'bg-blue-100 text-blue-800';
            default: return 'bg-red-100 text-red-800';
        }
    };

    const filteredAlumnos = alumnos.filter(alumno => {
        const matchSearch =
            alumno.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            alumno.apellidos_alumno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            alumno.rut_alumno?.includes(searchTerm);
        const matchSeccion = filterSeccion === 'todos' || alumno.seccion === filterSeccion;
        return matchSearch && matchSeccion;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestión de Alumnos</h1>
                    <p className="text-gray-600 mt-1">Registro y administración de beneficiarios</p>
                </div>
                <button onClick={handleNew} className="btn-scout flex items-center gap-2">
                    <span>➕</span> Nuevo Alumno
                </button>
            </div>

            {/* Filtros */}
            <div className="card-glass p-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Buscar por nombre, apellido o RUT..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                    />
                </div>
                <div className="w-full md:w-48">
                    <select
                        value={filterSeccion}
                        onChange={(e) => setFilterSeccion(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                    >
                        <option value="todos">Todas las secciones</option>
                        <option value="manada">Manada</option>
                        <option value="tropa">Tropa</option>
                        <option value="compañia">Compañía</option>
                        <option value="comunidad">Comunidad</option>
                    </select>
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alumno</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RUT</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sección</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Apoderado</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-scout-blue mx-auto"></div></td></tr>
                            ) : filteredAlumnos.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">No se encontraron alumnos</td></tr>
                            ) : (
                                filteredAlumnos.map((alumno) => (
                                    <tr key={alumno.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{alumno.nombre} {alumno.apellidos_alumno}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{alumno.rut_alumno}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getSeccionBadgeColor(alumno.seccion)}`}>
                                                {alumno.seccion}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {alumno.apoderado ? (
                                                <span className="font-medium">{alumno.apoderado.nombre} {alumno.apoderado.apellidos}</span>
                                            ) : (
                                                <span className="text-red-400 italic">Sin asignar</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleView(alumno)} className="text-scout-blue hover:text-blue-900 mr-4 font-semibold">
                                                Ver Ficha
                                            </button>
                                            <button onClick={() => handleDelete(alumno.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Ficha Completa (Solo Lectura) */}
            {showViewModal && viewingAlumno && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl max-w-2xl w-full p-0 shadow-2xl animate-fade-in-up my-8 overflow-hidden">
                        {/* Header con color de sección */}
                        <div className={`p-6 ${getSeccionBadgeColor(viewingAlumno.seccion).replace('text-', 'bg-opacity-20 text-')}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{viewingAlumno.nombre} {viewingAlumno.apellidos_alumno}</h2>
                                    <span className={`mt-2 px-3 py-1 inline-flex text-sm font-semibold rounded-full capitalize ${getSeccionBadgeColor(viewingAlumno.seccion)}`}>
                                        {viewingAlumno.seccion}
                                    </span>
                                </div>
                                <button onClick={() => setShowViewModal(false)} className="text-gray-500 hover:text-gray-700 text-xl font-bold">
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Grid de Información */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Columna Alumno */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">👤 Información del Alumno</h3>
                                    <dl className="space-y-3">
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">RUT</dt>
                                            <dd className="text-base text-gray-900">{viewingAlumno.rut_alumno}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Curso</dt>
                                            <dd className="text-base text-gray-900">{viewingAlumno.curso || 'No registrado'}</dd>
                                        </div>
                                    </dl>
                                </div>

                                {/* Columna Apoderado */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">👨‍👩‍👧‍👦 Información del Apoderado</h3>
                                    {viewingAlumno.apoderado ? (
                                        <dl className="space-y-3">
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Nombre Completo</dt>
                                                <dd className="text-base text-gray-900">{viewingAlumno.apoderado.nombre} {viewingAlumno.apoderado.apellidos}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">RUT</dt>
                                                <dd className="text-base text-gray-900">{viewingAlumno.apoderado.rut}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Email</dt>
                                                <dd className="text-base text-gray-900">{viewingAlumno.apoderado.email}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Teléfono</dt>
                                                <dd className="text-base text-gray-900">{viewingAlumno.apoderado.telefono}</dd>
                                            </div>
                                        </dl>
                                    ) : (
                                        <div className="bg-red-50 p-4 rounded-lg text-red-600 text-sm">
                                            ⚠️ Este alumno no tiene apoderado asignado correctamente.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer con Acciones */}
                        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={handleEditFromView}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm flex items-center gap-2"
                            >
                                ✏️ Editar Datos
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Edición/Creación */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl animate-fade-in-up my-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                            {editingAlumno ? 'Editar Alumno' : 'Nuevo Registro'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Sección Apoderado */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <span>👨‍👩‍👧‍👦</span> Datos del Apoderado
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">RUT Apoderado</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name="rut_apoderado"
                                                required
                                                value={formData.rut_apoderado}
                                                onChange={handleInputChange}
                                                onBlur={handleRutApoderadoBlur}
                                                disabled={editingAlumno} // No permitir cambiar RUT apoderado al editar alumno (por simplicidad)
                                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-scout-blue ${apoderadoExistente ? 'bg-green-50 border-green-300' : 'bg-white border-gray-300'}`}
                                                placeholder="12.345.678-9"
                                            />
                                            {checkingApoderado && (
                                                <div className="absolute right-3 top-2.5 animate-spin h-5 w-5 border-b-2 border-scout-blue rounded-full"></div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {apoderadoExistente
                                                ? '✅ Apoderado registrado. Sus datos se han cargado.'
                                                : 'ℹ️ Ingrese el RUT para buscar. Si no existe, podrá registrarlo.'}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                        <input
                                            type="text"
                                            name="nombre_apoderado"
                                            required
                                            value={formData.nombre_apoderado}
                                            onChange={handleInputChange}
                                            disabled={apoderadoExistente}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                                        <input
                                            type="text"
                                            name="apellidos_apoderado"
                                            required
                                            value={formData.apellidos_apoderado}
                                            onChange={handleInputChange}
                                            disabled={apoderadoExistente}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            name="email_apoderado"
                                            required
                                            value={formData.email_apoderado}
                                            onChange={handleInputChange}
                                            disabled={apoderadoExistente}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                        <input
                                            type="tel"
                                            name="telefono_apoderado"
                                            required
                                            value={formData.telefono_apoderado}
                                            onChange={handleInputChange}
                                            disabled={apoderadoExistente}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sección Alumno */}
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <span>⚜️</span> Datos del Alumno
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                        <input
                                            type="text"
                                            name="nombre"
                                            required
                                            value={formData.nombre}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                                        <input
                                            type="text"
                                            name="apellidos_alumno"
                                            required
                                            value={formData.apellidos_alumno}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">RUT Alumno</label>
                                        <input
                                            type="text"
                                            name="rut_alumno"
                                            required
                                            value={formData.rut_alumno}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                                            placeholder="12.345.678-9"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Curso</label>
                                        <input
                                            type="text"
                                            name="curso"
                                            value={formData.curso}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Sección</label>
                                        <select
                                            name="seccion"
                                            value={formData.seccion}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                                        >
                                            <option value="manada">Manada</option>
                                            <option value="tropa">Tropa</option>
                                            <option value="compañia">Compañía</option>
                                            <option value="comunidad">Comunidad</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-scout-blue text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                                >
                                    {editingAlumno ? 'Guardar Cambios' : 'Registrar Todo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
