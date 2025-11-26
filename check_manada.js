import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://jrghwpvmoafiruoxelxd.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ2h3cHZtb2FmaXJ1b3hlbHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MDg4MjMsImV4cCI6MjA3ODE4NDgyM30.XRPkFMxgpPg_HDHG6fyu9V42jhnQAYpR_i64Chsrl7g";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

let output = '';
const log = (msg) => {
    console.log(msg);
    output += msg + '\n';
};

async function checkItems2025() {
    const currentYear = 2025;

    log('='.repeat(80));
    log(`ITEMS DE COBRO PARA EL AÑO ${currentYear} (Como los ve la app)`);
    log('='.repeat(80));

    // Obtener items del año actual (como lo hace StudentProfilePage)
    const { data: items, error } = await supabase
        .from('items_pago')
        .select('*')
        .eq('anio', currentYear)
        .order('seccion', { ascending: true });

    if (error) {
        log('ERROR: ' + JSON.stringify(error));
        return;
    }

    log(`\nTotal de items para ${currentYear}: ${items.length}\n`);

    // Agrupar por sección
    const porSeccion = {};
    items.forEach(item => {
        const seccion = item.seccion || 'GENERAL (Todas las secciones)';
        if (!porSeccion[seccion]) porSeccion[seccion] = [];
        porSeccion[seccion].push(item);
    });

    log('DISTRIBUCIÓN POR SECCIÓN:');
    log('-'.repeat(80));
    Object.entries(porSeccion).forEach(([seccion, lista]) => {
        log(`${seccion}: ${lista.length} items`);
    });

    // Simular lo que ve un alumno de MANADA
    log('\n' + '='.repeat(80));
    log('ITEMS APLICABLES A UN ALUMNO DE MANADA (Simulación)');
    log('='.repeat(80));

    const applicableToManada = items.filter(item =>
        !item.seccion || item.seccion === 'MANADA'
    );

    log(`\nItems que vería un alumno de MANADA: ${applicableToManada.length}`);

    const cuotasMensuales = applicableToManada.filter(i => i.tipo_item === 'cuota_mensual');
    const otrosItems = applicableToManada.filter(i => i.tipo_item !== 'cuota_mensual');

    log(`  - Cuotas mensuales: ${cuotasMensuales.length}`);
    log(`  - Otros items: ${otrosItems.length}`);

    if (cuotasMensuales.length > 0) {
        log('\nCUOTAS MENSUALES:');
        cuotasMensuales.forEach(c => {
            log(`  [Mes ${c.mes}] ${c.descripcion} - $${c.monto} (Sección: ${c.seccion || 'General'})`);
        });
    } else {
        log('\n⚠️ NO HAY CUOTAS MENSUALES ASIGNADAS PARA MANADA EN 2025');
    }

    if (otrosItems.length > 0) {
        log('\nOTROS ITEMS:');
        otrosItems.forEach(item => {
            log(`  [${item.tipo_item}] ${item.descripcion} - $${item.monto} (Sección: ${item.seccion || 'General'})`);
        });
    }

    // Detalle completo
    log('\n' + '='.repeat(80));
    log('DETALLE COMPLETO POR SECCIÓN');
    log('='.repeat(80));

    Object.entries(porSeccion).forEach(([seccion, lista]) => {
        log(`\n${'▼'.repeat(40)}`);
        log(`${seccion.toUpperCase()}`);
        log('▼'.repeat(40));

        lista.forEach(item => {
            log(`\n[ID: ${item.id}] ${item.tipo_item.toUpperCase()}`);
            log(`  Descripción: ${item.descripcion}`);
            log(`  Monto: $${item.monto.toLocaleString('es-CL')}`);
            log(`  Mes: ${item.mes || 'N/A'}`);
            log(`  Vencimiento: ${item.fecha_vencimiento || 'No definido'}`);
        });
    });

    fs.writeFileSync('reporte_2025.txt', output);
    log('\n' + '='.repeat(80));
    log('✅ Reporte guardado en: reporte_2025.txt');
    log('='.repeat(80));
}

checkItems2025();
