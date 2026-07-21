// ==========================================
// CONFIGURACIÓN INICIAL
// ==========================================
const URL_CSV_DIRECTO = "https://raw.githubusercontent.com/tevo-mdp/prueba_caipser/main/productos.csv"; 
const MI_NUMERO_WHATSAPP = "5492235310709"; 

let productos = [];
let carrito = []; // Estructura: [{ producto, cantidad }]
let cotizacionDolar = 1200;
let categoriaActiva = "Todas";
let productoModalActual = null;

// ==========================================
// 1. OBTENER DÓLAR BLUE EN TIEMPO REAL
// ==========================================
async function obtenerDolar() {
    try {
        const res = await fetch('https://dolarapi.com/v1/dolares/blue');
        const data = await res.json();
        if (data && data.venta) cotizacionDolar = data.venta;
    } catch (e) {
        console.log("Usando dólar de respaldo $1200");
    }
}

// ==========================================
// 2. CARGAR Y PROCESAR CSV
// ==========================================
async function CargarCSV() {
    await obtenerDolar();
    
    try {
        const respuesta = await fetch(URL_CSV_DIRECTO);
        const textoCSV = await respuesta.text();

        Papa.parse(textoCSV, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                productos = results.data;
                generarBotonesCategorias();
                filtrarProductos();
            }
        });
    } catch (error) {
        console.error("Error al cargar el CSV:", error);
    }
}

// ==========================================
// 3. FILTROS Y CATEGORÍAS
// ==========================================
function generarBotonesCategorias() {
    const contenedor = document.getElementById('contenedor-categorias');
    if (!contenedor) return;

    const categorias = ["Todas", ...new Set(productos.map(p => p.categoria).filter(Boolean))];

    contenedor.innerHTML = categorias.map(cat => `
        <button onclick="seleccionarCategoria('${cat}')" 
                class="btn-categoria text-xs font-bold px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all ${cat === categoriaActiva ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
            ${cat}
        </button>
    `).join('');
}

function seleccionarCategoria(cat) {
    categoriaActiva = cat;
    generarBotonesCategorias();
    filtrarProductos();
}

function filtrarProductos() {
    const texto = (document.getElementById('input-busqueda')?.value || '').toLowerCase().trim();

    const filtrados = productos.filter(p => {
        if (!p.nombre) return false;
        const coincideCat = categoriaActiva === "Todas" || p.categoria === categoriaActiva;
        const coincideNombre = p.nombre.toLowerCase().includes(texto);
        return coincideCat && coincideNombre;
    });

    dibujarProductos(filtrados);
}

// ==========================================
// 4. RENDERIZAR PRODUCTOS EN GRILLA
// ==========================================
function dibujarProductos(lista) {
    const contenedor = document.getElementById('contenedor-productos');
    if (!contenedor) return;

    contenedor.innerHTML = "";

    if (lista.length === 0) {
        contenedor.innerHTML = `<div class="col-span-full py-16 text-center text-slate-400 font-medium">No se encontraron artículos.</div>`;
        return;
    }

    lista.forEach(prod => {
        const pMinARS = Math.round((parseFloat(prod.precio_minorista) || 0) * cotizacionDolar);
        const pMayARS = Math.round((parseFloat(prod.precio_mayorista) || 0) * cotizacionDolar);

        const stockTxt = (prod.stock || '').toString().toLowerCase().trim();
        const esStockNumerico = !isNaN(parseInt(stockTxt));
        const tieneStock = esStockNumerico ? parseInt(stockTxt) > 0 : (stockTxt === 'si' || stockTxt === 'disponible');

        const botonHTML = tieneStock 
            ? `<button onclick="event.stopPropagation(); agregarAlCarrito('${prod.id}', 1)" class="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-transform active:scale-95">Sumar</button>`
            : `<button disabled class="bg-slate-100 text-slate-400 px-3 py-1.5 rounded-xl text-xs font-bold cursor-not-allowed">Agotado</button>`;

        contenedor.innerHTML += `
            <div onclick="abrirModal('${prod.id}')" class="bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-slate-300 transition-all group">
                <div>
                    <div class="overflow-hidden rounded-xl bg-slate-50 mb-3 h-36 sm:h-44">
                        <img src="${prod.imagen}" class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='https://via.placeholder.com/300'">
                    </div>
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">${prod.categoria || 'General'}</span>
                    <h3 class="font-bold text-slate-900 text-xs sm:text-sm leading-snug mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">${prod.nombre}</h3>
                </div>
                <div class="flex justify-between items-end border-t border-slate-100 pt-2.5 mt-2">
                    <div>
                        <p class="text-[10px] line-through text-slate-400">$${pMinARS.toLocaleString('es-AR')}</p>
                        <p class="font-black text-emerald-600 text-sm">$${pMayARS.toLocaleString('es-AR')} <span class="text-[9px] font-normal text-slate-400">x mayor</span></p>
                    </div>
                    ${botonHTML}
                </div>
            </div>
        `;
    });
}

