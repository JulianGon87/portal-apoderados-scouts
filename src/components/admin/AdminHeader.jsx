import React from 'react';
import PropTypes from 'prop-types';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/client';

/**
 * Header del panel de administración
 * Muestra información del usuario admin y botones de acción
 */
const AdminHeader = ({ user, rol, onToggleSidebar, sidebarOpen }) => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const getRoleBadgeColor = (userRol) => {
        const colors = {
            admin: 'bg-purple-100 text-purple-800',
            scoutmaster: 'bg-blue-100 text-blue-800',
            jefe: 'bg-green-100 text-green-800',
            tesorero: 'bg-yellow-100 text-yellow-800',
            secretario: 'bg-pink-100 text-pink-800',
            presidente: 'bg-indigo-100 text-indigo-800',
        };
        return colors[userRol] || 'bg-gray-100 text-gray-800';
    };

    const getRoleLabel = (userRol) => {
        const labels = {
            admin: 'Administrador',
            scoutmaster: 'Scoutmaster',
            jefe: 'Jefe',
            tesorero: 'Tesorero',
            secretario: 'Secretario',
            presidente: 'Presidente',
        };
        return labels[userRol] || userRol;
    };

    return (
        <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
            <div className="flex items-center justify-between px-4 py-3">
                {/* Left: Toggle + Logo */}
                <div className="flex items-center space-x-4">
                    {/* Sidebar Toggle Button */}
                    <button
                        onClick={onToggleSidebar}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
                        aria-label="Toggle sidebar"
                    >
                        <svg
                            className="w-6 h-6 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            {sidebarOpen ? (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            ) : (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            )}
                        </svg>
                    </button>

                    {/* Logo + Title */}
                    <div className="flex items-center space-x-3">
                        <img
                            src="/logo_admapu.png"
                            alt="Logo ADMAPU"
                            className="h-10 w-auto"
                        />
                        <div className="hidden sm:block">
                            <h1 className="text-lg font-bold text-gray-800">Panel de Administración</h1>
                            <p className="text-xs text-gray-500">ADMAPU</p>
                        </div>
                    </div>
                </div>

                {/* Right: User Info + Actions */}
                <div className="flex items-center space-x-4">
                    {/* User Info */}
                    <div className="hidden md:flex items-center space-x-3">
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-800">{user?.nombre || 'Usuario'}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(rol)}`}>
                                {getRoleLabel(rol)}
                            </span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-scout-blue text-white flex items-center justify-center font-bold">
                            {user?.nombre?.charAt(0) || 'A'}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                        {/* Volver al Portal */}
                        <NavLink
                            to="/"
                            className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Ir al Inicio"
                        >
                            <svg className="w-5 h-5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span className="hidden sm:inline">Inicio</span>
                        </NavLink>

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Cerrar sesión"
                        >
                            <svg className="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="hidden sm:inline">Salir</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

AdminHeader.propTypes = {
    user: PropTypes.shape({
        nombre: PropTypes.string
    }),
    rol: PropTypes.string,
    onToggleSidebar: PropTypes.func.isRequired,
    sidebarOpen: PropTypes.bool.isRequired
};

export default AdminHeader;
