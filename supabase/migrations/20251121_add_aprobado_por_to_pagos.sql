-- Agregar campos de auditoría a la tabla pagos
-- Esto permite rastrear quién aprobó cada pago y cuándo

-- Agregar columna aprobado_por para auditoría
ALTER TABLE pagos 
ADD COLUMN IF NOT EXISTS aprobado_por UUID REFERENCES auth.users(id);

-- Agregar columna fecha_aprobacion
ALTER TABLE pagos 
ADD COLUMN IF NOT EXISTS fecha_aprobacion TIMESTAMP WITH TIME ZONE;

-- Crear índice para consultas de auditoría
CREATE INDEX IF NOT EXISTS idx_pagos_aprobado_por ON pagos(aprobado_por);

-- Comentarios para documentación
COMMENT ON COLUMN pagos.aprobado_por IS 'ID del usuario que aprobó el pago';
COMMENT ON COLUMN pagos.fecha_aprobacion IS 'Fecha y hora en que se aprobó el pago';
