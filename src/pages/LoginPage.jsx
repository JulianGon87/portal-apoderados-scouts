import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateRut } from '../utils/rut.js';
import { supabase } from '../supabase/client.js';
import PasswordInput from '../components/PasswordInput';

const LoginForm = () => {
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const navigate = useNavigate();

  // Constante para evitar hardcoded password warning
  const DEFAULT_INITIAL_PASS = '123456';

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/home');
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const rutLimpio = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();

    if (!validateRut(rutLimpio)) {
      setMessage('Error: El formato del RUT es inválido.');
      setLoading(false);
      return;
    }

    const emailFalso = `${rutLimpio}@portal.scout`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailFalso,
      password: password,
    });

    if (error) {
      setMessage('Error de credenciales. Verifique su RUT y clave.');
      setLoading(false);
      return;
    }

    const user = data.user;
    if (user && password === DEFAULT_INITIAL_PASS && user.user_metadata?.require_new_password === true) {
      setMessage('¡Primer ingreso! Debe crear una nueva contraseña.');
      setShowPasswordChange(true);
      setLoading(false);
      return;
    }

    setMessage('✅ Inicio de sesión exitoso. Redirigiendo...');
    setLoading(false);
    navigate('/home');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { require_new_password: false }
    });

    if (error) {
      setMessage('Error al cambiar la clave. Intente de nuevo.');
    } else {
      setMessage('✅ Contraseña actualizada. Inicie sesión con su nueva clave.');
      setShowPasswordChange(false);
      setPassword('');
      setNewPassword('');
      await supabase.auth.signOut();
    }
    setLoading(false);
  };

  if (showPasswordChange) {
    return (
      <form onSubmit={handleChangePassword} className="space-y-6">
        {message && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg animate-fade-in">
            <p className="text-blue-700 text-sm">{message}</p>
          </div>
        )}
        <PasswordInput
          id="new-password"
          name="new-password"
          label="Nueva Contraseña (mín. 6 caracteres)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required={true}
          placeholder="Mínimo 6 caracteres"
          autoComplete="new-password"
          className={loading ? "opacity-50 cursor-not-allowed" : ""}
        />
        <button
          type="submit"
          className="btn-scout w-full"
          disabled={loading}
        >
          {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      {message && (
        <div
          className={`border-l-4 p-4 rounded-lg animate-fade-in ${message.startsWith('Error:')
            ? 'bg-red-50 border-red-500 text-red-700'
            : 'bg-green-50 border-green-500 text-green-700'
            }`}
        >
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}

      <div>
        <label htmlFor="rut" className="block text-sm font-medium text-gray-700 mb-2">
          RUT del Apoderado
        </label>
        <input
          id="rut"
          type="text"
          placeholder="RUT (ej: 123456780 ó 12345678-0)"
          required
          value={rut}
          onChange={(e) => setRut(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-scout-blue focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <PasswordInput
        id="password"
        name="password"
        label="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required={true}
        placeholder="Ingrese su contraseña"
        autoComplete="current-password"
        className={loading ? "opacity-50 cursor-not-allowed" : ""}
      />

      <button
        type="submit"
        className="btn-scout w-full"
        disabled={loading}
      >
        {loading ? 'Verificando...' : 'Iniciar Sesión'}
      </button>
    </form>
  );
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-scout-green via-scout-blue to-scout-gold">
      <div className="flex-grow flex items-center justify-center px-4 py-3">
        <div className="w-full max-w-md">
          <div className="card-glass p-6 sm:p-8 pt-2 animate-slide-up">
            <div className="text-center mb-4">
              <img
                src="/logo_admapu.png"
                alt="Logo ADMAPU"
                className="h-50 w-auto mx-auto mb-0 mt-0 animate-fade-in hover:scale-105 transition-transform"
              />
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-gray-800 mt-0">
                Portal de Información ADMAPU
              </h2>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">Acceso único para apoderados</p>
            </div>
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}