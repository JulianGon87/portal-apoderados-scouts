-- Habilitar RLS en la tabla tickets_pago
ALTER TABLE tickets_pago ENABLE ROW LEVEL SECURITY;

-- Política 1: Permitir a usuarios autenticados INSERTAR tickets
-- (Cualquier usuario logueado puede crear un ticket)
CREATE POLICY "Permitir insertar a usuarios autenticados"
ON tickets_pago FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política 2: Permitir a usuarios autenticados VER tickets
-- (Idealmente filtraríamos por alumno, pero para MVP permitimos ver si están autenticados)
CREATE POLICY "Permitir ver a usuarios autenticados"
ON tickets_pago FOR SELECT
TO authenticated
USING (true);

-- Política 3: Permitir a usuarios autenticados ACTUALIZAR tickets
-- (Necesario para que los admins aprueben/rechacen)
CREATE POLICY "Permitir actualizar a usuarios autenticados"
ON tickets_pago FOR UPDATE
TO authenticated
USING (true);

-- Política 4: Permitir acceso al bucket de comprobantes (Storage)
-- Esto es necesario si el error viniera del storage, pero el error reportado es de la tabla.
-- Dejamos esto como recordatorio, pero se configura en la UI de Storage normalmente.
