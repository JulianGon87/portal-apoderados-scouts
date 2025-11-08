// src/supabase/client.js
import { createClient } from '@supabase/supabase-js';

// 1. Lee las variables del archivo .env.local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Verifica que las claves existan
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Asegúrate de crear el archivo .env.local");
}

// 3. Exporta el cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 4. Exporta el modo de login (RUT)
export const identifierMode = 'rut';