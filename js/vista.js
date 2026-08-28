// ============================================================
//  vista.js - dibujado, entrada y bucle principal (vista cenital)
//  Estética de animación japonesa: contorno de tinta, sombreado
//  plano de dos tonos, noche azul y farolillos que dan luz.
//  La lógica de juego vive en mazmorra.js; aquí solo se pinta.
// ============================================================
const lienzo = document.getElementById('vista');
const ctx = lienzo.getContext('2d');
let AN = lienzo.width, AL = lienzo.height;   // los fija la ventana, ver ajustarLienzo

const TILE = 34;              // píxeles por casilla
const ALCANCE_LUZ = 12;       // hasta dónde llega el farol del héroe, en casillas
const RAYOS_LUZ = 320;        // rayos con que se recorta la silueta iluminada
const MORDIDA_PARED = 0.7;    // cuánto entra el rayo en el muro, para verle la cara
const OSCURIDAD = 0.82;       // la noche no llega a negra: es azul de tinta
const MARGEN_SOMBRA = 14;     // sobra alrededor, para que el temblor no descubra bordes
const SPR = 56;               // lado del lienzo de cada sprite
const ESCALA_SPR = 1.16;      // las figuras se dibujan algo mayores que su lienzo

// ============================================================
//  Paleta: cada material lleva base, luz y sombra, los tres planos.
//  El contorno es siempre el mismo violeta de tinta, nunca negro puro.
// ============================================================
const P = {
    tinta: '#17132b',

    // el bosque nocturno que rodea el recinto
    nocheAlta: '#16274d',
    nocheBaja: '#101c3a',
    hoja: '#1e3d70', hojaLuz: '#33619e', hojaSombra: '#132749',
    hojaFria: '#255a7e', hojaFriaLuz: '#3d87ab',

    // tejados de teja vidriada, verdes como en las estampas
    teja: '#2f7a76', tejaLuz: '#4ea79c', tejaSombra: '#1d4f54',

    // el interior: tatami y madera de tarima
    tatami: '#6f9a63', tatamiLuz: '#82ad72', tatamiSombra: '#4f7350',
    madera: '#8a5f3e', maderaLuz: '#ad7c53', maderaSombra: '#5d3d29',
    piedra: '#8d93a8', piedraLuz: '#b2b8c8', piedraSombra: '#5c6178',

    // luz cálida de los farolillos de papel
    papel: '#ffcf72', papelLuz: '#fff0c4', bermellon: '#c8402f',

    // el héroe y su acero
    traje: '#e6ecf7', trajeLuz: '#ffffff', trajeSombra: '#a3b3cc',
    casco: '#e0453f', cascoLuz: '#ff7a63', cascoSombra: '#8f221d',
    bufanda: '#3a6fd8', bufandaLuz: '#6b9cf2', bufandaSombra: '#24468f',
    acero: '#dfe9ff', aceroSombra: '#8f9fc4',
    oro: '#e8b352', oroLuz: '#ffd784', oroSombra: '#9a6f2b',

    // los adversarios
    ninja: '#2b3f78', ninjaLuz: '#41609f', ninjaSombra: '#1a2750',
    ala: '#b7c6de', alaLuz: '#e6effc',
    oni: '#5a3670', oniLuz: '#7f5297', oniSombra: '#33204a',
    oniPiel: '#a0619f', oniPielLuz: '#c98cc2',
    ojoCalido: '#ffd24a', ojoIra: '#ff5a48',

    elixir: '#e04f7a', elixirLuz: '#ff9cba',
    sakura: '#f0a8c8', sakuraLuz: '#ffd3e4'
};

const cam = { x: 0, y: 0 };   // en píxeles de mundo
let sacudida = 0;             // temblor de pantalla al recibir daño
let flash = 0;
let dtVista = 0.016;         // el último paso de tiempo, para lo que se atenúa por fotograma

function lienzoOculto(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
}

// ============================================================
//  Piezas de cel-shading
//  Todo lo dibujado a mano sigue el mismo patrón: primero la mancha
//  de tinta que hace de contorno, luego el color plano, y encima dos
//  manchas más -sombra y luz- recortadas a la propia silueta.
// ============================================================
function pieza(g, cx, cy, rx, ry, base, luz, sombra, giro = 0, grosor = 2.4) {
    g.save();
    if (grosor) {
        g.fillStyle = P.tinta;
        g.beginPath(); g.ellipse(cx, cy, rx + grosor, ry + grosor, giro, 0, 6.2832); g.fill();
    }
    g.beginPath(); g.ellipse(cx, cy, rx, ry, giro, 0, 6.2832);
    g.fillStyle = base; g.fill();
    g.clip();
    if (sombra) {
        g.fillStyle = sombra;
        g.beginPath(); g.ellipse(cx + rx * 0.45, cy + ry * 0.5, rx, ry, giro, 0, 6.2832); g.fill();
    }
    if (luz) {
        g.fillStyle = luz;
        g.beginPath(); g.ellipse(cx - rx * 0.36, cy - ry * 0.48, rx * 0.62, ry * 0.54, giro, 0, 6.2832); g.fill();
    }
    g.restore();
}

// Brillo especular: la pincelada blanca que remata cada superficie
function brillo(g, cx, cy, rx, ry, giro = 0, alfa = 0.8) {
    g.save();
    g.globalAlpha = alfa;
    g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(cx, cy, rx, ry, giro, 0, 6.2832); g.fill();
    g.restore();
}

// ============================================================
//  Composición del nivel: se hace una vez por recinto
// ============================================================
let lienzoNivel = null;
let adornos = [];             // farolillos, tinajas y demás detalle del interior
let luces = [];               // focos fijos que iluminan la noche

// Distancia en casillas de cada celda al suelo transitable más cercano. Sirve
// para saber cuánto sitio hay fuera del recinto antes de plantar un árbol o
// una casa, y para que nada invada el alero del tejado.
function distanciasAlSuelo() {
    const d = new Int16Array(ANCHO * ALTO).fill(999);
    const cola = [];
    for (let y = 0; y < ALTO; y++)
        for (let x = 0; x < ANCHO; x++)
            if (J.mapa[y][x] === 0) { d[y * ANCHO + x] = 0; cola.push(y * ANCHO + x); }

    for (let p = 0; p < cola.length; p++) {
        const i = cola[p], x = i % ANCHO, y = (i / ANCHO) | 0;
        const paso = d[i] + 1;
        if (x > 0 && d[i - 1] > paso) { d[i - 1] = paso; cola.push(i - 1); }
        if (x < ANCHO - 1 && d[i + 1] > paso) { d[i + 1] = paso; cola.push(i + 1); }
        if (y > 0 && d[i - ANCHO] > paso) { d[i - ANCHO] = paso; cola.push(i - ANCHO); }
        if (y < ALTO - 1 && d[i + ANCHO] > paso) { d[i + ANCHO] = paso; cola.push(i + ANCHO); }
    }
    return d;
}

function construirLienzoNivel() {
    const W = ANCHO * TILE, H = ALTO * TILE;
    const dist = distanciasAlSuelo();

    // 1) Silueta del recinto: el suelo tal cual, con el filo intacto
    const silueta = lienzoOculto(W, H), sg = silueta.getContext('2d');
    sg.fillStyle = '#fff';
    for (let y = 0; y < ALTO; y++)
        for (let x = 0; x < ANCHO; x++)
            if (J.mapa[y][x] === 0) sg.fillRect(x * TILE, y * TILE, TILE, TILE);

    // 2) El camino que recorre todo borde entre suelo y muro: con él se trazan
    //    el tejado de fuera, la tarima de dentro y la línea de tinta
    const bordes = new Path2D();
    for (let y = 0; y < ALTO; y++)
        for (let x = 0; x < ANCHO; x++) {
            if (J.mapa[y][x] !== 0) continue;
            const px = x * TILE, py = y * TILE;
            if (esMuro(x, y - 1)) { bordes.moveTo(px, py); bordes.lineTo(px + TILE, py); }
            if (esMuro(x, y + 1)) { bordes.moveTo(px, py + TILE); bordes.lineTo(px + TILE, py + TILE); }
            if (esMuro(x - 1, y)) { bordes.moveTo(px, py); bordes.lineTo(px, py + TILE); }
            if (esMuro(x + 1, y)) { bordes.moveTo(px + TILE, py); bordes.lineTo(px + TILE, py + TILE); }
        }

    const nivel = lienzoOculto(W, H), ng = nivel.getContext('2d');
    pintarExterior(ng, W, H, dist);                    // el bosque y la aldea de fuera
    ng.drawImage(capaTejados(W, H, silueta, bordes), 0, 0);
    ng.drawImage(capaSuelo(W, H, silueta, bordes), 0, 0);

    // 3) Línea de tinta que cierra el recinto, como el entintado de un cel
    ng.save();
    ng.lineCap = 'square';
    ng.strokeStyle = P.tinta;
    ng.lineWidth = 3.5;
    ng.stroke(bordes);
    ng.restore();

    lienzoNivel = nivel;
    sembrarAdornos();
    prepararMinimapa();
}