// ==========================================
// 5. POPUP / MODAL INTERACTIVO
// ==========================================
function abrirModal(id) {
    const prod = productos.find(p => p.id.toString() === id.toString());
    if (!prod) return;

    productoModalActual = prod;

    const pMinARS = Math.round((parseFloat(prod.precio_minorista) || 0) * cotizacionDolar);
    const pMayARS = Math.round((parseFloat(prod.precio_mayorista) || 0) * cotizacionDolar);

    const stockTxt = (prod.stock || '').toString().toLowerCase().trim();
    const esStockNumerico = !isNaN(parseInt(stockTxt));
    const tieneStock = esStockNumerico ? parseInt(stockTxt) > 0 : (stockTxt === 'si' || stockTxt === 'disponible');

    document.getElementById('modal-imagen').src = prod.imagen;
    document.getElementById('modal-categoria').innerText = prod.categoria || 'Producto';
    document.getElementById('modal-nombre').innerText = prod.nombre;
    
    // Carga la descripción del CSV
    const elDesc = document.getElementById('modal-descripcion');
    if (elDesc) {
        elDesc.innerText = prod.descripcion || 'Sin descripción disponible.';
    }

    document.getElementById('modal-precio-min').innerText = `$${pMinARS.toLocaleString('es-AR')}`;
    document.getElementById('modal-precio-may').innerText = `$${pMayARS.toLocaleString('es-AR')}`;

    // Resetear cantidad a 1
    const inputCant = document.getElementById('modal-cantidad');
    if (inputCant) inputCant.value = 1;

    const badgeContainer = document.getElementById('modal-stock-badge');
    const btnContainer = document.getElementById('modal-btn-container');

    if (tieneStock) {
        badgeContainer.innerHTML = `<span class="inline-block bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">● En Stock</span>`;
        btnContainer.innerHTML = `<button onclick="confirmarAgregarModal()" class="w-full bg-slate-900 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-slate-800 transition-all active:scale-95 shadow-sm">Agregar al Pedido</button>`;
    } else {
        badgeContainer.innerHTML = `<span class="inline-block bg-red-50 text-red-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-red-200">● Agotado</span>`;
        btnContainer.innerHTML = `<button disabled class="w-full bg-slate-100 text-slate-400 py-2.5 rounded-xl font-bold text-xs cursor-not-allowed">Sin Stock</button>`;
    }

    document.getElementById('modal-detalle').classList.remove('hidden');
}

function cambiarCantidadModal(delta) {
    const inputCant = document.getElementById('modal-cantidad');
    if (!inputCant) return;

    let actual = parseInt(inputCant.value) || 1;
    if (actual + delta >= 1) {
        inputCant.value = actual + delta;
    }
}

function validarCantidadInputModal(input) {
    let val = parseInt(input.value);
    if (isNaN(val) || val < 1) {
        input.value = 1;
    }
}

function confirmarAgregarModal() {
    const inputCant = document.getElementById('modal-cantidad');
    const cantidad = parseInt(inputCant?.value) || 1;

    if (productoModalActual) {
        agregarAlCarrito(productoModalActual.id, cantidad);
        cerrarModal();
    }
}

function cerrarModal() {
    document.getElementById('modal-detalle').classList.add('hidden');
}

document.getElementById('modal-detalle')?.addEventListener('click', function(e) {
    if (e.target === this) cerrarModal();
});

// ==========================================
// 6. LÓGICA CARRITO Y WHATSAPP
// ==========================================
function agregarAlCarrito(id, cantidad = 1) {
    const prod = productos.find(p => p.id.toString() === id.toString());
    if (!prod) return;

    const itemExistente = carrito.find(item => item.producto.id.toString() === id.toString());

    if (itemExistente) {
        itemExistente.cantidad += cantidad;
    } else {
        carrito.push({ producto: prod, cantidad: cantidad });
    }

    actualizarCarrito();
}

