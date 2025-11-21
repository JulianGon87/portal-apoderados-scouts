import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Usamos anon key, debería bastar si hay RLS pública o si tengo usuario

if (!supabaseUrl || !supabaseKey) {
    console.error('Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectPagos() {
    console.log('🔍 Inspeccionando tabla pagos...');

    // Intentamos leer un registro para ver las claves
    const { data, error } = await supabase
        .from('pagos')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log('✅ Columnas encontradas:', Object.keys(data[0]));
    } else {
        console.log('⚠️ Tabla vacía, no se pueden inferir columnas por datos.');
        // Si está vacía, intentamos insertar algo dummy para ver si falla por columnas inexistentes
        // O mejor, asumimos que si está vacía, el usuario puede borrarla y recrearla bien.
    }
}

try {
    await inspectPagos();
} catch (error) {
    console.error(error);
    process.exit(1);
}
