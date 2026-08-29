/* ============================================================
menu.js - portada: fondo animado y botones de entrada
El fondo se pinta con la misma receta que la partida: colores
planos, contorno de tinta y ni un degradado dentro de las siluetas.
   ============================================================ */
'use strict';

const M = {
    tinta: '#17132b',
    nocheAlta: '#23407a', nocheMedia: '#14224a', nocheBaja: '#0a1024',
    luna: '#fff0c4', halo: 'rgba(255, 215, 132, 0.16)',
    bosque: '#132749', bosqueMedio: '#1e3d70', bosqueCerca: '#0f1e3c',
    teja: '#2f7a76', tejaLuz: '#4ea79c',
    bermellon: '#c8402f', bermellonLuz: '#e0453f',
    papel: '#ffcf72',
    sakura: '#f0a8c8', sakuraClara: '#ffd6e6'
};

// la portada del ocaso pinta su cielo con CSS y no trae lienzo; las demás
// pantallas sí, y entonces se anima aquí
const lienzo = document.getElementById('fondoMenu');
const ctx = lienzo ? lienzo.getContext('2d') : null;
let ancho = 0, alto = 0;
let petalos = [];
let t = 0;

function azar(a, b) { return a + Math.random() * (b - a); }

function medir() {
    ancho = lienzo.width = window.innerWidth;
    alto = lienzo.height = window.innerHeight;
}

// los pétalos nacen repartidos por toda la pantalla para que no se note el arranque
function sembrarPetalos() {
    petalos = [];
    const cuantos = Math.round(ancho * alto / 26000);
    for (let i = 0; i < cuantos; i++) petalos.push(nuevoPetalo(azar(0, alto)));
}

function nuevoPetalo(y) {
    return {
        x: azar(-40, ancho + 40), y,
        vy: azar(22, 55), vx: azar(-26, -6),
        r: azar(3, 6.5),
        giro: azar(0, Math.PI * 2), vgiro: azar(-2.2, 2.2),
        bamboleo: azar(0, Math.PI * 2),
        claro: Math.random() < 0.4
    };
}

// ---------- Piezas del decorado ----------

// silueta de arbolado: triángulos escalonados, como los cedros del fondo
function franjaBosque(base, altura, paso, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-paso, alto);
    for (let x = -paso; x < ancho + paso; x += paso) {
        const h = altura * (0.6 + 0.4 * Math.abs(Math.sin(x * 0.017)));
        ctx.lineTo(x, base);
        ctx.lineTo(x + paso / 2, base - h);
        ctx.lineTo(x + paso, base);
    }
    ctx.lineTo(ancho + paso, alto);
    ctx.closePath();
    ctx.fill();
}

function torii(x, base, escala) {
    const a = 120 * escala, h = 150 * escala, g = 13 * escala;
    ctx.strokeStyle = M.tinta;
    ctx.lineWidth = 4 * escala;
    ctx.fillStyle = M.bermellon;

    const pilar = (px) => {
        ctx.beginPath();
        ctx.moveTo(px - g / 2, base);
        ctx.lineTo(px - g * 0.35, base - h);
        ctx.lineTo(px + g * 0.35, base - h);
        ctx.lineTo(px + g / 2, base);
        ctx.closePath(); ctx.fill(); ctx.stroke();
    };
    pilar(x - a / 2); pilar(x + a / 2);

    // travesaño bajo y dintel curvado, los dos de una pieza plana
    ctx.beginPath();
    ctx.rect(x - a / 2 - 8 * escala, base - h * 0.76, a + 16 * escala, 10 * escala);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = M.bermellonLuz;
    ctx.beginPath();
    ctx.moveTo(x - a / 2 - 26 * escala, base - h + 6 * escala);
    ctx.quadraticCurveTo(x, base - h - 14 * escala, x + a / 2 + 26 * escala, base - h + 6 * escala);
    ctx.lineTo(x + a / 2 + 22 * escala, base - h + 20 * escala);
    ctx.quadraticCurveTo(x, base - h + 2 * escala, x - a / 2 - 22 * escala, base - h + 20 * escala);
    ctx.closePath(); ctx.fill(); ctx.stroke();
}

