// src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client.js';

import AlumnoCard from '../components/AlumnoCard';
import BottomNavigation from '../components/BottomNavigation';




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
        const adminRoles = ['admin', 'scoutmaster', 'tesorero', 'jefe', 'presidente', 'secretario'];
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
    <div className="min-h-full bg-gray-50 flex flex-col pb-24 lg:pb-0">
      <main className="container mx-auto px-4 py-8 flex-grow max-w-7xl">




        {/* Sticky Header para Móvil */}
        <div className="lg:hidden sticky top-0 z-30 bg-gray-50/95 backdrop-blur-sm pt-2 pb-4 mb-6 border-b border-gray-200/50 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-scout-green font-bold uppercase tracking-wider mb-0.5">Bienvenido/a</p>
              <h1 className="text-xl font-display font-bold text-gray-900 leading-none">
                {apoderado ? apoderado.nombre.split(' ')[0] : 'Explorador'}
              </h1>
            </div>

            <div
              className="relative p-0.5 rounded-full border-2 border-scout-green/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                {apoderado?.foto_url ? (
                  <img src={apoderado.foto_url} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-scout-green text-white font-bold">
                    {apoderado?.nombre?.charAt(0) || 'S'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

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

          {/* Bottom Sheet Perfil (Móvil) / Sidebar (Desktop) */}
          <div
            className={`
              fixed bottom-0 left-0 z-50 w-full bg-white rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] 
              transform transition-transform duration-300 ease-out pb-24 lg:pb-0 max-h-[85vh] overflow-y-auto touch-pan-y overscroll-y-contain
              lg:relative lg:transform-none lg:w-auto lg:bg-transparent lg:shadow-none lg:rounded-none lg:block lg:max-h-none lg:overflow-visible
              ${showSidebar ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
            `}
            onTouchStart={(e) => {
              // Solo capturamos el inicio si estamos al tope
              if (e.currentTarget.scrollTop <= 5) {
                const touch = e.touches[0];
                e.currentTarget.dataset.startY = touch.clientY;
                e.currentTarget.dataset.isDragging = 'true';
              } else {
                e.currentTarget.dataset.isDragging = 'false';
              }
            }}
            onTouchMove={(e) => {
              if (e.currentTarget.dataset.isDragging !== 'true') return;

              const touch = e.touches[0];
              const startY = parseFloat(e.currentTarget.dataset.startY);
              const deltaY = touch.clientY - startY;

              // Si desliza hacia abajo más de 80px (aumentado para evitar falsos positivos), cerrar
              if (deltaY > 80) {
                setShowSidebar(false);
                e.currentTarget.dataset.isDragging = 'false'; // Reset evitar múltiples disparos
              }
            }}
          >
            {/* Handle bar for Mobile */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 mb-2 lg:hidden" />

            {/* Close Button Mobile (Absolute Top Right) */}
            <button
              onClick={() => setShowSidebar(false)}
              className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-500 lg:hidden hover:bg-gray-200"
            >
              <span className="sr-only">Cerrar</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {apoderado && (
              <div className="p-6 lg:p-0">
                {/* Desktop Card Wrapper */}
                <div className="lg:bg-white lg:rounded-2xl lg:shadow-sm lg:border lg:border-gray-200 lg:p-6 lg:overflow-hidden">

                  {/* Header Perfil Compacto */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="relative group">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-scout-green/10">
                        {apoderado.foto_url ? (
                          <img src={apoderado.foto_url} alt="Perfil" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-scout-green text-white font-bold text-xl">
                            {apoderado.nombre?.charAt(0)}
                          </div>
                        )}
                      </div>
                      {/* Mini Edit Button */}
                      <label className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow border border-gray-100 cursor-pointer hover:bg-gray-50 text-scout-green">
                        <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </label>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 truncate">
                        {apoderado.nombre}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">{apoderado.email}</p>
                    </div>
                  </div>

                  {/* Action List */}
                  <div className="space-y-1">
                    {isAdmin && (
                      <button onClick={() => navigate('/admin')} className="w-full flex items-center gap-3 p-3 text-left rounded-xl hover:bg-orange-50 text-orange-700 font-medium transition-colors">
                        <span className="p-1.5 bg-orange-100 rounded-lg">⚙️</span>
                        Panel de Administración
                      </button>
                    )}

                    <button onClick={() => setShowEditProfileModal(true)} className="w-full flex items-center gap-3 p-3 text-left rounded-xl hover:bg-gray-50 text-gray-700 font-medium transition-colors">
                      <span className="p-1.5 bg-gray-100 rounded-lg text-gray-500">✏️</span>
                      Editar mis datos
                    </button>

                    <button onClick={() => setShowPasswordModal(true)} className="w-full flex items-center gap-3 p-3 text-left rounded-xl hover:bg-gray-50 text-gray-700 font-medium transition-colors">
                      <span className="p-1.5 bg-gray-100 rounded-lg text-gray-500">🔒</span>
                      Cambiar contraseña
                    </button>
                  </div>

                  {/* Emergency Contact Compact */}
                  {(apoderado.nombre_contacto_emergencia || apoderado.telefono_contacto_emergencia) && (
                    <div className="mt-8 pt-6 border-t border-gray-100">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400"></span> Emergencia
                      </p>
                      <div className="bg-red-50/50 rounded-xl p-3 flex items-center gap-3">
                        <span className="text-xl">🚨</span>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{apoderado.nombre_contacto_emergencia}</p>
                          <p className="text-xs text-gray-500">{apoderado.telefono_contacto_emergencia}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Redes Sociales en Menú Móvil (Movidas desde el Footer) */}
            <div className="mt-8 pb-6 text-center lg:hidden">
              <p className="text-xs text-gray-400 mb-3 font-medium">SÍGUENOS EN</p>
              <div className="flex justify-center gap-6">
                <a href="https://www.facebook.com/grupo.admapu" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-scout-blue transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                </a>
                <a href="https://www.instagram.com/gscoutadmapu/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-600 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                </a>
              </div>
            </div>
          </div>

          {/* Columna Principal: Alumnos */}
          <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mt-2 lg:mt-0">
              <h2 className="text-2xl lg:text-3xl font-display font-bold text-gray-800">
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
      {/* Bottom Navigation para Móvil */}
      <BottomNavigation
        onHomeClick={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setShowSidebar(false);
        }}
        onProfileClick={() => setShowSidebar(!showSidebar)}
        onAdminClick={() => navigate('/admin')}
        isAdmin={isAdmin}
      />
    </div>
  );
}
