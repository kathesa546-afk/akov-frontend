// =====================
// CONFIGURACIÓN API
// =====================
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:8000/api'
  : 'https://api.akov3.com/api';

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

// Interceptor que renueva el token automáticamente cuando expira (401)
async function apiCall(endpoint, method = 'GET', data = null, retry = true) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const opts = { method, headers };
  if (data) opts.body = JSON.stringify(data);

  try {
    const res = await fetch(API_URL + endpoint, opts);

    // Token expirado → intentar refrescar una vez
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
// PRODUCTOS — datos de respaldo (SOLO se usan si la API no responde)
// Normalizados con la MISMA forma que produce mapearProductoAPI(), para que
// renderProductos() y abrirProducto() funcionen idénticos en ambos casos.
// =====================
const PRODUCTOS_DATA_MOCK = [
  {
    id: 1, nombre: "Blazer Oversized", slug: null, cat: "chaquetas", categoriaNombre: "Chaquetas", genero: "mujer",
    precio: 320000, precioOriginal: null, enOferta: false, destacado: true, tag: "new", icono: "🧥", foto: null,
    tallas: [{ nombre: "XS", disponible: true }, { nombre: "S", disponible: true }, { nombre: "M", disponible: true }, { nombre: "L", disponible: true }, { nombre: "XL", disponible: true }],
    descripcion: "Blazer oversized en lana premium. Corte relajado con hombros caídos. Forro interior suave."
  },
  {
    id: 2, nombre: "Camisa Oxford", slug: null, cat: "camisas", categoriaNombre: "Camisas", genero: "hombre",
    precio: 98000, precioOriginal: null, enOferta: false, destacado: false, tag: "", icono: "👔", foto: null,
    tallas: [{ nombre: "S", disponible: true }, { nombre: "M", disponible: true }, { nombre: "L", disponible: true }, { nombre: "XL", disponible: true }, { nombre: "XXL", disponible: false }],
    descripcion: "Camisa Oxford 100% algodón. Tejido resistente y transpirable. Cuello button-down."
  },
  {
    id: 3, nombre: "Vestido Midi Seda", slug: null, cat: "vestidos", categoriaNombre: "Vestidos", genero: "mujer",
    precio: 285000, precioOriginal: 398000, enOferta: true, destacado: false, tag: "sale", icono: "👗", foto: null,
    tallas: [{ nombre: "XS", disponible: false }, { nombre: "S", disponible: true }, { nombre: "M", disponible: true }, { nombre: "L", disponible: true }],
    descripcion: "Vestido midi en seda natural. Caída fluida y elegante. Escote en V sutil."
  },
  {
    id: 4, nombre: "Pantalón Wide Leg", slug: null, cat: "pantalones", categoriaNombre: "Pantalones", genero: "mujer",
    precio: 175000, precioOriginal: null, enOferta: false, destacado: false, tag: "", icono: "👖", foto: null,
    tallas: [{ nombre: "XS", disponible: true }, { nombre: "S", disponible: true }, { nombre: "M", disponible: true }, { nombre: "L", disponible: true }, { nombre: "XL", disponible: true }],
    descripcion: "Pantalón wide leg en lino premium. Tiro alto con cinturilla elástica."
  },
  {
    id: 5, nombre: "Chaqueta Denim", slug: null, cat: "chaquetas", categoriaNombre: "Chaquetas", genero: "hombre",
    precio: 248000, precioOriginal: 310000, enOferta: true, destacado: false, tag: "sale", icono: "🧥", foto: null,
    tallas: [{ nombre: "S", disponible: false }, { nombre: "M", disponible: true }, { nombre: "L", disponible: true }, { nombre: "XL", disponible: true }],
    descripcion: "Chaqueta denim clásica con lavado vintage. Bolsillos frontales y en pecho."
  },
  {
    id: 6, nombre: "Blusa de Seda", slug: null, cat: "blusas", categoriaNombre: "Blusas", genero: "mujer",
    precio: 142000, precioOriginal: null, enOferta: false, destacado: true, tag: "new", icono: "👚", foto: null,
    tallas: [{ nombre: "XS", disponible: true }, { nombre: "S", disponible: true }, { nombre: "M", disponible: true }, { nombre: "L", disponible: true }, { nombre: "XL", disponible: true }],
    descripcion: "Blusa holgada en seda natural. Mangas largas con puños. Cuello redondo."
  }
];

// =====================
// ESTADO GLOBAL
// =====================
let productos = [];
let categoriasDisponibles = [];
let modoRespaldo = false; // true cuando la API no responde y usamos PRODUCTOS_DATA_MOCK
let carrito = JSON.parse(localStorage.getItem('akov_carrito') || '[]');
let favoritos = [];
let usuarioActual = null;
let tallaSeleccionada = null;
let productoDetalleActual = null; // producto completo cargado por abrirProducto()
let searchTimer = null;

// Estado de filtros — dimensiones independientes (evita el bug de un solo
// string 'filtroActivo' donde 'oferta' pisaba a 'genero' y viceversa).
let filtros = {
  genero: 'all',   // 'all' | 'mujer' | 'hombre' | 'unisex'
  categoria: '',   // slug de categoría, '' = todas
  enOferta: false, // true = solo productos en oferta
  busqueda: '',    // texto de búsqueda
  orden: '-creado' // coincide 1:1 con los <option value> del <select> de orden
};

// =====================
// PERSISTIR CARRITO
// =====================
function guardarCarrito() {
  localStorage.setItem('akov_carrito', JSON.stringify(carrito));
}

// =====================
// MAPEO API → MODELO DE VISTA
// Traduce los campos reales de ProductoListSerializer al objeto que
// consume el resto del archivo. Si el backend agrega/renombra un campo,
// este es el ÚNICO lugar que hay que tocar.
// =====================
function mapearProductoAPI(p) {
  const precioBase = parseFloat(p.precio);
  const precioVigente = parseFloat(p.precio_vigente ?? p.precio);
  return {
    id: p.id,
    nombre: p.nombre,
    slug: p.slug,
    cat: p.categoria_slug || '',
    categoriaNombre: p.categoria_nombre || '',
    genero: p.genero,
    precio: precioVigente,
    precioOriginal: p.en_oferta ? precioBase : null,
    enOferta: !!p.en_oferta,
    destacado: !!p.destacado,
    tag: p.en_oferta ? 'sale' : (p.destacado ? 'new' : ''),
    foto: p.foto_principal || null,
    icono: p.foto_principal ? null : '👗',
    // Estos tres solo existen en el detalle; se completan al abrir el modal.
    descripcion: undefined,
    tallas: undefined,
    fotos: undefined,
  };
}

// =====================
// CARGAR CATEGORÍAS DESDE API (chip "Todos" dinámico)
// =====================
async function cargarCategoriasAPI() {
  try {
    const res = await apiCall('/categorias/');
    if (!Array.isArray(res)) {
      console.error('No se pudieron cargar las categorías: respuesta inesperada', res);
      return;
    }
    categoriasDisponibles = res;
    renderChipsCategoria();
  } catch (e) {
    console.error('Error cargando categorías:', e);
  }
}

function renderChipsCategoria() {
  const barra = document.getElementById('filterBar');
  const chipTodos = barra.querySelector('[data-cat="true"]');
  if (!chipTodos) return;

  // Elimina chips de categoría inyectados en una carga previa (evita duplicados
  // si cargarCategoriasAPI() se vuelve a invocar).
  barra.querySelectorAll('.filter-chip[data-cat-slug]').forEach(el => el.remove());

  const fragmentos = categoriasDisponibles.map(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-chip';
    btn.setAttribute('data-cat', 'true');
    btn.setAttribute('data-cat-slug', cat.slug);
    btn.textContent = cat.nombre;
    btn.addEventListener('click', () => setFilterCat(btn, cat.slug));
    return btn;
  });

  fragmentos.forEach(btn => chipTodos.insertAdjacentElement('afterend', btn));
}

