// ==========================================
// CONFIGURACIÓN INICIAL
// ==========================================
const ARCHIVO_CSV = "productos.csv"; // Nombre del archivo subido a Cloudflare Pages
const MI_NUMERO_WHATSAPP = "5492235310709"; //

let productos = [];
let carrito = [];
let cotizacionDolar = 1200; // Valor de respaldo por si falla la conexión a la API

// ==========================================
// 1. OBTENER COTIZACIÓN DEL DÓLAR
// ==========================================
async function obtenerCotizacionDolar() {
    try {
        const respuesta = await fetch('https://dolarapi.com/v1/dolares/blue');
        const datos = await respuesta.json();
        cotizacionDolar = datos.venta;
        console.log(`Cotización Dólar Blue cargada: $${cotizacionDolar}`);
    } catch (error) {
        console.error("No se pudo obtener la cotización del dólar. Usando valor de respaldo.", error);
    }
}

// ==========================================
// 2. INICIALIZAR LA TIENDA
// ==========================================
async function iniciarTienda() {
    // Primero obtenemos la cotización del dólar
    await obtenerCotizacionDolar();

    // Luego leemos el archivo CSV
    Papa.parse(ARCHIVO_CSV, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            productos = results.data;
            mostrarProductos();
        },
        error: function(err) {
            console.error("Error al leer el archivo CSV:", err);
        }
    });
}

// ==========================================
// 3. MOSTRAR PRODUCTOS EN PANTALLA
// ==========================================
function mostrarProductos() {
    const contenedor = document.getElementById('contenedor-productos');
    if (!contenedor) return;
    
    contenedor.innerHTML = '';

    productos.forEach(prod => {
        if (!prod.id || !prod.nombre) return; // Salta filas dañadas

        // Calculamos los precios en pesos a partir del USD del CSV
        const precioMinUSD = parseFloat(prod.precio_minorista) || 0;
        const precioMayUSD = parseFloat(prod.precio_mayorista) || 0;

        const precioMinARS = Math.round(precioMinUSD * cotizacionDolar);
        const precioMayARS = Math.round(precioMayUSD * cotizacionDolar);

        // Evaluamos el stock (Acepta 'SI'/'NO' o números como '0', '5')
        const stockTexto = (prod.stock || '').toString().toLowerCase().trim();
        const esStockNumerico = !isNaN(parseInt(stockTexto));
        const tieneStock = esStockNumerico ? parseInt(stockTexto) > 0 : (stockTexto === 'si' || stockTexto === 'disponible');

        // Construimos el botón y etiquetas de stock
        let botonHTML = '';
        let opacidadTarjeta = '';
        let etiquetaStock = '';

        if (tieneStock) {
            botonHTML = `<button onclick="agregarAlCarrito('${prod.id}')" class="bg-black text-white px-3 py-1.5 rounded text-sm font-semibold hover:bg-gray-800 transition">Sumar</button>`;
            if (esStockNumerico && parseInt(stockTexto) <= 3) {
                etiquetaStock = `<span class="text-xs font-bold text-orange-500 block mb-1">● Últimas ${stockTexto} unidades</span>`;
            } else {
                etiquetaStock = `<span class="text-xs font-bold text-green-600 block mb-1">● Disponible</span>`;
            }
        } else {
            botonHTML = `<button disabled class="bg-gray-200 text-gray-500 px-3 py-1.5 rounded text-sm font-semibold cursor-not-allowed">Sin Stock</button>`;
            opacidadTarjeta = 'opacity-60';
            etiquetaStock = `<span class="text-xs font-bold text-red-500 block mb-1">● Agotado</span>`;
        }

        const tarjeta = `
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-between ${opacidadTarjeta}">
                <div>
                    <img src="${prod.imagen}" alt="${prod.nombre}" class="h-44 w-full object-cover mb-3 rounded-md bg-gray-50" onerror="this.src='https://via.placeholder.com/300x300?text=Sin+Imagen'">
                    ${etiquetaStock}
                    <h3 class="font-bold text-gray-800 text-base leading-snug mb-1">${prod.nombre}</h3>
                    <p class="text-gray-400 text-xs mb-3">${prod.categoria}</p>
                </div>
                
                <div class="flex justify-between items-end border-t pt-2 mt-2">
                    <div>
                        <p class="text-xs line-through text-gray-400">$${precioMinARS.toLocaleString('es-AR')}</p>
                        <p class="font-extrabold text-green-600 text-base">$${precioMayARS.toLocaleString('es-AR')} <span class="text-xs font-normal text-gray-500">x mayor</span></p>
                    </div>
                    ${botonHTML}
                </div>
            </div>
        `;
        contenedor.innerHTML += tarjeta;
    });
}

