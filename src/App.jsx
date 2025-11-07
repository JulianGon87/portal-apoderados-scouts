// src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage'; // La pantalla de Login (a crear)
import HomePage from './pages/HomePage';   // El Dashboard/Home (a crear)

export default function App() {
  return (
    // Las 'Routes' definen qué componente se muestra según la URL
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/home" element={<HomePage />} />
      {/* Puedes añadir una ruta de fallback aquí si lo deseas */}
    </Routes>
  );
}