// =====================
// CARGAR PRODUCTOS DESDE API (con filtros/orden aplicados en el servidor)
// =====================
async function cargarProductosAPI() {
  const grid = document.getElementById('productsGrid');
  const contador = document.getElementById('resultCount');
  contador.textContent = 'Cargando…';

  try {
    const params = new URLSearchParams();
    params.set('page_size', '60');
    if (filtros.genero && filtros.genero !== 'all') params.set('genero', filtros.genero);
    if (filtros.categoria) params.set('categoria', filtros.categoria);
    if (filtros.enOferta) params.set('en_oferta', '1');
    if (filtros.busqueda) params.set('q', filtros.busqueda);
    if (filtros.orden) params.set('orden', filtros.orden);

    const res = await apiCall('/productos/?' + params.toString());

    // El backend SIEMPRE devuelve un objeto paginado { results: [...] },
    // nunca un array plano. Leer .results es obligatorio.
    if (res && Array.isArray(res.results)) {
      modoRespaldo = false;
      productos = res.results.map(mapearProductoAPI);
      renderProductos(productos);
    } else {
      throw new Error('Respuesta de /productos/ con forma inesperada');
    }
  } catch (e) {
    console.error('No se pudo cargar el catálogo desde la API. Usando datos de respaldo:', e);
    modoRespaldo = true;
    productos = filtrarLocalmente(PRODUCTOS_DATA_MOCK);
    renderProductos(productos);
    mostrarNotificacion('No pudimos conectar con la tienda. Mostrando catálogo de muestra.');
  }
}