// ============================================================
//  Fuera del recinto: ladera de bosque nocturno con pinos en masa,
//  sotobosque y algún tejado de aldea asomando entre las copas
// ============================================================
function pintarExterior(g, W, H, dist) {
    const noche = g.createLinearGradient(0, 0, W * 0.4, H);
    noche.addColorStop(0, P.nocheAlta);
    noche.addColorStop(1, P.nocheBaja);
    g.fillStyle = noche;
    g.fillRect(0, 0, W, H);

    const hueco = (cx, cy, min) =>
        cx >= 0 && cy >= 0 && cx < ANCHO && cy < ALTO && dist[cy * ANCHO + cx] >= min;

    // manchas amplias de maleza, para que el fondo no quede liso
    for (let i = 0; i < 300; i++) {
        const x = azar(0, W), y = azar(0, H);
        if (!hueco(Math.floor(x / TILE), Math.floor(y / TILE), 2)) continue;
        g.fillStyle = `rgba(45, 92, 150, ${azar(0.05, 0.14)})`;
        g.beginPath();
        g.ellipse(x, y, azar(30, 90), azar(20, 60), azar(0, 3.14), 0, 6.2832);
        g.fill();
    }

    // aldea: algún tejado suelto donde el bosque deja sitio de sobra
    for (let intento = 0; intento < 120; intento++) {
        const cx = azarEnt(1, ANCHO - 6), cy = azarEnt(1, ALTO - 7);
        let cabe = true;
        for (let y = cy; y < cy + 6 && cabe; y++)
            for (let x = cx; x < cx + 5 && cabe; x++) cabe = hueco(x, y, 4);
        if (!cabe) continue;
        casaDeAldea(g, cx * TILE + TILE, cy * TILE + TILE, TILE * 3, TILE * 4);
        for (let y = cy - 1; y < cy + 7; y++)          // el solar queda ocupado
            for (let x = cx - 1; x < cx + 6; x++)
                if (x >= 0 && y >= 0 && x < ANCHO && y < ALTO) dist[y * ANCHO + x] = 1;
    }

    // arboleda: copas apretadas, más frías cuanto más lejos del recinto
    for (let y = 0; y < ALTO; y++)
        for (let x = 0; x < ANCHO; x++) {
            const d = dist[y * ANCHO + x];
            if (d < 3 || Math.random() > 0.45) continue;
            copaDeArbol(g, x * TILE + azar(3, TILE - 3), y * TILE + azar(3, TILE - 3),
                        azar(TILE * 0.6, TILE * 1.15), Math.min(1, (d - 3) / 7));
        }

    // helechos y piedras sueltas en el sotobosque
    for (let i = 0; i < 460; i++) {
        const x = azar(0, W), y = azar(0, H);
        if (!hueco(Math.floor(x / TILE), Math.floor(y / TILE), 2)) continue;
        if (Math.random() < 0.62) {
            g.strokeStyle = `rgba(95, 155, 210, ${azar(0.12, 0.3)})`;
            g.lineWidth = 1.6; g.lineCap = 'round';
            const a = azar(0, 6.28), l = azar(6, 14);
            g.beginPath(); g.moveTo(x, y);
            g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 - 4, y + Math.sin(a) * l * 0.5,
                               x + Math.cos(a) * l, y + Math.sin(a) * l);
            g.stroke();
        } else {
            pieza(g, x, y, azar(3, 7), azar(2.5, 5), P.piedraSombra, null, null, azar(0, 3), 1.6);
        }
    }
}

// Copa vista desde arriba: lóbulos de un mismo trazo, tinta debajo y una
// media luna de luz arriba a la izquierda. Cel puro, sin degradados.
function copaDeArbol(g, cx, cy, r, lejos) {
    const lobulos = 6, giro = azar(0, 6.28);
    const camino = escala => {
        g.beginPath();
        for (let i = 0; i < lobulos; i++) {
            const a = giro + (i / lobulos) * 6.2832;
            const lx = cx + Math.cos(a) * r * 0.55, ly = cy + Math.sin(a) * r * 0.55;
            g.moveTo(lx + r * 0.5 * escala, ly);
            g.arc(lx, ly, r * 0.5 * escala, 0, 6.2832);
        }
        g.moveTo(cx + r * 0.62 * escala, cy);
        g.arc(cx, cy, r * 0.62 * escala, 0, 6.2832);
    };

    g.fillStyle = P.tinta;
    camino(1.14); g.fill();
    g.fillStyle = lejos > 0.55 ? P.hojaFria : P.hoja;
    camino(1); g.fill();

    g.save();
    camino(1); g.clip();
    g.fillStyle = P.hojaSombra;                        // el lado de sombra
    g.beginPath(); g.ellipse(cx + r * 0.45, cy + r * 0.5, r, r * 0.9, 0, 0, 6.2832); g.fill();
    g.fillStyle = lejos > 0.55 ? P.hojaFriaLuz : P.hojaLuz;
    g.beginPath(); g.ellipse(cx - r * 0.33, cy - r * 0.4, r * 0.6, r * 0.5, -0.5, 0, 6.2832); g.fill();
    g.globalAlpha = 0.45;                              // dos o tres hojas sueltas
    for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.ellipse(cx + azar(-r * 0.6, r * 0.2), cy + azar(-r * 0.6, r * 0.2),
                  r * 0.16, r * 0.1, azar(0, 3), 0, 6.2832);
        g.fill();
    }
    g.restore();
}

// Casa de aldea a vuelo de pájaro: tejado a dos aguas, caballete claro y
// aleros entintados, con su sombra sobre la maleza
function casaDeAldea(g, x, y, w, h) {
    g.save();
    g.fillStyle = 'rgba(9, 13, 32, 0.5)';
    g.beginPath(); g.ellipse(x + w / 2 + 9, y + h / 2 + 11, w * 0.78, h * 0.62, 0, 0, 6.2832); g.fill();

    g.fillStyle = P.tinta;
    g.fillRect(x - 5, y - 5, w + 10, h + 10);
    g.fillStyle = P.teja;
    g.fillRect(x, y, w, h);
    g.fillStyle = P.tejaSombra;                        // el faldón de la derecha
    g.fillRect(x + w * 0.52, y, w * 0.48, h);
    g.fillStyle = P.tejaLuz;                           // caballete iluminado
    g.fillRect(x + w * 0.4, y, w * 0.14, h);

    g.strokeStyle = 'rgba(18, 40, 50, 0.5)';           // hiladas de teja
    g.lineWidth = 1.4;
    for (let ty = y + 7; ty < y + h; ty += 7) {
        g.beginPath(); g.moveTo(x, ty); g.lineTo(x + w, ty); g.stroke();
    }
    g.fillStyle = P.tinta;                             // remate del caballete
    g.fillRect(x + w * 0.47, y - 3, 3, h + 6);
    g.restore();
}

// ============================================================
//  El tejado del propio recinto: banda de teja que corre por fuera de
//  todos los muros, con su alero de tinta y su brillo de vidriado
// ============================================================
function capaTejados(W, H, silueta, bordes) {
    const c = lienzoOculto(W, H), g = c.getContext('2d');
    g.lineJoin = 'round'; g.lineCap = 'round';

    g.strokeStyle = P.tinta;      g.lineWidth = TILE * 2.5 + 9; g.stroke(bordes);
    g.strokeStyle = P.tejaSombra; g.lineWidth = TILE * 2.5;     g.stroke(bordes);
    g.strokeStyle = P.teja;       g.lineWidth = TILE * 1.7;     g.stroke(bordes);
    g.strokeStyle = P.tejaLuz;    g.lineWidth = TILE * 0.45;    g.stroke(bordes);

    // canalón del alero y limatesa: dos hilos finos siguiendo el borde
    g.strokeStyle = 'rgba(18, 45, 55, 0.55)';
    g.lineWidth = 2;
    g.save(); g.translate(0, 5); g.stroke(bordes); g.restore();
    g.save(); g.translate(0, -TILE * 0.85); g.stroke(bordes); g.restore();

    // la teja se marca con hiladas, pero solo sobre la banda ya pintada
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = g.createPattern(tileTeja(), 'repeat');
    g.fillRect(0, 0, W, H);

    // y nada de esto puede invadir el interior
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(silueta, 0, 0);
    return c;
}

function tileTeja() {
    const L = 18;
    const c = lienzoOculto(L, L), g = c.getContext('2d');
    g.strokeStyle = 'rgba(12, 35, 45, 0.32)';
    g.lineWidth = 1.6;
    for (let i = 0; i <= 1; i++) {
        g.beginPath();
        g.arc(L * 0.25 + i * L * 0.5, L * 0.5, L * 0.26, 0, Math.PI);
        g.stroke();
    }
    g.strokeStyle = 'rgba(150, 230, 215, 0.12)';
    g.beginPath(); g.moveTo(0, 1); g.lineTo(L, 1); g.stroke();
    return c;
}

