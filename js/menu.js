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

const lienzo = document.getElementById('fondoMenu');
const ctx = lienzo.getContext('2d');
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

// ---------- Botones ----------
// cada pantalla dice en su <body data-siguiente="..."> a dónde lleva el botón
// principal, así index.html y prev.html comparten este mismo guion
function continuar() { location.href = document.body.dataset.siguiente || 'game.html'; }
function volver() { location.href = document.body.dataset.anterior || 'index.html'; }

// controles y créditos comparten hueco: abrir uno cierra el otro
function alternar(cual) {
    const controles = document.getElementById('panelControles');
    const creditos = document.getElementById('panelCreditos');
    if (!controles || !creditos) return;
    const pedido = cual === 'controles' ? controles : creditos;
    const otro = cual === 'controles' ? creditos : controles;
    otro.hidden = true;
    pedido.hidden = !pedido.hidden;
    document.getElementById('panel').classList.toggle('abierto', !pedido.hidden);
}

function cerrarPaneles() {
    const panel = document.getElementById('panel');
    if (!panel) return;
    document.getElementById('panelControles').hidden = true;
    document.getElementById('panelCreditos').hidden = true;
    panel.classList.remove('abierto');
}

// los botones que una pantalla no tenga sencillamente no se atan
function enlazar(id, accion) {
    const boton = document.getElementById(id);
    if (boton) boton.addEventListener('click', accion);
}

enlazar('btJugar', continuar);
enlazar('btVolver', volver);
enlazar('btControles', () => alternar('controles'));
enlazar('btCreditos', () => alternar('creditos'));

addEventListener('keydown', e => {
    // mientras se escribe (la consola) el teclado no es del menú, y Alt+Intro
    // es cosa suya
    if (e.target.tagName === 'INPUT' || e.altKey) return;
    // Enter vale por el botón principal; donde no lo hay (la lista de ranuras)
    // no se avanza a ciegas
    if (e.key === 'Enter' && document.getElementById('btJugar')) continuar();
    if (e.key === 'Escape') cerrarPaneles();
});

addEventListener('resize', () => { medir(); sembrarPetalos(); });
medir();
sembrarPetalos();
requestAnimationFrame(cuadro);
