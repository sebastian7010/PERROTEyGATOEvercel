const preloadImages = (urls) => {
    urls.forEach(url => {
        const img = new Image();
        img.src = url;
    });
};

// precargar algunas imágenes populares
preloadImages([
    "https://…/antiparasario.webp",
    "https://…/ricocat.webp",
    "https://…/champu.webp"
]);

function normalizeText(text) {
    return text
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita tildes
        .replace(/\s+/g, "") // quita espacios

    // --- pesos y unidades ---
    .replace(/kilos?|kilo|quilo|quilos|kg|kgr?/g, "kg")
        .replace(/(\d+)[ ]?(k|kg)/g, "$1kg")
        .replace(/(\d+)[ ]?(gr|g|gramos?)/g, "$1g")
        .replace(/(\d+)[ ]?(ml|mililitros?)/g, "$1ml")
        .replace(/(\d+)[ ]?(l|litros?)/g, "$1l")
        .replace(/(\d+)[ ]?(lb|libras?)/g, "$1lb")
        .replace(/(\d+)[ ]?(oz|onzas?)/g, "$1oz")

    // --- casos especiales de mercado ---
    .replace(/(\d+)[ ]?k/g, "$1kg")
        .replace(/(\d+)[ ]?cc/g, "$1ml")
        .replace(/(\d+)[ ]?cl/g, "$1ml")

    // --- errores comunes ---
    .replace(/kils|kls|kiloos/g, "kg")
        .replace(/mll|mlll/g, "ml")

    // --- limpia dobles unidades ---
    .replace(/kgkg/g, "kg")
        .replace(/mlml/g, "ml")
        .replace(/gg/g, "g");
}


// @ts-nocheck
// Función para detectar soporte de WebP en el navegador
function supportsWebp(callback) {
    const img = new Image();
    img.onload = function() {
        callback(true);
    };
    img.onerror = function() {
        callback(false);
    };
    // Usamos una imagen de prueba en base64
    img.src =
        'data:image/webp;base64,UklGRiIAAABXRUJQVlA4TCEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
}

// Función que reemplaza en todos los elementos <img> la extensión .jpg o .png por .webp
function replaceImagesWithWebp() {
    const imgs = document.querySelectorAll('img');
    imgs.forEach((img) => {
        // Solo modificamos si la URL termina en jpg o png
        if (img.src.match(/\.(jpg|png)$/i)) {
            img.src = img.src.replace(/\.(jpg|png)$/i, '.webp');
        }
    });
}

// Llamamos a la función de soporte y reemplazo al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    supportsWebp((supported) => {
        if (supported) {
            replaceImagesWithWebp();
            console.log('Se han reemplazado las imágenes a formato WebP.');
        } else {
            console.log('El navegador no soporta WebP. Se mantienen las imágenes originales.');
        }
    });
});







// Variables globales
let cart = {}; // Objeto que almacenará la cantidad de cada producto (clave: productId)
let products = []; // Lista de productos obtenida del JSON
let fuse; // Instancia de Fuse.js para búsqueda
let categoryPages = {}; // Página actual por categoría


