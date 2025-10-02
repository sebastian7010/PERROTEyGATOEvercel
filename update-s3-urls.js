// update-s3-urls.js
import fs from "fs";

const BUCKET_URL = "https://perrote-gatote-images.s3.us-east-2.amazonaws.com/";

// Cargar productos.json
const products = JSON.parse(fs.readFileSync("products.json", "utf8"));

// Reemplazar rutas
products.forEach(product => {
    if (product.url && product.url.startsWith("imagenes-webp/")) {
        product.url = BUCKET_URL + product.url;
    }

    if (Array.isArray(product.imagenes)) {
        product.imagenes = product.imagenes.map(img => {
            if (img.startsWith("imagenes-webp/")) {
                return BUCKET_URL + img;
            }
            return img;
        });
    }
});

// Guardar archivo actualizado
fs.writeFileSync("products.json", JSON.stringify(products, null, 2), "utf8");

console.log("✅ URLs actualizadas con la ruta del bucket S3");