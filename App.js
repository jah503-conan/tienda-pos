// Base de datos inicial en LocalStorage para Arte e impresiones
let inventario = JSON.parse(localStorage.getItem('pos_inventario')) || [
    { id: '1', codigo: '7501001300010', nombre: 'Impresión B/N Carta', precio: 0.15, stock: 500, descripcion: 'Impresión láser blanco y negro' },
    { id: '2', codigo: '7501001300020', nombre: 'Impresión a Color Carta', precio: 0.50, stock: 200, descripcion: 'Impresión a color alta calidad' },
    { id: '3', codigo: '7501001300030', nombre: 'Anillado Metálico', precio: 1.50, stock: 50, descripcion: 'Encuadernación con espiral metálico' }
];

let carrito = [];
let html5QrCode = null;
let camarasDisponibles = [];
let indiceCamaraActual = 0;

// Guardar inventario por defecto si está vacío
if (!localStorage.getItem('pos_inventario')) {
    localStorage.setItem('pos_inventario', JSON.stringify(inventario));
}

// Inicializar la aplicación al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    actualizarVistaCarrito();
    renderizarInventario();
    configurarEventos();
});

function configurarEventos() {
    // Pestañas de navegación
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;
            cambiarPestaña(tab);
        });
    });

    // Vaciar carrito
    document.getElementById('btn-vaciar').addEventListener('click', () => {
        carrito = [];
        actualizarVistaCarrito();
    });

    // Cobrar venta
    document.getElementById('btn-cobrar').addEventListener('click', () => {
        if (carrito.length === 0) return alert('El carrito está vacío');
        
        // Descontar stock local
        carrito.forEach(item => {
            const prod = inventario.find(p => p.id === item.id);
            if (prod) prod.stock -= item.quantity;
        });
        
        localStorage.setItem('pos_inventario', JSON.stringify(inventario));
        alert('¡Venta completada con éxito!');
        carrito = [];
        actualizarVistaCarrito();
        renderizarInventario();
    });

    // Búsqueda manual en caja
    document.getElementById('busqueda-input').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const resultados = inventario.filter(p => p.nombre.toLowerCase().includes(query) || p.codigo.includes(query));
        mostrarSugerenciasBusqueda(resultados);
    });
}

function cambiarPestaña(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('border-blue-600', 'text-blue-600', 'bg-blue-50/50');
        el.classList.add('border-transparent', 'text-slate-600');
    });

    document.getElementById(`section-${tab}`).classList.remove('hidden');
    const activoBtn = document.querySelector(`[data-tab="${tab}"]`);
    activoBtn.classList.remove('border-transparent', 'text-slate-600');
    activoBtn.classList.add('border-blue-600', 'text-blue-600', 'bg-blue-50/50');

    // Detener escáner si cambia de pestaña
    detenerEscaner();
}

// --- LÓGICA DEL ESCÁNER DE CÁMARA ---
async function iniciarEscaner() {
    const contenedorModal = document.getElementById('modal-escaner');
    contenedorModal.classList.remove('hidden');

    try {
        camarasDisponibles = await Html5Qrcode.getCameras();
        if (camarasDisponibles && camarasDisponibles.length > 0) {
            // Preferir cámara trasera
            const trasera = camarasDisponibles.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('trasera'));
            indiceCamaraActual = trasera ? camarasDisponibles.indexOf(trasera) : camarasDisponibles.length - 1;
            arrancarInstanciaCamara(camarasDisponibles[indiceCamaraActual].id);
        } else {
            alert('No se encontraron cámaras disponibles.');
            cerrarEscaner();
        }
    } catch (err) {
        console.error("Error al obtener cámaras:", err);
        alert('No se pudo acceder a la cámara. Revisa los permisos.');
        cerrarEscaner();
    }
}

function arrancarInstanciaCamara(cameraId) {
    if (html5QrCode) {
        html5QrCode.stop().catch(() => {}).then(() => ejecutarLector(cameraId));
    } else {
        ejecutarLector(cameraId);
    }
}

function ejecutarLector(cameraId) {
    html5QrCode = new Html5Qrcode("reader-container");
    const config = { fps: 15, qrbox: { width: 250, height: 150 } };

    html5QrCode.start(
        cameraId, 
        config, 
        (decodedText) => {
            manejarCodigoDetectado(decodedText);
            cerrarEscaner();
        },
        () => {} // Ignorar errores de fotogramas vacíos
    ).catch(err => {
        console.error("Error al iniciar lector QR:", err);
    });
}

