import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useToast } from '../../components/Toast';

export default function AdminUsuarios() {
    const { user: currentUser } = useAdminAuth();
    const { addToast } = useToast();

    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        rut: '',
        rol: 'apoderado'
    });

    const rolesDisponibles = [
        { value: 'admin', label: 'Administrador' },
        { value: 'scoutmaster', label: 'Jefe de Grupo' },
        { value: 'subjefe_grupo', label: 'Subjefe de Grupo' },
        { value: 'jefe_compania', label: 'Jefe de Compañía' },
        { value: 'tesorero', label: 'Tesorero' },
        { value: 'jefe', label: 'Jefe de Unidad' },
        { value: 'secretario', label: 'Secretario' },
        { value: 'presidente', label: 'Presidente' },
        { value: 'apoderado', label: 'Apoderado' }
    ];

    useEffect(() => {
        fetchUsuarios();
    }, []);

    const fetchUsuarios = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('nombre');

            if (error) throw error;
            setUsuarios(data || []);
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            addToast('Error al cargar usuarios', 'error');
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
            if (!editingUser) {
                // Crear
                // Verificar si ya existe el RUT
                const { data: existing } = await supabase
                    .from('users')
                    .select('id')
                    .eq('rut', formData.rut)
                    .single();

                if (existing) {
                    addToast('Ya existe un usuario con este RUT', 'warning');
                    return;
                }

                // Usar Edge Function para crear usuario en Auth y DB
                const { data: funcData, error: funcError } = await supabase.functions.invoke('create-user', {
                    body: formData
                });

                if (funcError) throw funcError;
                if (funcData?.error) throw new Error(funcData.error);

                addToast('Usuario creado exitosamente. Contraseña inicial: 123456', 'success');
            } else {
                // Editar
                const { error } = await supabase
                    .from('users')
                    .update({
                        nombre: formData.nombre,
                        rol: formData.rol,
                        // No permitimos editar RUT por seguridad/consistencia
                    })
                    .eq('id', editingUser.id);

                if (error) throw error;
                addToast('Usuario actualizado exitosamente', 'success');
            }

            setShowModal(false);
            fetchUsuarios();
        } catch (error) {
            console.error('Error al guardar usuario:', error);
            addToast('Error al guardar: ' + error.message, 'error');
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({
            nombre: user.nombre,
            rut: user.rut,
            rol: user.rol || 'apoderado'
        });
        setShowModal(true);
    };

    const handleResetPassword = async (user) => {
        if (!confirm(`¿Estás seguro de resetear la contraseña para ${user.nombre}? Se establecerá la contraseña por defecto (123456).`)) return;

        try {
            const { data: funcData, error: funcError } = await supabase.functions.invoke('reset-password', {
                body: { userId: user.id }
            });

            if (funcError) throw funcError;
            if (funcData?.error) throw new Error(funcData.error);

            addToast('Contraseña reseteada exitosamente a 123456. El usuario deberá cambiarla al ingresar.', 'success');
        } catch (error) {
            console.error('Error al resetear contraseña:', error);
            addToast('Error al resetear: ' + error.message, 'error');
        }
    };

    const handleDelete = async (id) => {
        if (id === currentUser.id) {
            addToast('No puedes eliminar tu propio usuario', 'warning');
            return;
        }
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

        try {
            const { error } = await supabase.from('users').delete().eq('id', id);
            if (error) throw error;
            addToast('Usuario eliminado', 'success');
            fetchUsuarios();
        } catch (error) {
            console.error('Error al eliminar:', error);
            addToast('Error al eliminar', 'error');
        }
    };

    const handleNew = () => {
        setEditingUser(null);
        setFormData({
            nombre: '',
            rut: '',
            rol: 'apoderado'
        });
        setShowModal(true);
    };

    const filteredUsuarios = usuarios.filter(u =>
        u.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.rut?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
                    <p className="text-gray-600 mt-1">Administra los roles y accesos al sistema</p>
                </div>
                <button
                    onClick={handleNew}
                    className="btn-scout flex items-center gap-2"
                >
                    <span>👤</span> Nuevo Usuario
                </button>
            </div>

            {/* Buscador */}
            <div className="card-glass p-4">
                <input
                    id="user-search"
                    name="search"
                    type="text"
                    placeholder="Buscar por nombre o RUT..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue focus:border-transparent"
                    aria-label="Buscar usuarios por nombre o RUT"
                />
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RUT / ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-scout-blue mx-auto"></div>
                                    </td>
                                </tr>
                            ) : filteredUsuarios.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                        No se encontraron usuarios
                                    </td>
                                </tr>
                            ) : (
                                filteredUsuarios.map((user, index) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                                    {user.nombre?.charAt(0) || 'U'}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        <span className="text-gray-400 mr-2 font-mono">{index + 1}.</span>
                                                        {user.nombre}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {user.rut}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full capitalize
                                                ${user.rol === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                    user.rol === 'tesorero' ? 'bg-green-100 text-green-800' :
                                                        user.rol === 'scoutmaster' ? 'bg-blue-100 text-blue-800' :
                                                            user.rol === 'subjefe_grupo' ? 'bg-cyan-100 text-cyan-800' :
                                                                user.rol === 'jefe_compania' ? 'bg-teal-100 text-teal-800' :
                                                                    user.rol === 'jefe' ? 'bg-yellow-100 text-yellow-800' :
                                                                        user.rol === 'secretario' ? 'bg-pink-100 text-pink-800' :
                                                                            user.rol === 'presidente' ? 'bg-indigo-100 text-indigo-800' :
                                                                                'bg-stone-100 text-stone-800'}`}>
                                                <span>
                                                    {user.rol === 'admin' ? '🛡️' :
                                                        user.rol === 'scoutmaster' ? '⚜️' :
                                                            user.rol === 'subjefe_grupo' ? '🥈' :
                                                                user.rol === 'jefe_compania' ? '⛺' :
                                                                    user.rol === 'tesorero' ? '💰' :
                                                                        user.rol === 'jefe' ? '⭐' :
                                                                            user.rol === 'secretario' ? '📝' :
                                                                                user.rol === 'presidente' ? '👔' : '👤'}
                                                </span>
                                                {user.rol === 'scoutmaster' ? 'Jefe de Grupo' :
                                                    user.rol === 'subjefe_grupo' ? 'Subjefe de Grupo' :
                                                        user.rol === 'jefe_compania' ? 'Jefe de Compañía' :
                                                            user.rol}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleResetPassword(user)}
                                                className="text-amber-600 hover:text-amber-900 mr-4"
                                            >
                                                Resetear
                                            </button>
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                                            >
                                                Editar
                                            </button>
                                            {user.id !== currentUser?.id && (
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Eliminar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl animate-fade-in-up">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                            {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                <input
                                    id="nombre"
                                    type="text"
                                    name="nombre"
                                    required
                                    value={formData.nombre}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                                />
                            </div>

                            <div>
                                <label htmlFor="rut" className="block text-sm font-medium text-gray-700 mb-1">RUT (sin puntos ni guión)</label>
                                <input
                                    id="rut"
                                    type="text"
                                    name="rut"
                                    required
                                    disabled={!!editingUser}
                                    value={formData.rut}
                                    onChange={handleInputChange}
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue ${editingUser ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    placeholder="Ej: 12345678"
                                />
                                {!editingUser && <p className="text-xs text-gray-500 mt-1">El usuario deberá registrarse con un email que comience con este RUT.</p>}
                            </div>

                            <div>
                                <label htmlFor="rol" className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                                <select
                                    id="rol"
                                    name="rol"
                                    value={formData.rol}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                                >
                                    {rolesDisponibles.map(role => (
                                        <option key={role.value} value={role.value}>{role.label}</option>
                                    ))}
                                </select>
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
                                    {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
