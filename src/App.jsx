import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Analytics } from "@vercel/analytics/react"
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import Layout from './components/Layout';
import NotFoundPage from './pages/NotFoundPage';
import StudentProfilePage from './pages/StudentProfilePage';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<LoginPage />} />
          <Route path="home" element={<HomePage />} />
          <Route path="alumno/:slug" element={<StudentProfilePage />} />
          {/* Ruta 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Rutas de Admin */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
        </Route>
      </Routes>
      <Analytics />
    </>
  );
}

export default App;