function cambiarCamara() {
    if (camarasDisponibles.length < 2) return;
    indiceCamaraActual = (indiceCamaraActual + 1) % camarasDisponibles.length;
    arrancarInstanciaCamara(camarasDisponibles[indiceCamaraActual].id);
}

function cerrarEscaner() {
    detenerEscaner();
    document.getElementById('modal-escaner').classList.add('hidden');
}

function detenerEscaner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            html5QrCode = null;
        }).catch(err => console.error(err));
    }
}

function manejarCodigoDetectado(codigo) {
    const producto = inventario.find(p => p.codigo === codigo);
    if (producto) {
        agregarAlCarrito(producto);
    } else {
        alert(`Código no registrado: ${codigo}`);
    }
}

// --- CARRITO DE COMPRAS ---
function agregarAlCarrito(producto) {
    const item = carrito.find(i => i.id === producto.id);
    if (item) {
        item.quantity += 1;
    } else {
        carrito.push({ ...producto, quantity: 1 });
    }
    actualizarVistaCarrito();
}

function actualizarVistaCarrito() {
    const lista = document.getElementById('lista-carrito');
    const txtSubtotal = document.getElementById('txt-subtotal');
    const txtTotal = document.getElementById('txt-total');

    if (carrito.length === 0) {
        lista.innerHTML = `<p class="text-slate-400 text-center py-10 text-sm">El carrito está vacío</p>`;
        txtSubtotal.textContent = '$0.00';
        txtTotal.textContent = '$0.00';
        return;
    }

    let html = '';
    let subtotal = 0;

    carrito.forEach((item, index) => {
        const totalItem = item.precio * item.quantity;
        subtotal += totalItem;

        html += `
            <div class="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                    <h4 class="font-medium text-sm text-slate-900">${item.nombre}</h4>
                    <p class="text-xs text-slate-500">$${item.precio.toFixed(2)} c/u</p>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-sm font-semibold">x${item.quantity}</span>
                    <span class="text-sm font-bold text-slate-900">$${totalItem.toFixed(2)}</span>
                    <button onclick="eliminarItemCarrito(${index})" class="text-red-500 hover:text-red-700 text-xs font-bold p-1">✕</button>
                </div>
            </div>
        `;
    });

    lista.innerHTML = html;
    txtSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    txtTotal.textContent = `$${subtotal.toFixed(2)}`;
}

window.eliminarItemCarrito = function(index) {
    carrito.splice(index, 1);
    actualizarVistaCarrito();
};

function mostrarSugerenciasBusqueda(resultados) {
    // Opcional para mostrar resultados rápidos debajo del input de búsqueda
    const contenedor = document.getElementById('sugerencias-busqueda');
    if (!contenedor) return;
    
    if (resultados.length === 0 || document.getElementById('busqueda-input').value === '') {
        contenedor.innerHTML = '';
        return;
    }

    let html = '<div class="absolute left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 z-10 max-h-40 overflow-y-auto">';
    resultados.forEach(p => {
        html += `<div onclick="agregarAlCarritoPorId('${p.id}')" class="p-2 hover:bg-blue-50 cursor-pointer flex justify-between text-sm">
            <span>${p.nombre}</span>
            <span class="font-bold text-blue-600">$${p.precio.toFixed(2)}</span>
        </div>`;
    });
    html += '</div>';
    contenedor.innerHTML = html;
}

window.agregarAlCarritoPorId = function(id) {
    const prod = inventario.find(p => p.id === id);
    if (prod) agregarAlCarrito(prod);
    document.getElementById('busqueda-input').value = '';
    document.getElementById('sugerencias-busqueda').innerHTML = '';
};

// --- GESTIÓN DE INVENTARIO ---
function renderizarInventario() {
    const contenedor = document.getElementById('tabla-inventario');
    if (!contenedor) return;

    let html = '';
    inventario.forEach(p => {
        html += `
            <div class="p-4 flex items-center justify-between gap-3 hover:bg-slate-50">
                <div>
                    <h4 class="font-semibold text-slate-800">${p.nombre}</h4>
                    <p class="text-xs text-slate-500 font-mono">Código: ${p.codigo}</p>
                </div>
                <div class="text-right">
                    <span class="font-bold text-slate-900">$${p.precio.toFixed(2)}</span>
                    <p class="text-xs text-slate-400">Stock: ${p.stock}</p>
                </div>
            </div>
        `;
    });
    contenedor.innerHTML = html;
}
