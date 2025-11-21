-- 1. Asegurar que el bucket 'comprobantes' exista y sea público
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes', 'comprobantes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Eliminar políticas anteriores para evitar conflictos (opcional pero recomendado si se re-ejecuta)
DROP POLICY IF EXISTS "Public Access Comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert Comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Comprobantes" ON storage.objects;

-- 3. Política para permitir ver archivos (SELECT) a cualquiera (público)
-- Necesario para que el admin pueda ver el comprobante y el usuario también
CREATE POLICY "Public Access Comprobantes"
ON storage.objects FOR SELECT
USING ( bucket_id = 'comprobantes' );

-- 4. Política para permitir subir archivos (INSERT) a usuarios autenticados
-- Permite a cualquier usuario logueado subir archivos a este bucket
CREATE POLICY "Authenticated Insert Comprobantes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'comprobantes' );

-- 5. Política para permitir actualizar/borrar (opcional, para admins o el mismo usuario)
CREATE POLICY "Authenticated Update Comprobantes"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'comprobantes' );
