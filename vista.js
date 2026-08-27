// ============================================================
//  vista.js - dibujado, entrada y bucle principal (vista cenital)
//  La lógica de juego vive en mazmorra.js; aquí solo se pinta.
// ============================================================
const lienzo = document.getElementById('vista');
const ctx = lienzo.getContext('2d');
const AN = lienzo.width, AL = lienzo.height;

const TILE = 34;              // píxeles por casilla
const RADIO_LUZ = 9;          // en casillas
const SPR = 46;               // lado del lienzo de cada sprite
const ESCALA_SPR = 1.35;      // las figuras se dibujan algo mayores que su lienzo

const cam = { x: 0, y: 0 };   // en píxeles de mundo
let sacudida = 0;             // temblor de pantalla al recibir daño
let flash = 0;

function lienzoOculto(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
}

// ============================================================
//  Texturas de piedra: manchas irregulares, sin cuadrícula
// ============================================================
function tileRuido(base, variacion, manchas) {
    const L = 96;
    const c = lienzoOculto(L, L), g = c.getContext('2d');
    g.fillStyle = `rgb(${base}, ${base - 5}, ${base - 12})`;
    g.fillRect(0, 0, L, L);
    for (let i = 0; i < manchas; i++) {
        const t = Math.round(azar(-variacion, variacion));
        g.fillStyle = `rgba(${base + t}, ${base + t - 5}, ${base + t - 12}, 0.55)`;
        const cx = azar(0, L), cy = azar(0, L);
        const rx = azar(4, 16), ry = azar(3, 11), giro = azar(0, 3.14);
        // manchas ovaladas y giradas; se repiten en las 9 copias vecinas para que
        // el patrón encaje consigo mismo y no se adivine la rejilla al repetirlo
        for (let ox = -1; ox <= 1; ox++)
            for (let oy = -1; oy <= 1; oy++) {
                g.beginPath();
                g.ellipse(cx + ox * L, cy + oy * L, rx, ry, giro, 0, 6.2832);
                g.fill();
            }
    }
    return c;
}

// ============================================================
//  Composición del nivel: se hace una vez por cueva
// ============================================================
let lienzoNivel = null;

function construirLienzoNivel() {
    const W = ANCHO * TILE, H = ALTO * TILE;
    const ESC = 0.5;                                  // la máscara se calcula a mitad de resolución
    const w = Math.round(W * ESC), h = Math.round(H * ESC);

    // 1) Silueta del suelo, en blanco sobre negro
    const masc = lienzoOculto(w, h), mg = masc.getContext('2d');
    mg.fillStyle = '#000';
    mg.fillRect(0, 0, w, h);
    mg.fillStyle = '#fff';
    const t = TILE * ESC;
    for (let y = 0; y < ALTO; y++)
        for (let x = 0; x < ANCHO; x++)
            if (J.mapa[y][x] === 0) mg.fillRect(x * t - 0.5, y * t - 0.5, t + 1, t + 1);

    // 2) Desenfocar y subir el contraste: las esquinas rectas se redondean
    //    y el contorno queda irregular, como roca excavada.
    const suave = lienzoOculto(w, h), sg = suave.getContext('2d');
    sg.filter = `blur(${Math.round(TILE * ESC * 0.42)}px) contrast(22)`;
    sg.drawImage(masc, 0, 0);
    sg.filter = 'none';

    // 3) Pasar ese blanco/negro a transparencia (la silueta ya redondeada)
    const d = sg.getImageData(0, 0, w, h);
    const px = d.data;
    for (let i = 0; i < px.length; i += 4) {
        px[i + 3] = px[i];                              // el rojo hace de alfa
        px[i] = px[i + 1] = px[i + 2] = 255;
    }
    sg.putImageData(d, 0, 0);

    // 4) Montar el nivel: roca de fondo, sombra del borde y suelo recortado
    const nivel = lienzoOculto(W, H), ng = nivel.getContext('2d');
    ng.fillStyle = ng.createPattern(tileRuido(34, 14, 90), 'repeat');
    ng.fillRect(0, 0, W, H);

    // la silueta proyecta sombra sobre la roca: da sensación de profundidad
    ng.save();
    ng.shadowColor = 'rgba(0,0,0,0.85)';
    ng.shadowBlur = 26;
    for (let i = 0; i < 3; i++) ng.drawImage(suave, 0, 0, W, H);
    ng.restore();

    // el suelo, recortado con la misma silueta
    const suelo = lienzoOculto(W, H), fg = suelo.getContext('2d');
    fg.fillStyle = fg.createPattern(tileRuido(112, 22, 140), 'repeat');
    fg.fillRect(0, 0, W, H);
    fg.globalCompositeOperation = 'destination-in';
    fg.drawImage(suave, 0, 0, W, H);
    ng.drawImage(suelo, 0, 0);

    // borde interior oscuro, para que la pared "muerda" el suelo
    ng.save();
    ng.globalCompositeOperation = 'multiply';
    ng.globalAlpha = 0.55;
    ng.filter = 'blur(6px)';
    ng.drawImage(recortarBorde(suave, W, H), 0, 0);
    ng.restore();

    lienzoNivel = nivel;
    prepararMinimapa();
}

