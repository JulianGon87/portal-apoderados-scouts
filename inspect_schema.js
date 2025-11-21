import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log("🔍 Inspecting 'users' table...");
    const { data, error } = await supabase.from('users').select('*').limit(1);

    if (error) {
        console.error("❌ Error:", error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log("⚠️ Table is empty, cannot infer columns from data.");
        return;
    }

    console.log("📋 Columns found:");
    console.log(Object.keys(data[0]).join('\n'));
}

try {
    await inspect();
} catch (error) {
    console.error(error);
    process.exit(1);
}
