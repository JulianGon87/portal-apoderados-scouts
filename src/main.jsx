// src/main.jsx (Configurado para Foundation)

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'

// 1. Importar el CSS de Foundation
import 'foundation-sites/dist/css/foundation.min.css'

// 2. (Opcional) Si quieres los estilos de "flotación" de Foundation
// import 'foundation-sites/dist/css/foundation-float.min.css';

// 3. (Opcional) Si quieres los estilos "RTL" (Right-to-Left)
// import 'foundation-sites/dist/css/foundation-rtl.min.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* 4. Ya no necesitamos ChakraProvider */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)