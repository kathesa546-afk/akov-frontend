// =====================
// CONFIGURACIÓN API
// =====================
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:8000/api'
  : 'https://web-production-3b3ef.up.railway.app/api';
  
const getToken = () => localStorage.getItem('akov_token');
const getRefreshToken = () => localStorage.getItem('akov_refresh');
const setToken = t => localStorage.setItem('akov_token', t);
const setRefreshToken = t => localStorage.setItem('akov_refresh', t);
const removeToken = () => { localStorage.removeItem('akov_token'); localStorage.removeItem('akov_refresh'); };
const getUsuarioGuardado = () => {
  const u = localStorage.getItem('akov_usuario');
  return u ? JSON.parse(u) : null;
};
const setUsuarioGuardado = u => localStorage.setItem('akov_usuario', JSON.stringify(u));
const removeUsuario = () => localStorage.removeItem('akov_usuario');

// ✅ CORREGIDO: interceptor que renueva el token automáticamente cuando expira (401)
async function apiCall(endpoint, method = 'GET', data = null, retry = true) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const opts = { method, headers };
  if (data) opts.body = JSON.stringify(data);

  try {
    const res = await fetch(API_URL + endpoint, opts);

    // ✅ Token expirado → intentar refrescar una vez
    if (res.status === 401 && retry) {
      const refreshed = await refrescarAccess();
      if (refreshed) return apiCall(endpoint, method, data, false);
      // No se pudo refrescar → cerrar sesión silenciosamente
      await cerrarSesionSilencioso();
      return null;
    }

    if (res.status === 204) return {};
    return await res.json();
  } catch (e) {
    console.error('API error:', e);
    return null;
  }
}

