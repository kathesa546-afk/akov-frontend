// =====================================================================
// ANIMACIONES DE SCROLL (AKOV)
// Separado de main.js a propósito: este archivo solo se encarga de
// movimiento/estética, nunca de lógica de negocio (carrito, auth, etc.)
// =====================================================================

gsap.registerPlugin(ScrollTrigger);

// FIX (auditoría nueva, hallazgo 3.1 — Media): no existía ninguna regla
// `prefers-reduced-motion`. El parallax del hero y de cada tarjeta de
// categoría/producto está ligado directamente a la posición del scroll
// (scrub) — para personas con trastornos vestibulares o sensibilidad al
// movimiento, este tipo de efecto no es solo estético, es una barrera de
// accesibilidad real (criterio WCAG 2.1, 2.3.3). Se verifica esta
// preferencia UNA vez al cargar: si el usuario la cambia después sin
// recargar la página es un caso límite tan raro que no justifica la
// complejidad de un listener reactivo — la próxima carga de página ya
// respeta el nuevo valor.
const prefiereMovimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── HERO ─────────────────────────────────────────────────────────────────
// Dos capas de movimiento a la vez (esto es lo que hace que se sienta
// "parallax" de verdad, no solo un zoom): la imagen de fondo se desplaza
// verticalmente más lento que el resto de la página, MIENTRAS se des-zoomea
// desde 1.45 hasta su tamaño real y aparece de un fundido. Todo controlado
// directamente por la posición del scroll (scrub: true), no por tiempo.
//
// FIX (auditoría, hallazgo 6 — Media): en móvil (≤768px) .hero-visual
// tiene display:none (ver styles.css), pero este ScrollTrigger seguía
// registrado y recalculando en cada frame de scroll igual — ciclos de
// CPU/batería desperdiciados exactamente en el dispositivo donde más
// importa cuidarlos, animando un elemento que nadie puede ver. Se usa
// gsap.matchMedia() para que el tween del hero solo exista cuando el
// elemento es realmente visible, y se destruya limpio al cruzar el
// breakpoint (por ejemplo al rotar el dispositivo o redimensionar la
// ventana del navegador).
const mmHero = gsap.matchMedia();

// FIX (auditoría nueva, hallazgo 3.1 — Media): se agrega la condición de
// movimiento reducido directamente en el media query de gsap.matchMedia()
// — si el usuario la tiene activa, esta consulta compuesta nunca coincide,
// así que el tween nunca se crea y gsap.matchMedia() se encarga de la
// limpieza automáticamente, igual que ya hace con el breakpoint de 769px.
mmHero.add('(min-width: 769px) and (prefers-reduced-motion: no-preference)', () => {
  gsap.fromTo('.hero-visual-inner',
    { scale: 1.45, opacity: 0.35, yPercent: -12 },
    {
      scale: 1,
      opacity: 1,
      yPercent: 12,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 0.6,
      },
    }
  );
  // gsap.matchMedia() limpia automáticamente este tween y su
  // ScrollTrigger asociado al salir de la condición — no hace falta
  // return de una función de cleanup manual para este caso simple.
});

// ─── CATEGORÍAS ──────────────────────────────────────────────────────────
// Misma idea que el hero pero por tarjeta: cada imagen tiene su propio
// disparador de scroll, así que el efecto ocurre en el momento exacto en que
// esa tarjeta específica cruza la pantalla, no todas a la vez.
function aplicarParallaxCategorias() {
  if (prefiereMovimientoReducido) return;
  document.querySelectorAll('.cat-item').forEach((item) => {
    const bg = item.querySelector('.cat-bg');
    if (!bg || bg.dataset.parallaxAplicado) return;
    bg.dataset.parallaxAplicado = 'true';

    gsap.fromTo(bg,
      { scale: 1.4, yPercent: -10 },
      {
        scale: 1.05,
        yPercent: 10,
        ease: 'none',
        scrollTrigger: {
          trigger: item,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.6,
        },
      }
    );
  });
}
aplicarParallaxCategorias();
// main.js reemplaza el contenido del grid de categorías de forma
// asíncrona (llega después desde la API) — se expone la función para que
// pueda llamarla otra vez cuando eso pase, sin que animations.js tenga que
// saber nada de cómo/cuándo se cargan los datos.
window.aplicarParallaxCategorias = aplicarParallaxCategorias;

// ─── PRODUCTOS: reveal escalonado + parallax sutil en la imagen ─────────────
// El grid de productos se renderiza DESPUÉS de cargar (main.js llama a la API
// de forma asíncrona), así que en vez de un ScrollTrigger fijo de GSAP —que
// no sabría nada de tarjetas que todavía no existen— se usa un
// IntersectionObserver que se reengancha automáticamente a cada tarjeta
// nueva. Además de aparecer con un fade-up, cada foto de producto se mueve
// un poco más lento que la página (parallax sutil, no solo aparición).
const observerProductos = new IntersectionObserver((entradas) => {
  entradas.forEach((entrada, i) => {
    if (entrada.isIntersecting) {
      entrada.target.style.transitionDelay = `${(i % 4) * 60}ms`;
      entrada.target.classList.add('revelado');
      observerProductos.unobserve(entrada.target);
    }
  });
}, { threshold: 0.15 });

const gridProductos = document.getElementById('productsGrid');
if (gridProductos) {
  const vigilarTarjetasNuevas = new MutationObserver(() => {
    // Limpia triggers de GSAP apuntando a tarjetas que ya no existen en el
    // DOM (pasa cada vez que se cambia de filtro y el grid se reemplaza).
    ScrollTrigger.getAll().forEach((st) => {
      if (st.vars.__productoImg && !document.body.contains(st.trigger)) st.kill();
    });

    gridProductos.querySelectorAll('.product-card').forEach((tarjeta) => {
      if (!tarjeta.classList.contains('observado')) {
        tarjeta.classList.add('observado');
        observerProductos.observe(tarjeta);
      }
      const img = tarjeta.querySelector('.product-img-inner');
      if (img && img.tagName === 'IMG' && !img.dataset.parallaxAplicado && !prefiereMovimientoReducido) {
        img.dataset.parallaxAplicado = 'true';
        gsap.fromTo(img,
          { yPercent: -6, scale: 1.12 },
          {
            yPercent: 6,
            scale: 1.12, // constante — solo da margen para el movimiento vertical
            ease: 'none',
            scrollTrigger: {
              trigger: tarjeta,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.6,
              __productoImg: true,
            },
          }
        );
      }
    });

    ScrollTrigger.refresh();
  });
  vigilarTarjetasNuevas.observe(gridProductos, { childList: true });
}

// ─── TITULARES DE SECCIÓN: fade-up suave al entrar en pantalla ──────────────
if (!prefiereMovimientoReducido) {
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
}