import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Map, Home } from 'lucide-react';

export default function NotFoundPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8">

                {/* Icono Animado */}
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-scout-green/20 rounded-full blur-xl animate-pulse"></div>
                    <div className="relative bg-white p-6 rounded-full shadow-lg border-4 border-scout-green/10">
                        <Compass className="w-20 h-20 text-scout-green animate-[spin_4s_linear_infinite]" />
                    </div>
                </div>

                {/* Texto */}
                <div className="space-y-4">
                    <h1 className="text-6xl font-display font-bold text-scout-blue">404</h1>
                    <h2 className="text-2xl font-bold text-gray-800">
                        ¡Te has perdido en el bosque!
                    </h2>
                    <p className="text-gray-600">
                        Parece que la página que buscas no existe o ha sido movida de campamento.
                        Mejor regresemos al punto de encuentro.
                    </p>
                </div>

                {/* Botón */}
                <div>
                    <Link
                        to="/"
                        className="inline-flex items-center px-6 py-3 bg-scout-blue hover:bg-scout-blue/90 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 gap-2"
                    >
                        <Home className="w-5 h-5" />
                        Volver al Inicio
                    </Link>
                </div>

                {/* Decoración */}
                <div className="pt-8 flex justify-center gap-4 opacity-30">
                    <Map className="w-8 h-8 text-gray-400" />
                    <span className="text-2xl">🌲</span>
                    <span className="text-2xl">🏕️</span>
                    <span className="text-2xl">🌲</span>
                </div>
            </div>
        </div>
    );
}
