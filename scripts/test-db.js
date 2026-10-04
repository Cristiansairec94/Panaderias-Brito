const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Leer variables desde .env.local o fallback a .env.example
let url = '';
let key = '';

function loadEnv(file) {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        url = trimmed.split('=')[1].trim();
      }
      if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
        key = trimmed.split('=')[1].trim();
      }
    });
  }
}

loadEnv('.env.local');
if (!url || !key) {
  loadEnv('.env.example');
}

if (!url || !key) {
  console.error('❌ Error: No se encontraron las variables NEXT_PUBLIC_SUPABASE_URL ni NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local');
  process.exit(1);
}

console.log('🥖 ==============================================================');
console.log('   PANADERÍAS BRITO - TEST DE CONEXIÓN A BASE DE DATOS');
console.log('   URL de Servidor Supabase:', url);
console.log('=================================================================\n');

const client = createClient(url, key);

const tables = [
  'categories',
  'branches',
  'products',
  'customers',
  'sales',
  'sale_items',
  'custom_orders',
  'cash_shifts',
  'cash_movements',
  'cash_expenses',
  'inventory_items',
  'inventory_movements'
];

async function run() {
  let successCount = 0;
  let errorCount = 0;

  console.log('1. Verificando disponibilidad de las 12 tablas:');
  for (const table of tables) {
    try {
      const { data, error } = await client.from(table).select('*').limit(1);
      if (error) {
        console.log(`   ❌ Tabla "${table}": Error (${error.code}) - ${error.message}`);
        errorCount++;
      } else {
        console.log(`   ✅ Tabla "${table}": Lista y conectada`);
        successCount++;
      }
    } catch (err) {
      console.log(`   ❌ Tabla "${table}": ${err.message}`);
      errorCount++;
    }
  }

  console.log('\n-----------------------------------------------------------------');
  console.log(`   Total Tablas: ${successCount} operativas de ${tables.length}`);
  console.log('-----------------------------------------------------------------\n');

  if (successCount === tables.length) {
    console.log('2. Probando permisos de LECTURA y ESCRITURA en tiempo real...');
    const testId = `test_ping_${Date.now()}`;
    const { error: insertErr } = await client.from('categories').insert({
      id: testId,
      name: 'Ping de Conexión',
      icon: '🥖'
    });

    if (insertErr) {
      console.log(`   ⚠️ Error de escritura: ${insertErr.message}`);
    } else {
      console.log('   ✅ Escritura exitosa (INSERT completado sin errores)');
      const { error: deleteErr } = await client.from('categories').delete().eq('id', testId);
      if (!deleteErr) {
        console.log('   ✅ Limpieza exitosa (DELETE completado)');
        console.log('\n🎉 ¡FELICIDADES! La base de datos está 100% vinculada y lista para producción.');
      }
    }
  } else {
    console.log('⚠️ Aún hay tablas pendientes. Ejecuta supabase/schema.sql en el SQL Editor de Supabase.');
  }
  console.log('\n=================================================================');
}

run();