// ============================================================
//  Dentro: esteras de tatami, tarima de madera contra los muros y la
//  sombra dura que el alero echa sobre el suelo
// ============================================================
function capaSuelo(W, H, silueta, bordes) {
    const c = lienzoOculto(W, H), g = c.getContext('2d');

    g.fillStyle = g.createPattern(tileTatami(), 'repeat');
    g.fillRect(0, 0, W, H);

    // tarima perimetral: la franja de madera pegada a los muros
    g.lineCap = 'butt'; g.lineJoin = 'miter';
    g.strokeStyle = P.madera;    g.lineWidth = TILE * 1.05; g.stroke(bordes);
    g.strokeStyle = P.maderaLuz; g.lineWidth = TILE * 0.2;
    g.save(); g.translate(0, 3); g.stroke(bordes); g.restore();
    g.strokeStyle = P.maderaSombra; g.lineWidth = 3;
    g.save(); g.translate(0, TILE * 0.52); g.stroke(bordes); g.restore();

    // sombra del alero, corrida hacia dentro: el recurso de cel para levantar
    // el muro sin recurrir a un solo degradado
    g.strokeStyle = 'rgba(20, 26, 60, 0.4)';
    g.lineWidth = TILE * 0.55;
    g.save(); g.translate(4, 7); g.stroke(bordes); g.restore();

    g.globalCompositeOperation = 'destination-in';
    g.drawImage(silueta, 0, 0);
    return c;
}

// Esteras cruzadas, a la manera de las salas de té: dos tendidas arriba,
// dos de canto abajo, y el patrón encaja consigo mismo al repetirse
function tileTatami() {
    const T = TILE * 2, L = T * 2;
    const c = lienzoOculto(L, L), g = c.getContext('2d');
    g.fillStyle = P.tatami;
    g.fillRect(0, 0, L, L);

    let alterna = 0;
    const estera = (x, y, w, h) => {
        g.fillStyle = (alterna++ % 2) ? P.tatami : P.tatamiLuz;
        g.fillRect(x, y, w, h);
        g.strokeStyle = 'rgba(28, 44, 34, 0.6)';       // ribete de tela
        g.lineWidth = 2.5;
        g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
        g.strokeStyle = 'rgba(255, 255, 255, 0.045)';  // veta del junco
        g.lineWidth = 1;
        if (w > h) for (let i = 6; i < h - 4; i += 5) {
            g.beginPath(); g.moveTo(x + 4, y + i); g.lineTo(x + w - 4, y + i); g.stroke();
        } else for (let i = 6; i < w - 4; i += 5) {
            g.beginPath(); g.moveTo(x + i, y + 4); g.lineTo(x + i, y + h - 4); g.stroke();
        }
    };

    estera(0, 0, T, T / 2);
    estera(0, T / 2, T, T / 2);
    estera(T, 0, T, T / 2);
    estera(T, T / 2, T, T / 2);
    estera(0, T, T / 2, T);
    estera(T / 2, T, T / 2, T);
    estera(T, T, T / 2, T);
    estera(T * 1.5, T, T / 2, T);
    return c;
}

// ============================================================
//  Adornos del interior: se colocan pegados a los muros, donde no
//  estorban el paso. Los que llevan llama se apuntan como focos.
// ============================================================
function sembrarAdornos() {
    adornos = [];
    luces = [];
    // cada clase de adorno guarda su propia separación: que haya una rocalla al
    // lado no debe impedir colgar un farolillo, y al revés tampoco
    const puestos = {};
    const lejosDe = (x, y, d, tipo) =>
        (puestos[tipo] || []).every(p => Math.hypot(p.x - x, p.y - y) > d);

    for (let y = 1; y < ALTO - 1; y++)
        for (let x = 1; x < ANCHO - 1; x++) {
            if (J.mapa[y][x] !== 0) continue;
            const contra = (esMuro(x, y - 1) ? 1 : 0) + (esMuro(x, y + 1) ? 1 : 0)
                         + (esMuro(x - 1, y) ? 1 : 0) + (esMuro(x + 1, y) ? 1 : 0);
            if (!contra) continue;

            const cx = x + 0.5, cy = y + 0.5;
            if (Math.hypot(cx - J.puerta.x, cy - J.puerta.y) < 2.5) continue;
            if (Math.hypot(cx - J.jugador.x, cy - J.jugador.y) < 2.5) continue;

            // arrimado al muro: así el adorno queda fuera de la línea de paso
            let ox = 0, oy = 0;
            if (esMuro(x, y - 1)) oy = -0.22; else if (esMuro(x, y + 1)) oy = 0.22;
            if (esMuro(x - 1, y)) ox = -0.22; else if (esMuro(x + 1, y)) ox = 0.22;

            const r = Math.random();
            let tipo = null;
            if (r < 0.12 && lejosDe(cx, cy, 5, 'farol')) tipo = 'farol';
            else if (r < 0.2 && contra >= 2 && lejosDe(cx, cy, 4, 'toro')) tipo = 'toro';
            else if (r < 0.26 && lejosDe(cx, cy, 3.5, 'sakura')) tipo = 'sakura';
            else if (r < 0.32 && lejosDe(cx, cy, 3, 'tinaja')) tipo = 'tinaja';
            else if (r < 0.42 && lejosDe(cx, cy, 2.4, 'rocalla')) tipo = 'rocalla';
            if (!tipo) continue;

            const a = { x: cx + ox, y: cy + oy, tipo, fase: azar(0, 6.28), giro: azar(0, 6.28) };
            adornos.push(a);
            (puestos[tipo] ||= []).push(a);

            if (tipo === 'farol')
                luces.push({ x: a.x, y: a.y, r: TILE * 4.6, color: [255, 186, 92], fuerza: 0.85, fase: a.fase, mez: 0, enPantalla: false });
            if (tipo === 'toro')
                luces.push({ x: a.x, y: a.y, r: TILE * 3.2, color: [255, 210, 130], fuerza: 0.6, fase: a.fase, mez: 0, enPantalla: false });
        }
}

function dibujarAdornos() {
    for (const a of adornos) {
        const px = aPantallaX(a.x), py = aPantallaY(a.y);
        if (px < -60 || py < -60 || px > AN + 60 || py > AL + 60) continue;
        const parpadeo = 0.85 + Math.sin(J.tiempo * 6 + a.fase) * 0.15;
        sombraElipse(px, py + 6, 13, 6, 0.32);

        switch (a.tipo) {
            case 'farol': {                            // chōchin colgado de su vara
                pieza(ctx, px, py, 12, 12, P.papel, P.papelLuz, '#e09a3c', 0, 3);
                ctx.save();
                ctx.strokeStyle = 'rgba(120, 60, 20, 0.5)'; ctx.lineWidth = 1.4;
                for (let i = -2; i <= 2; i++) {
                    ctx.beginPath();
                    ctx.ellipse(px, py, 11.4, Math.max(1.5, 11.4 - Math.abs(i) * 3.4), 0, 0, 6.2832);
                    ctx.stroke();
                }
                ctx.restore();
                pieza(ctx, px, py, 3.4, 3.4, P.bermellon, null, null, 0, 1.6);
                brillo(ctx, px - 4, py - 5, 3, 2, -0.6, 0.55 * parpadeo);
                break;
            }
            case 'toro': {                             // linterna de piedra del jardín
                pieza(ctx, px, py, 13, 12, P.piedra, P.piedraLuz, P.piedraSombra, 0, 2.6);
                ctx.fillStyle = P.tinta;
                ctx.fillRect(px - 14, py - 3, 28, 2.5);
                pieza(ctx, px, py, 5.5, 5, P.papelLuz, null, null, 0, 2);
                brillo(ctx, px, py, 3.4, 3, 0, 0.5 + parpadeo * 0.35);
                break;
            }
            case 'sakura': {                           // cerezo enano en su macetón
                pieza(ctx, px, py + 2, 11, 9, P.maderaSombra, P.madera, null, 0, 2.4);
                ctx.save();
                ctx.translate(px, py);
                for (let i = 0; i < 5; i++) {
                    const ang = a.giro + i * 1.256;
                    pieza(ctx, Math.cos(ang) * 7, Math.sin(ang) * 6, 7.5, 6.5,
                          P.sakura, P.sakuraLuz, '#d07ca2', ang, 2.2);
                }
                ctx.restore();
                pieza(ctx, px, py, 5, 4.5, P.sakuraLuz, null, null, 0, 1.8);
                break;
            }
            case 'tinaja': {                           // tinaja de agua, con reflejo
                pieza(ctx, px, py, 10, 9, '#4b5a72', '#6d7f9c', '#2e3a4e', 0, 2.6);
                pieza(ctx, px, py, 6.5, 5.8, '#2b527a', '#3f7aa8', null, 0, 1.6);
                brillo(ctx, px - 2, py - 2, 2.6, 1.6, -0.5, 0.5);
                break;
            }
            default: {                                 // rocalla del jardín seco
                pieza(ctx, px, py, 8, 6, P.piedra, P.piedraLuz, P.piedraSombra, a.giro, 2.2);
                break;
            }
        }
    }
}

// ============================================================
//  Sprites: figuras de animación, entintadas y con dos tonos
// ============================================================
let sprites;

function nuevoSprite(pintar) {
    const c = lienzoOculto(SPR, SPR);
    pintar(c.getContext('2d'), SPR / 2);
    return c;
}

