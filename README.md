# Portal de Apoderados - Grupo Scout

Aplicación web para la gestión de apoderados, alumnos y pagos del Grupo Scout. Permite a los apoderados visualizar la información de sus hijos, estado de pagos y deudas.

## 🚀 Tecnologías

- **Frontend:** React (Vite)
- **Estilos:** Tailwind CSS v4 (Migrado desde Foundation)
- **Backend & Auth:** Supabase
- **Iconos:** Lucide React
- **Fuentes:** Inter y Outfit (Google Fonts)

## 🛠️ Instalación y Configuración

1.  **Clonar el repositorio:**
    ```bash
    git clone <url-del-repo>
    cd portal-apoderados
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno:**
    Crea un archivo `.env.local` en la raíz con tus credenciales de Supabase:
    ```env
    VITE_SUPABASE_URL=tu_url_de_supabase
    VITE_SUPABASE_ANON_KEY=tu_clave_anonima
    ```

4.  **Ejecutar en desarrollo:**
    ```bash
    npm run dev
    ```

## 📂 Scripts de Importación (Backend)

Ubicados en la carpeta `../Scrip-Importacion/`:

*   **`importar_datos.js`**: Lee el Excel `DatosScoutV66.xlsx` e importa apoderados, alumnos y pagos a Supabase. Genera usuarios con RUT temporal si es necesario y sincroniza con Supabase Auth.
    *   *Ejecución:* `node Scrip-Importacion/importar_datos.js`
*   **`limpiar_basura.js`**: Elimina usuarios de prueba o mal formados (RUTs que empiezan con `100000`) tanto de la base de datos como de Authentication.
    *   *Ejecución:* `node Scrip-Importacion/limpiar_basura.js`

## 🏗️ Estructura del Proyecto

```
src/
├── components/      # Componentes reutilizables (Layout, Footer, AlumnoCard)
├── pages/           # Vistas principales (LoginPage, HomePage)
├── supabase/        # Cliente de conexión a Supabase
├── utils/           # Funciones de utilidad (rut.js)
├── App.jsx          # Configuración de rutas
└── index.css        # Configuración global de Tailwind
```

## ✨ Características Principales

*   **Login Seguro:** Autenticación vía RUT y contraseña.
*   **Gestión de Pagos:** Visualización clara de cuotas pagadas, pendientes y futuras (Marzo - Diciembre).
*   **Diseño Moderno:** Interfaz limpia y responsiva con Tailwind CSS.
*   **Validación de RUT:** Algoritmo de validación chileno (Módulo 11).
