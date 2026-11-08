// Base de datos inicial en LocalStorage para JEHOVA JIREH
let inventario = JSON.parse(localStorage.getItem('pos_inventario')) || [
    { id: '1', codigo: '7501001300010', nombre: 'Impresión B/N Carta', precio: 0.15, stock: 500 },
    { id: '2', codigo: '7501001300020', nombre: 'Impresión a Color Carta', precio: 0.50, stock: 200 },
    { id: '3', codigo: '7501001300030', nombre: 'Anillado Metálico', precio: 1.50, stock: 50 }
];

let carrito = [];
let html5QrCode = null;
let modoEscannerInventario = false; 
let idProductoEditando = null; 

if (!localStorage.getItem('pos_inventario')) {
    localStorage.setItem('pos_inventario', JSON.stringify(inventario));
}

document.addEventListener('DOMContentLoaded', () => {
    actualizarVistaCarrito();
    renderizarInventario();
    configurarEventos();
});

function configurarEventos() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;
            cambiarPestaña(tab);
        });
    });

    document.getElementById('btn-vaciar').addEventListener('click', () => {
        carrito = [];
        actualizarVistaCarrito();
    });

    document.getElementById('btn-cobrar').addEventListener('click', () => {
        if (carrito.length === 0) return alert('El carrito está vacío');
        
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

    document.getElementById('busqueda-input').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const resultados = inventario.filter(p => p.nombre.toLowerCase().includes(query) || p.codigo.includes(query));
        mostrarSugerenciasBusqueda(resultados);
    });

    // Guardar o actualizar producto desde el formulario
    document.getElementById('form-nuevo-producto').addEventListener('submit', (e) => {
        e.preventDefault();
        const nombre = document.getElementById('input-nombre').value.trim();
        const codigo = document.getElementById('input-codigo').value.trim();
        const precio = parseFloat(document.getElementById('input-precio').value);
        const stock = parseInt(document.getElementById('input-stock').value);

        if (!nombre || !codigo || isNaN(precio) || isNaN(stock)) {
            alert('Por favor completa todos los campos correctamente.');
            return;
        }

        if (idProductoEditando) {
            const prod = inventario.find(p => p.id === idProductoEditando);
            if (prod) {
                prod.nombre = nombre;
                prod.codigo = codigo;
                prod.precio = precio;
                prod.stock = stock;
            }
            idProductoEditando = null;
        } else {
            const nuevoProducto = {
                id: Date.now().toString(),
                codigo,
                nombre,
                precio,
                stock
            };
            inventario.push(nuevoProducto);
        }

        localStorage.setItem('pos_inventario', JSON.stringify(inventario));
        renderizarInventario();
        cerrarModalProducto();
        e.target.reset();
        alert('¡Operación realizada con éxito!');
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

    detenerEscaner();
}

// --- MODAL DE NUEVO / EDITAR PRODUCTO ---
window.abrirModalProducto = function() {
    idProductoEditando = null;
    document.getElementById('titulo-modal-producto').textContent = "Registrar Nuevo Producto";
    document.getElementById('form-nuevo-producto').reset();
    document.getElementById('modal-producto').classList.remove('hidden');
}

window.cerrarModalProducto = function() {
    idProductoEditando = null;
    document.getElementById('modal-producto').classList.add('hidden');
}

window.editarProducto = function(id) {
    const prod = inventario.find(p => p.id === id);
    if (!prod) return;

    idProductoEditando = prod.id;
    document.getElementById('titulo-modal-producto').textContent = "Modificar Producto";
    document.getElementById('input-nombre').value = prod.nombre;
    document.getElementById('input-codigo').value = prod.codigo;
    document.getElementById('input-precio').value = prod.precio;
    document.getElementById('input-stock').value = prod.stock;
    document.getElementById('busqueda-input').value = '';
    document.getElementById('sugerencias-busqueda').innerHTML = '';
    
    document.getElementById('modal-producto').classList.remove('hidden');
}

// --- ESCÁNER DE CÁMARA ROBUSTO ---
window.iniciarEscaner = function() {
    modoEscannerInventario = false;
    abrirModalEscanerVisual();
}

window.iniciarEscanerParaInventario = function() {
    modoEscannerInventario = true;
    abrirModalEscanerVisual();
}

function abrirModalEscanerVisual() {
    const contenedorModal = document.getElementById('modal-escaner');
    contenedorModal.classList.remove('hidden');

    setTimeout(() => {
        if (html5QrCode) {
            html5QrCode.stop().catch(() => {}).then(() => iniciarInstanciaLector());
        } else {
            iniciarInstanciaLector();
        }
    }, 200);
}

function iniciarInstanciaLector() {
    html5QrCode = new Html5Qrcode("reader-container");
    const config = { fps: 10, qrbox: { width: 250, height: 150 } };

    html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        (decodedText) => {
            manejarCodigoDetectado(decodedText);
            detenerEscaner();
        },
        () => {}
    ).catch(err => {
        console.error("Error al iniciar cámara:", err);
        alert('No se pudo acceder a la cámara. Revisa los permisos.');
        detenerEscaner();
    });
}