function prepararSprites() {
    sprites = {
        // Todas las figuras miran a la derecha; se rotan al dibujarlas.
        ninja: nuevoSprite((g, c) => {
            // alas de libélula, translúcidas y con nervadura
            g.save();
            g.globalAlpha = 0.55;
            pieza(g, c - 4, c - 12, 11, 5, P.ala, P.alaLuz, null, -0.5, 1.8);
            pieza(g, c - 4, c + 12, 11, 5, P.ala, P.alaLuz, null, 0.5, 1.8);
            g.restore();

            pieza(g, c - 5, c, 13, 10, P.ninja, P.ninjaLuz, P.ninjaSombra);       // torso
            pieza(g, c - 8, c - 8, 5, 4, P.ninja, null, P.ninjaSombra, -0.6, 2);  // brazos
            pieza(g, c - 8, c + 8, 5, 4, P.ninja, null, P.ninjaSombra, 0.6, 2);
            pieza(g, c + 7, c, 8.5, 7.5, P.ninjaLuz, '#5c7ec0', P.ninja);         // capucha
            g.fillStyle = '#e8eef8';                                              // banda de la frente
            g.fillRect(c + 5, c - 7, 4, 14);
            g.fillStyle = P.ojoCalido;                                            // ojos rasgados
            g.beginPath(); g.ellipse(c + 12, c - 3.4, 2.6, 1.7, 0.35, 0, 6.2832); g.fill();
            g.beginPath(); g.ellipse(c + 12, c + 3.4, 2.6, 1.7, -0.35, 0, 6.2832); g.fill();
            // hoja corta al costado
            g.strokeStyle = P.tinta; g.lineWidth = 5;
            g.beginPath(); g.moveTo(c - 2, c - 11); g.lineTo(c + 13, c - 15); g.stroke();
            g.strokeStyle = P.acero; g.lineWidth = 2.4;
            g.beginPath(); g.moveTo(c - 2, c - 11); g.lineTo(c + 13, c - 15); g.stroke();
        }),

        oni: nuevoSprite((g, c) => {
            pieza(g, c - 4, c, 18, 15, P.oni, P.oniLuz, P.oniSombra);             // corpachón
            pieza(g, c - 11, c - 13, 7, 6, P.oni, null, P.oniSombra, -0.5);       // hombreras
            pieza(g, c - 11, c + 13, 7, 6, P.oni, null, P.oniSombra, 0.5);
            g.fillStyle = P.tinta;                                                // faja de la armadura
            g.fillRect(c - 12, c - 15, 5, 30);
            pieza(g, c + 9, c, 11, 10, P.oniPiel, P.oniPielLuz, P.oni);           // testa
            // cuernos
            g.strokeStyle = P.tinta; g.lineWidth = 6;
            g.beginPath(); g.moveTo(c + 12, c - 7); g.lineTo(c + 21, c - 12); g.stroke();
            g.beginPath(); g.moveTo(c + 12, c + 7); g.lineTo(c + 21, c + 12); g.stroke();
            g.strokeStyle = '#f0e2c0'; g.lineWidth = 3;
            g.beginPath(); g.moveTo(c + 12, c - 7); g.lineTo(c + 21, c - 12); g.stroke();
            g.beginPath(); g.moveTo(c + 12, c + 7); g.lineTo(c + 21, c + 12); g.stroke();
            g.fillStyle = P.ojoIra;                                               // mirada de ira
            g.beginPath(); g.ellipse(c + 14, c - 4, 3.2, 2, 0.4, 0, 6.2832); g.fill();
            g.beginPath(); g.ellipse(c + 14, c + 4, 3.2, 2, -0.4, 0, 6.2832); g.fill();
            brillo(g, c + 15, c - 4.6, 1.1, 0.8, 0, 0.9);
            brillo(g, c + 15, c + 3.4, 1.1, 0.8, 0, 0.9);
        }),

        heroe: nuevoSprite((g, c) => {
            // bufanda al viento, por detrás de todo
            g.save();
            g.fillStyle = P.tinta;
            g.beginPath();
            g.moveTo(c - 4, c - 5); g.quadraticCurveTo(c - 20, c - 14, c - 26, c - 6);
            g.quadraticCurveTo(c - 18, c - 4, c - 4, c + 2); g.fill();
            g.fillStyle = P.bufanda;
            g.beginPath();
            g.moveTo(c - 5, c - 5); g.quadraticCurveTo(c - 19, c - 12.5, c - 24, c - 6);
            g.quadraticCurveTo(c - 17, c - 4, c - 5, c + 1); g.fill();
            g.restore();

            pieza(g, c - 4, c, 15, 13, P.traje, P.trajeLuz, P.trajeSombra);       // coraza
            pieza(g, c - 7, c - 11, 6, 5, P.traje, P.trajeLuz, P.trajeSombra, -0.5, 2.2);
            pieza(g, c - 7, c + 11, 6, 5, P.traje, P.trajeLuz, P.trajeSombra, 0.5, 2.2);
            pieza(g, c - 2, c, 8, 11, P.bufanda, P.bufandaLuz, P.bufandaSombra, 0, 2.2);  // peto azul

            pieza(g, c + 5, c, 9.5, 9, P.casco, P.cascoLuz, P.cascoSombra);       // casco
            g.fillStyle = P.tinta;                                                // cresta blanca
            g.beginPath(); g.moveTo(c + 2, c - 2); g.lineTo(c + 17, c - 4); g.lineTo(c + 17, c + 4);
            g.lineTo(c + 2, c + 2); g.closePath(); g.fill();
            g.fillStyle = P.trajeLuz;
            g.beginPath(); g.moveTo(c + 3, c - 1.5); g.lineTo(c + 15, c - 3); g.lineTo(c + 15, c + 3);
            g.lineTo(c + 3, c + 1.5); g.closePath(); g.fill();
            pieza(g, c + 3, c - 8, 3.5, 3, P.casco, P.cascoLuz, null, -0.6, 2);   // orejeras
            pieza(g, c + 3, c + 8, 3.5, 3, P.casco, P.cascoLuz, null, 0.6, 2);
            brillo(g, c + 2, c - 5, 3.4, 2.2, -0.6, 0.75);
        }),

        katana: nuevoSprite((g, c) => {
            g.lineCap = 'round';
            g.strokeStyle = P.tinta; g.lineWidth = 7.5;                           // entintado
            g.beginPath(); g.moveTo(c + 2, c); g.quadraticCurveTo(c + 14, c - 2, c + 25, c - 5); g.stroke();
            g.strokeStyle = P.acero; g.lineWidth = 4.5;                           // hoja
            g.beginPath(); g.moveTo(c + 2, c); g.quadraticCurveTo(c + 14, c - 2, c + 25, c - 5); g.stroke();
            g.strokeStyle = '#ffffff'; g.lineWidth = 1.6;                         // filo
            g.beginPath(); g.moveTo(c + 4, c - 1.6); g.quadraticCurveTo(c + 14, c - 3.6, c + 24, c - 6); g.stroke();
            pieza(g, c, c, 4.5, 2.4, P.oro, P.oroLuz, P.oroSombra, 1.4, 2);       // guarda
            g.strokeStyle = P.tinta; g.lineWidth = 6;                             // empuñadura
            g.beginPath(); g.moveTo(c - 3, c + 1); g.lineTo(c - 10, c + 3); g.stroke();
            g.strokeStyle = P.bufandaSombra; g.lineWidth = 3.5;
            g.beginPath(); g.moveTo(c - 3, c + 1); g.lineTo(c - 10, c + 3); g.stroke();
        }),

        escudo: nuevoSprite((g, c) => {
            pieza(g, c, c, 7, 14, P.bermellon, '#e8674f', '#8d2517', 0, 2.6);     // laca roja
            g.strokeStyle = P.oroLuz; g.lineWidth = 1.8;                          // filete dorado
            g.beginPath(); g.ellipse(c, c, 4.6, 11, 0, 0, 6.2832); g.stroke();
            pieza(g, c, c, 3, 3, P.oro, P.oroLuz, P.oroSombra, 0, 1.6);           // emblema
            brillo(g, c - 2, c - 5, 1.8, 4.5, 0, 0.5);
        }),

        elixir: nuevoSprite((g, c) => {
            pieza(g, c, c + 1, 8.5, 8.5, P.elixir, P.elixirLuz, '#a83458', 0, 2.6);
            pieza(g, c, c - 7, 3.2, 2.6, P.piedra, P.piedraLuz, null, 0, 2);      // tapón
            brillo(g, c - 3, c - 2, 2.6, 1.8, -0.6, 0.75);
        })
    };
}

