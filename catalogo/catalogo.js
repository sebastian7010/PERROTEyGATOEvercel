// Importar Fuse.js (versión ES Module)
import Fuse from 'https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.esm.js';
// Importar categorías desde el módulo externo (si no las usas, puedes borrar esta línea)
import { categories } from './categories.js';

/* =========================
   Estado global / constantes
   ========================= */
let cart = {}; // carrito (clave: id, valor: cantidad)
let products = []; // productos normalizados para la UI
let filteredProducts = []; // productos filtrados (búsqueda/categoría)
let fuse = null; // instancia Fuse para búsqueda
const productsPerPage = 16;
let currentPage = 1;

const fuseOptions = { keys: ['name', 'description'], threshold: 0.4 };

/* ===========================================================
   Normaliza tu JSON (precio/url/imagenes/nombre/...) al esquema
   interno que la UI espera (price/image/gallery/name/...)
   (sin optional chaining ni nullish para máxima compatibilidad)
   =========================================================== */
function normalizeProduct(p, idx) {
    // name
    var name = (p && p.nombre) ? p.nombre : (p && p.name) ? p.name : 'Producto';

    // price -> número
    var rawPrice = (p && p.precio !== undefined) ? p.precio :
        (p && p.price !== undefined) ? p.price :
        0;
    var price = Number(rawPrice) || 0;

    // image principal
    var image = (p && p.url) ? p.url :
        (p && p.image) ? p.image :
        (p && p.imagenes && Array.isArray(p.imagenes) && p.imagenes.length ? p.imagenes[0] : '');

    // gallery
    var gallery = [];
    if (p && p.imagenes && Array.isArray(p.imagenes) && p.imagenes.length) {
        gallery = p.imagenes.slice();
    } else if (p && p.gallery && Array.isArray(p.gallery) && p.gallery.length) {
        gallery = p.gallery.slice();
    } else if (image) {
        gallery = [image];
    }

    // descripción + extras (marca / referencia)
    var baseDesc = (p && p.descripcion) ? p.descripcion :
        (p && p.description) ? p.description :
        '';
    var extras = [];
    if (p && p.marca) extras.push('Marca: ' + p.marca);
    if (p && p.referencia) extras.push('Ref: ' + p.referencia);
    var description = extras.length ? [baseDesc, extras.join(' · ')].filter(Boolean).join('\n') : baseDesc;

    // id estable si no viene
    var id = (p && p.id !== undefined) ? p.id : (900000 + (idx || 0));

    // categoryId
    var categoryId = (p && p.categoryId !== undefined) ? Number(p.categoryId) : 11;

    return { id: id, name: name, price: price, image: image, gallery: gallery, description: description, categoryId: categoryId };
}

/* ==========================================
   Render de cards de productos (con fragment)
   ========================================== */
function renderProducts(productsToRender) {
    const productGrid = document.getElementById("product-grid");
    productGrid.innerHTML = "";

    if (!productsToRender || productsToRender.length === 0) {
        productGrid.innerHTML = "<p>No se encontraron productos.</p>";
        return;
    }

    const fragment = document.createDocumentFragment();

    productsToRender.forEach(function(product) {
        const priceNum = Number(product.price || 0);
        const safeImage = product.image || '';
        const safeName = product.name || 'Producto';
        const gallery = Array.isArray(product.gallery) && product.gallery.length ? product.gallery : (safeImage ? [safeImage] : []);

        const card = document.createElement("div");
        card.classList.add("product-card");
        card.innerHTML = `
      <img src="${safeImage}" alt="${safeName}" class="product-image"
           loading="lazy" width="300" height="300"
           data-gallery='${JSON.stringify(gallery)}'>
      <div class="product-details">
        <h3>${safeName}</h3>
        <p>$${priceNum.toLocaleString('es-CO')}</p>
        <p>${product.description ? product.description : ''}</p>
        <div class="quantity-controls">
          <button class="quantity-btn minus" data-id="${product.id}">-</button>
          <span id="quantity-${product.id}">0</span>
          <button class="quantity-btn plus" data-id="${product.id}">+</button>
        </div>
        <button class="buy-btn" onclick="handleSingleBuyClick(${JSON.stringify(product.id)}, ${JSON.stringify(safeName)}, ${priceNum})">Comprar</button>
      </div>
    `;
        fragment.appendChild(card);
    });

    productGrid.appendChild(fragment);

    assignImageClickEvents();
    attachQuantityButtons();
}

