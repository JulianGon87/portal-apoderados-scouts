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
        let value = rut.replaceAll(/[^\dkK]/g, '');
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

            // Generar variantes de búsqueda:
            // 1. Formateado: 12345678-9
            // 2. Limpio: 123456789 (como se guarda a veces en AdminUsuarios)
            // 3. Ingresado original: por si acaso
            const rutLimpio = rutFormateado.replace(/\./g, '').replace(/-/g, '');

            const { data, error } = await supabase
                .from('users')
                .select('*')
                .or(`rut.eq.${rutFormateado},rut.eq.${rutLimpio},rut.eq.${rutIngresado}`)
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
                // Preparar RUT limpio para la creación de usuario (username)
                const rutLimpio = rutApoderadoFormateado.replace(/\./g, '').replace(/-/g, '').toUpperCase();

                // Usar Edge Function para crear usuario en Auth (con clave 123456)
                // Enviamos los datos básicos que espera la función, más los extras por si la función los soporta
                const { data: funcData, error: funcError } = await supabase.functions.invoke('create-user', {
                    body: {
                        rut: rutLimpio,
                        nombre: formData.nombre_apoderado,
                        rol: 'apoderado',
                        email: formData.email_apoderado // Enviamos email por si la función lo usa
                    }
                });

                if (funcError) throw funcError;
                if (funcData?.error) throw new Error(funcData.error);

                finalApoderadoId = funcData.user.id; // Asumiendo que la función retorna la estructura { user: { id: ... } } o similar

                // Actualizar el perfil completo en public.users con los datos extra (apellidos, teléfono, rut formateado visualmente)
                // La función 'create-user' crea el registro básico, aquí lo enriquecemos.
                // Nota: Usamos rutApoderadoFormateado para el campo 'rut' visible en la tabla users si queremos mantener el formato,
                // o el limpio si queremos consistencia con auth. AdminUsuarios usa limpio en el input pero veamos...
                // AdminAlumnos usa formatRut (1.234.567-8) en la UI. Vamos a guardar el formateado en la tabla users para consistencia visual si así se prefiere,
                // PERO AdminUsuarios parece guardar el "limpio" en el campo rut?
                // Revisando AdminUsuarios, el input dice "sin puntos ni guion". 
                // Mejor guardamos el rut formateado en public.users para que se vea bonito, y auth usa el email falso generado.

                const { error: updateError } = await supabase
                    .from('users')
                    .update({
                        rut: rutApoderadoFormateado, // Guardamos formato legible en la BD pública
                        nombre: formData.nombre_apoderado,
                        apellidos: formData.apellidos_apoderado,
                        email: formData.email_apoderado,
                        telefono: formData.telefono_apoderado
                    })
                    .eq('id', finalApoderadoId);

                if (updateError) {
                    console.error('Error actualizando perfil de apoderado:', updateError);
                    // No bloqueamos, el usuario ya se creó
                }

                addToast('Apoderado creado. Clave inicial: 123456', 'info');
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
        const s = seccion?.toLowerCase() || '';
        if (s === 'manada') return 'bg-yellow-100 text-yellow-800';
        if (s === 'tropa') return 'bg-green-100 text-green-800';
        if (s === 'compañia' || s === 'compañía') return 'bg-blue-100 text-blue-800';
        if (s === 'comunidad') return 'bg-purple-100 text-purple-800';
        return 'bg-gray-100 text-gray-800';
    };

    const filteredAlumnos = alumnos.filter(alumno => {
        const matchSearch =
            alumno.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            alumno.apellidos_alumno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            alumno.rut_alumno?.includes(searchTerm);

        // Normalización para el filtro de sección (case-insensitive y manejo de tildes)
        let seccionAlumno = alumno.seccion?.toLowerCase() || '';
        let filtro = filterSeccion.toLowerCase();

        // Si el filtro es "compañia" (sin tilde), que haga match con "compañía" (con tilde) y viceversa
        if (filtro === 'compañia' || filtro === 'compañía') {
            const match = seccionAlumno === 'compañia' || seccionAlumno === 'compañía';
            return matchSearch && match;
        }

        const matchSeccion = filterSeccion === 'todos' || seccionAlumno === filtro;
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

            {/* Modal de Ficha Completa (Solo Lectura) - Mobile Optimized */}
            {showViewModal && viewingAlumno && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up flex flex-col">
                        {/* Header Sticky */}
                        <div className={`p-6 sticky top-0 z-10 border-b border-gray-100 flex justify-between items-start ${getSeccionBadgeColor(viewingAlumno.seccion).replace('text-', 'bg-opacity-20 text-').replace('bg-', 'bg-')}`}>
                            <div className="flex-1 mr-4">
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{viewingAlumno.nombre} {viewingAlumno.apellidos_alumno}</h2>
                                <span className={`mt-2 px-3 py-1 inline-flex text-sm font-bold rounded-full capitalize shadow-sm ${getSeccionBadgeColor(viewingAlumno.seccion).replace('bg-opacity-20', 'bg-opacity-100')}`}>
                                    {viewingAlumno.seccion}
                                </span>
                            </div>
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="p-2 -mr-2 text-gray-500 hover:text-gray-700 hover:bg-black/10 rounded-full transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto">
                            {/* Grid de Información */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Columna Alumno */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                                        <span>👤</span> Información del Alumno
                                    </h3>
                                    <dl className="space-y-4">
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <dt className="text-xs font-bold text-gray-500 uppercase tracking-wide">RUT</dt>
                                            <dd className="text-base font-medium text-gray-900 mt-1">{viewingAlumno.rut_alumno}</dd>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <dt className="text-xs font-bold text-gray-500 uppercase tracking-wide">Curso</dt>
                                            <dd className="text-base font-medium text-gray-900 mt-1">{viewingAlumno.curso || 'No registrado'}</dd>
                                        </div>
                                    </dl>
                                </div>

                                {/* Columna Apoderado */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                                        <span>👨‍👩‍👧‍👦</span> Apoderado
                                    </h3>
                                    {viewingAlumno.apoderado ? (
                                        <dl className="space-y-4">
                                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                                <dt className="text-xs font-bold text-blue-600 uppercase tracking-wide">Nombre Completo</dt>
                                                <dd className="text-base font-bold text-gray-900 mt-1">{viewingAlumno.apoderado.nombre} {viewingAlumno.apoderado.apellidos}</dd>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <dt className="text-xs font-bold text-gray-500 uppercase tracking-wide">RUT</dt>
                                                    <dd className="text-sm font-medium text-gray-900 mt-1">{viewingAlumno.apoderado.rut}</dd>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <dt className="text-xs font-bold text-gray-500 uppercase tracking-wide">Teléfono</dt>
                                                    <dd className="text-sm font-medium text-gray-900 mt-1">{viewingAlumno.apoderado.telefono}</dd>
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                <dt className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</dt>
                                                <dd className="text-sm font-medium text-gray-900 mt-1 break-all">{viewingAlumno.apoderado.email}</dd>
                                            </div>
                                        </dl>
                                    ) : (
                                        <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-red-700 flex gap-3 items-start">
                                            <span className="text-2xl">⚠️</span>
                                            <div>
                                                <p className="font-bold">Sin apoderado asignado</p>
                                                <p className="text-sm mt-1">Este alumno no tiene un apoderado vinculado correctamente.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer con Acciones */}
                        <div className="bg-gray-50 p-4 sm:px-6 sm:py-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t sticky bottom-0 z-10">
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="w-full sm:w-auto px-4 py-3 sm:py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-bold text-center"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={handleEditFromView}
                                className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-bold shadow-md hover:shadow-lg transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                ✏️ Editar Datos
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Edición/Creación - Mobile Optimized */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up flex flex-col">
                        <div className="p-5 sm:p-6 border-b border-gray-100 sticky top-0 bg-white z-10 flex justify-between items-center">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                                {editingAlumno ? 'Editar Alumno' : 'Nuevo Registro'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-5 sm:p-6 overflow-y-auto">
                            <form id="alumnoForm" onSubmit={handleSubmit} className="space-y-6">

                                {/* Sección Apoderado */}
                                <div className="bg-gray-50 p-4 sm:p-5 rounded-xl border border-gray-200">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <span>👨‍👩‍👧‍👦</span> Datos del Apoderado
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label htmlFor="rut_apoderado" className="block text-sm font-bold text-gray-700 mb-1">RUT Apoderado</label>
                                            <div className="relative">
                                                <input
                                                    id="rut_apoderado"
                                                    type="text"
                                                    name="rut_apoderado"
                                                    required
                                                    value={formData.rut_apoderado}
                                                    onChange={handleInputChange}
                                                    onBlur={handleRutApoderadoBlur}
                                                    disabled={editingAlumno}
                                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-scout-blue transition-all ${apoderadoExistente ? 'bg-green-50 border-green-300' : 'bg-white border-gray-300'}`}
                                                    placeholder="12345678-9"
                                                />
                                                {checkingApoderado && (
                                                    <div className="absolute right-3 top-2.5 animate-spin h-5 w-5 border-b-2 border-scout-blue rounded-full"></div>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2 flex gap-1">
                                                {apoderadoExistente
                                                    ? <span className="text-green-600 font-semibold">✅ Apoderado encontrado.</span>
                                                    : <span className="text-gray-500">ℹ️ Ingrese RUT para buscar o registrar uno nuevo.</span>}
                                            </p>
                                        </div>

                                        <div>
                                            <label htmlFor="nombre_apoderado" className="block text-sm font-bold text-gray-700 mb-1">Nombre</label>
                                            <input
                                                id="nombre_apoderado"
                                                type="text"
                                                name="nombre_apoderado"
                                                required
                                                value={formData.nombre_apoderado}
                                                onChange={handleInputChange}
                                                disabled={apoderadoExistente}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-200 disabled:text-gray-500 focus:ring-2 focus:ring-scout-blue"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="apellidos_apoderado" className="block text-sm font-bold text-gray-700 mb-1">Apellidos</label>
                                            <input
                                                id="apellidos_apoderado"
                                                type="text"
                                                name="apellidos_apoderado"
                                                required
                                                value={formData.apellidos_apoderado}
                                                onChange={handleInputChange}
                                                disabled={apoderadoExistente}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-200 disabled:text-gray-500 focus:ring-2 focus:ring-scout-blue"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label htmlFor="email_apoderado" className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                                            <input
                                                id="email_apoderado"
                                                type="email"
                                                name="email_apoderado"
                                                required
                                                value={formData.email_apoderado}
                                                onChange={handleInputChange}
                                                disabled={apoderadoExistente}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-200 disabled:text-gray-500 focus:ring-2 focus:ring-scout-blue"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label htmlFor="telefono_apoderado" className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
                                            <input
                                                id="telefono_apoderado"
                                                type="tel"
                                                name="telefono_apoderado"
                                                required
                                                value={formData.telefono_apoderado}
                                                onChange={handleInputChange}
                                                disabled={apoderadoExistente}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-200 disabled:text-gray-500 focus:ring-2 focus:ring-scout-blue"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Sección Alumno */}
                                <div className="bg-blue-50 p-4 sm:p-5 rounded-xl border border-blue-200">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <span>⚜️</span> Datos del Alumno
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="nombre_alumno" className="block text-sm font-bold text-gray-700 mb-1">Nombre</label>
                                            <input
                                                id="nombre_alumno"
                                                type="text"
                                                name="nombre"
                                                required
                                                value={formData.nombre}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="apellidos_alumno" className="block text-sm font-bold text-gray-700 mb-1">Apellidos</label>
                                            <input
                                                id="apellidos_alumno"
                                                type="text"
                                                name="apellidos_alumno"
                                                required
                                                value={formData.apellidos_alumno}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="rut_alumno" className="block text-sm font-bold text-gray-700 mb-1">RUT Alumno</label>
                                            <input
                                                id="rut_alumno"
                                                type="text"
                                                name="rut_alumno"
                                                required
                                                value={formData.rut_alumno}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue bg-white"
                                                placeholder="12.345.678-9"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="curso_alumno" className="block text-sm font-bold text-gray-700 mb-1">Curso</label>
                                            <input
                                                id="curso_alumno"
                                                type="text"
                                                name="curso"
                                                value={formData.curso}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue bg-white"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label htmlFor="seccion_alumno" className="block text-sm font-bold text-gray-700 mb-1">Sección</label>
                                            <select
                                                id="seccion_alumno"
                                                name="seccion"
                                                value={formData.seccion}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue bg-white"
                                            >
                                                <option value="manada">Manada</option>
                                                <option value="tropa">Tropa</option>
                                                <option value="compañia">Compañía</option>
                                                <option value="comunidad">Comunidad</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="p-5 sm:p-6 border-t border-gray-100 bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-3 sticky bottom-0 z-10 rounded-b-xl">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="w-full sm:w-auto px-4 py-3 sm:py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-bold text-center"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                form="alumnoForm"
                                className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-scout-blue text-white rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-md hover:shadow-lg transform active:scale-95 text-center"
                            >
                                {editingAlumno ? 'Guardar Cambios' : 'Registrar Todo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
