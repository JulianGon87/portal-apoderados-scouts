import React from 'react';
import PropTypes from 'prop-types';
import { Home, User, Settings } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const BottomNavigation = ({
    onHomeClick,
    onProfileClick,
    onAdminClick,
    isAdmin
}) => {
    const location = useLocation();
    const isHome = location.pathname === '/home';

    const NavItem = ({ icon: Icon, label, onClick, isActive, className = '' }) => (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center w-full py-2 transition-colors duration-200 ${isActive
                ? 'text-scout-green bg-green-50/50'
                : 'text-stone-500 hover:text-scout-green hover:bg-stone-50'
                } ${className}`}
        >
            <Icon
                size={24}
                strokeWidth={isActive ? 2.5 : 2}
                className={`mb-1 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
            />
            <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                {label}
            </span>
        </button>
    );

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] lg:hidden pb-safe">
            <div className="flex justify-around items-center h-16 max-w-md mx-auto">
                <NavItem
                    icon={Home}
                    label="Inicio"
                    onClick={onHomeClick}
                    isActive={isHome}
                />

                <NavItem
                    icon={User}
                    label="Perfil"
                    onClick={onProfileClick}
                    isActive={false} // Modal action, not a route
                />



                {isAdmin && (
                    <NavItem
                        icon={Settings}
                        label="Admin"
                        onClick={onAdminClick}
                        isActive={location.pathname.startsWith('/admin')}
                    />
                )}
            </div>
        </div>
    );
};

BottomNavigation.propTypes = {
    onHomeClick: PropTypes.func.isRequired,
    onProfileClick: PropTypes.func.isRequired,
    onAdminClick: PropTypes.func.isRequired,
    isAdmin: PropTypes.bool
};

export default BottomNavigation;