// La puerta al siguiente recinto: dos hojas de papel en marco bermellón,
// como un shoji. Se dibuja en directo porque late y se mueve.
function dibujarPuerta(cx, cy) {
    const r = TILE * 0.75;
    const a = J.puerta.apertura;
    const pulso = 0.85 + Math.sin(J.tiempo * 2.5) * 0.15;

    if (a > 0) {                                       // ya franqueable: respira luz
        const halo = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.3);
        halo.addColorStop(0, `rgba(150, 210, 255, ${0.4 * a * pulso})`);
        halo.addColorStop(1, 'rgba(150, 210, 255, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(cx, cy, r * 2.3, 0, 6.2832); ctx.fill();
    }

    ctx.fillStyle = '#0c1024';                         // el vano al otro lado
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.fill();

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.clip();
    const corrida = a * r * 1.08;
    hojaShoji(cx - corrida, cy, r, -1);
    hojaShoji(cx + corrida, cy, r, 1);

    if (a < 1) {                                       // el sello, mientras aguanta
        ctx.globalAlpha = 1 - a;
        ctx.fillStyle = '#f2e4c8';
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(0.25);
        ctx.fillRect(-5, -r * 0.62, 10, r * 1.24);
        ctx.strokeStyle = P.bermellon; ctx.lineWidth = 1.6;
        ctx.strokeRect(-5, -r * 0.62, 10, r * 1.24);
        ctx.fillStyle = `rgba(210, 70, 55, ${pulso})`;
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(0, i * 8, 2, 0, 6.2832); ctx.fill(); }
        ctx.restore();
        ctx.globalAlpha = 1;
    }
    ctx.restore();

    ctx.strokeStyle = P.tinta;                         // marco entintado
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = a >= 1 ? P.bermellon : '#7a4a58';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = a >= 1
        ? `rgba(170, 220, 255, ${0.7 * pulso})`
        : `rgba(230, 120, 100, ${0.45 * pulso})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r + 7, 0, 6.2832); ctx.stroke();
}

// Media hoja de shoji: papel translúcido cuadriculado por listones
function hojaShoji(x, y, r, lado) {
    const x0 = lado < 0 ? x - r : x;
    ctx.fillStyle = '#e8dfc4';
    ctx.fillRect(x0, y - r, r, r * 2);
    ctx.fillStyle = 'rgba(255, 235, 180, 0.35)';
    ctx.fillRect(x0, y - r, r, r);

    ctx.strokeStyle = 'rgba(90, 60, 45, 0.55)';
    ctx.lineWidth = 1.4;
    for (let i = 1; i < 3; i++) {
        const vx = x0 + (r * i) / 3;
        ctx.beginPath(); ctx.moveTo(vx, y - r); ctx.lineTo(vx, y + r); ctx.stroke();
    }
    for (let i = 1; i < 5; i++) {
        const vy = y - r + (r * 2 * i) / 5;
        ctx.beginPath(); ctx.moveTo(x0, vy); ctx.lineTo(x0 + r, vy); ctx.stroke();
    }
    ctx.fillStyle = P.tinta;                           // canto por donde se juntan
    ctx.fillRect(lado < 0 ? x - 2.5 : x, y - r, 2.5, r * 2);
}

// ============================================================
//  Ambiente: pétalos que bajan en diagonal y luciérnagas que rondan
// ============================================================
const petalos = [];
const luciernagas = [];

function prepararAmbiente() {
    petalos.length = 0;
    luciernagas.length = 0;
    for (let i = 0; i < 34; i++)
        petalos.push({ x: azar(0, AN), y: azar(0, AL), v: azar(14, 34),
                       giro: azar(0, 6.28), vGiro: azar(-1.6, 1.6), t: azar(6, 15) });
    for (let i = 0; i < 16; i++)
        luciernagas.push({ x: azar(0, AN), y: azar(0, AL), fase: azar(0, 6.28),
                           vx: azar(-9, 9), vy: azar(-9, 9) });
}

function actualizarAmbiente(dt) {
    for (const p of petalos) {
        p.y += p.v * dt;
        p.x += Math.sin(J.tiempo * 1.4 + p.giro) * 16 * dt - 8 * dt;
        p.giro += p.vGiro * dt;
        if (p.y > AL + 12) { p.y = -12; p.x = azar(-20, AN); }
        if (p.x < -20) p.x = AN + 10;
    }
    for (const l of luciernagas) {
        l.x += l.vx * dt; l.y += l.vy * dt;
        l.vx += azar(-16, 16) * dt; l.vy += azar(-16, 16) * dt;
        l.vx = Math.max(-14, Math.min(14, l.vx));
        l.vy = Math.max(-14, Math.min(14, l.vy));
        if (l.x < 0 || l.x > AN) l.vx *= -1;
        if (l.y < 0 || l.y > AL) l.vy *= -1;
    }
}

function dibujarPetalos() {
    ctx.save();
    for (const p of petalos) {
        ctx.globalAlpha = 0.42;
        ctx.fillStyle = P.sakuraLuz;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.giro);
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.2, 2.2 * Math.abs(Math.cos(J.tiempo * 3 + p.t)), 0, 0, 6.2832);
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}

// ============================================================
//  Dibujado por fotograma
// ============================================================
const aPantallaX = x => x * TILE - cam.x;
const aPantallaY = y => y * TILE - cam.y;

function pintar() {
    const j = J.jugador;

    // cámara: sigue al héroe y se queda dentro de los límites del recinto. Si la
    // ventana es más ancha que el propio recinto, este se planta en el centro
    const objX = j.x * TILE - AN / 2, objY = j.y * TILE - AL / 2;
    const topeX = ANCHO * TILE - AN, topeY = ALTO * TILE - AL;
    cam.x = topeX > 0 ? Math.max(0, Math.min(topeX, objX)) : topeX / 2;
    cam.y = topeY > 0 ? Math.max(0, Math.min(topeY, objY)) : topeY / 2;

    ctx.save();
    if (sacudida > 0) ctx.translate(azar(-sacudida, sacudida), azar(-sacudida, sacudida));

    ctx.fillStyle = P.nocheBaja;
    ctx.fillRect(-10, -10, AN + 20, AL + 20);
    ctx.drawImage(lienzoNivel, cam.x, cam.y, AN, AL, 0, 0, AN, AL);

    dibujarAdornos();
    dibujarPuerta(aPantallaX(J.puerta.x), aPantallaY(J.puerta.y));

    for (const o of J.objetos) {
        const flot = Math.sin(J.tiempo * 3 + o.giro) * 2.5;
        const px = aPantallaX(o.x), py = aPantallaY(o.y);
        auraDeElixir(px, py + flot, o.giro);
        sombraElipse(px, py + 7, 11, 5, 0.3);
        dibujarSprite(sprites.elixir, px, py + flot, 0);
    }

    for (const e of J.enemigos) {
        const v = visibilidadEnemigo(e, j);
        if (v < 0.02) continue;                         // tapado por un muro
        const px = aPantallaX(e.x), py = aPantallaY(e.y);
        ctx.globalAlpha = v;
        sombra(px, py, e.r);
        if (e.herido > 0) { ctx.save(); ctx.filter = 'brightness(2.6) saturate(0.3)'; }
        dibujarSprite(sprites[e.tipo], px, py, e.mira);
        if (e.herido > 0) ctx.restore();
        barraEnemigo(e, px, py);
        ctx.globalAlpha = 1;
    }

    dibujarHeroe(j);
    dibujarEfectos();
    sombrasDeGeometria(j);
    pintarLuces(j);
    dibujarPetalos();

    if (flash > 0) {
        ctx.fillStyle = `rgba(200, 40, 60, ${flash * 0.35})`;
        ctx.fillRect(0, 0, AN, AL);
    }
    ctx.restore();
    vinetear();
}

// Viñeta: el borde se apaga en azul, como el encuadre de un fotograma
let capaVineta = null;
function vinetear() {
    if (!capaVineta) {
        capaVineta = lienzoOculto(AN, AL);
        const g = capaVineta.getContext('2d');
        const v = g.createRadialGradient(AN / 2, AL / 2, AL * 0.4, AN / 2, AL / 2, AL * 0.95);
        v.addColorStop(0, 'rgba(10, 16, 40, 0)');
        v.addColorStop(1, 'rgba(10, 16, 40, 0.55)');
        g.fillStyle = v;
        g.fillRect(0, 0, AN, AL);
    }
    ctx.drawImage(capaVineta, 0, 0);
}

// El aura que delata un elixir: un halo que late, el anillo que se abre y se
// desvanece -el recurso de siempre para señalar un objeto en escena- y unas
// motas que le dan vueltas en órbita achatada, como si flotase.
function auraDeElixir(px, py, fase) {
    const pulso = 0.72 + Math.sin(J.tiempo * 3.4 + fase) * 0.28;
    const r = TILE * 0.95 * (0.88 + pulso * 0.2);

    const halo = ctx.createRadialGradient(px, py, r * 0.12, px, py, r);
    halo.addColorStop(0, `rgba(255, 156, 186, ${0.45 * pulso})`);
    halo.addColorStop(0.5, `rgba(224, 79, 122, ${0.22 * pulso})`);
    halo.addColorStop(1, 'rgba(224, 79, 122, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(px, py, r, 0, 6.2832); ctx.fill();

    const k = ((J.tiempo * 0.6 + fase) % 1);          // el anillo, una vez por vuelta
    ctx.strokeStyle = `rgba(255, 205, 228, ${0.55 * (1 - k)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(px, py, TILE * 0.3 + k * TILE * 0.62,
                (TILE * 0.3 + k * TILE * 0.62) * 0.55, 0, 0, 6.2832);
    ctx.stroke();

    for (let i = 0; i < 3; i++) {
        const a = J.tiempo * 1.7 + fase + i * 2.0944;
        const mx = px + Math.cos(a) * TILE * 0.46;
        const my = py + Math.sin(a) * TILE * 0.2 - 3;
        ctx.fillStyle = `rgba(255, 226, 240, ${0.35 + Math.sin(a) * 0.35})`;
        ctx.beginPath(); ctx.arc(mx, my, 2.2, 0, 6.2832); ctx.fill();
    }
}

function dibujarSprite(sprite, px, py, angulo) {
    const s = SPR * ESCALA_SPR;
    ctx.save();
    ctx.translate(px, py);
    if (angulo) ctx.rotate(angulo);
    ctx.drawImage(sprite, -s / 2, -s / 2, s, s);
    ctx.restore();
}

function sombraElipse(px, py, rx, ry, alfa) {
    ctx.fillStyle = `rgba(12, 18, 45, ${alfa})`;
    ctx.beginPath();
    ctx.ellipse(px, py, rx, ry, 0, 0, 6.2832);
    ctx.fill();
}

function sombra(px, py, r) {
    sombraElipse(px, py + r * TILE * 0.55, r * TILE * 1.05, r * TILE * 0.5, 0.38);
}

function dibujarHeroe(j) {
    const px = aPantallaX(j.x), py = aPantallaY(j.y);
    sombra(px, py, j.r);

    // la katana acompaña al golpe: sale por delante y vuelve
    const prog = j.golpe > 0 ? 1 - j.golpe / 0.18 : 0;
    const barrido = j.golpe > 0 ? (prog - 0.5) * j.arco * 2 : Math.sin(J.tiempo * 2) * 0.06;
    const empuje = j.golpe > 0 ? Math.sin(prog * Math.PI) * 9 : 0;
    const s = SPR * ESCALA_SPR;

    if (j.dash > 0) estelaDeImpulso(px, py, j);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(j.mira);

    if (j.golpe > 0) {                                  // estela del tajo, en dos capas
        const arco = (radio, alfa, ancho) => {
            ctx.fillStyle = `rgba(235, 245, 255, ${alfa})`;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radio, barrido - ancho, barrido + ancho);
            ctx.closePath();
            ctx.fill();
        };
        arco(j.alcance * TILE, 0.3 * (1 - prog), 0.55);
        arco(j.alcance * TILE * 0.92, 0.5 * (1 - prog), 0.22);
    }

    if (j.cubriendo) {                                  // el arco que para los golpes
        ctx.strokeStyle = `rgba(150, 210, 255, 0.5)`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, TILE * 0.78, -ARCO_GUARDIA, ARCO_GUARDIA);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, TILE * 0.86, -ARCO_GUARDIA * 0.9, ARCO_GUARDIA * 0.9);
        ctx.stroke();
    }

    if (!j.cubriendo) {                                 // cubierto, la hoja baja
        ctx.save();
        ctx.rotate(barrido);
        ctx.translate(empuje, 0);
        ctx.drawImage(sprites.katana, -s / 2 + 8, -s / 2 + 12, s, s);
        ctx.restore();
    }

    ctx.globalAlpha = J.muerto ? 0.35 : (j.invulnerable > 0 ? 0.55 : 1);
    const cadenciaPaso = j.corriendo ? 21 : 14;
    const paso = j.andando ? Math.sin(J.tiempo * cadenciaPaso) * (j.corriendo ? 1.5 : 0.9) : 0;
    ctx.drawImage(sprites.heroe, -s / 2, -s / 2 + paso, s, s);

    // el escudo va en el brazo contrario a la hoja; al cubrirse se alza de frente
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
        ctx.globalAlpha = 0.22 * k * (1 - i / 4);
        ctx.translate(px - Math.cos(j.mira) * i * 9, py - Math.sin(j.mira) * i * 9);
        ctx.rotate(j.mira);
        ctx.drawImage(sprites.heroe, -s / 2, -s / 2, s, s);
        ctx.restore();
    }
    // líneas de velocidad, marca de la casa en la animación japonesa
    ctx.save();
    ctx.globalAlpha = 0.3 * k;
    ctx.strokeStyle = '#dff0ff';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
        const desv = (i - 2) * 5;
        const a = j.mira + Math.PI;
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a) * 14 - Math.sin(a) * desv, py + Math.sin(a) * 14 + Math.cos(a) * desv);
        ctx.lineTo(px + Math.cos(a) * (34 + i * 5) - Math.sin(a) * desv,
                   py + Math.sin(a) * (34 + i * 5) + Math.cos(a) * desv);
        ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
}

