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
import AdminTickets from './pages/admin/AdminTickets';
import AdminAprobaciones from './pages/admin/AdminAprobaciones';
import AdminResources from './pages/admin/AdminResources';

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
          <Route path="recursos" element={
            <ProtectedRoute requiredPermissions="crear_items_cobro">
              <AdminResources />
            </ProtectedRoute>
          } />
          <Route path="tickets" element={
            <ProtectedRoute requiredPermissions="gestionar_tickets">
              <AdminTickets />
            </ProtectedRoute>
          } />
          <Route path="aprobaciones" element={
            <ProtectedRoute requiredPermissions={['aprobar_pagos', 'ver_metricas']}>
              <AdminAprobaciones />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
      <Analytics />
    </ToastProvider>
  );
}

export default App;