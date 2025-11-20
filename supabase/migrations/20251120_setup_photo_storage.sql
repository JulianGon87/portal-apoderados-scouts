-- 1. Agregar columna foto_url a la tabla alumnos
ALTER TABLE alumnos 
ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- 2. Configurar Storage para 'avatars'
-- Nota: Esto requiere que la extensión 'storage' esté habilitada (por defecto en Supabase)

-- Crear el bucket 'avatars' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de Seguridad para Storage (RLS)

-- Permitir acceso público para ver los avatares
CREATE POLICY "Avatares son públicos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Permitir a los usuarios autenticados subir avatares
CREATE POLICY "Usuarios autenticados pueden subir avatares"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- Permitir a los usuarios actualizar sus propios avatares (o cualquiera si es admin/apoderado por ahora simplificado)
CREATE POLICY "Usuarios pueden actualizar avatares"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- Permitir borrar (opcional, por si quieren cambiarla)
CREATE POLICY "Usuarios pueden borrar avatares"
ON storage.objects FOR DELETE
USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );
