import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';

/**
 * Componente para proteger rutas según permisos específicos
 * 
 * @param {Object} props
 * @param {string|string[]} props.requiredPermissions - Permiso(s) requerido(s) para acceder
 * @param {ReactNode} props.children - Componente a renderizar si tiene permisos
 * @param {ReactNode} props.fallback - Componente alternativo si no tiene permisos (opcional)
 */
const ProtectedRoute = ({ requiredPermissions = [], children, fallback }) => {
    const { hasPermission, hasAnyPermission, isLoading, rol } = useAdminAuth(requiredPermissions);

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

        // Por defecto, mostrar mensaje de acceso denegado
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center max-w-md">
                    <div className="mb-6">
                        <svg className="mx-auto h-24 w-24 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Acceso Denegado</h2>
                    <p className="text-gray-600 mb-6">
                        No tienes permisos para acceder a esta sección.
                    </p>
                    <div className="space-y-2">
                        <a
                            href="/admin"
                            className="inline-block px-6 py-2 bg-scout-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Volver al Dashboard
                        </a>
                        <p className="text-sm text-gray-500 mt-4">
                            Si crees que deberías tener acceso, contacta al administrador.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
