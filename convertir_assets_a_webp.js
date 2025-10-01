// convertir_assets_a_webp.js
// Convierte todas las imágenes de la carpeta assets a formato .webp
// Requiere instalar sharp:  npm install sharp

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const INPUT_DIR = process.argv[2] || "assets"; // carpeta de entrada
const OUTPUT_DIR = process.argv[3] || "assets-webp"; // carpeta de salida

// extensiones válidas
const VALID_EXTS = new Set([
    ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".tif", ".avif"
]);

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function convertImage(file, outPath) {
    try {
        await sharp(file)
            .webp({ quality: 85 })
            .toFile(outPath);
        console.log(`✅ Convertido: ${path.basename(file)} → ${path.basename(outPath)}`);
    } catch (err) {
        console.error(`❌ Error con ${file}:`, err.message);
    }
}

function walk(dir, outDir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const full = path.join(dir, item);
        const outFull = path.join(outDir, item);
        const stat = fs.statSync(full);

        if (stat.isDirectory()) {
            // Crear subcarpeta en salida y seguir
            ensureDir(outFull);
            walk(full, outFull);
        } else {
            const ext = path.extname(item).toLowerCase();
            if (VALID_EXTS.has(ext)) {
                const base = path.basename(item, ext) + ".webp";
                const outFile = path.join(outDir, base);
                convertImage(full, outFile);
            } else {
                console.log(`⚠️ Omitido (no es imagen): ${item}`);
            }
        }
    }
}

(function main() {
    ensureDir(OUTPUT_DIR);
    walk(INPUT_DIR, OUTPUT_DIR);
    console.log(`\n🚀 Conversión iniciada desde: ${INPUT_DIR}`);
    console.log(`📂 Resultados en: ${OUTPUT_DIR}`);
})();