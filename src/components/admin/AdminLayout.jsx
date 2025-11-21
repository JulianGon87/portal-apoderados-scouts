import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import useAdminAuth from '../../hooks/useAdminAuth';

/**
 * Layout compartido para todas las páginas del panel de administración
 * Incluye sidebar colapsable y header con información del admin
 */
const AdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const { user, rol, isLoading } = useAdminAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scout-blue mx-auto mb-4"></div>
                    <p className="text-gray-600">Verificando permisos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <AdminHeader
                user={user}
                rol={rol}
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                sidebarOpen={sidebarOpen}
            />

            <div className="flex">
                {/* Sidebar */}
                <AdminSidebar
                    isOpen={sidebarOpen}
                    rol={rol}
                />

                {/* Main Content */}
                <main
                    className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-0 lg:ml-64' : 'ml-0'
                        }`}
                >
                    <div className="p-6 pt-20">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