// Importación de las categorías desde el módulo externo
import { categories } from './categories.js';
/** Renderizar los resultados de la búsqueda **/
function renderSearchResults(results) {
    const container = document.getElementById('carousels-container');
    if (!container) return;
    container.innerHTML = ""; // Limpiar el contenedor

    if (results.length === 0) {
        container.innerHTML = "<p>No se encontraron productos.</p>";
        return;
    }

    // Se construye un layout tipo grid para los resultados de la búsqueda.
    let html = '<div class="search-results-grid">';
    results.forEach(result => {
        const product = result.item;
        html += `
      <div class="product-card" data-id="${product.id}">
        <img src="${product.image}" alt="${product.name}" class="product-image" data-gallery='${JSON.stringify(product.gallery && product.gallery.length ? product.gallery : [product.image])}'>
        <div class="product-details">
          <h3>${product.name}</h3>
          <p>$${product.price.toLocaleString()}</p>
          <div class="quantity-controls">
            <button class="quantity-btn minus" data-id="${product.id}">-</button>
            <span id="quantity-${product.id}">0</span>
            <button class="quantity-btn plus" data-id="${product.id}">+</button>
          </div>
          <button class="buy-btn" onclick="buyProduct(${product.id})">Comprar</button>
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
    attachEventListeners();
    assignImageClickEvents();
}

/** Actualiza el carrito flotante (floating cart)
 *  Se actualiza la cantidad del producto en el objeto 'cart'
 *  y se actualiza el contador global.
 **/
// Actualiza el carrito flotante cuando se suma/resta un producto
function updateFloatingCart(productId, change) {
    // Aseguramos que productId sea string
    productId = String(productId);

    if (!cart[productId]) {
        cart[productId] = 0;
    }

    cart[productId] += change;
    if (cart[productId] < 0) cart[productId] = 0;

    // Actualiza contador y estado visual (.has-items)
    updateCartDisplay();

    // Si estamos agregando producto, hacer giro del carrito
    if (change > 0) {
        const floatingCartElem = document.getElementById("floating-cart");
        if (floatingCartElem) {
            floatingCartElem.classList.add("cart-spin");
            setTimeout(() => {
                floatingCartElem.classList.remove("cart-spin");
            }, 450);
        }
    }
}

// Actualiza contador y muestra/oculta la pastilla "Comprar"
function updateCartDisplay() {
    let total = 0;
    for (const id in cart) {
        total += cart[id];
    }

    const cartCountElem = document.getElementById("cart-count");
    const floatingCartElem = document.getElementById("floating-cart");

    if (cartCountElem) {
        cartCountElem.textContent = total;
        cartCountElem.style.display = total > 0 ? "flex" : "none";
    }

    if (floatingCartElem) {
        if (total > 0) {
            floatingCartElem.classList.add("has-items");
        } else {
            floatingCartElem.classList.remove("has-items");
        }
    }
}



/** Actualiza la cantidad mostrada en cada tarjeta de producto **/
function updateQuantityDisplay(productId) {
    productId = String(productId);
    const quantityElem = document.getElementById(`quantity-${productId}`);
    if (quantityElem) {
        quantityElem.textContent = cart[productId] || 0;
    }
}


// Convierte tu JSON nuevo -> esquema interno
function normalizeProduct(p, idx) {
    var name = (p && p.nombre) || (p && p.name) || 'Producto';
    var price = Number((p && p.precio) != null ? p.precio : (p && p.price) != null ? p.price : 0);
    var image = (p && p.url) || (p && p.image) || (p && p.imagenes && p.imagenes[0]) || '';

    var gallery = (p && Array.isArray(p.imagenes) && p.imagenes.length) ?
        p.imagenes.slice(0) :
        (p && Array.isArray(p.gallery) && p.gallery.length) ?
        p.gallery.slice(0) :
        (image ? [image] : []);

    // Descripción base
    var descBase = (p && (p.descripcion || p.description)) || '';

    // Extra info
    var extras = [];
    if (p && p.marca) extras.push('Marca: ' + p.marca);
    if (p && p.referencia) extras.push('Ref: ' + p.referencia);

    var description = extras.length ?
        (descBase ? (descBase + '\n' + extras.join(' · ')) : extras.join(' · ')) :
        descBase;

    // Searchable FINAL (correcto)
    var searchable = normalizeText(name + " " + description);

    // Categorías
    var catTxt = (p && (p['categoria producto'] || p.categoria)) || '';
    var key = String(catTxt).trim().toLowerCase();

    var CAT = {
        'accesorios': 1,
        'comida premium para perros': 2,
        'comida para perros': 3,
        'juguetes para perros': 4,
        'accesorios para gatos': 5,
        'comida premium para gatos': 6,
        'comida para gatos': 7,
        'juguetes para gatos': 8,
        'suplementos': 9,
        'equinos': 9,
        'caballos': 9,
        'bovinos': 10,
        'vacas': 10,
        'aves': 11,
        'pájaros': 11,
        'pajaros': 11,
        'terneros': 12,
        'conejos': 13,
        'alimentos': 3
    };

    var categoryId = (p && p.categoryId != null) ? Number(p.categoryId) : (CAT[key] || 1);
    var id = (p && p.id != null) ? p.id : (900000 + (idx || 0));

    return {
        id,
        categoryId,
        name,
        price,
        description,
        image,
        gallery,
        searchable
    };
}

function renderSuggestions(list) {
    const box = document.getElementById("search-suggestions");
    if (!box) return;

    if (!list || list.length === 0) {
        box.style.display = "none";
        box.innerHTML = "";
        return;
    }

    let html = "";
    list.forEach(item => {
        const product = products.find(p => p.id == item.id);
        if (!product) return;

        html += `
            <div class="suggestion-item" data-id="${product.id}">
                <img src="${product.image}" class="suggestion-thumb" />
                <div class="suggestion-name">${product.name}</div>
            </div>
        `;
    });

    box.innerHTML = html;
    box.style.display = "block";

    // Eventos de clic
    box.querySelectorAll(".suggestion-item").forEach(el => {
        el.addEventListener("click", () => {
            const id = el.dataset.id;
            const selected = products.find(p => p.id == id);
            if (!selected) return;

            // Autocompletar barra
            const searchBar = document.getElementById("search-bar");
            searchBar.value = selected.name;

            // Ocultar sugerencias
            box.style.display = "none";

            // Buscar y mostrar solo ese producto
            const results = fuse.search(normalizeText(selected.name));
            renderSearchResults(results);

            setTimeout(() => {
                window.scrollTo({
                    top: searchBar.offsetTop - 10,
                    behavior: "smooth"
                });
            }, 120);
        });
    });
}



/** Cargar productos desde products.json **/
/** Cargar productos desde products.json **/
async function loadProducts() {
    try {
        const response = await fetch('./products.json');
        if (!response.ok) throw new Error('Error al cargar products.json: ' + response.status);

        const raw = await response.json();
        const list = Array.isArray(raw) ? raw : (raw.productos || raw.items || raw.data || []);
        products = list.map((p, i) => normalizeProduct(p, i));

        // (opcional) para depurar por consola
        window.products = products;

        // Fuse para buscar por nombre/descripcion (donde también metimos marca/ref)
        fuse = new Fuse(products, {
            keys: ['searchable'],
            threshold: 0.3,
            ignoreLocation: true
        });


        initializePagination();
        initializeSearch();
    } catch (error) {
        console.error('Error al cargar los productos:', error);
    }
}


/** Inicializar paginación **/
function initializePagination() {
    const container = document.getElementById('carousels-container');
    if (!container) return;
    container.innerHTML = '';
    // Por cada categoría se inicia en la página 0 y se renderiza el carrusel
    categories.forEach(category => {
        categoryPages[category.id] = 0;
        renderCategory(category.id);
    });
}

/** Renderizar todas las categorías con sus carruseles **/
function renderAllCategories() {
    categories.forEach(category => {
        renderCategory(category.id);
    });
}

/** Renderizar una categoría con su carrusel **/
function renderCategory(categoryId) {
    const container = document.getElementById('carousels-container');
    if (!container) return;

    // Filtrar productos de la categoría
    const categoryProducts = products.filter(product => product.categoryId === categoryId);
    if (categoryProducts.length === 0) return;

    // Si la sección para esta categoría no existe, créala
    let categorySection = document.getElementById(`category-${categoryId}`);
    if (!categorySection) {
        categorySection = document.createElement('section');
        categorySection.classList.add('category-section');
        categorySection.id = `category-${categoryId}`;
        container.appendChild(categorySection);
    }

    // Calcular rango de productos a mostrar
    const pageIndex = categoryPages[categoryId];
    const start = pageIndex * productsPerPage;
    const end = start + productsPerPage;
    const productsToRender = categoryProducts.slice(start, end);

    // Crear la estructura fija del carrusel
    categorySection.innerHTML = `
      <h2 class="category-title">${categories.find(cat => cat.id === categoryId).title}</h2>
      <div class="carousel-container">
        <button class="carousel-btn prev-btn" onclick="changePage(${categoryId}, -1)">❮</button>
        <div class="carousel-track grid-2x6" id="carousel-track-${categoryId}"></div>
        <button class="carousel-btn next-btn" onclick="changePage(${categoryId}, 1)">❯</button>
      </div>
    `;

    // Insertar el DocumentFragment en el contenedor correcto
    const trackElement = categorySection.querySelector(`#carousel-track-${categoryId}`);
    trackElement.innerHTML = ''; // Limpiar contenido previo
    const fragment = generateProductGrid(productsToRender);
    trackElement.appendChild(fragment);

    // Reasigna eventos necesarios
    attachEventListeners();
    assignImageClickEvents();
}


let productsPerPage;
const width = window.innerWidth;
if (width <= 480) {
    productsPerPage = 4;
} else if (width <= 768) {
    productsPerPage = 8;
} else {
    productsPerPage = 12;
}


function generateProductGrid(products) {
    const filteredProds = products.slice(0, productsPerPage);
    let itemsPerRow;
    if (productsPerPage === 4) {
        itemsPerRow = 2;
    } else if (productsPerPage === 8) {
        itemsPerRow = 4;
    } else {
        itemsPerRow = 6;
    }
    const fragment = document.createDocumentFragment();
    const pageDiv = document.createElement('div');
    pageDiv.classList.add('carousel-page');

    for (let i = 0; i < filteredProds.length; i += itemsPerRow) {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('carousel-row');
        const rowProducts = filteredProds.slice(i, i + itemsPerRow);
        rowProducts.forEach(product => {
            const productCard = document.createElement('div');
            productCard.classList.add('product-card');
            productCard.dataset.id = product.id;
            productCard.innerHTML = `
                <img src="${product.image}" alt="${product.name}" class="product-image" data-gallery='${JSON.stringify(product.gallery && product.gallery.length ? product.gallery : [product.image])}' loading="lazy" width="300" height="300">
                <div class="product-details">
                  <h3>${product.name}</h3>
                  <p>$${product.price.toLocaleString()}</p>
                  <div class="quantity-controls">
                    <button class="quantity-btn minus" data-id="${product.id}">-</button>
                    <span id="quantity-${product.id}">0</span>
                    <button class="quantity-btn plus" data-id="${product.id}">+</button>
                  </div>
                  <button class="buy-btn" onclick="buyProduct(${product.id})">Comprar</button>
                </div>`;
            rowDiv.appendChild(productCard);
        });
        pageDiv.appendChild(rowDiv);
    }
    fragment.appendChild(pageDiv);
    return fragment;
}






/** Cambiar página del carrusel **/
window.changePage = function(categoryId, direction) {
    const categoryProducts = products.filter(product => product.categoryId === categoryId);
    const totalPages = Math.ceil(categoryProducts.length / productsPerPage);

    categoryPages[categoryId] += direction;
    if (categoryPages[categoryId] < 0) categoryPages[categoryId] = 0;
    if (categoryPages[categoryId] >= totalPages) categoryPages[categoryId] = totalPages - 1;

    renderCategory(categoryId);
};

/** Función para la acción de "comprar" un producto **/
function buyProduct(productId) {
    // Buscar el producto en el arreglo global "products"
    const product = products.find(p => p.id === productId);

    // Si no se encuentra, se envía un mensaje genérico
    let message = product ?
        `Hola, quiero comprar ${product.name} por $${product.price.toLocaleString()}.` :
        "Hola, estoy interesado en comprar este producto.";


    // Número de WhatsApp (asegúrate de que esté en el formato correcto, sin símbolos ni espacios)
    const phone = "573005318412";

    // Se crea la URL con el mensaje codificado
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    // Se abre una nueva pestaña/ventana hacia WhatsApp
    window.open(url, '_blank');
}

// Exponer la función al objeto global (si se usa inline en el HTML)
window.buyProduct = buyProduct;


function attachEventListeners() {
    // Botones "+"
    const plusButtons = document.querySelectorAll('.quantity-btn.plus');
    plusButtons.forEach(button => {
        // Clonamos el botón para evitar duplicados
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        newButton.addEventListener('click', () => {
            const productId = newButton.dataset.id;
            // Actualizamos el carrito y la visualización de cantidad
            updateFloatingCart(productId, 1);
            updateQuantityDisplay(productId);

            // Buscamos el elemento de la tarjeta (o la imagen) relacionada
            const cardElement = newButton.closest('.product-card');
            if (cardElement) {
                // Se anima del producto hacia el carrito (isAdding = true)
                flyToCart(cardElement, true);
            }
        });
    });

    // Botones "–"
    const minusButtons = document.querySelectorAll('.quantity-btn.minus');
    minusButtons.forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        newButton.addEventListener('click', () => {
            const productId = newButton.dataset.id;
            updateFloatingCart(productId, -1);
            updateQuantityDisplay(productId);

            // Buscamos el elemento de la tarjeta relacionada
            const cardElement = newButton.closest('.product-card');
            if (cardElement) {
                // Se anima del carrito de regreso a la card (isAdding = false)
                flyToCart(cardElement, false);
            }
        });
    });
}


