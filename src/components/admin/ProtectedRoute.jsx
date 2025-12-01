import React from 'react';
import PropTypes from 'prop-types';
import { useAdminAuth } from '../../hooks/useAdminAuth';

import AccessDenied from '../../pages/AccessDenied';

/**
 * Componente para proteger rutas según permisos específicos
 * 
 * @param {Object} props
 * @param {string|string[]} props.requiredPermissions - Permiso(s) requerido(s) para acceder
 * @param {ReactNode} props.children - Componente a renderizar si tiene permisos
 * @param {ReactNode} props.fallback - Componente alternativo si no tiene permisos (opcional)
 */
const ProtectedRoute = ({ requiredPermissions = [], children, fallback }) => {
    const { hasPermission, isLoading, rol } = useAdminAuth(requiredPermissions);

    // Mostrar loading mientras verifica permisos
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scout-blue mx-auto mb-4"></div>
                    <p className="text-gray-600">Verificando permisos...</p>
                </div>
            </div>
        );
    }

    // Convertir a array si es string
    const permissions = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

    // Admin tiene acceso a todo
    if (rol === 'admin') {
        return children;
    }

    // Verificar si tiene al menos uno de los permisos requeridos
    const hasAccess = permissions.length === 0 || permissions.some(permission => hasPermission(permission));

    if (!hasAccess) {
        // Si hay fallback personalizado, usarlo
        if (fallback) {
            return fallback;
        }

        // Por defecto, mostrar página de acceso denegado
        return <AccessDenied />;
    }

    return children;
};



ProtectedRoute.propTypes = {
    requiredPermissions: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.arrayOf(PropTypes.string)
    ]),
    children: PropTypes.node.isRequired,
    fallback: PropTypes.node
};

export default ProtectedRoute;