/* ==============================
   Cargar productos (products.json)
   ============================== */
async function loadProducts() {
    try {
        const response = await fetch('./products.json');
        if (!response.ok) throw new Error('Error al cargar products.json: ' + response.status);

        const raw = await response.json();

        // Acepta arreglo directo o { productos: [...] } / { items: [...] } / { data: [...] }
        const list = Array.isArray(raw) ? raw :
            (raw && Array.isArray(raw.productos)) ? raw.productos :
            (raw && Array.isArray(raw.items)) ? raw.items :
            (raw && Array.isArray(raw.data)) ? raw.data : [];

        products = list.map(function(p, i) { return normalizeProduct(p, i); });

        if (typeof Fuse !== 'undefined') {
            fuse = new Fuse(products, fuseOptions);
        }

        filteredProducts = products.slice();
        renderPage();
    } catch (error) {
        console.error("Error al cargar los productos:", error);
    }
}

/* ===========================
   Paginación / render de página
   =========================== */
function renderPage() {
    const start = (currentPage - 1) * productsPerPage;
    const end = start + productsPerPage;
    const productsToRender = filteredProducts.slice(start, end);
    renderProducts(productsToRender);

    const currentEl = document.getElementById("current-page");
    const prevBtn = document.getElementById("prev-page");
    const nextBtn = document.getElementById("next-page");

    if (currentEl) currentEl.textContent = String(currentPage);
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = end >= filteredProducts.length;
}

/* ======================
   Búsqueda en tiempo real
   ====================== */
function initializeSearch() {
    const searchInput = document.getElementById("search-input");
    if (!searchInput) return;

    searchInput.addEventListener("input", function() {
        const query = searchInput.value.trim();
        if (!query) {
            filteredProducts = products.slice();
        } else if (fuse) {
            const results = fuse.search(query);
            filteredProducts = results.map(function(r) { return r.item; });
        } else {
            // fallback por si no carga Fuse
            filteredProducts = products.filter(function(p) {
                return (p.name && p.name.toLowerCase().includes(query.toLowerCase())) ||
                    (p.description && p.description.toLowerCase().includes(query.toLowerCase()));
            });
        }
        currentPage = 1;
        renderPage();
    });
}

/* ==========================
   Filtro por categoría (select)
   ========================== */
function initializeCategoryFilter() {
    const categorySelect = document.getElementById("category-select");
    if (!categorySelect) return;

    categorySelect.addEventListener("change", function() {
        const selected = categorySelect.value;
        if (selected === "all") {
            filteredProducts = products.slice();
        } else {
            filteredProducts = products.filter(function(product) {
                return String(product.categoryId) === String(selected);
            });
        }
        currentPage = 1;
        renderPage();
    });
}

/* =======================
   Botones de paginación UI
   ======================= */
document.addEventListener("DOMContentLoaded", function() {
    const prev = document.getElementById("prev-page");
    const next = document.getElementById("next-page");
    if (prev) prev.addEventListener("click", function() {
        if (currentPage > 1) {
            currentPage--;
            renderPage();
        }
    });
    if (next) next.addEventListener("click", function() {
        if (currentPage * productsPerPage < filteredProducts.length) {
            currentPage++;
            renderPage();
        }
    });
});




/** LAZY LOADING SUPER OPTIMIZADO **/
function lazyLoadImages() {
    const imgs = document.querySelectorAll("img.lazy-img");

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            const img = entry.target;
            const realSrc = img.dataset.src;

            if (realSrc) {
                img.src = realSrc;
            }

            img.onload = () => img.classList.add("loaded");

            obs.unobserve(img);
        });
    }, { threshold: 0.1 });

    imgs.forEach(img => observer.observe(img));
}