/** 
 * Función para enviar el carrito a WhatsApp.
 * Recorre el objeto 'cart' para obtener cada producto, calcula subtotales y el total, y abre WhatsApp con el mensaje preparado.
 **/
function sendCartToWhatsApp() {
    let message = "Hola, estoy interesado en comprar los siguientes productos:\n";
    let totalPrice = 0;
    let hasProducts = false;

    for (let productId in cart) {
        if (cart[productId] > 0) {
            let product = products.find(p => String(p.id) === productId);
            if (product) {
                hasProducts = true;
                const qty = cart[productId];
                const price = product.price;
                const subtotal = qty * price;
                totalPrice += subtotal;
                // Se agregan detalles del producto y la URL de la imagen
                message += `\n*${product.name}*\n`;
                message += `Cantidad: ${qty}\n`;
                message += `Precio unitario: $${price.toLocaleString()}\n`;
                message += `Subtotal: $${subtotal.toLocaleString()}\n`;
                message += `Imagen: ${product.image}\n`;
            }
        }
    }

    if (!hasProducts) {
        alert("No has agregado ningún producto al carrito.");
        return;
    }

    message += `\nTotal a pagar: $${totalPrice.toLocaleString()}`;
    const phone = "573005318412";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// Exponemos la función para que sea accesible desde el HTML
window.sendCartToWhatsApp = sendCartToWhatsApp;



function flyToCart(cardElement, isAdding) {
    // Clonamos el elemento de la tarjeta (puede ser toda la card o solo la imagen, según prefieras)
    const clonedElement = cardElement.cloneNode(true);
    const body = document.body;
    body.appendChild(clonedElement);

    // Obtenemos las posiciones inicial y final
    const cardRect = cardElement.getBoundingClientRect();
    const cartElement = document.getElementById('floating-cart');
    const cartRect = cartElement.getBoundingClientRect();

    // Establecemos los estilos iniciales para el clon
    Object.assign(clonedElement.style, {
        position: 'fixed',
        zIndex: '1000',
        pointerEvents: 'none',
        transition: 'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.8s ease',
        willChange: 'transform, opacity'
    });

    if (isAdding) {
        // Animación: del producto (tarjeta) hacia el carrito

        // Posicionamos el clon en la posición original de la tarjeta
        clonedElement.style.top = cardRect.top + 'px';
        clonedElement.style.left = cardRect.left + 'px';
        clonedElement.style.width = cardRect.width + 'px';
        clonedElement.style.height = cardRect.height + 'px';
        clonedElement.style.transform = 'none';
        clonedElement.style.opacity = '1';

        // Calculamos el centro del elemento y del carrito
        const cardCenterX = cardRect.left + cardRect.width / 2;
        const cardCenterY = cardRect.top + cardRect.height / 2;
        const cartCenterX = cartRect.left + cartRect.width / 2;
        const cartCenterY = cartRect.top + cartRect.height / 2;

        // Diferencia entre centros
        const deltaX = cartCenterX - cardCenterX;
        const deltaY = cartCenterY - cardCenterY;

        // Usamos requestAnimationFrame para iniciar la animación
        requestAnimationFrame(() => {
            clonedElement.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.2)`;
            clonedElement.style.opacity = '0';
        });
    } else {
        // Animación inversa: del carrito hacia la tarjeta

        // Posicionamos el clon inicialmente en la ubicación del carrito
        clonedElement.style.top = cartRect.top + 'px';
        clonedElement.style.left = cartRect.left + 'px';
        clonedElement.style.width = cartRect.width + 'px';
        clonedElement.style.height = cartRect.height + 'px';
        clonedElement.style.transform = 'none';
        clonedElement.style.opacity = '1';

        // Calculamos el centro de la tarjeta y del carrito
        const cardCenterX = cardRect.left + cardRect.width / 2;
        const cardCenterY = cardRect.top + cardRect.height / 2;
        const cartCenterX = cartRect.left + cartRect.width / 2;
        const cartCenterY = cartRect.top + cartRect.height / 2;

        // Diferencia para regresar a la tarjeta
        const deltaX = cardCenterX - cartCenterX;
        const deltaY = cardCenterY - cartCenterY;

        // Iniciamos la animación para que el clon se desplace hasta la tarjeta y se desvanezca
        requestAnimationFrame(() => {
            clonedElement.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1)`;
            clonedElement.style.opacity = '0';
        });
    }

    // Removemos el clon del DOM al finalizar la animación
    setTimeout(() => {
        if (clonedElement.parentNode) {
            clonedElement.parentNode.removeChild(clonedElement);
        }
    }, 900);
}


