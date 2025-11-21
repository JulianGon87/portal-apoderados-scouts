// Script para inspeccionar el esquema completo de Supabase
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspeccionarEsquema() {
    console.log('🔍 Inspeccionando esquema de Supabase...\n');

    // Tablas a inspeccionar
    const tablas = ['users', 'alumnos', 'pagos'];

    for (const tabla of tablas) {
        console.log(`\n📋 Tabla: ${tabla}`);
        console.log('─'.repeat(50));

        // Obtener una fila de ejemplo
        const { data, error } = await supabase
            .from(tabla)
            .select('*')
            .limit(1);

        if (error) {
            console.error(`❌ Error al leer ${tabla}:`, error.message);
            continue;
        }

        if (data && data.length > 0) {
            const columnas = Object.keys(data[0]);
            console.log(`Columnas (${columnas.length}):`);
            columnas.forEach(col => {
                const valor = data[0][col];
                const tipo = typeof valor;
                console.log(`  • ${col} (${tipo})`);
            });
        } else {
            console.log('  ⚠️  Tabla vacía');
        }

        // Contar registros
        const { count } = await supabase
            .from(tabla)
            .select('*', { count: 'exact', head: true });

        console.log(`\nTotal de registros: ${count}`);
    }

    console.log('\n✅ Inspección completada');
}

try {
    await inspeccionarEsquema();
} catch (error) {
    console.error(error);
    process.exit(1);
}