async function refrescarAccess() {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(API_URL + '/auth/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh })
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.access) {
      setToken(data.access);
      if (data.refresh) setRefreshToken(data.refresh);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function cerrarSesionSilencioso() {
  removeToken();
  removeUsuario();
  usuarioActual = null;
  favoritos = [];
  actualizarNavbarUsuario();
}

// =====================
// PRODUCTOS (datos de respaldo mientras carga la API)
// =====================
const PRODUCTOS_DATA = [
  {
    id: 1, nombre: "Blazer Oversized", cat: "chaquetas", genero: "mujer",
    color: "negro", fit: "holgada", material: "lana", precio: 320000,
    ventas: 142, tag: "new", icono: "🧥",
    tallas: [{nombre:"XS",disponible:true},{nombre:"S",disponible:true},{nombre:"M",disponible:true},{nombre:"L",disponible:true},{nombre:"XL",disponible:true}],
    descripcion: "Blazer oversized en lana premium. Corte relajado con hombros caídos. Forro interior suave."
  },
  {
    id: 2, nombre: "Camisa Oxford", cat: "camisas", genero: "hombre",
    color: "blanco", fit: "regular", material: "algodón", precio: 98000,
    ventas: 380, tag: "", icono: "👔",
    tallas: [{nombre:"S",disponible:true},{nombre:"M",disponible:true},{nombre:"L",disponible:true},{nombre:"XL",disponible:true},{nombre:"XXL",disponible:false}],
    descripcion: "Camisa Oxford 100% algodón. Tejido resistente y transpirable. Cuello button-down."
  },
  {
    id: 3, nombre: "Vestido Midi Seda", cat: "vestidos", genero: "mujer",
    color: "negro", fit: "ajustada", material: "seda", precio: 285000, precioOriginal: 398000,
    ventas: 95, tag: "sale", icono: "👗",
    tallas: [{nombre:"XS",disponible:false},{nombre:"S",disponible:true},{nombre:"M",disponible:true},{nombre:"L",disponible:true}],
    descripcion: "Vestido midi en seda natural. Caída fluida y elegante. Escote en V sutil."
  },
  {
    id: 4, nombre: "Pantalón Wide Leg", cat: "pantalones", genero: "mujer",
    color: "beige", fit: "holgada", material: "lino", precio: 175000,
    ventas: 210, tag: "", icono: "👖",
    tallas: [{nombre:"XS",disponible:true},{nombre:"S",disponible:true},{nombre:"M",disponible:true},{nombre:"L",disponible:true},{nombre:"XL",disponible:true}],
    descripcion: "Pantalón wide leg en lino premium. Tiro alto con cinturilla elástica."
  },
  {
    id: 5, nombre: "Chaqueta Denim", cat: "chaquetas", genero: "hombre",
    color: "azul", fit: "regular", material: "denim", precio: 248000, precioOriginal: 310000,
    ventas: 167, tag: "sale", icono: "🧥",
    tallas: [{nombre:"S",disponible:false},{nombre:"M",disponible:true},{nombre:"L",disponible:true},{nombre:"XL",disponible:true}],
    descripcion: "Chaqueta denim clásica con lavado vintage. Bolsillos frontales y en pecho."
  },
  {
    id: 6, nombre: "Blusa de Seda", cat: "blusas", genero: "mujer",
    color: "blanco", fit: "holgada", material: "seda", precio: 142000,
    ventas: 89, tag: "new", icono: "👚",
    tallas: [{nombre:"XS",disponible:true},{nombre:"S",disponible:true},{nombre:"M",disponible:true},{nombre:"L",disponible:true},{nombre:"XL",disponible:true}],
    descripcion: "Blusa holgada en seda natural. Mangas largas con puños. Cuello redondo."
  },
  {
    id: 7, nombre: "Camisa Lino Manga", cat: "camisas", genero: "hombre",
    color: "beige", fit: "regular", material: "lino", precio: 115000,
    ventas: 303, tag: "", icono: "👕",
    tallas: [{nombre:"S",disponible:true},{nombre:"M",disponible:true},{nombre:"L",disponible:true},{nombre:"XL",disponible:true},{nombre:"XXL",disponible:true}],
    descripcion: "Camisa manga larga en lino 100%. Ligera y transpirable."
  },
  {
    id: 8, nombre: "Vestido Mini", cat: "vestidos", genero: "mujer",
    color: "negro", fit: "ajustada", material: "algodón", precio: 195000,
    ventas: 178, tag: "", icono: "👗",
    tallas: [{nombre:"XS",disponible:true},{nombre:"S",disponible:true},{nombre:"M",disponible:true},{nombre:"L",disponible:true}],
    descripcion: "Vestido mini ajustado en algodón stretch. Sin mangas con escote cuadrado."
  },
  {
    id: 9, nombre: "Pantalón Chino", cat: "pantalones", genero: "hombre",
    color: "beige", fit: "regular", material: "algodón", precio: 138000, precioOriginal: 180000,
    ventas: 445, tag: "sale", icono: "👖",
    tallas: [{nombre:"28",disponible:false},{nombre:"30",disponible:true},{nombre:"32",disponible:true},{nombre:"34",disponible:true},{nombre:"36",disponible:true}],
    descripcion: "Pantalón chino slim en algodón. Tiro medio con cierre frontal."
  },
  {
    id: 10, nombre: "Sudadera Niño", cat: "camisas", genero: "niño",
    color: "gris", fit: "regular", material: "algodón", precio: 75000,
    ventas: 220, tag: "new", icono: "👕",
    tallas: [{nombre:"2",disponible:true},{nombre:"4",disponible:true},{nombre:"6",disponible:true},{nombre:"8",disponible:true},{nombre:"10",disponible:true},{nombre:"12",disponible:true}],
    descripcion: "Sudadera cómoda para niños en algodón suave."
  },
  {
    id: 11, nombre: "Vestido Niña", cat: "vestidos", genero: "niño",
    color: "blanco", fit: "regular", material: "algodón", precio: 89000,
    ventas: 130, tag: "", icono: "👗",
    tallas: [{nombre:"2",disponible:false},{nombre:"4",disponible:true},{nombre:"6",disponible:true},{nombre:"8",disponible:true},{nombre:"10",disponible:true},{nombre:"12",disponible:true}],
    descripcion: "Vestido infantil en algodón con bordados florales."
  },
  {
    id: 12, nombre: "Abrigo Clásico", cat: "chaquetas", genero: "mujer",
    color: "negro", fit: "ajustada", material: "lana", precio: 485000, precioOriginal: 620000,
    ventas: 58, tag: "sale", icono: "🧥",
    tallas: [{nombre:"XS",disponible:false},{nombre:"S",disponible:true},{nombre:"M",disponible:true},{nombre:"L",disponible:true},{nombre:"XL",disponible:false}],
    descripcion: "Abrigo largo en mezcla de lana premium. Corte estructurado con botonadura doble."
  }
];

// =====================
// ESTADO GLOBAL
// =====================
let productos = [...PRODUCTOS_DATA];
let filtroActivo = "all";
let carrito = JSON.parse(localStorage.getItem('akov_carrito') || '[]'); // ✅ Persiste el carrito
let favoritos = [];
let usuarioActual = null;
let tallaSeleccionada = null;

// =====================
// PERSISTIR CARRITO
// =====================
function guardarCarrito() {
  localStorage.setItem('akov_carrito', JSON.stringify(carrito));
}

// =====================
// CARGAR PRODUCTOS DESDE API
// =====================
async function cargarProductosAPI() {
  const res = await apiCall('/productos/');
  if (res && Array.isArray(res) && res.length > 0) {
    productos = res.map(p => ({
      id: p.id,
      nombre: p.nombre,
      slug: p.slug,
      cat: p.categoria_slug || 'general',
      genero: p.genero,
      color: p.color,
      fit: p.fit,
      material: p.material,
      precio: parseFloat(p.precio),
      precioOriginal: p.precio_original ? parseFloat(p.precio_original) : null,
      ventas: p.ventas,
      tag: p.tiene_descuento ? 'sale' : (p.nuevo ? 'new' : ''),
      // ✅ CORREGIDO: usa foto_principal de la API (URL absoluta)
      foto: p.foto_principal || null,
      fotoModelo: p.foto_modelo || null,
      icono: p.foto_principal ? null : '👗',
      // ✅ CORREGIDO: tallas como objetos {nombre, disponible}
      tallas: p.tallas || [],
      descripcion: p.descripcion,
    }));
    renderProductos(obtenerListaFiltrada());
  }
}

// =====================
// NAVBAR USUARIO
// =====================
function actualizarNavbarUsuario() {
  const info = document.getElementById('usuarioInfo');
  const nombreEl = document.getElementById('usuarioNombre');
  const btnLogin = document.getElementById('btnLogin');

  if (usuarioActual) {
    info.style.display = 'flex';
    nombreEl.textContent = usuarioActual.nombre
      ? usuarioActual.nombre.split(' ')[0]
      : usuarioActual.email.split('@')[0];
    btnLogin.style.display = 'none';
  } else {
    info.style.display = 'none';
    btnLogin.style.display = 'flex';
  }
}

// =====================
// SESIÓN
// =====================
async function verificarSesion() {
  const usuario = getUsuarioGuardado();
  const token = getToken();
  if (usuario && token) {
    usuarioActual = usuario;
    actualizarNavbarUsuario();
    cargarFavoritosBackend();
    // Pre-llenar checkout si hay sesión
    if (usuarioActual.nombre) {
      const chkNombre = document.getElementById('chkNombre');
      if (chkNombre && !chkNombre.value) chkNombre.value = usuarioActual.nombre;
    }
  }
}

async function loginUser() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  if (!email || !pass) { mostrarNotificacion('Completa todos los campos'); return; }

  const res = await apiCall('/auth/login/', 'POST', { email, password: pass });
  if (!res) { mostrarNotificacion('Error de conexión'); return; }
  if (res.error) { mostrarNotificacion(res.error); return; }
  if (!res.tokens || !res.tokens.access) { mostrarNotificacion('Error del servidor'); return; }

  setToken(res.tokens.access);
  // ✅ CORREGIDO: guardar también el refresh token
  if (res.tokens.refresh) setRefreshToken(res.tokens.refresh);
  setUsuarioGuardado(res.usuario);
  usuarioActual = res.usuario;
  actualizarNavbarUsuario();
  cerrarTodosLosPaneles();
  mostrarNotificacion('Bienvenido, ' + (usuarioActual.nombre || usuarioActual.email).split(' ')[0]);
  cargarFavoritosBackend();

  // Pre-llenar checkout
  const chkNombre = document.getElementById('chkNombre');
  if (chkNombre && usuarioActual.nombre) chkNombre.value = usuarioActual.nombre;
}

async function registerUser() {
  const nombre = document.getElementById('regNombre').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPass').value;
  if (!nombre || !email || !pass) { mostrarNotificacion('Completa todos los campos'); return; }
  if (pass.length < 8) { mostrarNotificacion('Mínimo 8 caracteres'); return; }

  const res = await apiCall('/auth/registro/', 'POST', { nombre, email, password: pass });
  if (!res) { mostrarNotificacion('Error de conexión'); return; }
  if (res.error) { mostrarNotificacion(res.error); return; }
  if (!res.tokens || !res.tokens.access) { mostrarNotificacion('Error del servidor'); return; }

  setToken(res.tokens.access);
  // ✅ CORREGIDO: guardar también el refresh token
  if (res.tokens.refresh) setRefreshToken(res.tokens.refresh);
  setUsuarioGuardado(res.usuario);
  usuarioActual = res.usuario;
  actualizarNavbarUsuario();
  cerrarTodosLosPaneles();
  mostrarNotificacion(res.mensaje);
  cargarFavoritosBackend();
}

async function cerrarSesion() {
  // ✅ CORREGIDO: envía el refresh token para invalidarlo en backend
  const refresh = getRefreshToken();
  if (refresh) {
    await apiCall('/auth/logout/', 'POST', { refresh });
  }
  removeToken();
  removeUsuario();
  usuarioActual = null;
  favoritos = [];
  document.getElementById('favCount').textContent = '0';
  actualizarNavbarUsuario();
  actualizarFavoritos();
  renderProductos(obtenerListaFiltrada());
  mostrarNotificacion('Sesión cerrada correctamente');
}

function toggleLogin() {
  const overlay = document.getElementById('loginOverlay');
  const isOpen = overlay.classList.contains('open');
  cerrarTodosLosPaneles();
  if (!isOpen) {
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPass').value = '';
    document.getElementById('regNombre').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPass').value = '';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function switchTab(tab) {
  document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
  event.currentTarget.classList.add('active');
  document.getElementById('tabLogin').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('tabRegister').style.display = tab === 'register' ? 'block' : 'none';
}

// =====================
// RENDER PRODUCTOS
// =====================
function renderImagen(p, clase = 'product-img-inner') {
  // ✅ CORREGIDO: muestra imagen real si viene de la API, icono si no
  if (p.foto) {
    return `<img src="${p.foto}" alt="${p.nombre}" class="${clase}" loading="lazy" onerror="this.outerHTML='<span class=\\"product-img-inner\\">${p.icono || '👗'}</span>'">`;
  }
  return `<span class="${clase}">${p.icono || '👗'}</span>`;
}

function renderProductos(lista) {
  const grid = document.getElementById("productsGrid");
  const contador = document.getElementById("resultCount");
  contador.textContent = lista.length + " resultados";

  if (!lista.length) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#999490;padding:3rem;font-size:.82rem">No se encontraron productos.</p>';
    return;
  }

  grid.innerHTML = lista.map(p => `
    <div class="product-card">
      <div class="product-img" onclick="abrirProducto(${p.id})">
        ${renderImagen(p)}
        ${p.fotoModelo ? `<img src="${p.fotoModelo}" alt="${p.nombre}" class="product-img-hover" loading="lazy">` : ''}
        ${p.tag ? `<span class="product-tag ${p.tag === 'sale' ? 'sale' : ''}">${p.tag === 'sale' ? 'Oferta' : 'Nuevo'}</span>` : ''}
        <div class="product-actions">
          <button class="pa-add" onclick="event.stopPropagation(); abrirProducto(${p.id})">Ver producto</button>
          <button class="pa-fav" onclick="event.stopPropagation(); toggleFav(${p.id})"
            style="color:${favoritos.find(f => f.id === p.id) ? '#c0392b' : 'inherit'}">
            ${favoritos.find(f => f.id === p.id) ? '♥' : '♡'}
          </button>
        </div>
      </div>
      <p class="product-name">${p.nombre}</p>
      <p class="product-meta">${capitalizar(p.genero)} · ${p.fit} · ${p.material}</p>
      <p class="product-price">
        ${p.precioOriginal
          ? `<span class="price-original">$${formatPrecio(p.precioOriginal)}</span>
             <span class="price-sale">$${formatPrecio(p.precio)}</span>`
          : `$${formatPrecio(p.precio)}`}
      </p>
    </div>
  `).join('');
}

// =====================
// MODAL PRODUCTO
// =====================
function abrirProducto(id) {
  const p = productos.find(x => x.id === id);
  if (!p) return;
  tallaSeleccionada = null;

  // ✅ CORREGIDO: galería funcional con imágenes reales o iconos
  const fotos = p.fotos && p.fotos.length > 0
    ? p.fotos
    : [{ imagen_url: null, icono: p.icono || '👗' }];

  const primeraFoto = fotos[0];
  const fotoMainHTML = primeraFoto.imagen_url
    ? `<img src="${primeraFoto.imagen_url}" alt="${p.nombre}" id="galeriaMainImg" style="width:100%;height:100%;object-fit:cover">`
    : `<span id="galeriaMainIcon" style="font-size:5rem">${p.icono || '👗'}</span>`;

  const miniaturasHTML = fotos.map((f, i) => {
    const content = f.imagen_url
      ? `<img src="${f.imagen_url}" alt="${p.nombre} foto ${i+1}" style="width:100%;height:100%;object-fit:cover">`
      : `<span style="font-size:1.8rem">${p.icono || '👗'}</span>`;
    return `<div class="miniatura ${i === 0 ? 'active' : ''}" onclick="cambiarFoto(this, '${f.imagen_url || ''}', '${p.icono || '👗'}')">${content}</div>`;
  }).join('');

  // ✅ CORREGIDO: tallas como objetos {nombre, disponible}
  const tallasArr = p.tallas || [];
  const tallasHTML = tallasArr.map(t => {
    const nombre = typeof t === 'string' ? t : t.nombre;
    const disponible = typeof t === 'string' ? true : t.disponible !== false;
    return `
      <button class="talla-btn ${!disponible ? 'agotada' : ''}"
        ${!disponible ? 'disabled' : `onclick="seleccionarTalla(this,'${nombre}')"`}
      >${nombre}</button>
    `;
  }).join('');

  document.getElementById("modalProductoContenido").innerHTML = `
    <div class="producto-detalle">
      <div class="producto-galeria">
        <div class="producto-galeria-principal" id="galeriaMain">${fotoMainHTML}</div>
        <div class="producto-miniaturas">${miniaturasHTML}</div>
      </div>
      <div class="producto-info">
        ${p.tag ? `<span class="product-tag ${p.tag === 'sale' ? 'sale' : ''}" style="display:inline-block;margin-bottom:.75rem">${p.tag === 'sale' ? 'Oferta' : 'Nuevo'}</span>` : ''}
        <h2 class="producto-info-nombre">${p.nombre}</h2>
        <p class="producto-info-meta">${capitalizar(p.genero)} · ${capitalizar(p.cat)} · ${p.material} · Fit ${p.fit}</p>
        <p class="producto-info-precio">
          ${p.precioOriginal
            ? `<span class="price-original">$${formatPrecio(p.precioOriginal)}</span>
               <span class="price-sale">$${formatPrecio(p.precio)}</span>`
            : `$${formatPrecio(p.precio)}`}
        </p>
        <p class="tallas-label">Selecciona tu talla</p>
        <div class="tallas-grid">${tallasHTML}</div>
        <div class="producto-btns">
          <button class="btn-primary" style="flex:1" onclick="agregarDesdeDetalle(${p.id})">Agregar al carrito</button>
          <button class="btn-outline" id="btnFavDetalle${p.id}"
            onclick="toggleFav(${p.id}); actualizarBtnFav(${p.id})">
            ${favoritos.find(f => f.id === p.id) ? '♥ Guardado' : '♡ Favorito'}
          </button>
        </div>
        <p class="producto-desc">${p.descripcion}</p>
        <div style="margin-top:1.25rem;padding-top:1.25rem;border-top:0.5px solid var(--gris-200)">
          <p style="font-size:0.62rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--gris-400);margin-bottom:.75rem">Envío y devoluciones</p>
          <p style="font-size:0.72rem;color:var(--gris-600);line-height:1.8;font-weight:300">
            📦 Envío a todo Colombia · 3-5 días hábiles<br>
            🔄 Devoluciones hasta 15 días después de la entrega<br>
            🔒 Pago 100% seguro y encriptado
          </p>
        </div>
      </div>
    </div>
  `;

  document.getElementById("productModal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function cerrarProducto() {
  document.getElementById("productModal").classList.remove("open");
  document.body.style.overflow = "";
}

// ✅ CORREGIDO: cambiarFoto ahora realmente cambia la imagen principal
function cambiarFoto(el, imgUrl, icono) {
  const main = document.getElementById("galeriaMain");
  if (imgUrl) {
    main.innerHTML = `<img src="${imgUrl}" alt="foto" style="width:100%;height:100%;object-fit:cover">`;
  } else {
    main.innerHTML = `<span style="font-size:5rem">${icono}</span>`;
  }
  document.querySelectorAll(".miniatura").forEach(m => m.classList.remove("active"));
  el.classList.add("active");
}

function seleccionarTalla(btn, talla) {
  document.querySelectorAll(".talla-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  tallaSeleccionada = talla;
}

function agregarDesdeDetalle(id) {
  if (!tallaSeleccionada) { mostrarNotificacion("Selecciona una talla primero"); return; }
  const p = productos.find(x => x.id === id);
  addToCart({ id: p.id, nombre: p.nombre, precio: p.precio, foto: p.foto, icono: p.icono || '👗', talla: tallaSeleccionada });
  cerrarProducto();
}

function actualizarBtnFav(id) {
  const btn = document.getElementById('btnFavDetalle' + id);
  if (btn) btn.textContent = favoritos.find(f => f.id === id) ? '♥ Guardado' : '♡ Favorito';
}

// =====================
// FILTROS
// =====================
function setFilter(btn, valor) {
  document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filtroActivo = valor;
  renderProductos(obtenerListaFiltrada());
}

function setFilterDirect(valor) {
  filtroActivo = valor;
  renderProductos(obtenerListaFiltrada());
}

function filterBy(valor) {
  filtroActivo = valor;
  document.querySelectorAll('.filter-chip').forEach(b => {
    b.classList.toggle('active', b.textContent.trim().toLowerCase() === valor);
  });
  renderProductos(obtenerListaFiltrada());
  document.getElementById('productos').scrollIntoView({ behavior: 'smooth' });
}

function obtenerListaFiltrada() {
  if (filtroActivo === 'all') return productos;
  if (filtroActivo === 'sale') return productos.filter(p => p.tag === 'sale');
  return productos.filter(p =>
    p.genero === filtroActivo || p.cat === filtroActivo || p.color === filtroActivo
  );
}

function sortProducts(valor) {
  let lista = [...obtenerListaFiltrada()];
  if (valor === 'az') lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
  else if (valor === 'za') lista.sort((a, b) => b.nombre.localeCompare(a.nombre));
  else if (valor === 'price-asc') lista.sort((a, b) => a.precio - b.precio);
  else if (valor === 'price-desc') lista.sort((a, b) => b.precio - a.precio);
  else if (valor === 'sales') lista.sort((a, b) => b.ventas - a.ventas);
  else if (valor === 'discount') {
    lista.sort((a, b) => {
      const da = a.precioOriginal ? (a.precioOriginal - a.precio) / a.precioOriginal : 0;
      const db = b.precioOriginal ? (b.precioOriginal - b.precio) / b.precioOriginal : 0;
      return db - da;
    });
  }
  renderProductos(lista);
}

// =====================
// CARRITO
// =====================
function addToCart(item) {
  // ✅ AÑADIDO: agrupar items iguales (mismo producto + talla)
  const existente = carrito.find(i => i.id === item.id && i.talla === item.talla);
  if (existente) {
    existente.cantidad = (existente.cantidad || 1) + 1;
  } else {
    carrito.push({ ...item, cantidad: 1 });
  }
  guardarCarrito();
  actualizarCarrito();
  mostrarNotificacion(item.nombre + ' agregado al carrito');
}

function removeFromCart(i) {
  carrito.splice(i, 1);
  guardarCarrito();
  actualizarCarrito();
}

function cambiarCantidad(i, delta) {
  carrito[i].cantidad = Math.max(1, (carrito[i].cantidad || 1) + delta);
  guardarCarrito();
  actualizarCarrito();
  actualizarCheckout();
}

function actualizarCarrito() {
  document.getElementById('cartCount').textContent = carrito.reduce((s, i) => s + (i.cantidad || 1), 0);
  const el = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');

  if (!carrito.length) {
    el.innerHTML = '<p class="cart-empty">Tu carrito está vacío</p>';
    totalEl.textContent = '$0';
    return;
  }

  el.innerHTML = carrito.map((item, i) => `
    <div class="cart-item">
      <div class="cart-item-img">
        ${item.foto
          ? `<img src="${item.foto}" alt="${item.nombre}" style="width:100%;height:100%;object-fit:cover;border-radius:2px">`
          : (item.icono || '👕')}
      </div>
      <div style="flex:1">
        <p class="cart-item-name">${item.nombre}</p>
        <p class="cart-item-meta">Talla ${item.talla || 'M'}</p>
        <div style="display:flex;align-items:center;gap:.5rem;margin-top:.3rem">
          <button onclick="cambiarCantidad(${i},-1)" style="background:var(--gris-100);border:none;width:20px;height:20px;cursor:pointer;font-size:.9rem;border-radius:2px">−</button>
          <span style="font-size:.72rem;min-width:16px;text-align:center">${item.cantidad || 1}</span>
          <button onclick="cambiarCantidad(${i},1)" style="background:var(--gris-100);border:none;width:20px;height:20px;cursor:pointer;font-size:.9rem;border-radius:2px">+</button>
        </div>
        <p class="cart-item-price">$${formatPrecio(item.precio * (item.cantidad || 1))}</p>
      </div>
      <button onclick="removeFromCart(${i})"
        style="background:none;border:none;cursor:pointer;color:#999490;font-size:.8rem;padding:0;align-self:flex-start"
        onmouseover="this.style.color='#0a0a0a'"
        onmouseout="this.style.color='#999490'">✕</button>
    </div>
  `).join('');

  totalEl.textContent = '$' + formatPrecio(carrito.reduce((s, i) => s + i.precio * (i.cantidad || 1), 0));
}

function toggleCart() {
  const o = document.getElementById('cartOverlay');
  const open = o.classList.contains('open');
  cerrarTodosLosPaneles();
  if (!open) { o.classList.add('open'); document.body.style.overflow = 'hidden'; }
}

// =====================
// FAVORITOS
// =====================
async function toggleFav(id) {
  if (!usuarioActual) {
    mostrarNotificacion('Inicia sesión para guardar favoritos');
    toggleLogin();
    return;
  }
  const p = productos.find(x => x.id === id);
  const res = await apiCall(`/favoritos/${id}/`, 'POST');
  if (!res) return;

  if (res.accion === 'guardado') {
    if (!favoritos.find(f => f.id === id)) favoritos.push(p);
  } else {
    favoritos = favoritos.filter(f => f.id !== id);
  }
  document.getElementById('favCount').textContent = favoritos.length;
  actualizarFavoritos();
  renderProductos(obtenerListaFiltrada());
  mostrarNotificacion(res.mensaje);
}

async function cargarFavoritosBackend() {
  if (!usuarioActual) return;
  const res = await apiCall('/favoritos/');
  if (!res || !Array.isArray(res)) return;
  favoritos = res.map(p => ({
    id: p.id, nombre: p.nombre,
    precio: parseFloat(p.precio),
    foto: p.foto_principal || null,
    icono: p.foto_principal ? null : '👗',
    tallas: p.tallas || [],
  }));
  document.getElementById('favCount').textContent = favoritos.length;
  actualizarFavoritos();
  renderProductos(obtenerListaFiltrada());
}

function actualizarFavoritos() {
  const el = document.getElementById('favItems');
  if (!favoritos.length) {
    el.innerHTML = '<p class="cart-empty">Aún no tienes favoritos guardados</p>';
    return;
  }
  el.innerHTML = favoritos.map(p => `
    <div class="fav-item">
      <div class="fav-item-img">
        ${p.foto
          ? `<img src="${p.foto}" alt="${p.nombre}" style="width:100%;height:100%;object-fit:cover">`
          : (p.icono || '👗')}
      </div>
      <div style="flex:1">
        <p class="fav-item-name">${p.nombre}</p>
        <p class="fav-item-price">$${formatPrecio(p.precio)}</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:.5rem">
        <button class="btn-primary" style="padding:.4rem .75rem;font-size:.58rem"
          onclick="abrirProducto(${p.id}); toggleFavoritos()">
          Ver producto
        </button>
        <button onclick="toggleFav(${p.id})"
          style="background:none;border:none;cursor:pointer;color:#999490;font-size:.75rem">
          Eliminar
        </button>
      </div>
    </div>
  `).join('');
}

function toggleFavoritos() {
  const o = document.getElementById('favOverlay');
  const open = o.classList.contains('open');
  cerrarTodosLosPaneles();
  if (!open) {
    actualizarFavoritos();
    o.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

// =====================
// MIS PEDIDOS
// =====================
async function togglePedidos() {
  const o = document.getElementById('pedidosOverlay');
  const open = o.classList.contains('open');
  cerrarTodosLosPaneles();
  if (!open) {
    await cargarPedidos();
    o.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

async function cargarPedidos() {
  const el = document.getElementById('pedidosItems');
  el.innerHTML = '<p class="cart-empty">Cargando...</p>';
  const res = await apiCall('/pedidos/mis-pedidos/');
  if (!res || !Array.isArray(res) || !res.length) {
    el.innerHTML = '<p class="cart-empty">Aún no tienes pedidos</p>';
    return;
  }
  el.innerHTML = res.map(p => `
    <div class="pedido-item">
      <div class="pedido-header">
        <span class="pedido-numero">Pedido #${p.id}</span>
        <span class="pedido-estado ${p.estado}">${p.estado_display}</span>
      </div>
      <div class="pedido-info">
        📦 ${p.items.length} producto${p.items.length !== 1 ? 's' : ''}<br>
        📍 ${p.ciudad} — ${p.direccion}<br>
        💳 ${p.metodo_pago_display}<br>
        📅 ${new Date(p.creado).toLocaleDateString('es-CO')}
        ${p.numero_guia ? `<br>🔍 Guía: <strong>${p.numero_guia}</strong>` : ''}
      </div>
      <p class="pedido-total">$${parseFloat(p.total).toLocaleString('es-CO')}</p>
      ${p.items.map(i => `
        <p style="font-size:.68rem;color:var(--gris-400);margin-top:.3rem">
          · ${i.nombre_producto} — Talla ${i.talla}
        </p>`).join('')}
    </div>
  `).join('');
}

// =====================
// EPAYCO
// =====================
async function iniciarPagoEpayco() {
  const nombre = document.getElementById('chkNombre').value.trim();
  const telefono = document.getElementById('chkTelefono').value.trim();
  const ciudad = document.getElementById('chkCiudad').value.trim();
  const direccion = document.getElementById('chkDireccion').value.trim();
  // ✅ CORREGIDO: el email puede ser del input del guest o del usuario logueado
  const emailInput = document.getElementById('chkEmail');
  const email = usuarioActual
    ? usuarioActual.email
    : (emailInput ? emailInput.value.trim() : '');

  if (!nombre || !telefono || !ciudad || !direccion) {
    mostrarNotificacion('Completa todos los datos de envío primero');
    return;
  }
  if (!email) {
    mostrarNotificacion('Ingresa tu correo electrónico para continuar');
    if (emailInput) emailInput.focus();
    return;
  }
  if (!carrito.length) {
    mostrarNotificacion('Tu carrito está vacío');
    return;
  }

  const total = carrito.reduce((s, i) => s + i.precio * (i.cantidad || 1), 0);
  const descripcion = carrito.map(i => `${i.nombre} (x${i.cantidad || 1})`).join(', ');
  const pago = document.querySelector('input[name="pago"]:checked')?.value || 'tarjeta';
  const apto = document.getElementById('chkApto')?.value || '';

  // Primero crear el pedido para obtener el pedido_id
  const pedidoRes = await apiCall('/pedidos/', 'POST', {
    nombre_cliente: nombre,
    email_cliente: email,
    telefono_cliente: telefono,
    ciudad, direccion,
    barrio_apto: apto,
    metodo_pago: pago,
    items: carrito.map(i => ({
      producto_id: i.id,
      talla: i.talla || 'M',
      cantidad: i.cantidad || 1
    }))
  });

  if (!pedidoRes || pedidoRes.error) {
    mostrarNotificacion(pedidoRes?.error || 'Error creando el pedido');
    return;
  }

  const pedidoId = pedidoRes.pedido_id;

  // ✅ CORREGIDO: si el método de pago es efectivo, no abrir ePayco
  if (pago === 'efectivo') {
    carrito = [];
    guardarCarrito();
    actualizarCarrito();
    cerrarTodosLosPaneles();
    mostrarNotificacion(`¡Pedido #${pedidoId} confirmado! Te contactaremos pronto`);
    return;
  }

  // Abrir checkout de ePayco con el pedido_id en extra1
  try {
    const handler = ePayco.checkout.configure({
      key: '90b036e7e0f51b21c0fd0160346e9c5c',
      test: true
    });

    handler.open({
      name: 'AKOV Tienda',
      description: descripcion,
      currency: 'cop',
      amount: String(total),
      tax_base: '0',
      tax: '0',
      country: 'co',
      lang: 'es',
      email_billing: email,
      name_billing: nombre,
      address_billing: direccion,
      mobilephone_billing: telefono,
      extra1: String(pedidoId), // ✅ Para que el webhook lo identifique
      response: window.location.href,
      confirmation: 'http://127.0.0.1:8000/api/epayco/confirmacion/',
      onSuccess: function() {
        carrito = [];
        guardarCarrito();
        actualizarCarrito();
        cerrarTodosLosPaneles();
        mostrarNotificacion(`¡Pedido #${pedidoId} confirmado! Revisa tu correo`);
      },
      onError: function() {
        mostrarNotificacion('Error en el pago. Tu pedido quedó guardado — contáctanos si necesitas ayuda.');
      },
      onClose: function() {
        mostrarNotificacion('Pago cancelado. Tu pedido queda pendiente.');
      }
    });
  } catch (e) {
    // ePayco no disponible (sin internet, bloqueado, etc.)
    carrito = [];
    guardarCarrito();
    actualizarCarrito();
    cerrarTodosLosPaneles();
    mostrarNotificacion(`¡Pedido #${pedidoId} registrado! Te contactaremos para el pago`);
  }
}

// =====================
// CHECKOUT
// =====================
function toggleCheckout() {
  const o = document.getElementById('checkoutOverlay');
  const open = o.classList.contains('open');
  cerrarTodosLosPaneles();
  if (!open) {
    actualizarCheckout();
    // Pre-llenar con datos del usuario logueado
    if (usuarioActual) {
      const chkNombre = document.getElementById('chkNombre');
      if (chkNombre && !chkNombre.value) chkNombre.value = usuarioActual.nombre || '';
    }
    o.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function actualizarCheckout() {
  const el = document.getElementById('checkoutItems');
  const sub = document.getElementById('chkSubtotal');
  const tot = document.getElementById('chkTotal');

  if (!carrito.length) {
    el.innerHTML = '<p style="font-size:.78rem;color:#999490;padding:1rem 0">No hay productos en el carrito</p>';
    sub.textContent = '$0'; tot.textContent = '$0';
    return;
  }

  el.innerHTML = carrito.map(item => `
    <div style="display:flex;justify-content:space-between;padding:.6rem 0;border-bottom:.5px solid var(--gris-200);font-size:.75rem">
      <span>${item.nombre} <span style="color:var(--gris-400)">T.${item.talla || 'M'}</span>
        ${(item.cantidad || 1) > 1 ? ` <span style="color:var(--gris-400)">×${item.cantidad}</span>` : ''}
      </span>
      <span style="font-family:var(--font-display)">$${formatPrecio(item.precio * (item.cantidad || 1))}</span>
    </div>
  `).join('');

  const total = carrito.reduce((s, i) => s + i.precio * (i.cantidad || 1), 0);
  sub.textContent = '$' + formatPrecio(total);
  tot.textContent = '$' + formatPrecio(total);
}

// =====================
// SUSCRIPCIÓN
// =====================
async function subscribe() {
  const email = document.getElementById('subEmail').value.trim();
  if (!email || !email.includes('@')) { mostrarNotificacion('Ingresa un correo válido'); return; }
  const res = await apiCall('/suscripcion/', 'POST', { email });
  if (!res) { mostrarNotificacion('Error de conexión'); return; }
  mostrarNotificacion(res.mensaje || res.error);
  document.getElementById('subEmail').value = '';
}

// =====================
// RASTREO
// =====================
function trackOrder() {
  const n = document.getElementById('trackNum').value.trim();
  if (!n) { mostrarNotificacion('Ingresa un número de guía'); return; }
  // Abrir rastreo en Coordinadora por defecto
  window.open(`https://www.coordinadora.com/rastreo?guia=${n}`, '_blank');
}

// =====================
// MENÚ MÓVIL
// =====================
function toggleMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
  document.getElementById('mobileOverlay').classList.toggle('open');
}

function closeMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
  document.getElementById('mobileOverlay').classList.remove('open');
}

// =====================
// PRIVACIDAD
// =====================
function mostrarPrivacidad() {
  cerrarTodosLosPaneles();
  document.getElementById('privacidadModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function cerrarPrivacidad() {
  document.getElementById('privacidadModal').classList.remove('open');
  document.body.style.overflow = '';
}

// =====================
// COOKIES
// =====================
function acceptCookies() {
  localStorage.setItem('akov_cookies', 'accepted');
  document.getElementById('cookieBanner').classList.remove('visible');
}

function rejectCookies() {
  localStorage.setItem('akov_cookies', 'rejected');
  document.getElementById('cookieBanner').classList.remove('visible');
}

function checkCookies() {
  if (!localStorage.getItem('akov_cookies')) {
    setTimeout(() => document.getElementById('cookieBanner').classList.add('visible'), 1500);
  }
}

// =====================
// CERRAR PANELES
// =====================
function cerrarTodosLosPaneles() {
  ['cartOverlay','loginOverlay','favOverlay','pedidosOverlay',
   'checkoutOverlay','productModal','privacidadModal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  });
  document.body.style.overflow = '';
}

// =====================
// NOTIFICACIÓN
// =====================
let notifyTimer;
function mostrarNotificacion(msg) {
  const el = document.getElementById('notify');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(notifyTimer);
  notifyTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

// =====================
// NAVBAR SCROLL
// =====================
window.addEventListener('scroll', () => {
  document.getElementById('navbar').style.boxShadow =
    window.scrollY > 50 ? '0 2px 20px rgba(0,0,0,0.08)' : 'none';
});

// =====================
// EVENTOS CLICK FUERA
// =====================
['cartOverlay','loginOverlay','favOverlay','pedidosOverlay',
 'checkoutOverlay','productModal','privacidadModal'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', function(e) {
    if (e.target === this) cerrarTodosLosPaneles();
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') cerrarTodosLosPaneles();
});

// =====================
// UTILIDADES
// =====================
const formatPrecio = n => Math.round(n).toLocaleString('es-CO');
const capitalizar = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : '';

// =====================
// INICIAR
// =====================
actualizarCarrito(); // Restaurar carrito persistido
renderProductos(productos);
checkCookies();
verificarSesion();
cargarProductosAPI();
