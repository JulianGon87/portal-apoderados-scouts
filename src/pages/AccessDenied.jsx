import React from 'react';
import { Link } from 'react-router-dom';

const AccessDenied = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <div className="mb-8">
                    <div className="mx-auto h-24 w-24 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <svg
                            className="h-12 w-12 text-red-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
                        Acceso Denegado
                    </h1>
                    <p className="text-gray-600 mb-8">
                        Lo sentimos, no tienes los permisos necesarios para acceder a esta página.
                        Si crees que esto es un error, por favor contacta al administrador.
                    </p>
                </div>

                <div className="space-y-4">
                    <Link
                        to="/admin"
                        className="block w-full px-4 py-3 bg-scout-blue text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                    >
                        Volver al Dashboard
                    </Link>
                    <Link
                        to="/"
                        className="block w-full px-4 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                    >
                        Ir al Inicio del Portal
                    </Link>
                </div>

                <div className="mt-12 text-sm text-gray-400">
                    <p>Código de error: 403 Forbidden</p>
                </div>
            </div>
        </div>
    );
};

export default AccessDenied;
