// filter-dogs.js
const fs = require("fs");

// Archivo de entrada y salida
const INPUT = "products.json";
const OUTPUT = "dog.json";

// IDs de categorías que queremos (1,2,3)
const TARGET_IDS = new Set([1, 2, 3]);

try {
    const raw = fs.readFileSync(INPUT, "utf8");
    const products = JSON.parse(raw);

    if (!Array.isArray(products)) {
        throw new Error("❌ El JSON no es un array de productos.");
    }

    // Filtramos
    const dogs = products.filter(p => TARGET_IDS.has(p.categoryId || p.idCategoria || p.id));

    // Guardamos
    fs.writeFileSync(OUTPUT, JSON.stringify(dogs, null, 2), "utf8");

    console.log(`✅ Se guardaron ${dogs.length} productos en ${OUTPUT}`);
} catch (err) {
    console.error("❌ Error:", err.message);
}