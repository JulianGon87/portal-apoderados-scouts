-- Migración: Crear tabla tickets_pago
-- Fecha: 2025-11-20
-- Descripción: Tabla para gestionar los reportes de pago de los apoderados

CREATE TABLE IF NOT EXISTS tickets_pago (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    alumno_id UUID REFERENCES alumnos(id) ON DELETE CASCADE,
    tipo_item VARCHAR(50) NOT NULL, -- 'cuota_mensual', 'rifa', 'evento', etc.
    item_id BIGINT REFERENCES items_pago(id), -- Opcional, si se paga un item específico
    monto INTEGER NOT NULL,
    fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
    comprobante_url TEXT,
    estado VARCHAR(20) DEFAULT 'pendiente', -- 'pendiente', 'aprobado', 'rechazado'
    comentario_admin TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_tickets_alumno ON tickets_pago(alumno_id);
CREATE INDEX IF NOT EXISTS idx_tickets_estado ON tickets_pago(estado);

-- Comentarios
COMMENT ON TABLE tickets_pago IS 'Registro de intentos de pago reportados por apoderados';
COMMENT ON COLUMN tickets_pago.estado IS 'Estado del ticket: pendiente, aprobado, rechazado';
