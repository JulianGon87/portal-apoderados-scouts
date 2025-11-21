-- Migración: Renombrar columna role a rol en tabla users
-- Fecha: 2025-11-20
-- Descripción: Estandariza el nombre de la columna de rol a español

-- 1. Renombrar columna role a rol en tabla users
ALTER TABLE users 
RENAME COLUMN role TO rol;

-- 2. Actualizar índice
DROP INDEX IF EXISTS idx_users_role;
CREATE INDEX IF NOT EXISTS idx_users_rol ON users(rol);
