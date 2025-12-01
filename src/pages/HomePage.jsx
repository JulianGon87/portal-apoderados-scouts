// src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client.js';

import AlumnoCard from '../components/AlumnoCard';




const combineAlumnosWithItems = (alumnos, items) => {
  return (alumnos || []).map(alumno => {
    const applicableItems = (items || []).filter(item => {
      return !item.seccion || item.seccion.toUpperCase() === (alumno.seccion || '').toUpperCase();
    });

    return {
      ...alumno,
      items: applicableItems
    };
  });
};

export default function HomePage() {
  const navigate = useNavigate();
  const [apoderado, setApoderado] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // Estados para modal de cambio de contraseña
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Estados para modal de editar perfil
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    telefono: '',
    email: '',
    nombre_contacto_emergencia: '',
    telefono_contacto_emergencia: ''
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);

  useEffect(() => {
    const fetchApoderadoData = async () => {
      try {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          navigate('/');
          return;
        }

        // 1. Obtener datos del apoderado
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

        // Verificar si el usuario tiene permisos de admin
        const adminRoles = ['admin', 'scoutmaster', 'tesorero', 'jefe'];
        setIsAdmin(adminRoles.includes(apoderadoData.rol));

        // 2. Obtener alumnos
        const { data: alumnosData, error: alumnosError } = await supabase
          .from('alumnos')
          .select('*, pagos(*)')
          .eq('apoderado_id', apoderadoData.id);

        if (alumnosError) {
          console.error('Error al buscar alumnos:', alumnosError);
          return;
        }

        // 3. Obtener items de cobro del año actual
        const currentYear = new Date().getFullYear();
        const { data: itemsData, error: itemsError } = await supabase
          .from('items_pago')
          .select('*')
          .eq('anio', currentYear);

        if (itemsError) {
          console.error('Error al buscar items de pago:', itemsError);
        }

        // 4. Combinar alumnos con sus items aplicables
        // 4. Combinar alumnos con sus items aplicables
        const alumnosWithItems = combineAlumnosWithItems(alumnosData, itemsData);

        setAlumnos(alumnosWithItems);

      } catch (error) {
        console.error('Error inesperado:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApoderadoData();
  }, [navigate]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es demasiado grande. Máximo 5MB');
      return;
    }

    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${apoderado.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error de upload:', uploadError);
        throw new Error(`Error al subir: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users')
        .update({ foto_url: publicUrl })
        .eq('id', apoderado.id);

      if (updateError) {
        console.error('Error de actualización:', updateError);
        throw new Error(`Error al actualizar perfil: ${updateError.message}`);
      }

      setApoderado({ ...apoderado, foto_url: publicUrl });
      alert('✅ Foto de perfil actualizada correctamente');

    } catch (error) {
      console.error('Error subiendo imagen:', error);
      alert(error.message || 'Error al subir la imagen. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Por favor completa todos los campos');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      setPasswordSuccess(true);
      setPasswordForm({ newPassword: '', confirmPassword: '' });

      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 2000);

    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      setPasswordError(error.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos del perfil cuando se abre el modal
  useEffect(() => {
    if (showEditProfileModal && apoderado) {
      setProfileForm({
        telefono: apoderado.telefono || '',
        email: apoderado.email || '',
        nombre_contacto_emergencia: apoderado.nombre_contacto_emergencia || '',
        telefono_contacto_emergencia: apoderado.telefono_contacto_emergencia || ''
      });
    }
  }, [showEditProfileModal, apoderado]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);

    // Validación de email más segura y simple para evitar ReDoS
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (profileForm.email && !emailRegex.test(profileForm.email)) {
      setProfileError('Por favor ingresa un email válido');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('users')
        .update({
          telefono: profileForm.telefono,
          email: profileForm.email,
          nombre_contacto_emergencia: profileForm.nombre_contacto_emergencia,
          telefono_contacto_emergencia: profileForm.telefono_contacto_emergencia
        })
        .eq('id', apoderado.id);

      if (error) throw error;

      setApoderado({ ...apoderado, ...profileForm });
      setProfileSuccess(true);

      setTimeout(() => {
        setShowEditProfileModal(false);
        setProfileSuccess(false);
      }, 2000);

    } catch (error) {
      console.error('Error actualizando perfil:', error);
      setProfileError(error.message || 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      <main className="container mx-auto px-4 py-8 flex-grow max-w-7xl">

        {/* Botón Móvil para abrir Sidebar */}
        <button
          onClick={() => setShowSidebar(true)}
          className="lg:hidden w-full mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between text-scout-green font-bold hover:bg-green-50 transition-colors"
        >
          <span className="flex items-center gap-3">
            <span className="bg-green-100 p-2 rounded-full text-xl">👤</span>
            <span>Ver Mi Perfil y Opciones</span>
          </span>
          <span className="text-gray-400">→</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* Overlay para Móvil */}
          {showSidebar && (
            <button
              type="button"
              className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity w-full h-full cursor-default"
              onClick={() => setShowSidebar(false)}
              aria-label="Cerrar menú lateral"
            />
          )}

          {/* Sidebar: Perfil Unificado */}
          <div className={`
              fixed inset-y-0 left-0 z-50 w-[85vw] max-w-sm bg-white shadow-2xl transform transition-transform duration-300 ease-out
              lg:relative lg:inset-auto lg:z-auto lg:w-auto lg:bg-transparent lg:shadow-none lg:transform-none lg:transition-none lg:col-span-1 lg:block
              ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}>

            <button
              onClick={() => setShowSidebar(false)}
              className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full lg:hidden z-20 hover:bg-white/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {apoderado && (
              <div className="bg-gradient-to-b from-scout-green to-green-950 h-full lg:h-auto lg:rounded-2xl shadow-xl overflow-y-auto lg:overflow-visible text-white relative">
                <div className="absolute top-0 left-0 w-full h-32 bg-white/5 opacity-50 rounded-b-[50%] transform -translate-y-1/2"></div>

                <div className="p-6 text-center relative z-10">
                  <h3 className="text-2xl font-bold mb-6 px-2 leading-tight">
                    {apoderado.nombre} {apoderado.apellidos}
                  </h3>

                  <div className="relative inline-block mb-6">
                    <div className="w-40 h-40 mx-auto bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-6xl border-4 border-white/30 shadow-lg overflow-hidden">
                      {apoderado.foto_url ? (
                        <img src={apoderado.foto_url} alt="Perfil" className="w-full h-full object-cover" />
                      ) : (
                        <span>👤</span>
                      )}
                    </div>
                    <label className="absolute bottom-2 right-2 bg-white text-scout-green p-3 rounded-full shadow-lg cursor-pointer hover:bg-gray-100 transition-colors group" title="Cambiar foto">
                      <span className="sr-only">Cambiar foto de perfil</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </label>
                  </div>

                  <p className="text-green-100 text-sm mb-8">{apoderado.email}</p>

                  <div className="space-y-3 mb-8 px-8">
                    {isAdmin && (
                      <button
                        onClick={() => navigate('/admin')}
                        className="w-full py-2.5 px-4 bg-white text-scout-green rounded-xl font-bold shadow-lg hover:bg-green-50 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-sm"
                      >
                        <span>⚙️</span> Panel Admin
                      </button>
                    )}

                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="w-full py-2.5 px-4 bg-green-800/40 hover:bg-green-800/60 border border-green-500/30 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 backdrop-blur-sm text-green-50"
                    >
                      🔒 Cambiar Contraseña
                    </button>

                    <button
                      onClick={() => setShowEditProfileModal(true)}
                      className="w-full py-2.5 px-4 bg-green-800/40 hover:bg-green-800/60 border border-green-500/30 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 backdrop-blur-sm text-green-50"
                    >
                      ✏️ Editar Perfil
                    </button>
                  </div>

                  {(apoderado.nombre_contacto_emergencia || apoderado.telefono_contacto_emergencia) && (
                    <div className="text-left bg-black/20 rounded-xl p-5 backdrop-blur-sm mx-4 border border-white/5">
                      <div className="flex items-start gap-4">
                        <span className="text-3xl">🚨</span>
                        <div>
                          <p className="text-[10px] text-red-300 font-bold uppercase tracking-widest mb-1">En caso de emergencia</p>
                          {apoderado.nombre_contacto_emergencia && (
                            <p className="font-bold text-white text-base leading-tight">{apoderado.nombre_contacto_emergencia}</p>
                          )}
                          {apoderado.telefono_contacto_emergencia && (
                            <p className="text-green-100 text-sm mt-0.5">{apoderado.telefono_contacto_emergencia}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Columna Principal: Alumnos */}
          <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h2 className="text-3xl font-display font-bold text-gray-800">
                Mis Hijos
              </h2>
              <span className="bg-scout-green/10 text-scout-green px-3 py-1 rounded-full text-sm font-bold">
                {alumnos.length} Estudiante{alumnos.length === 1 ? '' : 's'}
              </span>
            </div>

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
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
                  ⚠️
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No hay alumnos asociados</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  No hemos encontrado estudiantes vinculados a tu cuenta. Si crees que es un error, contacta a un dirigente.
                </p>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Modal de Cambio de Contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setShowPasswordModal(false);
                setPasswordError('');
                setPasswordSuccess(false);
                setPasswordForm({ newPassword: '', confirmPassword: '' });
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">Cambiar Contraseña</h2>

            {passwordSuccess ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-5xl mb-2">✅</div>
                <p className="text-green-800 font-medium">¡Contraseña actualizada exitosamente!</p>
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-green focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-green focus:border-transparent"
                    required
                  />
                </div>

                {passwordError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                    {passwordError}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordError('');
                      setPasswordSuccess(false);
                      setPasswordForm({ newPassword: '', confirmPassword: '' });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-scout-green text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal de Editar Perfil */}
      {showEditProfileModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowEditProfileModal(false);
                setProfileError('');
                setProfileSuccess(false);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">Editar Perfil</h2>

            {profileSuccess ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-5xl mb-2">✅</div>
                <p className="text-green-800 font-medium">¡Perfil actualizado exitosamente!</p>
              </div>
            ) : (
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono Personal
                  </label>
                  <input
                    type="tel"
                    id="telefono"
                    name="telefono"
                    value={profileForm.telefono}
                    onChange={(e) => setProfileForm({ ...profileForm, telefono: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-green focus:border-transparent"
                    placeholder="+56 9 1234 5678"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-green focus:border-transparent"
                    placeholder="tu@email.com"
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <span>🚨</span> Contacto de Emergencia
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label htmlFor="nombre_emergencia" className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre Completo
                      </label>
                      <input
                        type="text"
                        id="nombre_emergencia"
                        name="nombre_emergencia"
                        value={profileForm.nombre_contacto_emergencia}
                        onChange={(e) => setProfileForm({ ...profileForm, nombre_contacto_emergencia: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-green focus:border-transparent"
                        placeholder="Nombre del contacto"
                      />
                    </div>

                    <div>
                      <label htmlFor="telefono_emergencia" className="block text-sm font-medium text-gray-700 mb-1">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        id="telefono_emergencia"
                        name="telefono_emergencia"
                        value={profileForm.telefono_contacto_emergencia}
                        onChange={(e) => setProfileForm({ ...profileForm, telefono_contacto_emergencia: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-green focus:border-transparent"
                        placeholder="+56 9 1234 5678"
                      />
                    </div>
                  </div>
                </div>

                {profileError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                    {profileError}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditProfileModal(false);
                      setProfileError('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-scout-green text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
