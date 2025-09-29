// transform-products.js
// Convierte cada item agregando: categoryId y "categoria producto".
// Conserva TODOS los campos originales.

const fs = require('fs');

// === 1) Configura el mapeo de categoría -> id (ajústalo a tus IDs reales) ===
const CAT_MAP = {
    // Equinos / suplementos
    'suplementos': 9,
    'equinos': 9,
    'caballos': 9,

    // Bovinos
    'bovinos': 10,
    'vacas': 10,

    // Aves
    'aves': 11,
    'pájaros': 11,
    'pajaros': 11,

    // Terneros
    'terneros': 12,
};

// === 2) Carga el JSON de entrada ===
const INPUT_FILE = './products.json'; // cambia si tu archivo se llama distinto
const OUTPUT_FILE = './products_transformed.json';

function readJson(path) {
    const raw = fs.readFileSync(path, 'utf8');
    const data = JSON.parse(raw);
    // Si viene envuelto en una clave (p.ej. { productos: [...] }), intenta detectarlo:
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.productos)) return data.productos;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.data)) return data.data;
    throw new Error('No se encontró un array de productos en el JSON.');
}

// === 3) Transforma cada producto ===
function toCategoryId(categoria) {
    const key = String(categoria || '').trim().toLowerCase();
    return CAT_MAP[key] != null ? CAT_MAP[key] : 1; // 1 = fallback
}

function transformItem(p) {
    // clon superficial para conservar todos los campos originales
    const out = {...p };

    // agrega/normaliza "categoria producto"
    const catTexto = (p.categoria != null ? p.categoria : p['categoria producto']);
    out['categoria producto'] = catTexto != null ? catTexto : '';

    // agrega categoryId segun el mapeo
    out.categoryId = toCategoryId(catTexto);

    return out;
}

// === 4) Ejecuta ===
try {
    const list = readJson(INPUT_FILE);
    const transformed = list.map(transformItem);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(transformed, null, 2), 'utf8');
    console.log(`OK ✅  ${transformed.length} productos -> ${OUTPUT_FILE}`);
} catch (err) {
    console.error('Error ❌', err.message);
    process.exit(1);
}