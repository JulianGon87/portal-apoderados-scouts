// src/pages/HomePage.jsx (Con Foundation)
import React from 'react';

// Tarjeta de Alumno (Componente)
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

// Página Principal
export default function HomePage() {
  const apoderadoNombre = "Julián González";
  const alumnosData = [
    { id: 1, nombre: "Sofía", seccion: "Golondrinas", pagosPendientes: "2 Cuotas" },
    { id: 2, nombre: "Benjamín", seccion: "Lobatos", pagosPendientes: "1 Evento" },
  ];
  
  return (
    <div>
      {/* Encabezado */}
      <div className="top-bar">
        <div className="top-bar-left">
          <ul className="menu">
            <li className="menu-text" style={{ fontSize: '1.5rem' }}>
              Bienvenido, {apoderadoNombre}
            </li>
          </ul>
        </div>
        <div className="top-bar-right">
          <ul className="menu">
            <li>
              <button type="button" className="button small alert">
                Cerrar Sesión
              </button>
            </li>
          </ul>
        </div>
      </div>
      
      {/* Contenido Principal */}
      <div className="grid-container" style={{ marginTop: '2rem' }}>
        <div className="grid-x grid-margin-x">
          <div className="cell large-8">
            <h4>Mis Hijos</h4>
            {alumnosData.map(alumno => (
              <AlumnoCard key={alumno.id} {...alumno} />
            ))}
          </div>
          
          <div className="cell large-4" style={{ marginTop: '2rem' }}>
            <h4>Opciones</h4>
            <p className="subheader">
              Aquí se configurará el cambio de clave y el acceso al panel Admin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}