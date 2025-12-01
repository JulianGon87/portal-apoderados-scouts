import React from 'react';
import { NavLink } from 'react-router-dom';
import useAdminAuth from '../../hooks/useAdminAuth';

/**
 * Sidebar de navegación del panel de administración
 * Muestra los links según los permisos del usuario
 */
const AdminSidebar = ({ isOpen, onClose, rol }) => {
    const { hasPermission } = useAdminAuth();

    // Definir items de navegación con sus permisos requeridos
    const navItems = [
        {
            path: '/admin',
            label: 'Dashboard',
            icon: '📊',
            permission: 'ver_dashboard',
            exact: true
        },
        {
            path: '/admin/items-cobro',
            label: 'Items de Cobro',
            icon: '💰',
            permission: 'crear_items_cobro'
        },
        {
            path: '/admin/pagos',
            label: 'Gestión de Pagos',
            icon: '💳',
            permission: 'aprobar_pagos'
        },
        {
            path: '/admin/alumnos',
            label: 'Gestión de Alumnos',
            icon: '👥',
            permission: 'crear_alumnos'
        },
        {
            path: '/admin/logros',
            label: 'Designación de Logros',
            icon: '🏆',
            permission: 'designar_logros'
        },
        {
            path: '/admin/usuarios',
            label: 'Gestión de Usuarios',
            icon: '⚙️',
            permission: 'gestionar_usuarios'
        }
    ];

    const visibleItems = navItems.filter(item => hasPermission(item.permission));

    return (
        <>
            {/* Overlay para mobile - cierra el sidebar al hacer click */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-14 left-0 h-[calc(100vh-3.5rem)] w-64 bg-white shadow-lg transform transition-transform duration-300 z-50 overflow-y-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:translate-x-0`}
            >
                <nav className="p-4 space-y-2">
                    {visibleItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.exact}
                            onClick={() => {
                                // Cerrar sidebar en móvil al hacer click en un link
                                if (window.innerWidth < 1024) {
                                    onClose?.();
                                }
                            }}
                            className={({ isActive }) =>
                                `flex items-center px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-scout-blue text-white'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`
                            }
                        >
                            <span className="text-xl mr-3">{item.icon}</span>
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}

                    <div className="pt-4 mt-4 border-t border-gray-200">
                        <NavLink
                            to="/"
                            className="flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            <span className="text-xl mr-3">🏠</span>
                            <span className="font-medium">Volver al Inicio</span>
                        </NavLink>
                    </div>
                </nav>

                {/* Footer del Sidebar */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
                    <div className="text-xs text-gray-500 text-center">
                        <p className="font-semibold">Panel de Administración</p>
                        <p>ADMAPU © 2025</p>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default AdminSidebar;
