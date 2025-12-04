import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

const ResumenFinanciero = () => {
    return (
        <AdminLayout title="Resumen Financiero">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">📈</span>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Resumen Financiero</h2>
                    <p className="text-gray-600 mb-6">Esta sección está en construcción. Próximamente podrás ver los movimientos y el estado financiero.</p>
                    <div className="animate-pulse bg-gray-200 h-64 w-full rounded-lg"></div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default ResumenFinanciero;
