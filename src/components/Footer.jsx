import React from 'react';

const Footer = ({ className = '', dark = false }) => {
    return (
        <footer className={`w-full text-center py-6 ${className}`}>
            <p
                className={`text-sm font-medium transition-colors cursor-default flex items-center justify-center gap-1
          ${dark ? 'text-gray-400 hover:text-scout-blue' : 'text-white/90 hover:text-white drop-shadow-md'}
        `}
            >
                Desarrollado con <span className="animate-pulse">⚜️</span> por Julián González
            </p>
        </footer>
    );
};

export default Footer;