// tejado de teja vidriada asomando entre los árboles
function tejado(x, base, luz) {
    const h = luz * 0.34;
    ctx.strokeStyle = M.tinta; ctx.lineWidth = 4;
    ctx.fillStyle = M.teja;
    ctx.beginPath();
    ctx.moveTo(x - luz / 2, base);
    ctx.quadraticCurveTo(x - luz * 0.22, base - h * 0.86, x, base - h);
    ctx.quadraticCurveTo(x + luz * 0.22, base - h * 0.86, x + luz / 2, base);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = M.tejaLuz;
    ctx.beginPath();
    ctx.moveTo(x - luz * 0.30, base - h * 0.42);
    ctx.quadraticCurveTo(x, base - h * 0.98, x + luz * 0.30, base - h * 0.42);
    ctx.quadraticCurveTo(x, base - h * 0.70, x - luz * 0.30, base - h * 0.42);
    ctx.fill();
}

// farolillo colgado que se balancea despacio
function farolillo(x, y, escala, fase) {
    const balanceo = Math.sin(t * 1.1 + fase) * 0.06;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(balanceo);
    const w = 20 * escala, h = 28 * escala;

    ctx.strokeStyle = M.tinta; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -h * 1.9); ctx.lineTo(0, -h / 2); ctx.stroke();

    ctx.fillStyle = M.halo;
    ctx.beginPath(); ctx.arc(0, 0, w * 2.4, 0, 6.2832); ctx.fill();

    ctx.fillStyle = M.papel;
    ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, 6.2832);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = M.bermellon;
    ctx.fillRect(-w / 2, -h * 0.12, w, h * 0.10);
    ctx.restore();
}

function petalo(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.giro);
    ctx.fillStyle = p.claro ? M.sakuraClara : M.sakura;
    ctx.beginPath();
    ctx.moveTo(0, -p.r);
    ctx.quadraticCurveTo(p.r, -p.r * 0.2, 0, p.r);
    ctx.quadraticCurveTo(-p.r * 0.8, -p.r * 0.2, 0, -p.r);
    ctx.fill();
    ctx.restore();
}

// ---------- Bucle ----------
function pintar(dt) {
    const cielo = ctx.createLinearGradient(0, 0, 0, alto);
    cielo.addColorStop(0, M.nocheAlta);
    cielo.addColorStop(0.45, M.nocheMedia);
    cielo.addColorStop(1, M.nocheBaja);
    ctx.fillStyle = cielo;
    ctx.fillRect(0, 0, ancho, alto);

    // luna con su halo, algo a la derecha para no pisar el título
    const lx = ancho * 0.80, ly = alto * 0.18, lr = Math.min(ancho, alto) * 0.075;
    ctx.fillStyle = M.halo;
    ctx.beginPath(); ctx.arc(lx, ly, lr * 2.3, 0, 6.2832); ctx.fill();
    ctx.fillStyle = M.luna;
    ctx.beginPath(); ctx.arc(lx, ly, lr, 0, 6.2832); ctx.fill();
    ctx.fillStyle = M.nocheMedia;
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.arc(lx - lr * 0.35, ly + lr * 0.25, lr * 0.18, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(lx + lr * 0.28, ly - lr * 0.30, lr * 0.12, 0, 6.2832); ctx.fill();
    ctx.globalAlpha = 1;

    const escala = Math.min(1.5, ancho / 900);
    franjaBosque(alto * 0.70, alto * 0.16, 120, M.bosque);
    tejado(ancho * 0.24, alto * 0.74, Math.min(360, ancho * 0.26));
    tejado(ancho * 0.72, alto * 0.77, Math.min(280, ancho * 0.20));
    franjaBosque(alto * 0.80, alto * 0.13, 90, M.bosqueMedio);
    torii(ancho * 0.5, alto * 0.88, escala);
    franjaBosque(alto * 0.95, alto * 0.10, 70, M.bosqueCerca);

    farolillo(ancho * 0.14, alto * 0.40, escala, 0);
    farolillo(ancho * 0.88, alto * 0.50, escala * 0.85, 1.7);

    for (const p of petalos) {
        p.y += p.vy * dt;
        p.bamboleo += dt * 2.4;
        p.x += (p.vx + Math.sin(p.bamboleo) * 22) * dt;
        p.giro += p.vgiro * dt;
        if (p.y > alto + 20 || p.x < -60) Object.assign(p, nuevoPetalo(-20));
        petalo(p);
    }
}

let anterior = performance.now();
function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - anterior) / 1000);
    anterior = ahora;
    t += dt;
    pintar(dt);
    requestAnimationFrame(cuadro);
}