function scrollToCarousels() {
    const carouselContainer = document.getElementById('carousels-container');
    if (carouselContainer) {
        carouselContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

// Exponemos la función al objeto global (si es necesario)
window.scrollToCarousels = scrollToCarousels;

// Otras funciones y la carga de productos...
document.addEventListener('DOMContentLoaded', () => {
    loadProducts().then(() => {
        renderAllCategories();
        assignImageClickEvents(); // Asigna el clic a las imágenes para abrir el modal
    });
});


function goToWhatsAppContact() {
    const phone = "573005318412"; // Asegúrate de que este número esté en el formato correcto (código de país sin símbolos)
    const message = "Hola quiero comprar algunos de sus productos";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// Exponemos la función al objeto global, en caso de que se use un onclick inline
window.goToWhatsAppContact = goToWhatsAppContact;

/**
 * Función que anima el contador de 0 hasta targetNumber en la duración especificada (en milisegundos)
 * @param {number} targetNumber - Valor final del contador.
 * @param {number} duration - Duración de la animación en milisegundos.
 */
function animateCounter(targetNumber, duration) {
    const counterElem = document.getElementById("counter");
    let startTime = null;

    function updateCounter(currentTime) {
        if (!startTime) {
            startTime = currentTime;
        }
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Función de easing ease-out (más natural)
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        const currentValue = Math.floor(easedProgress * targetNumber);
        counterElem.textContent = currentValue.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }

    requestAnimationFrame(updateCounter);
}

// Usamos Intersection Observer para disparar la animación cuando el contenedor es visible
document.addEventListener('DOMContentLoaded', () => {
    const counterContainer = document.getElementById('purchases-counter-container');
    let hasAnimated = false; // Para asegurarnos de que la animación se ejecute solo una vez

    const observerOptions = {
        threshold: 0.3 // El callback se dispara cuando el 50% del contenedor es visible
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !hasAnimated) {
                animateCounter(1000, 1000);
                hasAnimated = true;
                observer.unobserve(counterContainer); // Deja de observar una vez animado
            }
        });
    }, observerOptions);

    observer.observe(counterContainer);
});

