import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function checkData() {
    console.log('🔍 Verificando estado de la base de datos...');

    const { count: pagosCount, error: e1 } = await supabase.from('pagos').select('*', { count: 'exact', head: true });
    const { count: ticketsCount, error: e2 } = await supabase.from('tickets_pago').select('*', { count: 'exact', head: true });
    const { count: itemsCount, error: e3 } = await supabase.from('items_pago').select('*', { count: 'exact', head: true });

    console.log(`📊 Pagos existentes: ${pagosCount} (Error: ${e1?.message || 'Ninguno'})`);
    console.log(`📊 Tickets existentes: ${ticketsCount} (Error: ${e2?.message || 'Ninguno'})`);
    console.log(`📊 Items de Cobro: ${itemsCount} (Error: ${e3?.message || 'Ninguno'})`);

    if (pagosCount > 0) {
        console.log('\n⚠️  ALERTA: Aún hay pagos en el sistema. Mostrando los primeros 3:');
        const { data: pagos } = await supabase.from('pagos').select('id, monto, estado, descripcion, item_id').limit(3);
        console.table(pagos);
    }
}

checkData();
