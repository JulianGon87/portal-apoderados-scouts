// src/pages/HomePage.jsx (VERSIÓN COMPLETA CON TODOS LOS CAMPOS)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client.js';

const AlumnoCard = ({ nombre, seccion, pagosPendientes }) => (
  <div className="card">
    <div className="card-section">
      <div className="grid-x align-middle">
        <div className="cell auto">
          <h4>{nombre}</h4>
          <p className="subheader" style={{ color: '#1779ba', fontWeight: 600 }}>
            Sección: {seccion}
          </p>
        </div>
        <div className="cell shrink text-right">
          <p className="subheader">Pendiente</p>
          <h4 style={{ color: '#cc4b37', fontWeight: 'bold' }}>
            {pagosPendientes}
          </h4>
        </div>
      </div>
    </div>
    <div className="card-divider">
      <a href="#" className="button small clear primary">
        Ver Detalle de Pagos
      </a>
    </div>
  </div>
);

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
          console.error('❌ No hay usuario autenticado');
          navigate('/');
          return;
        }

        const { data: apoderadoData, error: apoderadoError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();

        if (apoderadoError) {
          console.error('❌ Error al buscar apoderado:', apoderadoError);
          return;
        }

        setApoderado(apoderadoData);

        const { data: alumnosData, error: alumnosError } = await supabase
          .from('alumnos')
          .select('*')
          .eq('apoderado_id', apoderadoData.id);

        if (alumnosError) {
          console.error('❌ Error al buscar alumnos:', alumnosError);
          return;
        }

        setAlumnos(alumnosData || []);

      } catch (error) {
        console.error('🚨 Error inesperado:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApoderadoData();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Error al cerrar sesión:', error.message);
        alert('Error al cerrar sesión. Intente nuevamente.');
        return;
      }

      navigate('/');
      
    } catch (error) {
      console.error('🚨 Error inesperado:', error);
      alert('Error inesperado al cerrar sesión.');
    }
  };

  if (loading) {
    return (
      <div className="grid-container" style={{ marginTop: '2rem' }}>
        <div className="grid-x align-center">
          <div className="cell small-12 text-center">
            <h3>Cargando información...</h3>
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="top-bar">
        <div className="top-bar-left">
          <ul className="menu">
            <li className="menu-text" style={{ fontSize: '1.5rem' }}>
              Bienvenid@, {apoderado?.nombre || 'Apoderado'}
            </li>
          </ul>
        </div>
        <div className="top-bar-right">
          <ul className="menu">
            <li>
              <button 
                type="button" 
                className="button small alert"
                onClick={handleLogout}
                style={{ cursor: 'pointer' }}
              >
                Cerrar Sesión
              </button>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="grid-container" style={{ marginTop: '2rem' }}>
        <div className="grid-x grid-margin-x">
          <div className="cell large-8">
            <h4>Mis Hijos</h4>
            
            {alumnos.length > 0 ? (
              alumnos.map(alumno => (
                <AlumnoCard 
                  key={alumno.id} 
                  nombre={alumno.nombre}
                  seccion={alumno.seccion}
                  pagosPendientes="0 Cuotas"
                />
              ))
            ) : (
              <div className="callout warning">
                <p>No se encontraron alumnos asociados a su cuenta.</p>
              </div>
            )}
          </div>
          
          <div className="cell large-4" style={{ marginTop: '2rem' }}>
            <h4>Opciones</h4>
            <p className="subheader">
              Aquí se configurará el cambio de clave y el acceso al panel Admin.
            </p>
            
            {/* ✅ INFORMACIÓN DE CONTACTO COMPLETA */}
            {apoderado && (
              <div className="callout primary">
                <h6>Información de Contacto</h6>
                <p><strong>Teléfono:</strong> {apoderado.telefono}</p>
                {apoderado.email && <p><strong>Email:</strong> {apoderado.email}</p>}
                {apoderado.nombre_contacto_emergencia && (
                  <p><strong>Contacto emergencia:</strong> {apoderado.nombre_contacto_emergencia}</p>
                )}
                {/* ✅ TELÉFONO DE EMERGENCIA AGREGADO */}
                {apoderado.telefono_contacto_emergencia && (
                  <p><strong>Teléfono emergencia:</strong> {apoderado.telefono_contacto_emergencia}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}