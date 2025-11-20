-- Insertar logros de ejemplo para los alumnos de los apoderados especificados
-- RUTs: 16484292-4 y 17141068-1

-- 1. Promesa Scout (Para todos los alumnos de estos apoderados)
INSERT INTO logros_alumno (alumno_id, titulo, descripcion, fecha_obtencion, categoria, icono)
SELECT id, 'Promesa Scout', 'Ha realizado su promesa scout ante la unidad, comprometiéndose con los valores del movimiento.', '2024-04-15', 'adelanto', '⚜️'
FROM alumnos
WHERE apoderado_id IN (SELECT id FROM users WHERE rut IN ('164842924', '171410681'));

-- 2. Especialidad de Primeros Auxilios (Solo para el primer alumno encontrado de cada uno, para variar)
INSERT INTO logros_alumno (alumno_id, titulo, descripcion, fecha_obtencion, categoria, icono)
SELECT id, 'Primeros Auxilios Nivel 1', 'Aprobado el curso básico de primeros auxilios y RCP.', '2024-06-20', 'especialidad', '⛑️'
FROM alumnos
WHERE apoderado_id IN (SELECT id FROM users WHERE rut IN ('164842924', '171410681'));

-- 3. Campamento de Verano (Evento)
INSERT INTO logros_alumno (alumno_id, titulo, descripcion, fecha_obtencion, categoria, icono)
SELECT id, 'Campamento de Verano 2024', 'Participación completa en el campamento de verano en Picarquín.', '2024-01-15', 'evento', '⛺'
FROM alumnos
WHERE apoderado_id IN (SELECT id FROM users WHERE rut IN ('164842924', '171410681'));

-- 4. Espíritu Scout (Reconocimiento)
INSERT INTO logros_alumno (alumno_id, titulo, descripcion, fecha_obtencion, categoria, icono)
SELECT id, 'Espíritu Scout', 'Reconocimiento por su constante alegría y disposición a ayudar a los demás.', '2024-08-10', 'general', '🔥'
FROM alumnos
WHERE apoderado_id IN (SELECT id FROM users WHERE rut = '164842924'); -- Solo para uno para diferenciar
