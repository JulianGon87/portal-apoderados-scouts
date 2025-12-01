import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Analytics } from "@vercel/analytics/react"
import { ToastProvider } from './components/Toast';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import Layout from './components/Layout';
import NotFoundPage from './pages/NotFoundPage';
import StudentProfilePage from './pages/StudentProfilePage';
import AdminLayout from './components/admin/AdminLayout';
import ProtectedRoute from './components/admin/ProtectedRoute';
import AdminDashboard from './pages/admin/AdminDashboard';
import ItemsCobro from './pages/admin/ItemsCobro';
import AdminPagos from './pages/admin/AdminPagos';

import AdminAlumnos from './pages/admin/AdminAlumnos';
import AdminLogros from './pages/admin/AdminLogros';
import AdminUsuarios from './pages/admin/AdminUsuarios';

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<LoginPage />} />
          <Route path="home" element={<HomePage />} />
          <Route path="alumno/:slug" element={<StudentProfilePage />} />
          {/* Ruta 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Rutas de Admin con Protección Granular */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={
            <ProtectedRoute requiredPermissions="ver_dashboard">
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="items-cobro" element={
            <ProtectedRoute requiredPermissions={['crear_items_cobro', 'editar_items_cobro']}>
              <ItemsCobro />
            </ProtectedRoute>
          } />
          <Route path="pagos" element={
            <ProtectedRoute requiredPermissions={['aprobar_pagos', 'ver_metricas']}>
              <AdminPagos />
            </ProtectedRoute>
          } />
          <Route path="alumnos" element={
            <ProtectedRoute requiredPermissions="crear_alumnos">
              <AdminAlumnos />
            </ProtectedRoute>
          } />
          <Route path="logros" element={
            <ProtectedRoute requiredPermissions="designar_logros">
              <AdminLogros />
            </ProtectedRoute>
          } />
          <Route path="usuarios" element={
            <ProtectedRoute requiredPermissions="gestionar_usuarios">
              <AdminUsuarios />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
      <Analytics />
    </ToastProvider>
  );
}

export default App;