window.cerrarEscaner = function() {
    detenerEscaner();
}

function detenerEscaner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            html5QrCode = null;
        }).catch(() => {});
    }
    const contenedorModal = document.getElementById('modal-escaner');
    if (contenedorModal) contenedorModal.classList.add('hidden');
}

function manejarCodigoDetectado(codigo) {
    const cleanCode = codigo.trim();
    if (modoEscannerInventario) {
        const inputCodigo = document.getElementById('input-codigo');
        if (inputCodigo) {
            inputCodigo.value = cleanCode;
        }
        modoEscannerInventario = false;
    } else {
        const producto = inventario.find(p => p.codigo.toLowerCase() === cleanCode.toLowerCase());
        if (producto) {
            agregarAlCarrito(producto);
        } else {
            if (confirm(`El código "${cleanCode}" no está registrado. ¿Deseas agregarlo ahora?`)) {
                abrirModalProducto();
                document.getElementById('input-codigo').value = cleanCode;
            }
        }
    }
}

// --- CARRITO ---
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

    if (!lista) return;

    if (carrito.length === 0) {
        lista.innerHTML = `<p class="text-slate-400 text-center py-10 text-sm">El carrito está vacío</p>`;
        if (txtSubtotal) txtSubtotal.textContent = '$0.00';
        if (txtTotal) txtTotal.textContent = '$0.00';
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
    if (txtSubtotal) txtSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    if (txtTotal) txtTotal.textContent = `$${subtotal.toFixed(2)}`;
}

window.eliminarItemCarrito = function(index) {
    carrito.splice(index, 1);
    actualizarVistaCarrito();
};

function mostrarSugerenciasBusqueda(resultados) {
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

// --- INVENTARIO Y MODIFICACIÓN ---
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
                <div class="flex items-center gap-4">
                    <div class="text-right">
                        <span class="font-bold text-slate-900">$${p.precio.toFixed(2)}</span>
                        <p class="text-xs text-slate-400">Stock: ${p.stock}</p>
                    </div>
                    <div class="flex gap-1">
                        <button onclick="editarProducto('${p.id}')" class="bg-amber-500 hover:bg-amber-600 text-white text-xs px-2.5 py-1.5 rounded transition shadow-sm">Editar</button>
                        <button onclick="eliminarProducto('${p.id}')" class="bg-red-500 hover:bg-red-600 text-white text-xs px-2.5 py-1.5 rounded transition shadow-sm">Eliminar</button>
                    </div>
                </div>
            </div>
        `;
    });
    contenedor.innerHTML = html;
}

window.eliminarProducto = function(id) {
    if (confirm('¿Estás seguro de eliminar este producto del inventario?')) {
        inventario = inventario.filter(p => p.id !== id);
        localStorage.setItem('pos_inventario', JSON.stringify(inventario));
        renderizarInventario();
    }
}

// --- COPIA DE SEGURIDAD (EXPORTAR E IMPORTAR) ---
window.exportarInventario = function() {
    const datosStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(inventario, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", datosStr);
    downloadAnchor.setAttribute("download", `inventario_jehova_jireh_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

window.importarInventario = function(event) {
    const archivo = event.target.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = function(e) {
        try {
            const datosImportados = JSON.parse(e.target.result);
            if (Array.isArray(datosImportados)) {
                inventario = datosImportados;
                localStorage.setItem('pos_inventario', JSON.stringify(inventario));
                renderizarInventario();
                alert('¡Inventario restaurado con éxito desde la copia de seguridad!');
            } else {
                alert('El archivo no tiene un formato válido.');
            }
        } catch (err) {
            alert('Error al leer el archivo JSON.');
        }
    };
    lector.readAsText(archivo);
}
