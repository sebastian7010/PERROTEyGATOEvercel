// update-dog-products.js
const fs = require("fs");
const path = require("path");

// Archivos
const ROOT_JSON = path.join(__dirname, "products.json");
const DOG_JSON = path.join(__dirname, "perro", "products.json");

// IDs que queremos mover
const TARGET_IDS = new Set([1, 2, 3]);

try {
    // 1) Leemos el products.json general
    const raw = fs.readFileSync(ROOT_JSON, "utf8");
    const products = JSON.parse(raw);

    if (!Array.isArray(products)) {
        throw new Error("❌ El archivo raíz no es un array de productos.");
    }

    // 2) Filtramos por id
    const dogProducts = products.filter(
        p => TARGET_IDS.has(p.categoryId || p.idCategoria || p.id)
    );

    // 3) Guardamos en perro/products.json
    fs.writeFileSync(DOG_JSON, JSON.stringify(dogProducts, null, 2), "utf8");

    console.log(`✅ Guardados ${dogProducts.length} productos en ${DOG_JSON}`);
} catch (err) {
    console.error("❌ Error:", err.message);
}