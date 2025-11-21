-- Agregar columna fecha_pago a la tabla pagos si no existe
ALTER TABLE pagos 
ADD COLUMN IF NOT EXISTS fecha_pago DATE DEFAULT CURRENT_DATE;

-- Asegurar que otras columnas necesarias existan también
ALTER TABLE pagos 
ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50),
ADD COLUMN IF NOT EXISTS comprobante_url TEXT;