/* ======================
   Compra rápida por WhatsApp
   ====================== */
function handleSingleBuyClick(id, name, price) {
    const priceNum = Number(price || 0);
    const message = `Hola, estoy interesado en comprar el producto: ${name} (ID: ${id}). Precio: $${priceNum.toLocaleString('es-CO')}`;
    const phone = "573005318412";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}
window.handleSingleBuyClick = handleSingleBuyClick;

/* ===========================
   Carrito flotante: utilidades
   =========================== */
function updateFloatingCart(productId, change) {
    productId = String(productId);
    if (!cart[productId]) cart[productId] = 0;
    cart[productId] += change;
    if (cart[productId] < 0) cart[productId] = 0;
    updateCartDisplay();
}

function updateCartDisplay() {
    let total = 0;
    for (const id in cart) total += cart[id];
    const cartCountElem = document.getElementById("cart-count");
    if (cartCountElem) {
        cartCountElem.textContent = String(total);
        cartCountElem.style.display = total > 0 ? "flex" : "none";
    }
}

function updateQuantityDisplay(productId) {
    productId = String(productId);
    const quantityElem = document.getElementById(`quantity-${productId}`);
    if (quantityElem) quantityElem.textContent = String(cart[productId] || 0);
}

/* =======================================
   Eventos de cantidad en cada product card
   ======================================= */
function attachQuantityButtons() {
    const plusButtons = document.querySelectorAll('.quantity-btn.plus');
    plusButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            const productId = button.dataset.id;
            updateFloatingCart(productId, 1);
            updateQuantityDisplay(productId);
            const cardElement = button.closest('.product-card');
            if (cardElement) flyToCart(cardElement, true);
        });
    });
    const minusButtons = document.querySelectorAll('.quantity-btn.minus');
    minusButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            const productId = button.dataset.id;
            updateFloatingCart(productId, -1);
            updateQuantityDisplay(productId);
            const cardElement = button.closest('.product-card');
            if (cardElement) flyToCart(cardElement, false);
        });
    });
}

/* =====================================
   “Animar” una card hacia el carrito (UI)
   ===================================== */
function flyToCart(cardElement, isAdding) {
    const clonedElement = cardElement.cloneNode(true);
    document.body.appendChild(clonedElement);
    const cardRect = cardElement.getBoundingClientRect();
    const cartElement = document.getElementById('floating-cart');
    if (!cartElement) { // si no hay carrito flotante, solo desvanecer
        clonedElement.style.position = 'fixed';
        clonedElement.style.left = cardRect.left + 'px';
        clonedElement.style.top = cardRect.top + 'px';
        clonedElement.style.width = cardRect.width + 'px';
        clonedElement.style.height = cardRect.height + 'px';
        clonedElement.style.transition = 'opacity .6s ease';
        requestAnimationFrame(function() { clonedElement.style.opacity = '0'; });
        setTimeout(function() { if (clonedElement.parentNode) clonedElement.parentNode.removeChild(clonedElement); }, 650);
        return;
    }
    const cartRect = cartElement.getBoundingClientRect();

    Object.assign(clonedElement.style, {
        position: 'fixed',
        zIndex: '1000',
        pointerEvents: 'none',
        transition: 'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.8s ease',
        willChange: 'transform, opacity'
    });

    if (isAdding) {
        clonedElement.style.top = cardRect.top + 'px';
        clonedElement.style.left = cardRect.left + 'px';
        clonedElement.style.width = cardRect.width + 'px';
        clonedElement.style.height = cardRect.height + 'px';
        clonedElement.style.transform = 'none';
        clonedElement.style.opacity = '1';

        const cardCenterX = cardRect.left + cardRect.width / 2;
        const cardCenterY = cardRect.top + cardRect.height / 2;
        const cartCenterX = cartRect.left + cartRect.width / 2;
        const cartCenterY = cartRect.top + cartRect.height / 2;
        const deltaX = cartCenterX - cardCenterX;
        const deltaY = cartCenterY - cardCenterY;

        requestAnimationFrame(function() {
            clonedElement.style.transform = 'translate(' + deltaX + 'px,' + deltaY + 'px) scale(0.2)';
            clonedElement.style.opacity = '0';
        });
    } else {
        clonedElement.style.top = cartRect.top + 'px';
        clonedElement.style.left = cartRect.left + 'px';
        clonedElement.style.width = cartRect.width + 'px';
        clonedElement.style.height = cartRect.height + 'px';
        clonedElement.style.transform = 'none';
        clonedElement.style.opacity = '1';

        const cardCenterX = cardRect.left + cardRect.width / 2;
        const cardCenterY = cardRect.top + cardRect.height / 2;
        const cartCenterX = cartRect.left + cartRect.width / 2;
        const cartCenterY = cartRect.top + cartRect.height / 2;
        const deltaX = cardCenterX - cartCenterX;
        const deltaY = cardCenterY - cartCenterY;

        requestAnimationFrame(function() {
            clonedElement.style.transform = 'translate(' + deltaX + 'px,' + deltaY + 'px) scale(1)';
            clonedElement.style.opacity = '0';
        });
    }
    setTimeout(function() {
        if (clonedElement.parentNode) clonedElement.parentNode.removeChild(clonedElement);
    }, 900);
}

