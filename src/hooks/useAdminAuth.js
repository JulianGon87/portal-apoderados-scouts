import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client.js';

/**
 * Hook personalizado para verificar permisos de administrador
 * 
 * @param {string|string[]} requiredPermissions - Permiso(s) requerido(s) para acceder
 * @returns {Object} - { user, rol, permisos, hasPermission, isLoading }
 */
export const useAdminAuth = (requiredPermissions = []) => {
    const [user, setUser] = useState(null);
    const [rol, setRol] = useState(null);
    const [permisos, setPermisos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    // Convertir a array si es string
    const permissions = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            // 1. Verificar sesión de Supabase
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                console.log('No hay sesión activa');
                navigate('/');
                return;
            }

            // 2. Obtener datos del usuario desde la tabla users
            // 2. Obtener datos del usuario desde la tabla users usando el ID de sesión
            // Buscamos por id (nuevos usuarios) o auth_user_id (usuarios antiguos)
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, nombre, rut, rol')
                .or(`id.eq.${session.user.id},auth_user_id.eq.${session.user.id}`)
                .single();

            if (userError || !userData) {
                console.error('Error al obtener datos del usuario:', userError);
                navigate('/');
                return;
            }

            // 3. Obtener permisos personalizados del usuario
            const { data: permisosData, error: permisosError } = await supabase
                .from('permisos_usuario')
                .select('permiso')
                .eq('usuario_id', userData.id);

            const permisosPersonalizados = permisosError ? [] : permisosData.map(p => p.permiso);

            // 4. Obtener permisos del rol
            const permisosRol = getPermissionsByRole(userData.rol);

            // 5. Combinar permisos del rol + permisos personalizados
            const todosLosPermisos = [...new Set([...permisosRol, ...permisosPersonalizados])];

            setUser(userData);
            setRol(userData.rol);
            setPermisos(todosLosPermisos);
            setIsLoading(false);

            // 6. Verificar si tiene acceso al panel de admin
            if (!hasAdminAccess(userData.rol, todosLosPermisos)) {
                console.log('Usuario sin permisos de admin');
                navigate('/home');
            }

        } catch (error) {
            console.error('Error en checkAuth:', error);
            navigate('/');
        }
    };

    // Verificar si tiene al menos un permiso de admin
    const hasAdminAccess = (userRol, userPermisos) => {
        const adminRoles = ['admin', 'scoutmaster', 'tesorero', 'jefe', 'presidente', 'secretario'];
        return adminRoles.includes(userRol) || userPermisos.length > 0;
    };

    // Verificar si tiene un permiso específico
    const hasPermission = (permission) => {
        // Admin tiene todos los permisos
        if (rol === 'admin') return true;

        // Verificar si tiene el permiso
        return permisos.includes(permission);
    };

    // Verificar si tiene al menos uno de los permisos requeridos
    const hasAnyPermission = () => {
        if (permissions.length === 0) return true;
        if (rol === 'admin') return true;
        return permissions.some(p => permisos.includes(p));
    };

    return {
        user,
        rol,
        permisos,
        hasPermission,
        hasAnyPermission: hasAnyPermission(),
        isLoading
    };
};

/**
 * Obtiene los permisos por defecto de cada rol
 */
const getPermissionsByRole = (rol) => {
    const rolePermissions = {
        admin: [
            'ver_dashboard',
            'crear_items_cobro',
            'editar_items_cobro',
            'eliminar_items_cobro',
            'crear_alumnos',
            'editar_alumnos',
            'eliminar_alumnos',
            'designar_logros',
            'gestionar_tickets',
            'aprobar_pagos',
            'ver_metricas',
            'gestionar_usuarios',
            'ver_resumen_financiero',
            'tomar_asistencia'
        ],
        scoutmaster: [
            'ver_dashboard',
            'crear_items_cobro',
            'crear_alumnos',
            'editar_alumnos',
            'eliminar_alumnos',
            'designar_logros',
            'ver_metricas',
            'gestionar_usuarios',
            'tomar_asistencia'
        ],
        jefe: [
            'designar_logros',
            'tomar_asistencia'
        ],
        tesorero: [
            'ver_dashboard',
            'crear_items_cobro',
            'editar_items_cobro',
            'gestionar_tickets',
            'aprobar_pagos',
            'ver_metricas',
            'ver_resumen_financiero'
        ],
        presidente: [
            'ver_dashboard',
            'ver_resumen_financiero'
        ],
        secretario: [
            'ver_dashboard',
            'ver_resumen_financiero'
        ],
        apoderado: []
    };

    return rolePermissions[rol] || [];
};

export default useAdminAuth;