// Anillo oscuro justo por dentro del contorno del suelo
function recortarBorde(silueta, W, H) {
    const c = lienzoOculto(W, H), g = c.getContext('2d');
    g.fillStyle = '#404048';
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(silueta, 0, 0, W, H);
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(silueta, -5, -5, W + 10, H + 10);     // vaciar el centro
    return c;
}

// ============================================================
//  Sprites: figuras redondeadas dibujadas por código
// ============================================================
let sprites;

function nuevoSprite(pintar) {
    const c = lienzoOculto(SPR, SPR);
    pintar(c.getContext('2d'), SPR / 2);
    return c;
}

function bulto(g, cx, cy, rx, ry, relleno, giro = 0) {
    g.fillStyle = relleno;
    g.strokeStyle = 'rgba(0,0,0,0.8)';
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, giro, 0, Math.PI * 2);
    g.fill(); g.stroke();
}

function prepararSprites() {
    sprites = {
        // Todas las criaturas miran a la derecha; se rotan al dibujarlas.
        rata: nuevoSprite((g, c) => {
            g.strokeStyle = '#3b342e'; g.lineWidth = 2.5;
            g.beginPath(); g.moveTo(c - 8, c); g.quadraticCurveTo(c - 20, c - 6, c - 16, c - 15); g.stroke();
            bulto(g, c - 2, c, 11, 8, '#574d44');
            bulto(g, c + 7, c - 5, 4.5, 4.5, '#463d36');
            bulto(g, c + 7, c + 5, 4.5, 4.5, '#463d36');
            bulto(g, c + 9, c, 7, 5.5, '#635850');
            g.fillStyle = '#e05050';
            g.beginPath(); g.arc(c + 12, c - 3, 1.7, 0, 6.3); g.fill();
            g.beginPath(); g.arc(c + 12, c + 3, 1.7, 0, 6.3); g.fill();
        }),

        trol: nuevoSprite((g, c) => {
            bulto(g, c - 3, c, 17, 15, '#3d5330');
            bulto(g, c - 9, c - 12, 5.5, 5.5, '#33452a');
            bulto(g, c - 9, c + 12, 5.5, 5.5, '#33452a');
            bulto(g, c + 8, c, 11, 10, '#547140');
            g.fillStyle = '#f0d040';
            g.beginPath(); g.arc(c + 12, c - 4, 2.3, 0, 6.3); g.fill();
            g.beginPath(); g.arc(c + 12, c + 4, 2.3, 0, 6.3); g.fill();
            g.fillStyle = '#e8e8d8';
            g.beginPath(); g.arc(c + 17, c - 3, 1.6, 0, 6.3); g.fill();
            g.beginPath(); g.arc(c + 17, c + 3, 1.6, 0, 6.3); g.fill();
        }),

        heroe: nuevoSprite((g, c) => {
            bulto(g, c - 4, c, 15, 13, '#2f3f5e');                  // capa
            bulto(g, c - 1, c, 11, 10, '#4a628f');                  // hombros
            bulto(g, c + 3, c, 7.5, 7.5, '#d8b48c');                // cabeza
            g.fillStyle = '#3a2b1e';                                // pelo
            g.beginPath(); g.arc(c, c, 6.5, Math.PI / 2, -Math.PI / 2); g.fill();
        }),

        espada: nuevoSprite((g, c) => {
            g.strokeStyle = '#1a1a20'; g.lineWidth = 6;             // contorno
            g.beginPath(); g.moveTo(c + 2, c); g.lineTo(c + 20, c); g.stroke();
            g.strokeStyle = '#ccd2e0'; g.lineWidth = 3.5;           // hoja
            g.beginPath(); g.moveTo(c + 2, c); g.lineTo(c + 20, c); g.stroke();
            g.strokeStyle = '#7a5c30'; g.lineWidth = 5;             // guarda
            g.beginPath(); g.moveTo(c, c - 4); g.lineTo(c, c + 4); g.stroke();
        }),

        escudo: nuevoSprite((g, c) => {
            g.fillStyle = '#6e7488';                                // chapa
            g.strokeStyle = '#15161c'; g.lineWidth = 2.5;
            g.beginPath(); g.ellipse(c, c, 5.5, 13, 0, 0, 6.3);
            g.fill(); g.stroke();
            g.fillStyle = '#8f96ad';                                // reflejo
            g.beginPath(); g.ellipse(c - 1, c - 2, 2.4, 7.5, 0, 0, 6.3); g.fill();
            g.fillStyle = '#c8a060';                                // remache central
            g.beginPath(); g.arc(c, c, 2.6, 0, 6.3); g.fill(); g.stroke();
        }),

        pocion: nuevoSprite((g, c) => {
            bulto(g, c, c, 9.5, 9.5, '#c03838');
            g.fillStyle = 'rgba(255,190,190,0.5)';
            g.beginPath(); g.ellipse(c - 3, c - 3.5, 3.5, 2.4, -0.6, 0, 6.3); g.fill();
            g.fillStyle = '#c8a060';
            g.strokeStyle = 'rgba(0,0,0,0.75)'; g.lineWidth = 1.5;
            g.beginPath(); g.arc(c, c, 3.6, 0, 6.3); g.fill(); g.stroke();
        })
    };
}

