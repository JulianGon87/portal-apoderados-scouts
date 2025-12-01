import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { useToast } from '../../components/Toast';
import { useAdminAuth } from '../../hooks/useAdminAuth';

export default function AdminAlumnos() {
    const { addToast } = useToast();
    const { hasPermission } = useAdminAuth(['crear_alumnos', 'editar_alumnos']);

    const [alumnos, setAlumnos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSeccion, setFilterSeccion] = useState('todos');
    const [showModal, setShowModal] = useState(false);
    const [editingAlumno, setEditingAlumno] = useState(null);
    const [apoderadoFound, setApoderadoFound] = useState(null);
    const [checkingRut, setCheckingRut] = useState(false);

    const [formData, setFormData] = useState({
        // Datos del Apoderado
        rut_apoderado: '',
        nombre_apoderado: '',
        apellidos_apoderado: '',
        email_apoderado: '',
        telefono_apoderado: '',
        // Datos del Alumno
        nombre_alumno: '',
        apellidos_alumno: '',
        rut_alumno: '',
        seccion: 'manada',
        curso: ''
    });

    useEffect(() => {
        fetchAlumnos();
    }, []);

    const fetchAlumnos = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('alumnos')
                .select(`
                    *,
                    apoderado:users!apoderado_id(nombre, apellidos, rut, email, telefono)
                `)
                .order('apellidos_alumno', { ascending: true });

            if (error) throw error;
            setAlumnos(data || []);
        } catch (error) {
            console.error('Error al cargar alumnos:', error);
            addToast('Error al cargar alumnos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Buscar apoderado por RUT
    const handleApoderadoRutBlur = async () => {
        const rut = formData.rut_apoderado.trim();
        if (!rut || editingAlumno) return;

        setCheckingRut(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, nombre, apellidos, rut, email, telefono')
                .eq('rut', rut)
                .single();

            if (data) {
                setApoderadoFound(data);
                setFormData(prev => ({
                    ...prev,
                    nombre_apoderado: data.nombre || '',
                    apellidos_apoderado: data.apellidos || '',
                    email_apoderado: data.email || '',
                    telefono_apoderado: data.telefono || ''
                }));
                addToast('Apoderado encontrado. Datos cargados automáticamente.', 'success');
            } else {
                setApoderadoFound(null);
                addToast('Apoderado no encontrado. Se creará uno nuevo.', 'info');
            }
        } catch (error) {
            // No existe, se creará nuevo
            setApoderadoFound(null);
        } finally {
            setCheckingRut(false);
        }
    };

    // Validar RUT del alumno
    const handleAlumnoRutBlur = async () => {
        const rut = formData.rut_alumno.trim();
        if (!rut || editingAlumno) return;

        try {
            const { data, error } = await supabase
                .from('alumnos')
                .select('id')
                .eq('rut_alumno', rut)
                .single();

            if (data) {
                addToast('Este RUT de alumno ya está registrado', 'error');
                setFormData(prev => ({ ...prev, rut_alumno: '' }));
            }
        } catch (error) {
            // No existe, todo bien
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!hasPermission('crear_alumnos')) {
            addToast('No tienes permisos para crear alumnos', 'error');
            return;
        }

        try {
            setLoading(true);

            if (editingAlumno) {
                // EDITAR: Solo actualizar datos del alumno
                const { error } = await supabase
                    .from('alumnos')
                    .update({
                        nombre: formData.nombre_alumno,
                        apellidos_alumno: formData.apellidos_alumno,
                        rut_alumno: formData.rut_alumno,
                        seccion: formData.seccion,
                        curso: formData.curso
                    })
                    .eq('id', editingAlumno.id);

                if (error) throw error;
                addToast('Alumno actualizado exitosamente', 'success');
            } else {
                // CREAR: Apoderado + Alumno
                let apoderadoId;

                if (apoderadoFound) {
                    // Usar apoderado existente
                    apoderadoId = apoderadoFound.id;
                } else {
                    // Crear nuevo apoderado
                    const { data: newApoderado, error: apoderadoError } = await supabase
                        .from('users')
                        .insert([{
                            rut: formData.rut_apoderado,
                            nombre: formData.nombre_apoderado,
                            apellidos: formData.apellidos_apoderado,
                            email: formData.email_apoderado,
                            telefono: formData.telefono_apoderado,
                            rol: 'apoderado'
                        }])
                        .select()
                        .single();

                    if (apoderadoError) throw apoderadoError;
                    apoderadoId = newApoderado.id;

                    // Crear usuario en Supabase Auth
                    const tempPassword = `Scout${formData.rut_apoderado.slice(0, 4)}!`;
                    const { error: authError } = await supabase.auth.admin.createUser({
                        email: `${formData.rut_apoderado}@scouts.cl`,
                        password: tempPassword,
                        email_confirm: true
                    });

                    if (authError) {
                        console.warn('Error creando usuario auth:', authError);
                    }
                }

                // Crear alumno
                const slugBase = `${formData.nombre_alumno}-${formData.apellidos_alumno}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
                const uniqueSlug = `${slugBase}-${Math.random().toString(36).slice(2, 7)}`;

                const { error: alumnoError } = await supabase
                    .from('alumnos')
                    .insert([{
                        nombre: formData.nombre_alumno,
                        apellidos_alumno: formData.apellidos_alumno,
                        rut_alumno: formData.rut_alumno,
                        seccion: formData.seccion,
                        curso: formData.curso,
                        apoderado_id: apoderadoId,
                        slug: uniqueSlug
                    }]);

                if (alumnoError) throw alumnoError;
                addToast('Alumno y apoderado registrados exitosamente', 'success');
            }

            setShowModal(false);
            resetForm();
            fetchAlumnos();
        } catch (error) {
            console.error('Error al guardar:', error);
            addToast('Error al guardar: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            rut_apoderado: '',
            nombre_apoderado: '',
            apellidos_apoderado: '',
            email_apoderado: '',
            telefono_apoderado: '',
            nombre_alumno: '',
            apellidos_alumno: '',
            rut_alumno: '',
            seccion: 'manada',
            curso: ''
        });
        setApoderadoFound(null);
    };

    const handleEdit = (alumno) => {
        setEditingAlumno(alumno);
        setFormData({
            rut_apoderado: alumno.apoderado?.rut || '',
            nombre_apoderado: alumno.apoderado?.nombre || '',
            apellidos_apoderado: alumno.apoderado?.apellidos || '',
            email_apoderado: alumno.apoderado?.email || '',
            telefono_apoderado: alumno.apoderado?.telefono || '',
            nombre_alumno: alumno.nombre,
            apellidos_alumno: alumno.apellidos_alumno,
            rut_alumno: alumno.rut_alumno,
            seccion: alumno.seccion || 'manada',
            curso: alumno.curso || ''
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
        resetForm();
        setShowModal(true);
    };

    const getSeccionBadgeColor = (seccion) => {
        switch (seccion) {
            case 'manada':
                return 'bg-yellow-100 text-yellow-800';
            case 'tropa':
                return 'bg-green-100 text-green-800';
            case 'compañia':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-red-100 text-red-800';
        }
    };

    const filteredAlumnos = alumnos.filter(alumno => {
        const matchSearch =
            alumno.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            alumno.apellidos_alumno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            alumno.rut_alumno?.includes(searchTerm) ||
            alumno.apoderado?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            alumno.apoderado?.apellidos?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchSeccion = filterSeccion === 'todos' || alumno.seccion === filterSeccion;

        return matchSearch && matchSeccion;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestión de Alumnos</h1>
                    <p className="text-gray-600 mt-1">Administra la información de los beneficiarios y sus apoderados</p>
                </div>
                {hasPermission('crear_alumnos') && (
                    <button
                        onClick={handleNew}
                        className="btn-scout flex items-center gap-2"
                    >
                        <span>➕</span> Nuevo Alumno
                    </button>
                )}
            </div>

            {/* Filtros */}
            <div className="card-glass p-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <label htmlFor="search-alumnos" className="sr-only">Buscar alumnos</label>
                    <input
                        id="search-alumnos"
                        type="text"
                        placeholder="Buscar por nombre, apellido, RUT o apoderado..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                    />
                </div>
                <div className="w-full md:w-48">
                    <label htmlFor="filter-seccion" className="sr-only">Filtrar por sección</label>
                    <select
                        id="filter-seccion"
                        value={filterSeccion}
                        onChange={(e) => setFilterSeccion(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Apoderado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sección</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Curso</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-scout-blue mx-auto"></div>
                                    </td>
                                </tr>
                            )}

                            {!loading && filteredAlumnos.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        No se encontraron alumnos
                                    </td>
                                </tr>
                            )}

                            {!loading && filteredAlumnos.length > 0 && filteredAlumnos.map((alumno) => (
                                <tr key={alumno.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-lg overflow-hidden">
                                                {alumno.foto_url ? (
                                                    <img src={alumno.foto_url} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    '👤'
                                                )}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{alumno.nombre} {alumno.apellidos_alumno}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {alumno.rut_alumno}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {alumno.apoderado ? `${alumno.apoderado.nombre} ${alumno.apoderado.apellidos}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getSeccionBadgeColor(alumno.seccion)}`}>
                                            {alumno.seccion}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {alumno.curso || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {hasPermission('editar_alumnos') && (
                                            <button
                                                onClick={() => handleEdit(alumno)}
                                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                                            >
                                                Editar
                                            </button>
                                        )}
                                        {hasPermission('eliminar_alumnos') && (
                                            <button
                                                onClick={() => handleDelete(alumno.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Eliminar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                            {editingAlumno ? 'Editar Alumno' : 'Nuevo Alumno y Apoderado'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Sección Apoderado */}
                            {!editingAlumno && (
                                <div className="border-b pb-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <span>👨‍👩‍👧</span> Datos del Apoderado
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label htmlFor="rut_apoderado" className="block text-sm font-medium text-gray-700 mb-1">
                                                RUT Apoderado *
                                            </label>
                                            <input
                                                id="rut_apoderado"
                                                type="text"
                                                name="rut_apoderado"
                                                required
                                                value={formData.rut_apoderado}
                                                onChange={handleInputChange}
                                                onBlur={handleApoderadoRutBlur}
                                                disabled={checkingRut}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                                                placeholder="12345678-9"
                                            />
                                            {checkingRut && <p className="text-xs text-gray-500 mt-1">Buscando...</p>}
                                            {apoderadoFound && <p className="text-xs text-green-600 mt-1">✅ Apoderado encontrado</p>}
                                        </div>
                                        <div>
                                            <label htmlFor="nombre_apoderado" className="block text-sm font-medium text-gray-700 mb-1">
                                                Nombre *
                                            </label>
                                            <input
                                                id="nombre_apoderado"
                                                type="text"
                                                name="nombre_apoderado"
                                                required
                                                value={formData.nombre_apoderado}
                                                onChange={handleInputChange}
                                                disabled={!!apoderadoFound}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue disabled:bg-gray-100"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="apellidos_apoderado" className="block text-sm font-medium text-gray-700 mb-1">
                                                Apellidos *
                                            </label>
                                            <input
                                                id="apellidos_apoderado"
                                                type="text"
                                                name="apellidos_apoderado"
                                                required
                                                value={formData.apellidos_apoderado}
                                                onChange={handleInputChange}
                                                disabled={!!apoderadoFound}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue disabled:bg-gray-100"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="email_apoderado" className="block text-sm font-medium text-gray-700 mb-1">
                                                Email
                                            </label>
                                            <input
                                                id="email_apoderado"
                                                type="email"
                                                name="email_apoderado"
                                                value={formData.email_apoderado}
                                                onChange={handleInputChange}
                                                disabled={!!apoderadoFound}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue disabled:bg-gray-100"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="telefono_apoderado" className="block text-sm font-medium text-gray-700 mb-1">
                                                Teléfono
                                            </label>
                                            <input
                                                id="telefono_apoderado"
                                                type="tel"
                                                name="telefono_apoderado"
                                                value={formData.telefono_apoderado}
                                                onChange={handleInputChange}
                                                disabled={!!apoderadoFound}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue disabled:bg-gray-100"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Sección Alumno */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <span>🎒</span> Datos del Alumno
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="nombre_alumno" className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                                        <input
                                            id="nombre_alumno"
                                            type="text"
                                            name="nombre_alumno"
                                            required
                                            value={formData.nombre_alumno}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="apellidos_alumno" className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
                                        <input
                                            id="apellidos_alumno"
                                            type="text"
                                            name="apellidos_alumno"
                                            required
                                            value={formData.apellidos_alumno}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="rut_alumno" className="block text-sm font-medium text-gray-700 mb-1">RUT *</label>
                                        <input
                                            id="rut_alumno"
                                            type="text"
                                            name="rut_alumno"
                                            required
                                            value={formData.rut_alumno}
                                            onChange={handleInputChange}
                                            onBlur={handleAlumnoRutBlur}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                                            placeholder="12345678-9"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="curso" className="block text-sm font-medium text-gray-700 mb-1">Curso</label>
                                        <input
                                            id="curso"
                                            type="text"
                                            name="curso"
                                            value={formData.curso}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label htmlFor="seccion" className="block text-sm font-medium text-gray-700 mb-1">Sección *</label>
                                        <select
                                            id="seccion"
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

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-scout-blue text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Guardando...' : editingAlumno ? 'Guardar Cambios' : 'Crear Alumno'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