/* ==========================
   Modal de galería de imágenes
   ========================== */
function assignImageClickEvents() {
    const productImages = document.querySelectorAll('.product-image');
    productImages.forEach(function(img) {
        img.style.cursor = 'pointer';
        img.addEventListener('click', function() { openModal(img); });
    });
}

function openModal(imageElement) {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalImagesContainer = document.getElementById('modal-images');
    if (!modalOverlay || !modalImagesContainer) return;

    modalImagesContainer.innerHTML = "";
    const galleryData = imageElement.getAttribute('data-gallery');
    let images = [];
    try {
        images = JSON.parse(galleryData);
    } catch (e) {
        images = [imageElement.src];
    }
    images.forEach(function(src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = imageElement.alt || 'Producto';
        modalImagesContainer.appendChild(img);
    });
    modalOverlay.style.display = 'flex';
}

function closeModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) modalOverlay.style.display = 'none';
}
const modalCloseBtn = document.getElementById('modal-close');
if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
const modalOverlayEl = document.getElementById('modal-overlay');
if (modalOverlayEl) {
    modalOverlayEl.addEventListener('click', function(event) {
        if (event.target === event.currentTarget) closeModal();
    });
}
window.openModal = openModal;
window.assignImageClickEvents = assignImageClickEvents;

/* ==========================
   Enviar carrito por WhatsApp
   ========================== */
function sendCartToWhatsApp() {
    let message = "Hola, estoy interesado en comprar los siguientes productos:\n";
    let totalPrice = 0;
    let hasProducts = false;
    for (let productId in cart) {
        if (cart[productId] > 0) {
            const product = products.find(function(p) { return String(p.id) === String(productId); });
            if (product) {
                hasProducts = true;
                const qty = cart[productId];
                const unit = Number(product.price || 0);
                const subtotal = qty * unit;
                totalPrice += subtotal;
                message += `\n*${product.name}*\nCantidad: ${qty}\nPrecio unitario: $${unit.toLocaleString('es-CO')}\nSubtotal: $${subtotal.toLocaleString('es-CO')}\nImagen: ${product.image}\n`;
            }
        }
    }
    if (!hasProducts) {
        alert("No has agregado ningún producto al carrito.");
        return;
    }
    message += `\nTotal a pagar: $${totalPrice.toLocaleString('es-CO')}`;
    const phone = "573005318412";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}
window.sendCartToWhatsApp = sendCartToWhatsApp;

/* ====================
   Arranque de la página
   ==================== */
document.addEventListener("DOMContentLoaded", function() {
    loadProducts();
    initializeSearch();
    initializeCategoryFilter();
});