function barraEnemigo(e, px, py) {
    if (e.hp >= e.hpMax) return;
    const w = TILE * 0.82, x = px - w / 2, y = py - e.r * TILE - 13;
    ctx.fillStyle = P.tinta;
    ctx.fillRect(x - 2, y - 2, w + 4, 7);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = '#ff5c6e';
    ctx.fillRect(x, y, w * (e.hp / e.hpMax), 3);
}

// La esquirla del umbral: un cristal de jade que gira y crece de golpe al
// aparecer, con su resplandor y un destello en cruz encima
function dibujarEsquirla(px, py, f, k) {
    const brote = Math.min(1, f.t / 0.16);              // el estirón inicial
    const s = (12 + 4 * Math.sin(f.t * 5)) * brote;
    const giro = f.giro + f.t * 1.6;

    ctx.save();
    ctx.translate(px, py);

    ctx.globalAlpha = 0.30 * k;
    ctx.fillStyle = P.papel;
    ctx.beginPath(); ctx.arc(0, 0, s * 2.1, 0, 6.2832); ctx.fill();

    ctx.globalAlpha = k;
    ctx.rotate(giro);
    ctx.strokeStyle = P.tinta; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.fillStyle = f.cara || '#2f7a76';
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.72, -s * 0.28);
    ctx.lineTo(s * 0.30, s);
    ctx.lineTo(-s * 0.62, s * 0.42);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // la cara iluminada, plana como en las láminas
    ctx.fillStyle = f.luz || '#7fd6c4';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.82);
    ctx.lineTo(s * 0.34, -s * 0.06);
    ctx.lineTo(-s * 0.30, s * 0.34);
    ctx.closePath(); ctx.fill();

    // destello en cruz, más vivo al principio
    ctx.rotate(-giro);
    const d = s * 2.4 * (1 - f.t / f.vida);
    ctx.globalAlpha = k * k;
    ctx.strokeStyle = P.papelLuz; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-d, 0); ctx.lineTo(d, 0);
    ctx.moveTo(0, -d); ctx.lineTo(0, d);
    ctx.stroke();
    ctx.restore();
}

function dibujarEfectos() {
    for (const f of J.efectos) {
        const k = 1 - f.t / f.vida;
        const px = aPantallaX(f.x), py = aPantallaY(f.y);
        if (f.tipo === 'chispa') {
            ctx.globalAlpha = k;
            ctx.fillStyle = f.color;
            ctx.beginPath(); ctx.arc(px, py, 2.8 * k + 0.9, 0, 6.2832); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(px, py, 1.2 * k, 0, 6.2832); ctx.fill();
        } else if (f.tipo === 'esquirla') {
            dibujarEsquirla(px, py, f, k);
        } else {
            ctx.globalAlpha = k;
            ctx.fillStyle = f.color;
            ctx.font = 'bold 17px "Trebuchet MS", "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.strokeStyle = P.tinta; ctx.lineWidth = 4;
            ctx.strokeText(f.texto, px, py);
            ctx.fillText(f.texto, px, py);
        }
    }
    ctx.globalAlpha = 1;
}

// ============================================================
//  Sombras proyectadas: lo que tapa un muro, no se ve
// ============================================================
// Recorre la rejilla casilla a casilla en la dirección dada (el mismo paseo
// que usan los motores de raycasting) y devuelve a qué distancia topa con
// muro. Barato: avanza de borde en borde, no muestreando el trayecto.
function distanciaHastaRoca(ox, oy, dx, dy, tope, mordida = MORDIDA_PARED) {
    let cx = Math.floor(ox), cy = Math.floor(oy);
    const pasoX = dx > 0 ? 1 : -1, pasoY = dy > 0 ? 1 : -1;
    const saltoX = Math.abs(1 / (dx || 1e-9)), saltoY = Math.abs(1 / (dy || 1e-9));
    let bordeX = (dx > 0 ? cx + 1 - ox : ox - cx) * saltoX;
    let bordeY = (dy > 0 ? cy + 1 - oy : oy - cy) * saltoY;

    let t = 0;
    while (t < tope) {
        if (bordeX < bordeY) { t = bordeX; bordeX += saltoX; cx += pasoX; }
        else { t = bordeY; bordeY += saltoY; cy += pasoY; }
        // el rayo entra un poco en el muro: así su cara queda iluminada en vez
        // de quedarse en el filo de la sombra
        if (esMuro(cx, cy)) return Math.min(t + mordida, tope);
    }
    return tope;
}

// ¿Hay línea franca entre dos puntos? Con esto un farolillo alumbra solo si
// se le ve: su claro no se cuela al otro lado del muro.
// La mordida por omisión es indulgente, que es lo que quieren los farolillos
// arrimados al muro; para decidir si se ve a alguien se pide mordida 0, o el
// rayo se comería la pared que lo tapa.
function hayVision(ox, oy, tx, ty, mordida = MORDIDA_PARED) {
    const dx = tx - ox, dy = ty - oy;
    const d = Math.hypot(dx, dy);
    if (d < 0.01) return true;
    return distanciaHastaRoca(ox, oy, dx / d, dy / d, d, mordida) >= d - 0.05;
}

