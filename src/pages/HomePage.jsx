// src/pages/HomePage.jsx
import React from 'react';
import { LogoutIcon, UserCircleIcon, ClipboardListIcon, CogIcon } from '@heroicons/react/outline';

const AlumnoCard = ({ nombre, seccion, pagosPendientes }) => (
  <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
    <div className="px-4 py-5 sm:p-6 flex justify-between items-center">
      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          {nombre}
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-indigo-600 font-semibold">
          Sección: {seccion}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-gray-500">
          Pendiente
        </p>
        <p className="text-2xl font-extrabold text-red-500">
          {pagosPendientes}
        </p>
      </div>
    </div>
    <div className="border-t border-gray-200 px-4 py-2 sm:px-6">
      <button className="text-sm font-medium text-blue-600 hover:text-blue-500">
        Ver Detalle de Pagos
      </button>
    </div>
  </div>
);

export default function HomePage() {
  // Datos estáticos de prueba basados en tu requerimiento
  const apoderadoNombre = "Julián González";
  const alumnosData = [
    { id: 1, nombre: "Sofía", seccion: "Golondrinas", pagosPendientes: "2 Cuotas" },
    { id: 2, nombre: "Benjamín", seccion: "Lobatos", pagosPendientes: "1 Evento" },
  ];
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Bienvenido, {apoderadoNombre}
          </h1>
          <button className="flex items-center text-sm text-gray-500 hover:text-red-600">
            <LogoutIcon className="h-5 w-5 mr-1" />
            Cerrar Sesión
          </button>
        </div>
      </header>
      
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          
          <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center">
             <UserCircleIcon className="h-6 w-6 mr-2 text-indigo-500" />
             Mis Hijos
          </h2>
          <div className="space-y-4">
            {alumnosData.map(alumno => (
              <AlumnoCard key={alumno.id} {...alumno} />
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center">
              <CogIcon className="h-6 w-6 mr-2 text-gray-500" />
              Opciones
            </h2>
            <p className="text-gray-600">Aquí se configurará el cambio de clave y el acceso al panel Admin.</p>
          </div>

        </div>
      </main>
    </div>
  );
}