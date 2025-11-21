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
import AdminDashboard from './pages/admin/AdminDashboard';
import ItemsCobro from './pages/admin/ItemsCobro';
import AdminTickets from './pages/admin/AdminTickets';
import AdminAprobaciones from './pages/admin/AdminAprobaciones';

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

        {/* Rutas de Admin */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="items-cobro" element={<ItemsCobro />} />
          <Route path="tickets" element={<AdminTickets />} />
          <Route path="aprobaciones" element={<AdminAprobaciones />} />
        </Route>
      </Routes>
      <Analytics />
    </ToastProvider>
  );
}

export default App;