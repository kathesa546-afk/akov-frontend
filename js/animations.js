// =====================================================================
// ANIMACIONES DE SCROLL (AKOV)
// Separado de main.js a propósito: este archivo solo se encarga de
// movimiento/estética, nunca de lógica de negocio (carrito, auth, etc.)
// =====================================================================

gsap.registerPlugin(ScrollTrigger);

// ─── HERO: la imagen entra "ampliada" y se asienta a su tamaño real ──────────
// mientras el usuario baja por la primera pantalla. Efecto clásico de sitios
// premium (poch.studio / notom.co) — la foto "respira" con el scroll en vez
// de quedar estática.
gsap.to('.hero-visual-inner', {
  scale: 1,
  ease: 'none',
  scrollTrigger: {
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
  },
});

// ─── CATEGORÍAS: cada imagen se "revela" con el mismo efecto de zoom ─────────
// según su propia posición en el viewport — no todas a la vez, cada tarjeta
// tiene su propio disparador.
document.querySelectorAll('.cat-item').forEach((item) => {
  const bg = item.querySelector('.cat-bg');
  if (!bg) return;

  gsap.to(bg, {
    scale: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: item,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    },
  });
});

// ─── PRODUCTOS: reveal escalonado con IntersectionObserver ───────────────────
// El grid de productos se renderiza DESPUÉS de cargar (main.js llama a la API
// de forma asíncrona), así que en vez de crear un ScrollTrigger de GSAP fijo
// —que no sabría nada de tarjetas que todavía no existen— se usa un
// IntersectionObserver que se reengancha automáticamente a cada tarjeta
// nueva que aparece. Es además la técnica que recomienda evitar reflows
// costosos por 'scroll' crudo en listas largas.
const observerProductos = new IntersectionObserver((entradas) => {
  entradas.forEach((entrada, i) => {
    if (entrada.isIntersecting) {
      entrada.target.style.transitionDelay = `${(i % 4) * 60}ms`;
      entrada.target.classList.add('revelado');
      observerProductos.unobserve(entrada.target);
    }
  });
}, { threshold: 0.15 });

// Vigila el grid de productos: cada vez que main.js inyecta tarjetas nuevas
// (nueva búsqueda, nuevo filtro, carga inicial), las engancha al observer.
const gridProductos = document.getElementById('productsGrid');
if (gridProductos) {
  const vigilarTarjetasNuevas = new MutationObserver(() => {
    gridProductos.querySelectorAll('.product-card:not(.observado)').forEach((tarjeta) => {
      tarjeta.classList.add('observado');
      observerProductos.observe(tarjeta);
    });
  });
  vigilarTarjetasNuevas.observe(gridProductos, { childList: true });
}

// ─── TITULARES DE SECCIÓN: fade-up suave al entrar en pantalla ──────────────
document.querySelectorAll('.section-title, .deal-title, .sub-title').forEach((titulo) => {
  gsap.from(titulo, {
    y: 40,
    opacity: 0,
    duration: 1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: titulo,
      start: 'top 85%',
      toggleActions: 'play none none none',
    },
  });
});