// Cuánto se ve a un enemigo: nada si media un muro, y menguando en las dos
// últimas casillas de alcance. El valor se suaviza por fotograma para que al
// asomar por una esquina aparezca con un fundido, no de golpe.
function visibilidadEnemigo(e, j) {
    const dx = e.x - j.x, dy = e.y - j.y;
    const d = Math.hypot(dx, dy) || 1e-6;
    let meta = 0;

    if (d <= ALCANCE_LUZ) {
        // se tantean tres puntos de su cuerpo: así asoma en cuanto se le ve un
        // costado, en vez de esperar a que el centro salga del muro
        const ex = (-dy / d) * e.r, ey = (dx / d) * e.r;
        const visto = hayVision(j.x, j.y, e.x, e.y, 0)
    || hayVision(j.x, j.y, e.x + ex, e.y + ey, 0)
    || hayVision(j.x, j.y, e.x - ex, e.y - ey, 0);
        if (visto) meta = Math.min(1, (ALCANCE_LUZ - d) / 2);
    }

    if (e.vis === undefined) e.vis = meta;
    e.vis += (meta - e.vis) * Math.min(1, dtVista * 12);
    return e.vis;
}

// Silueta de todo lo que el héroe alcanza a ver desde donde está
function siluetaVisible(ox, oy) {
    const puntos = [];
    for (let i = 0; i < RAYOS_LUZ; i++) {
        const a = (i / RAYOS_LUZ) * Math.PI * 2;
        const dx = Math.cos(a), dy = Math.sin(a);
        const d = distanciaHastaRoca(ox, oy, dx, dy, ALCANCE_LUZ);
        puntos.push(aPantallaX(ox + dx * d), aPantallaY(oy + dy * d));
    }
    return puntos;
}

// El manto de noche se compone aparte y luego se posa encima de la escena.
// Hacerlo directamente sobre el lienzo principal no vale: al recortar la
// silueta con destination-out se borraría también el recinto que hay debajo.
let lienzoSombra = null, sctx = null;

function sombrasDeGeometria(j) {
    if (!lienzoSombra) {
        lienzoSombra = lienzoOculto(AN + MARGEN_SOMBRA * 2, AL + MARGEN_SOMBRA * 2);
        sctx = lienzoSombra.getContext('2d');
        // se trabaja en coordenadas de pantalla; el margen absorbe el temblor
        sctx.setTransform(1, 0, 0, 1, MARGEN_SOMBRA, MARGEN_SOMBRA);
    }
    const puntos = siluetaVisible(j.x, j.y);
    const px = aPantallaX(j.x), py = aPantallaY(j.y);
    const m = MARGEN_SOMBRA;

    sctx.globalCompositeOperation = 'source-over';
    sctx.clearRect(-m, -m, AN + m * 2, AL + m * 2);
    sctx.fillStyle = `rgba(14, 22, 54, ${OSCURIDAD})`;
    sctx.fillRect(-m, -m, AN + m * 2, AL + m * 2);

    // destination-out abre el hueco según el alfa: el degradado solo sirve para
    // que el farol se apague en su último tramo y no corte en círculo
    sctx.globalCompositeOperation = 'destination-out';
    const r = ALCANCE_LUZ * TILE;
    const g = sctx.createRadialGradient(px, py, r * 0.55, px, py, r);
    g.addColorStop(0, 'rgba(0, 0, 0, 1)');
    g.addColorStop(0.78, 'rgba(0, 0, 0, 0.94)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sctx.fillStyle = g;

    sctx.beginPath();
    sctx.moveTo(puntos[0], puntos[1]);
    for (let i = 2; i < puntos.length; i += 2) sctx.lineTo(puntos[i], puntos[i + 1]);
    sctx.closePath();
    sctx.fill();

    // los farolillos abren su propio claro, pero solo los que se ven: el claro
    // se va encendiendo al doblar la esquina en vez de aparecer de golpe
    for (const L of luces) {
        const lx = aPantallaX(L.x), ly = aPantallaY(L.y);
        L.enPantalla = !(lx < -L.r || ly < -L.r || lx > AN + L.r || ly > AL + L.r);
        if (!L.enPantalla) { L.mez = 0; continue; }

        const meta = hayVision(j.x, j.y, L.x, L.y) ? 1 : 0;
        L.mez += (meta - L.mez) * Math.min(1, dtVista * 5);
        if (L.mez < 0.02) continue;

        const titileo = 0.9 + Math.sin(J.tiempo * 5 + L.fase) * 0.1;
        const alcance = L.r * titileo;
        abrirClaro(sctx, lx, ly, alcance, L.fuerza * L.mez);
    }

    // los elixires se anuncian igual: su aura despeja la penumbra lo justo
    // para que se distingan de lejos y no se pasen de largo
    for (const o of J.objetos) {
        const lx = aPantallaX(o.x), ly = aPantallaY(o.y);
        const alcance = TILE * 2.6;
        o.enPantalla = !(lx < -alcance || ly < -alcance || lx > AN + alcance || ly > AL + alcance);
        if (!o.enPantalla) { o.mezLuz = 0; continue; }

        const meta = hayVision(j.x, j.y, o.x, o.y) ? 1 : 0;
        o.mezLuz = (o.mezLuz || 0) + (meta - (o.mezLuz || 0)) * Math.min(1, dtVista * 5);
        if (o.mezLuz < 0.02) continue;
        abrirClaro(sctx, lx, ly, alcance, 0.62 * o.mezLuz);
    }

    ctx.drawImage(lienzoSombra, -m, -m);
}

// Un hueco redondo en el manto de noche, más abierto en el centro que en
// el filo: sirve lo mismo para un farolillo que para el aura de un elixir
function abrirClaro(g, lx, ly, radio, fuerza) {
    const cl = g.createRadialGradient(lx, ly, 2, lx, ly, radio);
    cl.addColorStop(0, `rgba(0, 0, 0, ${0.9 * fuerza})`);
    cl.addColorStop(0.5, `rgba(0, 0, 0, ${0.45 * fuerza})`);
    cl.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = cl;
    g.beginPath(); g.arc(lx, ly, radio, 0, 6.2832); g.fill();
}

// Halos: se suman a lo ya pintado, de modo que la luz se ve pasar por
// encima de la noche en vez de limitarse a destaparla
function pintarLuces(j) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const L of luces) {
        if (!L.enPantalla || L.mez < 0.02) continue;
        const lx = aPantallaX(L.x), ly = aPantallaY(L.y);
        const titileo = 0.88 + Math.sin(J.tiempo * 5.5 + L.fase) * 0.12;
        const [r, v, a] = L.color;
        const fuerza = L.fuerza * L.mez;
        const halo = ctx.createRadialGradient(lx, ly, 1, lx, ly, L.r * titileo);
        halo.addColorStop(0, `rgba(${r}, ${v}, ${a}, ${0.5 * fuerza})`);
        halo.addColorStop(0.35, `rgba(${r}, ${v}, ${a}, ${0.16 * fuerza})`);
        halo.addColorStop(1, `rgba(${r}, ${v}, ${a}, 0)`);
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(lx, ly, L.r * titileo, 0, 6.2832); ctx.fill();
    }

    // el aura del elixir también suma su color: así se ve rosada incluso
    // desde el otro extremo de la sala, por encima de la penumbra
    for (const o of J.objetos) {
        if (!o.enPantalla || !o.mezLuz || o.mezLuz < 0.02) continue;
        const lx = aPantallaX(o.x), ly = aPantallaY(o.y);
        const pulso = 0.72 + Math.sin(J.tiempo * 3.4 + o.giro) * 0.28;
        const alcance = TILE * 2.6;
        const halo = ctx.createRadialGradient(lx, ly, 1, lx, ly, alcance);
        halo.addColorStop(0, `rgba(255, 130, 175, ${0.34 * pulso * o.mezLuz})`);
        halo.addColorStop(0.4, `rgba(224, 79, 122, ${0.12 * pulso * o.mezLuz})`);
        halo.addColorStop(1, 'rgba(224, 79, 122, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(lx, ly, alcance, 0, 6.2832); ctx.fill();
    }

    // el propio héroe lleva luz: cálida de cerca, y azul mientras se cubre
    const px = aPantallaX(j.x), py = aPantallaY(j.y);
    const rH = TILE * 3.4;
    const propio = ctx.createRadialGradient(px, py, 1, px, py, rH);
    const tono = j.cubriendo ? '130, 190, 255' : '255, 205, 140';
    propio.addColorStop(0, `rgba(${tono}, 0.3)`);
    propio.addColorStop(1, `rgba(${tono}, 0)`);
    ctx.fillStyle = propio;
    ctx.beginPath(); ctx.arc(px, py, rH, 0, 6.2832); ctx.fill();

    // luciérnagas, puntos de luz que rondan el encuadre
    for (const l of luciernagas) {
        const brilloL = 0.35 + Math.sin(J.tiempo * 3 + l.fase) * 0.35;
        if (brilloL <= 0) continue;
        const gl = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, 9);
        gl.addColorStop(0, `rgba(210, 255, 170, ${0.8 * brilloL})`);
        gl.addColorStop(1, 'rgba(210, 255, 170, 0)');
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(l.x, l.y, 9, 0, 6.2832); ctx.fill();
    }

    ctx.restore();
}

// los iconos de los contadores son los mismos dibujos de los paneles
document.getElementById('jadeIcono').innerHTML =
    (typeof ESQUIRLA_SVG !== 'undefined') ? ESQUIRLA_SVG : '';
document.getElementById('lapisIcono').innerHTML =
    (typeof LAPIS_SVG !== 'undefined') ? LAPIS_SVG : '';

// saldos ya pintados, para saber cuándo hay que celebrar el cambio
let jadeMostrado = -1, lapisMostrado = -1;