// ---------- El armazón ----------
// Todas las pantallas del menú viven dentro del marco de index.html, que es
// quien sujeta la música. La ventanita de ajustes de la partida también está
// enmarcada, pero de otro marco y con otras reglas, así que se descuenta.
const enArmazon = hayPadre && !enMarco;

function avisarAlArmazon(mensaje) {
    if (enArmazon) parent.postMessage(Object.assign({ tipo: 'armazon' }, mensaje), '*');
}

// Suelta no se queda: si esta pantalla se abre por su cuenta —al volver de la
// partida, que sí vive fuera del marco, o entrando por su url— se manda al
// armazón con el recado de abrirla a ella. Así el menú siempre acaba dentro,
// se llegue por donde se llegue, y la música nunca se queda sin quien la
// sujete. replace y no href: este paso no merece un hueco en el historial.
if (!hayPadre) {
    const yo = location.pathname.split('/').pop() + location.search;
    location.replace('../index.html?ir=' + encodeURIComponent(yo));
}

// ---------- Botones ----------
// cada pantalla dice en su <body data-siguiente="..."> a dónde lleva el botón
// principal, así todas comparten este mismo guion. Las rutas son relativas a
// quien las declara, y todas las pantallas del menú viven ya en html/.

// La partida es la única que no cabe en el marco: trae su propio Esc, su
// consola y su propia ventana de ajustes. Se le pide al armazón que salga a
// pantalla completa, y se le manda la dirección ya resuelta para que no tenga
// que adivinar desde dónde se le habla.
function irA(destino) {
    if (enArmazon && /(^|\/)game\.html($|[?#])/.test(destino)) {
        avisarAlArmazon({ salir: new URL(destino, location.href).href });
        return;
    }
    location.href = destino;
}

function continuar() { irA(document.body.dataset.siguiente || 'game.html'); }

// Enmarcada dentro de la partida (la ventana de ajustes), volver no es irse a
// ninguna parte: es cerrar la ventana. Se lo pide a quien la abrió, que es el
// único que puede. enMarco y cerrarMarco los pone ajustes.js.
function volver() {
    if (enMarco) { cerrarMarco(); return; }
    irA(document.body.dataset.anterior || 'portada.html');
}
function irAjustes() { irA(document.body.dataset.ajustes || 'ajustes.html'); }

// los huecos que se abren en el sitio del menú: controles y créditos en la
// portada; armería, personaje, habilidades, pergaminos y amuletos en el
// zaguán. Cada pantalla trae los suyos y los que no existen no se abren
const PANELES = ['panelControles', 'panelCreditos', 'armeria', 'personaje',
    'habilidades', 'pergaminos', 'amuletos'];

// todos comparten hueco: abrir uno cierra los demás, y volver a pulsar cierra
function alternar(id) {
    const pedido = document.getElementById(id);
    if (!pedido) return;
    const abrir = pedido.hidden;
    cerrarPaneles();
    pedido.hidden = !abrir;
    marcarPaneles();
}

// mientras hay alguno abierto el body lleva la marca: con ella la pantalla
// esconde el rótulo y lo demás, y el panel se lee sin nada delante. La miran
// también armeria.js y personaje.js, que abren los suyos por su cuenta
function marcarPaneles() {
    const abierto = PANELES.some(id => {
        const panel = document.getElementById(id);
        return panel && !panel.hidden;
    });
    document.body.classList.toggle('viendoPanel', abierto);
    const hueco = document.getElementById('panel');
    if (hueco) hueco.classList.toggle('abierto', abierto);
}

function hayPanelAbierto() { return document.body.classList.contains('viendoPanel'); }

function cerrarPaneles() {
    for (const id of PANELES) {
        const panel = document.getElementById(id);
        if (panel) panel.hidden = true;
    }
    marcarPaneles();
}

// los botones que una pantalla no tenga sencillamente no se atan
function enlazar(id, accion) {
    const boton = document.getElementById(id);
    if (boton) boton.addEventListener('click', accion);
}

enlazar('btJugar', continuar);
enlazar('btVolver', volver);
enlazar('btAjustes', irAjustes);
enlazar('btControles', () => alternar('panelControles'));
enlazar('btCreditos', () => alternar('panelCreditos'));
enlazar('btHabilidades', () => alternar('habilidades'));
enlazar('btPergaminos', () => alternar('pergaminos'));
enlazar('btAmuletos', () => alternar('amuletos'));
enlazar('btCerrarPanel', cerrarPaneles);

addEventListener('keydown', e => {
    // mientras se escribe (la consola) el teclado no es del menú, y Alt+Intro
    // es cosa suya
    if (e.target.tagName === 'INPUT' || e.altKey) return;
    // Enter vale por el botón principal; donde no lo hay (la lista de ranuras)
    // no se avanza a ciegas
    if (e.key === 'Enter' && !hayPanelAbierto() && document.getElementById('btJugar')) continuar();
    // enmarcada no hay paneles que recoger: Esc cierra la ventana entera
    if (e.key === 'Escape') { if (enMarco) cerrarMarco(); else cerrarPaneles(); }
});

// el renglón de láminas se corre con la rueda: con el ratón nadie tiene por
// qué ir a buscar la barra de abajo
addEventListener('wheel', e => {
    const fila = e.target.closest && e.target.closest('.armas');
    if (!fila || fila.scrollWidth <= fila.clientWidth) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;   // ya viene de lado
    fila.scrollLeft += e.deltaY;
    e.preventDefault();
}, { passive: false });

// ---------- La música, que ya no es cosa de aquí ----------
// La caja de música vive en el armazón (index.html), fuera del marco, porque
// es el único documento que no se recarga al cambiar de pantalla. Lo que se
// hace desde dentro es contarle dos cosas:
//
//   - si en esta pantalla suena o no, que lo dice su <body data-musica>
//   - el primer toque del jugador, porque el navegador no deja sonar nada
//     hasta que lo haya, y los clics caen aquí dentro y no en el armazón
if (enArmazon) {
    avisarAlArmazon({ musica: document.body.dataset.musica === 'si' });

    const avisarDelToque = () => avisarAlArmazon({ toque: true });
    addEventListener('pointerdown', avisarDelToque, { once: true });
    addEventListener('keydown', avisarDelToque, { once: true });
}

// sin lienzo no hay nada que animar, pero los botones ya quedaron atados
if (ctx) {
    addEventListener('resize', () => { medir(); sembrarPetalos(); });
    medir();
    sembrarPetalos();
    requestAnimationFrame(cuadro);
}

// Estas pantallas (portada, ranuras, zaguán, final) están pensadas para un
// ancho de referencia: lo que cambia con la ventana es el zoom con que se
// ven, no su diseño, así que se ven siempre del mismo tamaño en cualquier
// pantalla. El hud del juego no pasa por aquí: ese sí se acomoda a cada
// pantalla, ver ajustarEscalaLienzo en vista.js.
// Dentro de la ventana de ajustes de la partida esto no se aplica: allí manda
// el tamaño del marco, que ya es pequeño, y encogerlo otra vez dejaría las
// letras ilegibles.
// El arco de la portada no necesita nada aquí: como el de ranura.html, va
// clavado de arriba al suelo y escala con este mismo zoom, igual que el resto
// del decorado. Es justo lo que lo deja quieto.
const REF_ANCHO_MENU = 1600;
function fijarEscalaMenu() {
    document.documentElement.style.zoom = enMarco ? 1 : innerWidth / REF_ANCHO_MENU;
}
addEventListener('resize', fijarEscalaMenu);
fijarEscalaMenu();