function openModal(imageElement) {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalImagesContainer = document.getElementById('modal-images');

    // Limpiar imágenes previas en el modal
    modalImagesContainer.innerHTML = '';

    // Obtener el atributo data-gallery (se espera que sea un JSON con las URLs)
    const galleryData = imageElement.getAttribute('data-gallery');
    let images = [];
    try {
        images = JSON.parse(galleryData);
    } catch (error) {
        // Si falla el parse o no existe, se usa la imagen principal
        images = [imageElement.src];
    }

    // Por cada imagen, crear un elemento <img> y agregarlo al contenedor
    images.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.alt = imageElement.alt || 'Producto';
        modalImagesContainer.appendChild(img);
    });

    // Mostrar el modal
    modalOverlay.style.display = 'flex';
}

function assignImageClickEvents() {
    const productImages = document.querySelectorAll('.product-image');
    productImages.forEach(img => {
        img.style.cursor = 'pointer'; // Indica que la imagen es clickeable.
        img.addEventListener('click', () => {
            openModal(img);
        });
    });
}



function closeModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay.style.display = 'none';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
        closeModal();
    }
});


// ===== Marquee + navegación fiable (PC/móvil). Pega tal cual al final de script.js =====
(() => {
    const TH = 10; // px para considerar drag

    function initMarquee() {
        if (window.__marqueeInitDone) return;

        const marquee = document.querySelector('.pet-marquee');
        const track = marquee && marquee.querySelector('.pet-track');
        if (!marquee || !track) return;

        window.__marqueeInitDone = true;

        // Triplicar contenido una vez
        if (!track.__tripled) {
            const original = track.innerHTML.trim();
            track.innerHTML = original + original + original;
            track.__tripled = true;
        }

        const unitWidth = () => track.scrollWidth / 3;
        const center = () => { marquee.scrollLeft = unitWidth(); };
        requestAnimationFrame(center);
        window.addEventListener('load', center);

        // Envolver
        function wrap() {
            const u = unitWidth();
            const L = marquee.scrollLeft;
            const total = track.scrollWidth;
            if (L <= 0) marquee.scrollLeft = L + u;
            else if (L + marquee.clientWidth >= total - 1) marquee.scrollLeft = L - u;
        }
        marquee.addEventListener('scroll', wrap, { passive: true });

        // Autoscroll + drag
        let speed = -3; // derecha
        let paused = false;
        let dragging = false;

        function tick() {
            if (!paused && !dragging) {
                marquee.scrollLeft += speed;
                wrap();
            }
            requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);

        let startX = 0,
            startY = 0,
            startL = 0,
            moved = 0;

        marquee.addEventListener('pointerdown', (e) => {
            // No usar setPointerCapture para no romper clic en PC
            startX = e.clientX;
            startY = e.clientY;
            startL = marquee.scrollLeft;
            moved = 0;
            dragging = false;
            paused = true;
            marquee.classList.add('is-dragging');
        });

        marquee.addEventListener('pointermove', (e) => {
            if (e.pointerType === 'mouse' && e.buttons !== 1) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            moved = Math.max(moved, Math.abs(dx), Math.abs(dy));
            if (!dragging && moved >= TH) dragging = true;
            if (dragging) {
                marquee.scrollLeft = startL - dx;
                wrap();
            }
        });

        function endDrag() {
            dragging = false;
            marquee.classList.remove('is-dragging');
            setTimeout(() => { paused = false; }, 120);
        }
        marquee.addEventListener('pointerup', endDrag);
        marquee.addEventListener('pointercancel', endDrag);
        marquee.addEventListener('pointerleave', endDrag);

        // Rueda vertical => desplaza en X
        marquee.addEventListener('wheel', (e) => {
            if (e.shiftKey) return;
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                marquee.scrollLeft += e.deltaY;
                wrap();
                e.preventDefault();
            }
        }, { passive: false });
    }

    // Navegación a prueba de otros listeners (PC/móvil)
    const downPos = new WeakMap();
    document.addEventListener('pointerdown', (e) => {
        const a = e.target.closest('.pet-marquee a.pet-image-container');
        if (!a) return;
        downPos.set(a, { x: e.clientX, y: e.clientY });
    }, true);

    document.addEventListener('pointerup', (e) => {
        const a = e.target.closest('.pet-marquee a.pet-image-container');
        if (!a) return;

        if (e.ctrlKey || e.metaKey || e.button === 1) return; // nueva pestaña

        const p = downPos.get(a) || { x: e.clientX, y: e.clientY };
        const dx = Math.abs((e.clientX || 0) - (p.x || 0));
        const dy = Math.abs((e.clientY || 0) - (p.y || 0));
        const moved = Math.max(dx, dy);

        if (moved >= TH) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
        }

        const href = a.getAttribute('href');
        if (!href) return;

        if (href.charAt(0) === '#') {
            e.preventDefault();
            e.stopImmediatePropagation();
            const el = document.getElementById(href.slice(1));
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            else location.hash = href;
            return;
        }

        e.preventDefault();
        e.stopImmediatePropagation();
        setTimeout(() => { window.location.href = href; }, 0);
    }, true);

    document.addEventListener('DOMContentLoaded', () => {
        initMarquee();
        setTimeout(initMarquee, 300);
    });
})();