// Filtrado en memoria — SOLO se usa en modoRespaldo, porque los datos mock
// no pueden pedirle al backend que los filtre.
function filtrarLocalmente(lista) {
  let resultado = [...lista];
  if (filtros.genero !== 'all') resultado = resultado.filter(p => p.genero === filtros.genero);
  if (filtros.categoria) resultado = resultado.filter(p => p.cat === filtros.categoria);
  if (filtros.enOferta) resultado = resultado.filter(p => p.enOferta);
  if (filtros.busqueda) {
    const q = filtros.busqueda.toLowerCase();
    resultado = resultado.filter(p => p.nombre.toLowerCase().includes(q));
  }
  return resultado;
}

// Con la API real el filtrado ya viene aplicado desde el servidor; esta
// función existe para que el resto del código (renders puntuales) tenga
// un único punto de verdad sin tener que saber si estamos en respaldo o no.
function obtenerListaFiltrada() {
  return modoRespaldo ? filtrarLocalmente(PRODUCTOS_DATA_MOCK) : productos;
}

// =====================
// FILTROS — chip group 1: género + "En oferta" (mutuamente excluyentes)
// =====================
function setFilter(btn, valor) {
  document.getElementById('filterBar')
    .querySelectorAll('.filter-chip:not([data-cat])')
    .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  if (valor === 'oferta') {
    filtros.enOferta = true;
  } else {
    filtros.enOferta = false;
    filtros.genero = valor;
  }
  cargarProductosAPI();
}

// Usado por enlaces fuera de la barra de filtros (menú, hero, footer).
function setFilterDirect(valor) {
  filtros.enOferta = valor === 'oferta';
  filtros.genero = valor === 'oferta' ? 'all' : valor;
  cargarProductosAPI();
  document.getElementById('productos').scrollIntoView({ behavior: 'smooth' });
}

// =====================
// FILTROS — chip group 2: categoría (independiente de género/oferta)
// =====================
function setFilterCat(btn, valor) {
  document.getElementById('filterBar')
    .querySelectorAll('.filter-chip[data-cat]')
    .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filtros.categoria = valor;
  cargarProductosAPI();
}

// =====================
// BÚSQUEDA — con debounce de 350ms para no golpear la API en cada tecla
// =====================
function onSearch(valor) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    filtros.busqueda = valor.trim();
    cargarProductosAPI();
  }, 350);
}

// =====================
// ORDEN — delega directamente al backend (orden_map en views.py)
// =====================
function sortProducts(valor) {
  filtros.orden = valor || '-creado';
  cargarProductosAPI();
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
  if (res.tokens.refresh) setRefreshToken(res.tokens.refresh);
  setUsuarioGuardado(res.usuario);
  usuarioActual = res.usuario;
  actualizarNavbarUsuario();
  cerrarTodosLosPaneles();
  mostrarNotificacion('Bienvenido, ' + (usuarioActual.nombre || usuarioActual.email).split(' ')[0]);
  cargarFavoritosBackend();

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
  if (res.tokens.refresh) setRefreshToken(res.tokens.refresh);
  setUsuarioGuardado(res.usuario);
  usuarioActual = res.usuario;
  actualizarNavbarUsuario();
  cerrarTodosLosPaneles();
  mostrarNotificacion(res.mensaje);
  cargarFavoritosBackend();
}

