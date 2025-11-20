// src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client.js';
import Footer from '../components/Footer';
import AlumnoCard from '../components/AlumnoCard';


export default function HomePage() {
  const navigate = useNavigate();
  const [apoderado, setApoderado] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApoderadoData = async () => {
      try {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          navigate('/');
          return;
        }

        const { data: apoderadoData, error: apoderadoError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();

        if (apoderadoError) {
          console.error('Error al buscar apoderado:', apoderadoError);
          return;
        }

        setApoderado(apoderadoData);

        const { data: alumnosData, error: alumnosError } = await supabase
          .from('alumnos')
          .select('*, pagos(*)')
          .eq('apoderado_id', apoderadoData.id);

        if (alumnosError) {
          console.error('Error al buscar alumnos:', alumnosError);
          return;
        }

        setAlumnos(alumnosData || []);

      } catch (error) {
        console.error('Error inesperado:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApoderadoData();
  }, [navigate]);

  // handleLogout logic removed as it is now in Layout.jsx

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      {/* Header removed - now in Layout */}

      <main className="container mx-auto px-4 py-8 flex-grow max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Principal: Alumnos */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-display font-bold text-gray-800 border-b pb-2 border-gray-200">
              Mis Hijos
            </h2>

            {alumnos.length > 0 ? (
              <div className="grid gap-6">
                {alumnos.map(alumno => (
                  <AlumnoCard
                    key={alumno.id}
                    alumno={alumno}
                    pagos={alumno.pagos}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-yellow-400 text-xl">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      No se encontraron alumnos asociados a su cuenta.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Opciones e Info */}
          <div className="space-y-6">
            <div className="card-glass p-6">
              <h4 className="text-lg font-bold text-gray-800 mb-2">Opciones</h4>
              <p className="text-gray-600 text-sm mb-4">
                Configuración de cuenta y acceso al panel administrativo.
              </p>
              <button className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium">
                Cambiar Contraseña
              </button>
            </div>

            {apoderado && (
              <div className="bg-white rounded-2xl shadow-md p-6 border-t-4 border-scout-blue">
                <h6 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span>📞</span> Información de Contacto
                </h6>
                <div className="space-y-3 text-sm">
                  <p className="flex flex-col">
                    <span className="text-gray-500 text-xs uppercase tracking-wider">Teléfono</span>
                    <span className="font-medium text-gray-900">{apoderado.telefono}</span>
                  </p>

                  {apoderado.email && (
                    <p className="flex flex-col">
                      <span className="text-gray-500 text-xs uppercase tracking-wider">Email</span>
                      <span className="font-medium text-gray-900 break-all">{apoderado.email}</span>
                    </p>
                  )}

                  {(apoderado.nombre_contacto_emergencia || apoderado.telefono_contacto_emergencia) && (
                    <div className="pt-3 mt-3 border-t border-gray-100">
                      <span className="block text-red-500 text-xs font-bold uppercase tracking-wider mb-2">
                        En caso de emergencia
                      </span>
                      {apoderado.nombre_contacto_emergencia && (
                        <p className="mb-1">
                          <span className="text-gray-900">{apoderado.nombre_contacto_emergencia}</span>
                        </p>
                      )}
                      {apoderado.telefono_contacto_emergencia && (
                        <p>
                          <span className="text-gray-600 font-medium">
                            {apoderado.telefono_contacto_emergencia}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer dark className="mt-auto" />
    </div>
  );
}
