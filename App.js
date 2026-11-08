import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  ShoppingCart, 
  Package, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  RefreshCw, 
  Barcode, 
  Upload, 
  Image as ImageIcon,
  DollarSign,
  Tag,
  FileText
} from 'lucide-react';

// Productos de muestra iniciales
const INITIAL_PRODUCTS = [
  { id: '1', code: '7501055300074', name: 'Coca Cola 600ml', price: 1.25, cost: 0.90, stock: 24, description: 'Bebida gaseosa refrescante', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=60' },
  { id: '2', code: '7501000111204', name: 'Papas Lays Clásicas', price: 0.75, cost: 0.50, stock: 15, description: 'Frituras de papa con sal', image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&auto=format&fit=crop&q=60' },
  { id: '3', code: '1001', name: 'Impresión B/N Carta', price: 0.10, cost: 0.02, stock: 500, description: 'Impresión láser blanco y negro', image: '' },
  { id: '4', code: '1002', name: 'Impresión Color Carta', price: 0.25, cost: 0.05, stock: 500, description: 'Impresión inyección de tinta color', image: '' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('pos'); // 'pos', 'lookup', 'inventory'
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('store_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });
  
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [scannedResult, setScannedResult] = useState(null);
  
  // Estado para el modal de agregar/editar producto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    code: '',
    name: '',
    price: '',
    cost: '',
    stock: '',
    description: '',
    image: ''
  });

  // Estado para el Escáner de Cámara
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState('pos'); // 'pos', 'lookup', 'form'
  const [cameras, setCameras] = useState([]);
  const [activeCameraId, setActiveCameraId] = useState(null);
  const html5QrCodeRef = useRef(null);
  
  // Estado para la Captura de Foto de Producto
  const [isCameraCaptureOpen, setIsCameraCaptureOpen] = useState(false);
  const captureVideoRef = useRef(null);
  const captureStreamRef = useRef(null);

  // Guardar en localStorage cuando cambie la lista de productos
  useEffect(() => {
    localStorage.setItem('store_products', JSON.stringify(products));
  }, [products]);

  // Cargar dinámicamente la librería Html5Qrcode
  useEffect(() => {
    if (!window.Html5Qrcode) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // --- LÓGICA DEL ESCÁNER DE CÓDIGO DE BARRAS ---
  const startScanner = async (target = 'pos') => {
    setScannerTarget(target);
    setIsScannerOpen(true);

    // Esperar a que el elemento DOM y la librería estén cargados
    setTimeout(async () => {
      if (!window.Html5Qrcode) {
        alert('Cargando motor del escáner... Intenta de nuevo en unos segundos.');
        setIsScannerOpen(false);
        return;
      }

      try {
        const devices = await window.Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Preferir la cámara trasera (back/rear/environment)
          const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('trasera') || d.label.toLowerCase().includes('environment'));
          const selectedCamId = backCam ? backCam.id : devices[devices.length - 1].id;
          setActiveCameraId(selectedCamId);
          initCameraStream(selectedCamId);
        } else {
          alert('No se detectaron cámaras en tu dispositivo.');
          setIsScannerOpen(false);
        }
      } catch (err) {
        console.error("Error obteniendo cámaras:", err);
        alert('No se pudo acceder a la cámara. Revisa los permisos de tu navegador.');
        setIsScannerOpen(false);
      }
    }, 300);
  };

  const initCameraStream = (cameraId) => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().catch(() => {}).then(() => {
        startHtml5QrcodeInstance(cameraId);
      });
    } else {
      startHtml5QrcodeInstance(cameraId);
    }
  };

  const startHtml5QrcodeInstance = (cameraId) => {
    const html5QrCode = new window.Html5Qrcode("reader");
    html5QrCodeRef.current = html5QrCode;

    // Configuración optimizada para área amplia de escaneo
    const config = {
      fps: 15,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        // Usa casi todo el ancho disponible para facilitar enfocar códigos de barra largos (EAN-13, Code128)
        const width = Math.floor(viewfinderWidth * 0.85);
        const height = Math.floor(Math.min(viewfinderHeight * 0.45, 220));
        return { width, height };
      },
      aspectRatio: 1.333333
    };

    html5QrCode.start(
      cameraId,
      config,
      (decodedText) => {
        handleBarcodeScanned(decodedText);
      },
      () => {
        // Errores de frame simple ignorados para no saturar la consola
      }
    ).catch(err => {
      console.error("Error al iniciar lector:", err);
    });
  };

  const switchCamera = () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamId = cameras[nextIndex].id;
    setActiveCameraId(nextCamId);
    initCameraStream(nextCamId);
  };

  const stopScanner = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().then(() => {
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }).catch(err => console.error(err));
    }
    setIsScannerOpen(false);
  };

  const handleBarcodeScanned = (code) => {
    // Sonido o respuesta háptica de escaneo exitoso si está disponible
    if (navigator.vibrate) navigator.vibrate(100);

    if (scannerTarget === 'form') {
      setProductForm(prev => ({ ...prev, code }));
      stopScanner();
      return;
    }

    const found = products.find(p => p.code === code);

    if (scannerTarget === 'lookup') {
      if (found) {
        setScannedResult(found);
      } else {
        alert(`Producto con código "${code}" no encontrado en el inventario.`);
      }
      stopScanner();
    } else if (scannerTarget === 'pos') {
      if (found) {
        addToCart(found);
        // Pausa breve para evitar agregar 10 veces el mismo item por mantener la cámara enfocada
        stopScanner();
      } else {
        alert(`Producto no registrado (${code}). Redirigiendo a agregar producto...`);
        stopScanner();
        openProductModal(null, code);
      }
    }
  };

  // --- CAPTURA DE FOTOS DE PRODUCTOS CON LA CÁMARA ---
  const startCameraCapture = async () => {
    setIsCameraCaptureOpen(true);
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        captureStreamRef.current = stream;
        if (captureVideoRef.current) {
          captureVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accediendo a la cámara:", err);
        alert("No se pudo abrir la cámara para tomar la fotografía.");
        setIsCameraCaptureOpen(false);
      }
    }, 200);
  };

  const takePhoto = () => {
    if (!captureVideoRef.current) return;
    const video = captureVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    setProductForm(prev => ({ ...prev, image: dataUrl }));
    stopCameraCapture();
  };

  const stopCameraCapture = () => {
    if (captureStreamRef.current) {
      captureStreamRef.current.getTracks().forEach(track => track.stop());
      captureStreamRef.current = null;
    }
    setIsCameraCaptureOpen(false);
  };

  // --- LÓGICA DEL CARRITO / PUNTO DE VENTA ---
  const addToCart = (product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (id, delta) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // --- GESTIÓN DE INVENTARIO ---
  const openProductModal = (product = null, presetCode = '') => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        code: product.code,
        name: product.name,
        price: product.price.toString(),
        cost: (product.cost || 0).toString(),
        stock: product.stock.toString(),
        description: product.description || '',
        image: product.image || ''
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        code: presetCode,
        name: '',
        price: '',
        cost: '',
        stock: '10',
        description: '',
        image: ''
      });
    }
    setIsModalOpen(true);
  };

  const saveProduct = (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price || !productForm.code) {
      alert('Por favor completa el código, nombre y precio.');
      return;
    }

    const newProd = {
      id: editingProduct ? editingProduct.id : Date.now().toString(),
      code: productForm.code.trim(),
      name: productForm.name.trim(),
      price: parseFloat(productForm.price) || 0,
      cost: parseFloat(productForm.cost) || 0,
      stock: parseInt(productForm.stock) || 0,
      description: productForm.description.trim(),
      image: productForm.image
    };

    if (editingProduct) {
      setProducts(products.map(p => p.id === editingProduct.id ? newProd : p));
    } else {
      setProducts([...products, newProd]);
    }

    setIsModalOpen(false);
  };

  const deleteProduct = (id) => {
    if (confirm('¿Deseas eliminar este producto del inventario?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductForm(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Filtrado de productos para búsquedas
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.code.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Encabezado Principal */}
      <header className="bg-blue-700 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-yellow-300" />
            <h1 className="text-xl font-bold tracking-tight">Mi Tienda POS</h1>
          </div>
          <div className="text-xs bg-blue-800 px-3 py-1 rounded-full text-blue-100">
            {products.length} productos registrados
          </div>
        </div>
      </header>

      {/* Pestañas de Navegación */}
      <nav className="bg-white border-b border-slate-200 sticky top-12 z-20">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'pos' 
                ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Vender / Caja
          </button>
          <button
            onClick={() => setActiveTab('lookup')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'lookup' 
                ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-4 h-4" />
            Consulta Rápida
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'inventory' 
                ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            Inventario
          </button>
        </div>
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 pb-24">

        {/* 1. MODO PUNTO DE VENTA / CAJA */}
        {activeTab === 'pos' && (
          <div className="space-y-4">
            {/* Botón de Escanear Principal */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center">
              <button
                onClick={() => startScanner('pos')}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-4 px-6 rounded-xl shadow-lg flex items-center justify-center gap-3 text-lg transition-transform active:scale-95"
              >
                <Camera className="w-7 h-7" />
                Escanear Producto para Vender
              </button>
            </div>

            {/* Selector de Búsqueda Manual Rápida */}
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Lista Rápida si se está buscando */}
            {searchQuery && (
              <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {filteredProducts.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => { addToCart(p); setSearchQuery(''); }}
                    className="p-3 flex items-center justify-between hover:bg-blue-50 cursor-pointer"
                  >
                    <div>
                      <div className="font-medium text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-500 font-mono">Código: {p.code}</div>
                    </div>
                    <div className="font-bold text-blue-600">${p.price.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Carrito de Compras / Ticket actual */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h2 className="font-bold text-slate-700 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  Productos en la cuenta ({cart.reduce((a, c) => a + c.quantity, 0)})
                </h2>
                {cart.length > 0 && (
                  <button 
                    onClick={clearCart}
                    className="text-xs text-red-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Vaciar
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No hay productos en la cuenta actual.</p>
                  <p className="text-xs text-slate-400 mt-1">Usa la cámara o busca para agregar.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {cart.map(item => (
                    <div key={item.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-800 truncate">{item.name}</h4>
                        <div className="text-xs text-slate-500 font-mono">
                          ${item.price.toFixed(2)} c/u
                        </div>
                      </div>

                      {/* Control de Cantidad (+ / -) */}
                      <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                        <button
                          onClick={() => updateCartQuantity(item.id, -1)}
                          className="w-8 h-8 rounded-md bg-white text-slate-700 shadow-sm flex items-center justify-center font-bold hover:bg-slate-200"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-6 text-center font-bold text-slate-800 text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.id, 1)}
                          className="w-8 h-8 rounded-md bg-blue-600 text-white shadow-sm flex items-center justify-center font-bold hover:bg-blue-700"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Subtotal del item y borrar */}
                      <div className="text-right min-w-[70px]">
                        <div className="font-bold text-slate-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-xs text-red-500 hover:text-red-700 mt-1"
                        >
                          <Trash2 className="w-3.5 h-3.5 ml-auto" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Total Final */}
              {cart.length > 0 && (
                <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                  <div>
                    <div className="text-xs text-slate-400">Total a Pagar</div>
                    <div className="text-2xl font-black text-emerald-400">${subtotal.toFixed(2)}</div>
                  </div>
                  <button 
                    onClick={() => { alert('¡Venta completada con éxito!'); clearCart(); }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-3 rounded-lg shadow transition-colors"
                  >
                    Cobrar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. MODO CONSULTA RÁPIDA DE PRECIOS */}
        {activeTab === 'lookup' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center">
              <button
                onClick={() => startScanner('lookup')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg flex items-center justify-center gap-3 text-lg"
              >
                <Camera className="w-7 h-7" />
                Escanear para Consultar Precio
              </button>
            </div>

            {/* Búsqueda Manual */}
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Escribe el nombre o escanea..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Ficha de Producto Consultado */}
            {scannedResult ? (
              <div className="bg-white rounded-xl shadow-lg border-2 border-emerald-500 p-6 relative overflow-hidden">
                <button
                  onClick={() => setScannedResult(null)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="flex flex-col md:flex-row gap-6 items-center">
                  {scannedResult.image ? (
                    <img 
                      src={scannedResult.image} 
                      alt={scannedResult.name} 
                      className="w-32 h-32 object-cover rounded-xl border border-slate-200"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200">
                      <Package className="w-12 h-12" />
                    </div>
                  )}

                  <div className="flex-1 text-center md:text-left">
                    <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                      Código: {scannedResult.code}
                    </span>
                    <h2 className="text-2xl font-bold text-slate-800 mt-2">{scannedResult.name}</h2>
                    <p className="text-slate-500 text-sm mt-1">{scannedResult.description || 'Sin descripción'}</p>
                    
                    <div className="mt-4 flex items-baseline justify-center md:justify-start gap-2">
                      <span className="text-xs text-slate-400 uppercase font-semibold">Precio:</span>
                      <span className="text-4xl font-black text-emerald-600">${scannedResult.price.toFixed(2)}</span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                      <span>Stock disponible: <strong>{scannedResult.stock} unidades</strong></span>
                      <button 
                        onClick={() => { addToCart(scannedResult); setActiveTab('pos'); }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700"
                      >
                        + Agregar a Venta
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-3">O selecciona un producto de la lista:</h3>
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {filteredProducts.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => setScannedResult(p)}
                      className="py-3 px-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <img src={p.image} className="w-10 h-10 object-cover rounded-md" />
                        ) : (
                          <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center text-slate-400">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-800">{p.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{p.code}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-600">${p.price.toFixed(2)}</div>
                        <div className="text-xs text-slate-400">Stock: {p.stock}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. MODO GESTOR DE INVENTARIO */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar inventario..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => openProductModal()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg flex items-center gap-2 shadow"
              >
                <Plus className="w-5 h-5" /> Nuevo
              </button>
            </div>

            {/* Tabla de Productos */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {filteredProducts.map(p => (
                  <div key={p.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50">
                    <div className="flex items-center gap-3 min-w-0">
                      {p.image ? (
                        <img src={p.image} className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                      ) : (
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-800 truncate">{p.name}</h4>
                        <div className="text-xs text-slate-500 font-mono">Código: {p.code}</div>
                        <div className="text-xs text-slate-400 truncate max-w-xs">{p.description}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-slate-900">${p.price.toFixed(2)}</div>
                        <div className="text-xs text-slate-500">Stock: {p.stock}</div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openProductModal(p)}
                          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL ESCÁNER DE CÁMARA */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-between p-4">
          <div className="w-full max-w-md flex justify-between items-center text-white pt-2">
            <span className="font-semibold text-sm">Escaneando Código de Barras</span>
            <button onClick={stopScanner} className="p-2 text-white bg-slate-800 rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Visor amplio para cámara de teléfono */}
          <div className="w-full max-w-md flex-1 flex flex-col justify-center items-center relative">
            <div id="reader" className="w-full overflow-hidden rounded-2xl border-2 border-blue-500 shadow-2xl"></div>
            <p className="text-white/80 text-xs text-center mt-3 bg-slate-800/80 px-4 py-2 rounded-full">
              Apunta la cámara al código de barras del producto
            </p>
          </div>

          {/* Botón Cambiar Cámara */}
          <div className="w-full max-w-md pb-4 flex justify-center">
            {cameras.length > 1 && (
              <button
                onClick={switchCamera}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-full flex items-center gap-2 border border-slate-700"
              >
                <RefreshCw className="w-4 h-4" /> Cambiar Cámara
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL TOMAR FOTO DEL PRODUCTO */}
      {isCameraCaptureOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-between p-4">
          <div className="w-full max-w-md flex justify-between items-center text-white pt-2">
            <span className="font-semibold text-sm">Fotografiar Producto</span>
            <button onClick={stopCameraCapture} className="p-2 text-white bg-slate-800 rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="w-full max-w-md flex-1 flex items-center justify-center relative my-4">
            <video 
              ref={captureVideoRef} 
              autoPlay 
              playsInline 
              className="w-full h-80 object-cover rounded-2xl border-2 border-white/20"
            />
          </div>

          <div className="w-full max-w-md pb-6 flex justify-center">
            <button
              onClick={takePhoto}
              className="bg-white text-slate-900 font-bold px-8 py-3 rounded-full shadow-lg flex items-center gap-2 text-lg active:scale-95 transition-transform"
            >
              <Camera className="w-6 h-6 text-blue-600" /> Capturar Foto
            </button>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR PRODUCTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden my-8">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveProduct} className="p-6 space-y-4">
              {/* Código de barras */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Código de Barras *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={productForm.code}
                    onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                    placeholder="Escanea o escribe el código"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => startScanner('form')}
                    className="bg-slate-800 text-white px-3 py-2 rounded-lg font-medium text-xs flex items-center gap-1"
                  >
                    <Barcode className="w-4 h-4" /> Escanear
                  </button>
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Ej: Galletas Choco 100g"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Precios y Stock */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Precio ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Costo ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.cost}
                    onChange={(e) => setProductForm({ ...productForm, cost: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Stock</label>
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción</label>
                <textarea
                  rows="2"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Detalles adicionales, ubicación, marca..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                ></textarea>
              </div>

              {/* Foto de producto */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fotografía del Producto</label>
                <div className="flex items-center gap-3">
                  {productForm.image ? (
                    <img src={productForm.image} className="w-16 h-16 object-cover rounded-lg border border-slate-300" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 border border-slate-300">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 flex-1">
                    <button
                      type="button"
                      onClick={startCameraCapture}
                      className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-blue-100"
                    >
                      <Camera className="w-3.5 h-3.5" /> Tomar Foto
                    </button>
                    <label className="bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer hover:bg-slate-200">
                      <Upload className="w-3.5 h-3.5" /> Galería
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                    {productForm.image && (
                      <button
                        type="button"
                        onClick={() => setProductForm({ ...productForm, image: '' })}
                        className="text-red-500 text-xs underline px-1"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}