async function cerrarSesion() {
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
  if (p.foto) {
    return `<img src="${p.foto}" alt="${p.nombre}" class="${clase}" loading="lazy" onerror="this.outerHTML='<span class=\\"${clase}\\">${p.icono || '👗'}</span>'">`;
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
      <div class="product-img" onclick="abrirProducto('${p.slug || ''}', ${p.id})">
        ${renderImagen(p)}
        ${p.tag ? `<span class="product-tag ${p.tag === 'sale' ? 'sale' : ''}">${p.tag === 'sale' ? 'Oferta' : 'Nuevo'}</span>` : ''}
        <div class="product-actions">
          <button class="pa-add" onclick="event.stopPropagation(); abrirProducto('${p.slug || ''}', ${p.id})">Ver producto</button>
          <button class="pa-fav" onclick="event.stopPropagation(); toggleFav(${p.id})"
            style="color:${favoritos.find(f => f.id === p.id) ? '#c0392b' : 'inherit'}">
            ${favoritos.find(f => f.id === p.id) ? '♥' : '♡'}
          </button>
        </div>
      </div>
      <p class="product-name">${p.nombre}</p>
      <p class="product-meta">${capitalizar(p.genero)}${p.categoriaNombre ? ' · ' + p.categoriaNombre : ''}</p>
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
// Ahora es asíncrono: si el producto viene de la API real, pide el
// detalle completo (fotos, tallas con stock real, descripción) al backend
// en vez de depender de datos parciales que la lista nunca tuvo.
// =====================
async function abrirProducto(slug, idRespaldo) {
  const contenido = document.getElementById("modalProductoContenido");
  contenido.innerHTML = '<p style="padding:3rem;text-align:center;color:#999490;font-size:.8rem">Cargando producto…</p>';
  document.getElementById("productModal").classList.add("open");
  document.body.style.overflow = "hidden";

  let p;
  if (slug && !modoRespaldo) {
    const detalle = await apiCall(`/productos/${encodeURIComponent(slug)}/`);
    if (!detalle || detalle.error) {
      contenido.innerHTML = '<p style="padding:3rem;text-align:center;color:#999490;font-size:.8rem">No pudimos cargar este producto. Intenta de nuevo.</p>';
      return;
    }
    p = {
      id: detalle.id,
      nombre: detalle.nombre,
      slug: detalle.slug,
      cat: detalle.categoria?.slug || '',
      categoriaNombre: detalle.categoria?.nombre || '',
      genero: detalle.genero,
      precio: parseFloat(detalle.precio_vigente ?? detalle.precio),
      precioOriginal: detalle.en_oferta ? parseFloat(detalle.precio) : null,
      descripcion: detalle.descripcion,
      fotos: (detalle.fotos || []).map(f => ({ imagen_url: f.imagen, es_principal: f.es_principal })),
      tallas: (detalle.tallas || []).map(t => ({ nombre: t.nombre, disponible: t.stock > 0 })),
      icono: '👗',
      tag: detalle.en_oferta ? 'sale' : (detalle.destacado ? 'new' : ''),
    };
  } else {
    // Modo respaldo: el producto ya tiene todo lo necesario en PRODUCTOS_DATA_MOCK.
    p = PRODUCTOS_DATA_MOCK.find(x => x.id === idRespaldo);
    if (!p) {
      contenido.innerHTML = '<p style="padding:3rem;text-align:center;color:#999490;font-size:.8rem">Producto no encontrado.</p>';
      return;
    }
    p = { ...p, fotos: [] };
  }

  productoDetalleActual = p;
  tallaSeleccionada = null;

  const fotos = p.fotos && p.fotos.length > 0
    ? p.fotos
    : [{ imagen_url: null, icono: p.icono || '👗' }];

  const primeraFoto = fotos[0];
  const fotoMainHTML = primeraFoto.imagen_url
    ? `<img src="${primeraFoto.imagen_url}" alt="${p.nombre}" id="galeriaMainImg" style="width:100%;height:100%;object-fit:cover">`
    : `<span id="galeriaMainIcon" style="font-size:5rem">${p.icono || '👗'}</span>`;

  const miniaturasHTML = fotos.map((f, i) => {
    const content = f.imagen_url
      ? `<img src="${f.imagen_url}" alt="${p.nombre} foto ${i + 1}" style="width:100%;height:100%;object-fit:cover">`
      : `<span style="font-size:1.8rem">${p.icono || '👗'}</span>`;
    return `<div class="miniatura ${i === 0 ? 'active' : ''}" onclick="cambiarFoto(this, '${f.imagen_url || ''}', '${p.icono || '👗'}')">${content}</div>`;
  }).join('');

  const tallasArr = p.tallas || [];
  const tallasHTML = tallasArr.length
    ? tallasArr.map(t => `
        <button class="talla-btn ${!t.disponible ? 'agotada' : ''}"
          ${!t.disponible ? 'disabled' : `onclick="seleccionarTalla(this,'${t.nombre}')"`}
        >${t.nombre}</button>
      `).join('')
    : '<p style="font-size:.72rem;color:#999490">Sin tallas disponibles por ahora</p>';

  contenido.innerHTML = `
    <div class="producto-detalle">
      <div class="producto-galeria">
        <div class="producto-galeria-principal" id="galeriaMain">${fotoMainHTML}</div>
        <div class="producto-miniaturas">${miniaturasHTML}</div>
      </div>
      <div class="producto-info">
        ${p.tag ? `<span class="product-tag ${p.tag === 'sale' ? 'sale' : ''}" style="display:inline-block;margin-bottom:.75rem">${p.tag === 'sale' ? 'Oferta' : 'Nuevo'}</span>` : ''}
        <h2 class="producto-info-nombre">${p.nombre}</h2>
        <p class="producto-info-meta">${capitalizar(p.genero)}${p.categoriaNombre ? ' · ' + p.categoriaNombre : ''}</p>
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
        <p class="producto-desc">${p.descripcion || ''}</p>
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
}

function cerrarProducto() {
  document.getElementById("productModal").classList.remove("open");
  document.body.style.overflow = "";
  productoDetalleActual = null;
}

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
  const p = productoDetalleActual;
  if (!p || p.id !== id) { mostrarNotificacion("Ocurrió un error, vuelve a abrir el producto"); return; }
  addToCart({
    id: p.id,
    nombre: p.nombre,
    precio: p.precio,
    foto: p.fotos && p.fotos[0] ? p.fotos[0].imagen_url : null,
    icono: p.icono || '👗',
    talla: tallaSeleccionada
  });
  cerrarProducto();
}

function actualizarBtnFav(id) {
  const btn = document.getElementById('btnFavDetalle' + id);
  if (btn) btn.textContent = favoritos.find(f => f.id === id) ? '♥ Guardado' : '♡ Favorito';
}

// =====================
// CARRITO
// =====================
function addToCart(item) {
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
  const p = productos.find(x => x.id === id) || (productoDetalleActual && productoDetalleActual.id === id ? productoDetalleActual : null);
  const res = await apiCall(`/favoritos/${id}/`, 'POST');
  if (!res) return;

  if (res.accion === 'guardado') {
    if (p && !favoritos.find(f => f.id === id)) favoritos.push(p);
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
  favoritos = res.map(mapearProductoAPI);
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
          onclick="abrirProducto('${p.slug || ''}', ${p.id}); toggleFavoritos()">
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

  if (pago === 'efectivo') {
    carrito = [];
    guardarCarrito();
    actualizarCarrito();
    cerrarTodosLosPaneles();
    mostrarNotificacion(`¡Pedido #${pedidoId} confirmado! Te contactaremos pronto`);
    return;
  }

  // ---------------------------------------------------------------
  // EPAYCO
  // test: true  → modo prueba, no cobra dinero real (para desarrollo)
  // test: false → producción, cobra dinero real (para lanzamiento)
  // Cambiar en Railway la variable EPAYCO_TEST=False cuando estés lista
  // ---------------------------------------------------------------
  try {
    const handler = ePayco.checkout.configure({
      key: '90b036e7e0f51b21c0fd0160346e9c5c',
      test: true  // ← Cambiar a false cuando la tienda esté lista para ventas reales
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
      extra1: String(pedidoId),
      response: window.location.href,
      // URL del servidor de Railway — ePayco llama aquí para confirmar el pago
      confirmation: 'https://api.akov3.com/api/epayco/confirmacion/',
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
  ['cartOverlay', 'loginOverlay', 'favOverlay', 'pedidosOverlay',
    'checkoutOverlay', 'productModal', 'privacidadModal'].forEach(id => {
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
['cartOverlay', 'loginOverlay', 'favOverlay', 'pedidosOverlay',
  'checkoutOverlay', 'productModal', 'privacidadModal'].forEach(id => {
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
actualizarCarrito();
checkCookies();
verificarSesion();
cargarCategoriasAPI();
cargarProductosAPI();
