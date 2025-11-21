-- 1. Agregar columna item_id a la tabla pagos si no existe
ALTER TABLE pagos 
ADD COLUMN IF NOT EXISTS item_id BIGINT REFERENCES items_pago(id);

-- 2. Habilitar RLS en la tabla pagos
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

-- 3. Política para permitir INSERTAR pagos a usuarios autenticados (Admins)
CREATE POLICY "Permitir insertar pagos a usuarios autenticados"
ON pagos FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Política para permitir VER pagos a usuarios autenticados
-- (Para que se vean en el perfil del alumno y en admin)
CREATE POLICY "Permitir ver pagos a usuarios autenticados"
ON pagos FOR SELECT
TO authenticated
USING (true);

-- 5. Política para permitir ACTUALIZAR pagos (opcional, por si se requiere editar)
CREATE POLICY "Permitir actualizar pagos a usuarios autenticados"
ON pagos FOR UPDATE
TO authenticated
USING (true);