function actualizarCarrito() {
    const lista = document.getElementById('lista-carrito');
    const totalEl = document.getElementById('total-precio');
    const totalMobile = document.getElementById('total-precio-mobile');
    const cantMobile = document.getElementById('cant-items-mobile');
    const badgeTotalItems = document.getElementById('badge-total-items');
    const avisoEl = document.getElementById('aviso-mayorista');
    
    if (!lista) return;
    lista.innerHTML = "";

    const totalUnidades = carrito.reduce((acc, item) => acc + item.cantidad, 0);
    const aplicaMayorista = totalUnidades >= 5;
    let totalARS = 0;

    carrito.forEach((item, idx) => {
        const prod = item.producto;
        const pUSD = aplicaMayorista ? parseFloat(prod.precio_mayorista) : parseFloat(prod.precio_minorista);
        const pARS = Math.round(pUSD * cotizacionDolar);
        const subtotal = pARS * item.cantidad;
        totalARS += subtotal;

        lista.innerHTML += `
            <div class="flex items-center justify-between bg-slate-50 p-2 rounded-xl text-xs border border-slate-100">
                <div class="pr-2 truncate">
                    <p class="font-bold text-slate-800 truncate">${prod.nombre}</p>
                    <p class="text-[10px] text-slate-400">$${pARS.toLocaleString('es-AR')} c/u</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <div class="flex items-center border bg-white rounded-lg px-1">
                        <button onclick="modificarCantidadCarrito(${idx}, -1)" class="px-1 text-slate-500 font-bold">-</button>
                        <span class="px-1.5 font-bold text-slate-900">${item.cantidad}</span>
                        <button onclick="modificarCantidadCarrito(${idx}, 1)" class="px-1 text-slate-500 font-bold">+</button>
                    </div>
                    <button onclick="eliminarDelCarrito(${idx})" class="text-red-500 font-bold hover:text-red-700 text-xs px-1">✕</button>
                </div>
            </div>
        `;
    });

    if (totalEl) totalEl.innerText = totalARS.toLocaleString('es-AR');
    if (totalMobile) totalMobile.innerText = totalARS.toLocaleString('es-AR');
    if (cantMobile) cantMobile.innerText = totalUnidades;
    if (badgeTotalItems) badgeTotalItems.innerText = `${totalUnidades} item${totalUnidades !== 1 ? 's' : ''}`;

    if (avisoEl) {
        if (aplicaMayorista) {
            avisoEl.innerText = "¡Precios mayoristas aplicados!";
            avisoEl.className = "text-xs font-bold text-emerald-700 mb-4 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-center";
        } else {
            const faltantes = 5 - totalUnidades;
            avisoEl.innerText = `Llevá ${faltantes} un. más para precio mayorista.`;
            avisoEl.className = "text-xs font-semibold text-amber-800 mb-4 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-center";
        }
    }
}

function modificarCantidadCarrito(idx, delta) {
    if (carrito[idx]) {
        carrito[idx].cantidad += delta;
        if (carrito[idx].cantidad <= 0) {
            carrito.splice(idx, 1);
        }
        actualizarCarrito();
    }
}

function eliminarDelCarrito(idx) {
    carrito.splice(idx, 1);
    actualizarCarrito();
}

function enviarWhatsApp() {
    if (carrito.length === 0) return alert("El carrito está vacío");

    const nombre = document.getElementById('cliente-nombre')?.value.trim();
    const direccion = document.getElementById('cliente-direccion')?.value.trim();
    const nota = document.getElementById('cliente-nota')?.value.trim();

    if (!nombre || !direccion) return alert("Por favor, completá Nombre y Dirección.");

    let msj = `📦 *NUEVO PEDIDO MAYORISTA*\n\n`;
    msj += `👤 *Cliente:* ${nombre}\n📍 *Dirección:* ${direccion}\n`;
    if (nota) msj += `📝 *Nota:* ${nota}\n`;
    msj += `\n--------------------------------\n\n🛒 *Detalle del Pedido:*\n`;

    const totalUnidades = carrito.reduce((acc, item) => acc + item.cantidad, 0);
    const aplicaMayorista = totalUnidades >= 5;
    let totalARS = 0;

    carrito.forEach(item => {
        const prod = item.producto;
        const pUSD = aplicaMayorista ? parseFloat(prod.precio_mayorista) : parseFloat(prod.precio_minorista);
        const pARS = Math.round(pUSD * cotizacionDolar);
        const subtotal = pARS * item.cantidad;
        totalARS += subtotal;

        msj += `• ${item.cantidad}x ${prod.nombre} - *$${subtotal.toLocaleString('es-AR')}*\n`;
    });

    msj += `\n--------------------------------\n💰 *TOTAL ESTIMADO: $${totalARS.toLocaleString('es-AR')} ARS*`;

    window.open(`https://wa.me/${MI_NUMERO_WHATSAPP}?text=${encodeURIComponent(msj)}`, '_blank');
}

// Iniciar app al cargar la página
document.addEventListener('DOMContentLoaded', CargarCSV);
