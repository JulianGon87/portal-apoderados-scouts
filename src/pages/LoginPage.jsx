// src/pages/LoginPage.jsx
import React from 'react';
import { MailIcon, LockClosedIcon } from '@heroicons/react/solid'; 
import { validarRut, formatRut } from '../utils/rut.js'; // <-- RUTA CORREGIDA // Usaremos esto más tarde

// Este componente simula el formulario de Login (estático por ahora)
const LoginForm = () => {
  // Nota: Aquí irá la lógica de validación del RUT y Supabase.
  
  return (
    <div className="mt-8 space-y-6">
      <div>
        <label htmlFor="rut" className="sr-only">RUT del Apoderado</label>
        <div className="relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MailIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            id="rut"
            name="rut"
            type="text"
            required
            className="appearance-none rounded-none relative block w-full px-10 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder="RUT (sin puntos ni guion)"
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="password" className="sr-only">Contraseña</label>
        <div className="relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <LockClosedIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="appearance-none rounded-none relative block w-full px-10 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder="Clave Inicial (123456)"
          />
        </div>
      </div>
      
      <button
        type="submit"
        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
      >
        Iniciar Sesión
      </button>
    </div>
  );
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            {/* Logo de Agrupación (Placeholder) */}
            <span className="text-4xl font-extrabold text-blue-800">⚜️</span>
          </div>
          <h2 className="mt-2 text-center text-xl font-extrabold text-gray-900">
            Portal de Pagos Scout
          </h2>
          <p className="mt-1 text-center text-sm text-gray-600">
            Acceso único para apoderados
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}