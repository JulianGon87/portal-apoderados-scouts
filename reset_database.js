import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno manualmente desde .env.local
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: No se encontraron las credenciales de Supabase en .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetDatabase() {
    console.log('🧹 Iniciando limpieza de base de datos...');

    // 1. Eliminar Tickets de Pago
    console.log('🗑️  Eliminando tickets_pago...');
    const { error: ticketsError } = await supabase
        .from('tickets_pago')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (ticketsError) console.error('   ❌ Error al borrar tickets:', ticketsError.message);
    else console.log('   ✅ Tickets eliminados.');

    // 2. Eliminar Pagos
    console.log('🗑️  Eliminando pagos...');
    let { error: pagosError } = await supabase
        .from('pagos')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (pagosError) console.error('   ❌ Error al borrar pagos:', pagosError.message);
    else console.log('   ✅ Pagos eliminados.');

    // 3. Eliminar Items de Pago (Cobros/Cuotas)
    console.log('🗑️  Eliminando items_pago...');
    let { error: itemsError } = await supabase
        .from('items_pago')
        .delete()
        .neq('id', 0); // Confirmado que es BigInt

    if (itemsError) console.error('   ❌ Error al borrar items:', itemsError.message);
    else console.log('   ✅ Items eliminados.');

    // 4. Limpiar Storage (Comprobantes)
    console.log('🗑️  Limpiando bucket de comprobantes...');
    const { data: files, error: listError } = await supabase
        .storage
        .from('comprobantes')
        .list();

    if (listError) {
        console.error('   ❌ Error al listar archivos:', listError.message);
    } else if (files && files.length > 0) {
        const filesToRemove = files.map(x => x.name);
        const { error: removeError } = await supabase
            .storage
            .from('comprobantes')
            .remove(filesToRemove);

        if (removeError) console.error('   ❌ Error al eliminar archivos:', removeError.message);
        else console.log(`   ✅ Se eliminaron ${files.length} archivos del storage.`);
    } else {
        console.log('   ℹ️  No hay archivos para eliminar.');
    }

    console.log('\n✨ Proceso finalizado.');
}

resetDatabase();
