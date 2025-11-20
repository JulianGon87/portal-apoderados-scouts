import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase/client.js';
import { LogOut, User } from 'lucide-react';

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
                    .select('nombre')
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

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-inter">
            {/* Header */}
            <header className="bg-gradient-to-r from-scout-green to-scout-blue shadow-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo / Title */}
                        <div className="flex items-center gap-2">
                            <img
                                src="/logo_admapu.png"
                                alt="Logo"
                                className="h-14 w-auto"
                            />
                            <span className="text-xl font-bold text-white font-outfit tracking-tight">
                                Portal grupo Scout ADMAPU
                            </span>
                        </div>

                        {/* User Info & Logout */}
                        <div className="flex items-center space-x-3">
                            {apoderado && !isLoginPage && (
                                <>
                                    {/* User Name - Visible on mobile but simplified */}
                                    <div className="flex items-center text-white/90 bg-white/10 px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-sm">
                                        <User className="w-4 h-4 mr-2 text-scout-gold" />
                                        <span className="text-sm font-medium max-w-[100px] md:max-w-none truncate">
                                            {apoderado.nombre}
                                        </span>
                                    </div>

                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center px-3 py-1.5 bg-red-500/90 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm backdrop-blur-sm"
                                        title="Cerrar Sesión"
                                    >
                                        <LogOut className="w-4 h-4 md:mr-2" />
                                        <span className="hidden md:inline">Cerrar Sesión</span>
                                        <span className="md:hidden">Salir</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow w-full flex flex-col">
                <Outlet />
            </main>
        </div>
    );
}