// La puerta al siguiente nivel: dos hojas en un marco de piedra que se
// apartan a los lados. Se dibuja en directo porque late y se mueve.
function dibujarPuerta(cx, cy) {
    const r = TILE * 0.72;
    const a = J.puerta.apertura;
    const pulso = 0.85 + Math.sin(J.tiempo * 2.5) * 0.15;

    // ya franqueable: el pasaje respira luz azul
    if (a > 0) {
        const halo = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.1);
        halo.addColorStop(0, `rgba(120, 170, 220, ${0.34 * a * pulso})`);
        halo.addColorStop(1, 'rgba(120, 170, 220, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(cx, cy, r * 2.1, 0, 6.3); ctx.fill();
    }

    // el vano: oscuridad de lo que hay al otro lado
    const hueco = ctx.createRadialGradient(cx, cy - r * 0.2, r * 0.1, cx, cy, r);
    hueco.addColorStop(0, '#000');
    hueco.addColorStop(0.75, '#0b0a10');
    hueco.addColorStop(1, '#231f2b');
    ctx.fillStyle = hueco;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.3); ctx.fill();

    // las hojas, recortadas al vano: al correrse se meten en el marco
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.3); ctx.clip();
    const corrida = a * r * 1.08;
    hojaDePuerta(cx - corrida, cy, r, -1);
    hojaDePuerta(cx + corrida, cy, r, 1);

    if (a < 1) {                                    // el cerrojo, mientras aguanta
        ctx.globalAlpha = 1 - a;
        ctx.strokeStyle = '#9a6a52';
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, 6.3); ctx.stroke();
        ctx.fillStyle = `rgba(200, 90, 74, ${pulso})`;
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.13, 0, 6.3); ctx.fill();
        ctx.globalAlpha = 1;
    }
    ctx.restore();

    // marco de piedra, y un reborde que dice si se puede pasar
    ctx.strokeStyle = '#4a4654';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, 6.3); ctx.stroke();
    ctx.strokeStyle = a >= 1
        ? `rgba(150, 190, 235, ${0.55 * pulso})`
        : `rgba(190, 90, 80, ${0.40 * pulso})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r + 4.5, 0, 6.3); ctx.stroke();
}

// Media puerta: tablas verticales con dos refuerzos de hierro
function hojaDePuerta(x, y, r, lado) {
    const x0 = lado < 0 ? x - r : x;
    ctx.fillStyle = '#4a3726';
    ctx.fillRect(x0, y - r, r, r * 2);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
        const vx = x0 + (r * i) / 4;
        ctx.beginPath(); ctx.moveTo(vx, y - r); ctx.lineTo(vx, y + r); ctx.stroke();
    }

    ctx.fillStyle = '#6b6f80';
    ctx.fillRect(x0, y - r * 0.62, r, 4);
    ctx.fillRect(x0, y + r * 0.42, r, 4);

    ctx.fillStyle = '#241c14';                      // canto por donde se juntan
    ctx.fillRect(lado < 0 ? x - 2 : x, y - r, 2, r * 2);
}

// ============================================================
//  Dibujado por fotograma
// ============================================================
const aPantallaX = x => x * TILE - cam.x;
const aPantallaY = y => y * TILE - cam.y;

function pintar() {
    const j = J.jugador;

    // cámara: sigue al héroe y se queda dentro de los límites de la cueva
    const objX = j.x * TILE - AN / 2, objY = j.y * TILE - AL / 2;
    cam.x = Math.max(0, Math.min(ANCHO * TILE - AN, objX));
    cam.y = Math.max(0, Math.min(ALTO * TILE - AL, objY));

    ctx.save();
    if (sacudida > 0) ctx.translate(azar(-sacudida, sacudida), azar(-sacudida, sacudida));

    ctx.fillStyle = '#000';
    ctx.fillRect(-10, -10, AN + 20, AL + 20);
    ctx.drawImage(lienzoNivel, cam.x, cam.y, AN, AL, 0, 0, AN, AL);

    dibujarPuerta(aPantallaX(J.puerta.x), aPantallaY(J.puerta.y));

    for (const o of J.objetos) {
        const flot = Math.sin(J.tiempo * 3 + o.giro) * 2;
        sombra(aPantallaX(o.x), aPantallaY(o.y), 0.30);
        dibujarSprite(sprites.pocion, aPantallaX(o.x), aPantallaY(o.y) + flot, 0);
    }

    for (const e of J.enemigos) {
        const px = aPantallaX(e.x), py = aPantallaY(e.y);
        sombra(px, py, e.r);
        if (e.herido > 0) { ctx.save(); ctx.filter = 'brightness(2.2) saturate(0.4)'; }
        dibujarSprite(sprites[e.tipo], px, py, e.mira);
        if (e.herido > 0) ctx.restore();
        barraEnemigo(e, px, py);
    }

    dibujarHeroe(j);
    dibujarEfectos();
    luzDeAntorcha(aPantallaX(j.x), aPantallaY(j.y));

    if (flash > 0) {
        ctx.fillStyle = `rgba(160, 20, 20, ${flash * 0.4})`;
        ctx.fillRect(0, 0, AN, AL);
    }
    ctx.restore();
}

function dibujarSprite(sprite, px, py, angulo) {
    const s = SPR * ESCALA_SPR;
    ctx.save();
    ctx.translate(px, py);
    if (angulo) ctx.rotate(angulo);
    ctx.drawImage(sprite, -s / 2, -s / 2, s, s);
    ctx.restore();
}

function sombra(px, py, r) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(px, py + r * TILE * 0.55, r * TILE * 1.05, r * TILE * 0.5, 0, 0, 6.3);
    ctx.fill();
}

function dibujarHeroe(j) {
    const px = aPantallaX(j.x), py = aPantallaY(j.y);
    sombra(px, py, j.r);

    // la espada acompaña al golpe: sale por delante y vuelve
    const prog = j.golpe > 0 ? 1 - j.golpe / 0.18 : 0;
    const barrido = j.golpe > 0 ? (prog - 0.5) * j.arco * 2 : Math.sin(J.tiempo * 2) * 0.06;
    const empuje = j.golpe > 0 ? Math.sin(prog * Math.PI) * 9 : 0;
    const s = SPR * ESCALA_SPR;

    if (j.dash > 0) estelaDeImpulso(px, py, j);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(j.mira);

    if (j.golpe > 0) {                                  // estela del arco
        ctx.fillStyle = `rgba(220, 230, 255, ${0.28 * (1 - prog)})`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, j.alcance * TILE, barrido - 0.55, barrido + 0.55);
        ctx.closePath();
        ctx.fill();
    }

    if (j.cubriendo) {                                  // el arco que para los golpes
        ctx.strokeStyle = 'rgba(190, 205, 240, 0.32)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, TILE * 0.75, -ARCO_GUARDIA, ARCO_GUARDIA);
        ctx.stroke();
    }

    if (!j.cubriendo) {                                 // cubierto, la espada baja
        ctx.save();
        ctx.rotate(barrido);
        ctx.translate(empuje, 0);
        ctx.drawImage(sprites.espada, -s / 2 + 8, -s / 2 + 12, s, s);
        ctx.restore();
    }

    ctx.globalAlpha = J.muerto ? 0.35 : (j.invulnerable > 0 ? 0.55 : 1);
    const cadenciaPaso = j.corriendo ? 21 : 14;
    const paso = j.andando ? Math.sin(J.tiempo * cadenciaPaso) * (j.corriendo ? 1.5 : 0.9) : 0;
    ctx.drawImage(sprites.heroe, -s / 2, -s / 2 + paso, s, s);

    // el escudo va en el brazo contrario a la espada; al cubrirse se alza de frente
    ctx.translate(j.cubriendo ? 15 : 3, j.cubriendo ? 0 : -11);
    ctx.drawImage(sprites.escudo, -s / 2, -s / 2, s, s);

    ctx.restore();
    ctx.globalAlpha = 1;
}

// Rastro de siluetas detrás del héroe mientras dura el impulso
function estelaDeImpulso(px, py, j) {
    const k = j.dash / DURACION_DASH;
    const s = SPR * ESCALA_SPR;
    for (let i = 1; i <= 3; i++) {
        ctx.save();
        ctx.globalAlpha = 0.20 * k * (1 - i / 4);
        ctx.translate(px - Math.cos(j.mira) * i * 9, py - Math.sin(j.mira) * i * 9);
        ctx.rotate(j.mira);
        ctx.drawImage(sprites.heroe, -s / 2, -s / 2, s, s);
        ctx.restore();
    }
    ctx.globalAlpha = 1;
}

function barraEnemigo(e, px, py) {
    if (e.hp >= e.hpMax) return;
    const w = TILE * 0.8, x = px - w / 2, y = py - e.r * TILE - 12;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 1, y - 1, w + 2, 5);
    ctx.fillStyle = '#c04040';
    ctx.fillRect(x, y, w * (e.hp / e.hpMax), 3);
}

function dibujarEfectos() {
    for (const f of J.efectos) {
        const k = 1 - f.t / f.vida;
        const px = aPantallaX(f.x), py = aPantallaY(f.y);
        if (f.tipo === 'chispa') {
            ctx.fillStyle = f.color;
            ctx.globalAlpha = k;
            ctx.beginPath(); ctx.arc(px, py, 2.5 * k + 0.8, 0, 6.3); ctx.fill();
        } else {
            ctx.globalAlpha = k;
            ctx.fillStyle = f.color;
            ctx.font = 'bold 15px Consolas, monospace';
            ctx.textAlign = 'center';
            ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 3;
            ctx.strokeText(f.texto, px, py);
            ctx.fillText(f.texto, px, py);
        }
    }
    ctx.globalAlpha = 1;
}

function luzDeAntorcha(cx, cy) {
    const r = RADIO_LUZ * TILE;
    const g = ctx.createRadialGradient(cx, cy, r * 0.32, cx, cy, r);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.62, 'rgba(0,0,0,0.25)');
    g.addColorStop(1, 'rgba(0,0,0,0.93)');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -10, AN + 20, AL + 20);
}

function pintarHud() {
    const p = J.jugador;
    document.getElementById('estadoPv').textContent = `PV ${Math.ceil(p.hp)}/${p.hpMax}`;
    document.getElementById('vida').style.width = Math.max(0, (p.hp / p.hpMax) * 100) + '%';
    document.getElementById('exp').style.width = (p.exp / (p.nivel * 25)) * 100 + '%';

    const carga = Math.min(1, 1 - Math.max(0, p.cdDash) / ESPERA_DASH);
    const dash = document.getElementById('dash');
    dash.style.width = carga * 100 + '%';
    dash.parentElement.classList.toggle('lista', carga >= 1);

    document.getElementById('estadoNivel').textContent =
        `Cueva ${J.nivel}   ·   Nivel ${p.nivel}   ·   Enemigos ${J.enemigos.length}`;
    document.getElementById('mensajes').innerHTML =
        J.log.slice(-5).map(t => `<div>${t}</div>`).join('');
    document.getElementById('muerte').style.display = J.muerto ? 'flex' : 'none';

    const aviso = document.getElementById('aviso');
    const cerca = !J.muerto && cercaDePuerta();
    aviso.style.opacity = cerca ? 1 : 0;
    if (cerca) {
        const n = J.enemigos.length;
        aviso.textContent = puertaAbierta()
            ? '[E] cruzar la puerta'
            : n
                ? `La puerta está atrancada · ${n === 1 ? 'queda 1 enemigo' : `quedan ${n} enemigos`}`
                : 'La puerta se está abriendo…';
        aviso.classList.toggle('trabado', !puertaAbierta());
    }
}

// ============================================================
//  Minimapa: se recuerda lo explorado; los bichos solo salen si los ves
// ============================================================
const MINI = 3;                     // píxeles por casilla
const mini = document.getElementById('minimapa');
const mctx = mini.getContext('2d');

let terrenoMini = null;             // lo ya descubierto, dibujado una sola vez
let tctx = null;
let volcado = null;                 // casillas que ya pasaron al lienzo
let barridoCompleto = false;        // ya se volcó el mapa entero al vaciarse la cueva

function prepararMinimapa() {
    mini.width = ANCHO * MINI;
    mini.height = ALTO * MINI;
    if (!terrenoMini) {
        terrenoMini = lienzoOculto(mini.width, mini.height);
        tctx = terrenoMini.getContext('2d');
    }
    tctx.clearRect(0, 0, mini.width, mini.height);
    volcado = new Uint8Array(ANCHO * ALTO);
    barridoCompleto = false;
}

// Pinta solo lo recién descubierto: de ordinario basta con mirar alrededor del
// héroe, porque más lejos no ha podido cambiar nada. La excepción es el momento
// en que cae el último enemigo y la cueva entera pasa a estar explorada: ahí hay
// que barrer el mapa completo, y una sola vez.
function volcarDescubierto() {
    const j = J.jugador;
    const deGolpe = !barridoCompleto && J.puerta.apertura > 0;
    if (deGolpe) barridoCompleto = true;

    const r = Math.ceil(RADIO_VISION) + 1;
    const y0 = deGolpe ? 0 : Math.max(0, Math.floor(j.y - r));
    const y1 = deGolpe ? ALTO - 1 : Math.min(ALTO - 1, Math.floor(j.y + r));
    const x0 = deGolpe ? 0 : Math.max(0, Math.floor(j.x - r));
    const x1 = deGolpe ? ANCHO - 1 : Math.min(ANCHO - 1, Math.floor(j.x + r));

    for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
            const i = y * ANCHO + x;
            if (!J.explorado[i] || volcado[i]) continue;
            volcado[i] = 1;
            tctx.fillStyle = J.mapa[y][x] === 1 ? '#23252f' : '#5b6072';
            tctx.fillRect(x * MINI, y * MINI, MINI, MINI);
        }
}

const aLaVista = e => Math.hypot(e.x - J.jugador.x, e.y - J.jugador.y) <= RADIO_VISION;

function puntoMini(x, y, color, r) {
    mctx.fillStyle = color;
    mctx.beginPath();
    mctx.arc(x * MINI, y * MINI, r, 0, 6.3);
    mctx.fill();
}

function pintarMinimapa() {
    volcarDescubierto();
    const j = J.jugador;

    mctx.clearRect(0, 0, mini.width, mini.height);
    mctx.drawImage(terrenoMini, 0, 0);

    // recuadro de lo que se está viendo en pantalla
    mctx.strokeStyle = 'rgba(220, 225, 245, 0.16)';
    mctx.lineWidth = 1;
    mctx.strokeRect(cam.x / TILE * MINI + 0.5, cam.y / TILE * MINI + 0.5,
                    AN / TILE * MINI - 1, AL / TILE * MINI - 1);

    // la puerta, una vez encontrada, ya no se olvida: roja si sigue atrancada
    const iPue = Math.floor(J.puerta.y) * ANCHO + Math.floor(J.puerta.x);
    if (J.explorado[iPue]) {
        mctx.globalAlpha = 0.55 + Math.sin(J.tiempo * 2.5) * 0.35;
        puntoMini(J.puerta.x, J.puerta.y, puertaAbierta() ? '#78b4e0' : '#b8564a', 3.2);
        mctx.globalAlpha = 1;
    }

    // con la cueva limpia se ven todas las pociones, por si toca curarse
    const limpia = !J.enemigos.length;
    for (const o of J.objetos)
        if (limpia || aLaVista(o)) puntoMini(o.x, o.y, '#c03838', 2);
    for (const e of J.enemigos)
        if (aLaVista(e)) puntoMini(e.x, e.y, e.tipo === 'trol' ? '#7da44e' : '#a8825c', 2.2);

    // el héroe: una cuña que apunta a donde mira
    mctx.save();
    mctx.translate(j.x * MINI, j.y * MINI);
    mctx.rotate(j.mira);
    mctx.fillStyle = J.muerto ? '#8a6a6a' : '#f0f0ff';
    mctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    mctx.lineWidth = 1;
    mctx.beginPath();
    mctx.moveTo(5, 0); mctx.lineTo(-3.2, -3.4); mctx.lineTo(-3.2, 3.4);
    mctx.closePath();
    mctx.fill(); mctx.stroke();
    mctx.restore();
}

// ============================================================
//  Entrada
// ============================================================
const teclas = new Set();
const raton = { x: AN / 2, y: AL / 2, izq: false, der: false };
let dashPedido = false;          // el impulso se pide una vez por pulsación

addEventListener('keydown', ev => {
    const k = ev.key.toLowerCase();
    if (k === 'r') { comenzar(); return; }
    if (k === 'e') { if (!ev.repeat && cruzar()) construirLienzoNivel(); return; }
    if (k === ' ' && !ev.repeat) dashPedido = true;
    teclas.add(k);
    if ([' ', 'w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k))
        ev.preventDefault();
});
addEventListener('keyup', ev => teclas.delete(ev.key.toLowerCase()));

lienzo.addEventListener('mousemove', ev => {
    const c = lienzo.getBoundingClientRect();
    raton.x = (ev.clientX - c.left) * (AN / c.width);
    raton.y = (ev.clientY - c.top) * (AL / c.height);
});
lienzo.addEventListener('mousedown', ev => {
    if (ev.button === 0) raton.izq = true;
    if (ev.button === 2) raton.der = true;
});
addEventListener('mouseup', ev => {
    if (ev.button === 0) raton.izq = false;
    if (ev.button === 2) raton.der = false;
});
// sin el menú contextual, el botón derecho queda libre para la guardia
lienzo.addEventListener('contextmenu', ev => ev.preventDefault());
addEventListener('blur', () => { teclas.clear(); raton.izq = raton.der = false; });

function leerEntrada() {
    const t = k => teclas.has(k);
    const dx = (t('d') || t('arrowright') ? 1 : 0) - (t('a') || t('arrowleft') ? 1 : 0);
    const dy = (t('s') || t('arrowdown') ? 1 : 0) - (t('w') || t('arrowup') ? 1 : 0);

    // se apunta con el ratón; si no se ha movido, hacia donde se anda
    const j = J.jugador;
    let mira = j.mira;
    const rx = raton.x + cam.x - j.x * TILE;
    const ry = raton.y + cam.y - j.y * TILE;
    if (Math.hypot(rx, ry) > 6) mira = Math.atan2(ry, rx);
    else if (dx || dy) mira = Math.atan2(dy, dx);

    const dash = dashPedido;
    dashPedido = false;
    return { dx, dy, mira, atacar: raton.izq, cubrir: raton.der, correr: t('shift'), dash };
}

// ============================================================
//  Bucle principal
// ============================================================
let ultimo = performance.now();
let hpPrevio = 0;

function bucle(ahora) {
    const dt = Math.min(0.05, (ahora - ultimo) / 1000);   // sin saltos si se pierde el foco
    ultimo = ahora;

    actualizar(dt, leerEntrada());

    if (J.jugador.hp < hpPrevio) { flash = 1; sacudida = 5; }
    hpPrevio = J.jugador.hp;
    flash = Math.max(0, flash - dt * 3);
    sacudida = Math.max(0, sacudida - dt * 22);

    pintar();
    pintarHud();
    pintarMinimapa();
    requestAnimationFrame(bucle);
}

function comenzar() {
    iniciarPartida();
    construirLienzoNivel();
    hpPrevio = J.jugador.hp;
    flash = 0; sacudida = 0;
}

prepararSprites();
comenzar();
requestAnimationFrame(bucle);