// el contador solo se toca cuando cambia, y al subir da un brinco
function contador(caja, cifra, valor, mostrado) {
    if (valor === mostrado) return mostrado;
    document.getElementById(cifra).textContent = valor;
    if (valor > mostrado && mostrado >= 0) {
        const c = document.getElementById(caja);
        c.classList.remove('gana');
        void c.offsetWidth;                 // reinicia la animación en seco
        c.classList.add('gana');
    }
    return valor;
}

// si ya está escrita la cuenta de la caída de ahora
let caidaEscrita = false;

// Lo que se quedó en el suelo de la senda por no llegar a la puerta. Se pone
// entre el rótulo y los botones, con los mismos iconos que el HUD.
function pintarCaida() {
    const caja = document.getElementById('muertePerdido');
    const { jade, lapis } = J.perdido;
    if (!jade && !lapis) { caja.hidden = true; return; }

    const iconoJade = (typeof ESQUIRLA_SVG !== 'undefined') ? ESQUIRLA_SVG : '';
    const iconoLapis = (typeof LAPIS_SVG !== 'undefined') ? LAPIS_SVG : '';
    const cuentas = [];
    if (jade) cuentas.push(`<span class="jade">${jade}${iconoJade}</span>`);
    if (lapis) cuentas.push(`<span class="lapis">${lapis}${iconoLapis}</span>`);

    caja.innerHTML =
        `<span class="rotulo">Perdiste</span>
         <span class="cuentas">${cuentas.join('')}</span>`;
    caja.hidden = false;
}

function pintarHud() {
    const p = J.jugador;
    document.getElementById('estadoPv').textContent = `PV ${Math.ceil(p.hp)}/${p.hpMax}`;
    document.getElementById('vida').style.width = Math.max(0, (p.hp / p.hpMax) * 100) + '%';

    const carga = Math.min(1, 1 - Math.max(0, p.cdDash) / ESPERA_DASH);
    const dash = document.getElementById('dash');
    dash.style.width = carga * 100 + '%';
    dash.parentElement.classList.toggle('lista', carga >= 1);

    jadeMostrado = contador('jade', 'jadeCifra', J.esquirlas, jadeMostrado);
    lapisMostrado = contador('lapis', 'lapisCifra', J.lapis, lapisMostrado);

    document.getElementById('estadoNivel').textContent =
        `Senda ${J.nivel}   ·   Enemigos ${J.enemigos.length}\n${J.arma}`;
    document.getElementById('muerte').style.display = J.muerto ? 'flex' : 'none';
    // la cuenta de lo dejado atrás se escribe una sola vez, al caer, no en
    // cada cuadro que el velo pasa por delante
    if (J.muerto !== caidaEscrita) {
        caidaEscrita = J.muerto;
        if (J.muerto) pintarCaida();
    }

    const aviso = document.getElementById('aviso');
    const cerca = !J.muerto && cercaDePuerta();
    aviso.style.opacity = cerca ? 1 : 0;
    if (cerca) {
        const n = J.enemigos.length;
        aviso.textContent = puertaAbierta()
            ? '[E] cruzar la puerta'
            : n
                ? `El sello aguanta · ${n === 1 ? 'queda 1 enemigo' : `quedan ${n} enemigos`}`
                : 'El sello se deshace…';
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
let barridoCompleto = false;        // ya se volcó el mapa entero al vaciarse la senda

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
// en que cae el último enemigo y la senda entera pasa a estar explorada: ahí hay
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
            tctx.fillStyle = J.mapa[y][x] === 1 ? '#1b2c4e' : '#6f9a63';
            tctx.fillRect(x * MINI, y * MINI, MINI, MINI);
        }
}

const aLaVista = e => Math.hypot(e.x - J.jugador.x, e.y - J.jugador.y) <= RADIO_VISION;

function puntoMini(x, y, color, r) {
    mctx.fillStyle = color;
    mctx.beginPath();
    mctx.arc(x * MINI, y * MINI, r, 0, 6.2832);
    mctx.fill();
}

function pintarMinimapa() {
    volcarDescubierto();
    const j = J.jugador;

    mctx.clearRect(0, 0, mini.width, mini.height);
    mctx.drawImage(terrenoMini, 0, 0);

    // recuadro de lo que se está viendo en pantalla
    mctx.strokeStyle = 'rgba(220, 235, 255, 0.2)';
    mctx.lineWidth = 1;
    mctx.strokeRect(cam.x / TILE * MINI + 0.5, cam.y / TILE * MINI + 0.5,
                    AN / TILE * MINI - 1, AL / TILE * MINI - 1);

    // los farolillos ya descubiertos, como puntos cálidos
    for (const L of luces) {
        const i = Math.floor(L.y) * ANCHO + Math.floor(L.x);
        if (J.explorado[i]) puntoMini(L.x, L.y, 'rgba(255, 205, 120, 0.85)', 1.6);
    }

    // la puerta, una vez encontrada, ya no se olvida: roja si sigue sellada
    const iPue = Math.floor(J.puerta.y) * ANCHO + Math.floor(J.puerta.x);
    if (J.explorado[iPue]) {
        mctx.globalAlpha = 0.55 + Math.sin(J.tiempo * 2.5) * 0.35;
        puntoMini(J.puerta.x, J.puerta.y, puertaAbierta() ? '#8fd8ff' : '#e0503f', 3.2);
        mctx.globalAlpha = 1;
    }

    // con la senda limpia se ven todos los elixires, por si toca curarse
    const limpia = !J.enemigos.length;
    for (const o of J.objetos) {
        if (!limpia && !aLaVista(o)) continue;
        const pulso = 0.72 + Math.sin(J.tiempo * 3.4 + o.giro) * 0.28;
        mctx.globalAlpha = 0.35 * pulso;                // el aura, también aquí
        puntoMini(o.x, o.y, P.elixirLuz, 4);
        mctx.globalAlpha = 1;
        puntoMini(o.x, o.y, P.elixir, 2);
    }
    for (const e of J.enemigos)
        if (aLaVista(e)) puntoMini(e.x, e.y, e.tipo === 'oni' ? '#b07bd0' : '#5f8fd8', 2.2);

    // el héroe: una cuña que apunta a donde mira
    mctx.save();
    mctx.translate(j.x * MINI, j.y * MINI);
    mctx.rotate(j.mira);
    mctx.fillStyle = J.muerto ? '#8a6a6a' : '#ffffff';
    mctx.strokeStyle = P.tinta;
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

// ---------- Menú de Esc ----------
// No detiene nada: el santuario sigue vivo detrás, así que abrirlo en mitad de
// una pelea sale caro. Por eso ocupa solo el centro y deja ver el resto.
const menuJuego = document.getElementById('menuJuego');

function alternarMenu(abrir) {
    menuJuego.hidden = abrir === undefined ? !menuJuego.hidden : !abrir;
    // los controles se piden aparte: el menú siempre se abre recogido
    document.getElementById('mjLista').hidden = true;
    // el héroe no se queda corriendo ni cubriéndose por tener el menú delante
    teclas.clear();
    raton.izq = raton.der = false;
}

document.getElementById('mjCerrar').addEventListener('click', () => alternarMenu(false));

document.getElementById('mjControles').addEventListener('click', () => {
    const lista = document.getElementById('mjLista');
    lista.hidden = !lista.hidden;
});

// no hay nada que anotar al salir: el arma y las esquirlas se guardan solas
// en cuanto se ganan o se cambian
document.getElementById('mjInicio').addEventListener('click', () => {
    location.href = 'index.html';
});

document.getElementById('mjSalir').addEventListener('click', () => {
    window.close();
    // los navegadores solo cierran las pestañas que ellos abrieron: si seguimos
    // aquí un instante después, se lo decimos al jugador en vez de callar
    setTimeout(() => { document.getElementById('mjNota').hidden = false; }, 250);
});

// ---------- La pantalla de caída ----------
// Ya no se reinicia en el sitio: continuar deja al héroe otra vez en el zaguán,
// donde puede rehacerse en la armería antes de volver a entrar.
document.getElementById('mtContinuar').addEventListener('click', () => {
    location.href = 'prev.html';
});

document.getElementById('mtSalir').addEventListener('click', () => {
    location.href = 'index.html';
});

addEventListener('keydown', ev => {
    const k = ev.key.toLowerCase();
    if (k === 'escape') { alternarMenu(); return; }
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
    dtVista = dt;

    actualizar(dt, leerEntrada());
    actualizarAmbiente(dt);

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
    prepararAmbiente();
    hpPrevio = J.jugador.hp;
    flash = 0; sacudida = 0;
}

// El lienzo ocupa la ventana entera y se rehace cuando esta cambia: las capas
// que se guardan a medida (viñeta y sombra) se tiran para volver a nacer con
// el tamaño nuevo, y el ambiente se resiembra para que no quede todo a un lado.
function ajustarLienzo() {
    AN = lienzo.width = Math.max(480, innerWidth);
    AL = lienzo.height = Math.max(360, innerHeight);
    capaVineta = null;
    lienzoSombra = null; sctx = null;
    raton.x = AN / 2; raton.y = AL / 2;
    if (petalos.length) prepararAmbiente();
}
addEventListener('resize', ajustarLienzo);

prepararSprites();
ajustarLienzo();
comenzar();
requestAnimationFrame(bucle);