// ==========================================
// 4. LÓGICA DEL CARRITO DE COMPRAS
// ==========================================
function agregarAlCarrito(id) {
    const producto = productos.find(p => p.id.toString() === id.toString());
    if (producto) {
        carrito.push(producto);
        actualizarCarrito();
    }
}

function actualizarCarrito() {
    const lista = document.getElementById('lista-carrito');
    const totalElemento = document.getElementById('total-precio');
    const avisoElemento = document.getElementById('aviso-mayorista');
    
    if (!lista) return;
    lista.innerHTML = '';

    // Si hay 5 o más unidades totales en el carrito, se aplica precio mayorista
    const aplicaMayorista = carrito.length >= 5;
    let totalARS = 0;

    carrito.forEach((prod, index) => {
        const precioUSD = aplicaMayorista ? parseFloat(prod.precio_mayorista) : parseFloat(prod.precio_minorista);
        const precioARS = Math.round(precioUSD * cotizacionDolar);
        totalARS += precioARS;

        lista.innerHTML += `
            <div class="flex justify-between items-center border-b py-2 text-sm">
                <div class="pr-2">
                    <p class="font-medium text-gray-800">${prod.nombre}</p>
                    <p class="text-xs text-gray-500">$${precioARS.toLocaleString('es-AR')} c/u</p>
                </div>
                <button onclick="eliminarDelCarrito(${index})" class="text-red-500 hover:text-red-700 text-xs font-bold pl-2">✕</button>
            </div>
        `;
    });

    if (totalElemento) {
        totalElemento.innerText = totalARS.toLocaleString('es-AR');
    }

    // Actualizar cartel de condición mayorista
    if (avisoElemento) {
        if (aplicaMayorista) {
            avisoElemento.innerText = "¡Precios mayoristas aplicados!";
            avisoElemento.className = "text-xs font-bold text-green-600 mb-4 bg-green-50 p-2 rounded text-center";
        } else {
            const faltantes = 5 - carrito.length;
            avisoElemento.innerText = `Llevá ${faltantes} producto${faltantes > 1 ? 's' : ''} más para acceder a precio mayorista.`;
            avisoElemento.className = "text-xs font-medium text-amber-700 mb-4 bg-amber-50 p-2 rounded text-center";
        }
    }
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
}

// ==========================================
// 5. ENVIAR PEDIDO POR WHATSAPP
// ==========================================
function enviarWhatsApp() {
    if (carrito.length === 0) {
        alert("El carrito está vacío. Agregá algún producto antes de enviar tu pedido.");
        return;
    }

    const inputNombre = document.getElementById('cliente-nombre');
    const inputDireccion = document.getElementById('cliente-direccion');
    const inputNota = document.getElementById('cliente-nota');

    const nombre = inputNombre ? inputNombre.value.trim() : '';
    const direccion = inputDireccion ? inputDireccion.value.trim() : '';
    const nota = inputNota ? inputNota.value.trim() : '';

    if (!nombre || !direccion) {
        alert("Por favor, ingresá tu Nombre y Dirección de envío.");
        return;
    }

    // Formateamos el mensaje de WhatsApp
    let mensaje = `📦 *NUEVO PEDIDO DE CATÁLOGO*\n\n`;
    mensaje += `👤 *Cliente:* ${nombre}\n`;
    mensaje += `📍 *Dirección/Localidad:* ${direccion}\n`;
    if (nota) mensaje += `📝 *Nota:* ${nota}\n`;
    mensaje += `\n--------------------------------\n\n`;
    mensaje += `🛒 *Detalle del Pedido:*\n`;

    const aplicaMayorista = carrito.length >= 5;
    let totalARS = 0;

    carrito.forEach(prod => {
        const precioUSD = aplicaMayorista ? parseFloat(prod.precio_mayorista) : parseFloat(prod.precio_minorista);
        const precioARS = Math.round(precioUSD * cotizacionDolar);
        totalARS += precioARS;

        mensaje += `• ${prod.nombre} - *$${precioARS.toLocaleString('es-AR')}*\n`;
    });

    mensaje += `\n--------------------------------\n`;
    mensaje += `💰 *TOTAL ESTIMADO: $${totalARS.toLocaleString('es-AR')} ARS*\n`;
    if (aplicaMayorista) {
        mensaje += `✨ _(Descuento mayorista aplicado por 5+ unidades)_\n`;
    }

    // Abrimos WhatsApp en una nueva pestaña
    const URLWhatsApp = `https://wa.me/${MI_NUMERO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
    window.open(URLWhatsApp, '_blank');
}

// Inicializar al cargar el script
document.addEventListener('DOMContentLoaded', iniciarTienda);