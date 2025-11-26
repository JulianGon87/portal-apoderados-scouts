-- Script para agregar columna created_by a items_pago
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columna created_by (referencia a users con UUID)
ALTER TABLE items_pago 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- 2. (Opcional) Agregar índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_items_pago_created_by ON items_pago(created_by);

-- Comentario: Esta columna almacenará el UUID del usuario que creó el item de cobro
