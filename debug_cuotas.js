import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://jrghwpvmoafiruoxelxd.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ2h3cHZtb2FmaXJ1b3hlbHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MDg4MjMsImV4cCI6MjA3ODE4NDgyM30.XRPkFMxgpPg_HDHG6fyu9V42jhnQAYpR_i64Chsrl7g";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugCuotasMensuales() {
    console.log('='.repeat(80));
    console.log('DEBUG: CUOTAS MENSUALES PARA MANADA');
    console.log('='.repeat(80));

    const currentYear = 2025;

    // 1. Obtener TODAS las cuotas mensuales (sin filtro de sección)
    const { data: todasCuotas, error } = await supabase
        .from('items_pago')
        .select('*')
        .eq('tipo_item', 'cuota_mensual')
        .eq('anio', currentYear);

    if (error) {
        console.error('ERROR:', error);
        return;
    }

    console.log(`\nTotal de cuotas mensuales en ${currentYear}: ${todasCuotas.length}\n`);

    if (todasCuotas.length === 0) {
        console.log('⚠️ NO HAY CUOTAS MENSUALES CREADAS PARA 2025');
        return;
    }

    // Mostrar detalle de cada cuota
    todasCuotas.forEach(cuota => {
        console.log(`[ID: ${cuota.id}]`);
        console.log(`  Descripción: ${cuota.descripcion}`);
        console.log(`  Mes: ${cuota.mes}`);
        console.log(`  Sección: "${cuota.seccion}" (tipo: ${typeof cuota.seccion})`);
        console.log(`  Monto: $${cuota.monto}`);
        console.log('');
    });

    // 2. Obtener un alumno de MANADA para simular
    const { data: alumno } = await supabase
        .from('alumnos')
        .select('*')
        .eq('slug', 'isidora-sofia')
        .single();

    if (alumno) {
        console.log('='.repeat(80));
        console.log('SIMULACIÓN: Items que vería Isidora Sofia');
        console.log('='.repeat(80));
        console.log(`Sección del alumno: "${alumno.seccion}" (tipo: ${typeof alumno.seccion})\n`);

        // Simular el filtro que hace la app
        const applicableItems = todasCuotas.filter(item =>
            !item.seccion || item.seccion.toUpperCase() === (alumno.seccion || '').toUpperCase()
        );

        console.log(`Items aplicables (con fix case-insensitive): ${applicableItems.length}`);
        applicableItems.forEach(item => {
            console.log(`  - Mes ${item.mes}: ${item.descripcion}`);
        });

        // Probar SIN el fix (como estaba antes)
        const applicableItemsOld = todasCuotas.filter(item =>
            !item.seccion || item.seccion === alumno.seccion
        );

        console.log(`\nItems aplicables (SIN fix, comparación exacta): ${applicableItemsOld.length}`);
        applicableItemsOld.forEach(item => {
            console.log(`  - Mes ${item.mes}: ${item.descripcion}`);
        });
    }
}

debugCuotasMensuales();
