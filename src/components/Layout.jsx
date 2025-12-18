import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase/client.js';
import { LogOut, User, ArrowLeft } from 'lucide-react';

import Footer from './Footer';

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [apoderado, setApoderado] = useState(null);
    const isLoginPage = location.pathname === '/';

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profileData } = await supabase
                    .from('users')
                    .select('nombre, rol')
                    .eq('auth_user_id', user.id)
                    .single();
                setApoderado(profileData);
            }
        };
        fetchUserData();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                fetchUserData();
            }
            if (event === 'SIGNED_OUT') {
                setApoderado(null);
                navigate('/');
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };

    }, [navigate]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const getRoleBadge = (rol) => {
        switch (rol) {
            case 'admin':
                return { icon: '🛡️', label: 'Admin' };
            case 'scoutmaster':
                return { icon: '⚜️', label: 'ScoutMaster' };
            case 'tesorero':
                return { icon: '💰', label: 'Tesorero' };
            case 'jefe':
                return { icon: '⭐', label: 'Jefe de Unidad' };
            case 'secretario':
                return { icon: '📝', label: 'Secretario' };
            case 'presidente':
                return { icon: '👔', label: 'Presidente' };
            default:
                return { icon: '👤', label: 'Apoderado' };
        }
    };

    const isStudentProfile = location.pathname.startsWith('/alumno/');

    return (
        <div className="min-h-screen flex flex-col bg-stone-50 font-inter">
            {/* Header: Global (Oculto en Perfil de Alumno, Login y Home) */}
            {!isStudentProfile && !isLoginPage && location.pathname !== '/home' && (
                <header className="bg-gradient-to-r from-scout-green to-scout-blue shadow-lg sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            {/* Logo / Title / Back Button */}
                            <div className="flex items-center gap-2">
                                {/* Mostrar botón volver si no estamos en login o home */}
                                {!isLoginPage && location.pathname !== '/home' && (
                                    <button
                                        onClick={() => navigate('/home')}
                                        className="mr-2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                                        title="Volver al Inicio"
                                    >
                                        <ArrowLeft className="w-6 h-6" />
                                    </button>
                                )}

                                <img
                                    src="/logo_admapu.png"
                                    alt="Logo"
                                    className="h-10 w-auto md:h-14"
                                />
                                <span className="text-xl md:text-3xl font-bold text-white font-outfit tracking-tight hidden sm:block">
                                    ADMAPU
                                </span>
                            </div>

                            {/* User Info & Logout */}
                            <div className="flex items-center space-x-2 md:space-x-3">
                                {apoderado && !isLoginPage && (
                                    <>
                                        {/* User Info Badge - Responsive */}
                                        <div className="flex items-center text-white/90 bg-white/10 px-2 py-1 md:px-3 md:py-1.5 rounded-full border border-white/20 backdrop-blur-sm gap-1.5 md:gap-2">
                                            <div className="flex items-center gap-1 border-r border-white/20 pr-2 mr-0.5 md:pr-3 md:mr-1">
                                                <span className="text-base md:text-lg" role="img" aria-label={getRoleBadge(apoderado.rol).label}>
                                                    {getRoleBadge(apoderado.rol).icon}
                                                </span>
                                                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider opacity-80 hidden sm:block">
                                                    {getRoleBadge(apoderado.rol).label}
                                                </span>
                                            </div>
                                            <span className="text-xs md:text-sm font-medium max-w-[80px] md:max-w-none truncate">
                                                {apoderado.nombre.split(' ')[0]}
                                            </span>
                                        </div>

                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center justify-center w-8 h-8 md:w-auto md:h-auto md:px-3 md:py-1.5 bg-red-500/90 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm backdrop-blur-sm"
                                            title="Cerrar Sesión"
                                        >
                                            <LogOut className="w-4 h-4 md:mr-2" />
                                            <span className="hidden md:inline">Cerrar Sesión</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </header>
            )}

            {/* Main Content */}
            <main className="flex-grow w-full flex flex-col">
                <Outlet />
            </main>

            {/* Footer Global: Oculto en móvil solo en Home para no ensuciar */}
            <div className={location.pathname === '/home' ? 'hidden lg:block' : ''}>
                <Footer />
            </div>
        </div>
    );
}
