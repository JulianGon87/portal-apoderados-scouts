-- Script para agregar la columna foto_url a la tabla users
-- Ejecutar en Supabase SQL Editor

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Comentario: Esta columna almacenará la URL pública de la foto de perfil del usuario
