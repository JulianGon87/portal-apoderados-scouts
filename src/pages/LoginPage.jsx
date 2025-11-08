// src/pages/LoginPage.jsx (Con Foundation)
import React from 'react';
import { validarRut, formatRut } from '../utils/rut.js';

const LoginForm = () => {
  return (
    <form>
      <div className="grid-container">
        <div className="grid-x grid-padding-x">
          <div className="cell small-12">
            <label>RUT del Apoderado
              <input 
                type="text" 
                placeholder="RUT (sin puntos ni guion)" 
                required 
              />
            </label>
          </div>
          <div className="cell small-12">
            <label>Contraseña
              <input 
                type="password" 
                placeholder="Clave Inicial (123456)" 
                required 
              />
            </label>
          </div>
          <div className="cell small-12">
            <button 
              type="submit" 
              className="button success expanded" // Botón verde expandido
            >
              Iniciar Sesión
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default function LoginPage() {
  return (
    // 'grid-y' alinea verticalmente, 'align-center' centra
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