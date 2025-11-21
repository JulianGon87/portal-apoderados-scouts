-- Migración: Agregar columna seccion a tabla alumnos
-- Fecha: 2025-11-20
-- Descripción: Agrega la columna seccion a la tabla alumnos para filtrar items de cobro

-- Agregar columna seccion
ALTER TABLE alumnos 
ADD COLUMN IF NOT EXISTS seccion VARCHAR(20);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_alumnos_seccion ON alumnos(seccion);

-- Comentario para documentación
COMMENT ON COLUMN alumnos.seccion IS 'Sección del alumno: manada, tropa, compañia, comunidad';
