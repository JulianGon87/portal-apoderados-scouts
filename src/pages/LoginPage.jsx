// src/pages/LoginPage.jsx (Con Foundation + Lógica Supabase)
import React, { useState } from 'react'; 
import { useNavigate } from 'react-router-dom'; 
import { validarRut } from '../utils/rut.js'; 
import { supabase } from '../supabase/client.js'; 

const LoginForm = () => {
  const [rut, setRut] = useState(''); 
  const [password, setPassword] = useState('123456'); 
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  
  const navigate = useNavigate(); 

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    const rutLimpio = rut.replace(/\./g,'').replace(/-/g,'').toUpperCase();

    if (!validarRut(rutLimpio)) {
      setMessage('Error: El formato del RUT es inválido.');
      setLoading(false);
      return;
    }
    
    const emailFalso = `${rutLimpio}@portal.scout`; // Lógica de Email Falso

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailFalso, // Usamos el EMAIL FALSO
      password: password,
    });

    if (error) {
      setMessage('Error de credenciales. Verifique su RUT y clave.');
      setLoading(false);
      return;
    }

    const user = data.user;
    if (user && password === '123456' && user.user_metadata?.require_new_password === true) {
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
      <form onSubmit={handleChangePassword}>
        {message && <div className="callout primary text-center">{message}</div>}
        <div className="grid-x grid-padding-x">
          <div className="cell small-12">
            <label>Nueva Contraseña (mín. 6 caracteres)
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required 
                disabled={loading}
              />
            </label>
          </div>
          <div className="cell small-12">
            <button type="submit" className="button primary expanded" disabled={loading}>
              {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin}>
      {message && (
        <div 
          className={`callout text-center ${message.startsWith('Error:') ? 'alert' : 'success'}`}
        >
          {message}
        </div>
      )}
      <div className="grid-container">
        <div className="grid-x grid-padding-x">
          <div className="cell small-12">
            <label>RUT del Apoderado
              <input 
                type="text" 
                placeholder="RUT (ej: 164842924 o 16.484.292-4)" 
                required 
                value={rut}
                onChange={(e) => setRut(e.target.value)} 
                disabled={loading}
              />
            </label>
          </div>
          <div className="cell small-12">
            <label>Contraseña
              <input 
                type="password" 
                placeholder="Clave Inicial (123456)" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </label>
          </div>
          <div className="cell small-12">
            <button 
              type="submit" 
              className="button success expanded"
              disabled={loading} 
            >
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default function LoginPage() {
  return (
    <div className="grid-y align-center" style={{ height: '100vh', backgroundColor: '#f9f9f9' }}>
      <div className="cell small-10 medium-6 large-4">
        <div className="card" style={{ padding: '2rem' }}>
          <div className="card-divider text-center">
            <span style={{ fontSize: '3rem' }}>⚜️</span>
            <h2 className="text-center">Portal de Pagos Scout</h2>
            <p className="lead text-center">Acceso único para apoderados</p>
          </div>
          <div className="card-section">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}