function getSuggestions(query) {
    if (!query || query.length < 1) return [];

    const normalized = normalizeText(query);

    // ✔ Fuse devuelve coincidencias reales, inteligentes y ordenadas
    const results = fuse.search(normalized);

    // ✔ Preparar máximo 15 sugerencias internas (luego el CSS muestra 2.5)
    return results
        .slice(0, 15)
        .map(r => ({
            id: r.item.id,
            name: r.item.name
        }));
}





function initializeSearch() {
    const searchBar = document.getElementById("search-bar");
    if (!searchBar) return;

    searchBar.addEventListener("input", () => {
        const rawQuery = searchBar.value.trim();
        const query = normalizeText(rawQuery);
        const hideables = document.querySelectorAll(".hide-on-search");

        // sugerencias
        const suggestions = getSuggestions(rawQuery);
        renderSuggestions(suggestions);

        if (query === "") {
            hideables.forEach(el => el.classList.remove("hidden-on-search"));
            renderAllCategories();
            document.getElementById("search-suggestions").style.display = "none";
            return;
        }

        hideables.forEach(el => el.classList.add("hidden-on-search"));

        const results = fuse.search(query);
        renderSearchResults(results);

        setTimeout(() => {
            window.scrollTo({
                top: searchBar.offsetTop - 10,
                behavior: "smooth"
            });
        }, 150);
    });
}