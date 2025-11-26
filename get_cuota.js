import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://jrghwpvmoafiruoxelxd.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ2h3cHZtb2FmaXJ1b3hlbHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MDg4MjMsImV4cCI6MjA3ODE4NDgyM30.XRPkFMxgpPg_HDHG6fyu9V42jhnQAYpR_i64Chsrl7g";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getCuotaMensual() {
    const { data, error } = await supabase
        .from('items_pago')
        .select('*')
        .eq('tipo_item', 'cuota_mensual')
        .eq('anio', 2025);

    if (error) {
        console.error('ERROR:', error);
        return;
    }

    const output = JSON.stringify(data, null, 2);
    console.log(output);
    fs.writeFileSync('cuota_mensual.json', output);
    console.log('\n✅ Guardado en cuota_mensual.json');
}

getCuotaMensual();
