// save-cat-products.js
import fs from "fs";
import path from "path";

// rutas de los archivos
const rootProductsPath = path.resolve("./products.json"); // archivo general
const gatoProductsPath = path.resolve("./gato/products.json"); // destino dentro de carpeta gato

// categorías de gatos
const catCategoryIds = [5, 6, 7];

try {
    // leer archivo raíz
    const data = fs.readFileSync(rootProductsPath, "utf8");
    let products = JSON.parse(data);

    if (!Array.isArray(products)) {
        throw new Error("El archivo raíz no es un array de productos");
    }

    // filtrar productos por categoría
    const catProducts = products.filter(p => catCategoryIds.includes(Number(p.categoryId)));

    // crear carpeta gato si no existe
    const dir = path.dirname(gatoProductsPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // guardar productos filtrados
    fs.writeFileSync(gatoProductsPath, JSON.stringify(catProducts, null, 2), "utf8");

    console.log(`✅ Se exportaron ${catProducts.length} productos a ${gatoProductsPath}`);
} catch (err) {
    console.error("❌ Error procesando productos:", err.message);
}