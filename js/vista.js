// ============================================================
//  vista.js - dibujado, entrada y bucle principal (vista cenital)
//  Estética de animación japonesa: contorno de tinta, sombreado
//  plano de dos tonos, noche azul y farolillos que dan luz.
//  La lógica de juego vive en mazmorra.js; aquí solo se pinta.
// ============================================================
const lienzo = document.getElementById('vista');
const ctx = lienzo.getContext('2d');
// Resolución fija del juego: se ve igual de grande en cualquier pantalla.
// El tamaño real de ventana solo decide cómo se escala el lienzo (letterbox)
// y cómo se acomoda el hud, que sí vive en píxeles de pantalla de verdad.
const ANCHO_JUEGO = 1440, ALTO_JUEGO = 900;
let AN = lienzo.width, AL = lienzo.height;

const TILE = 44;              // píxeles por casilla
const ALCANCE_LUZ = 12;       // hasta dónde llega el farol del héroe, en casillas
const RAYOS_LUZ = 320;        // rayos con que se recorta la silueta iluminada
const MORDIDA_PARED = 0.7;    // cuánto entra el rayo en el muro, para verle la cara
const OSCURIDAD = 0.82;       // la noche no llega a negra: es azul de tinta
const MARGEN_SOMBRA = 14;     // sobra alrededor, para que el temblor no descubra bordes
const SPR = 56;               // lado en que están dibujadas las figuras
const LADO_SPR = 1.912;       // lo que ocupa una figura, medido en casillas
// El tamaño en pantalla sale de la casilla, no de un número suelto: así el
// héroe crece con el mundo cuando cambia TILE, y su hoja sigue midiendo lo
// que dice su alcance en vez de quedarse corta
const ESCALA_SPR = LADO_SPR * TILE / SPR;

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
    sakura: '#f0a8c8', sakuraLuz: '#ffd3e4',

    // ----------------------------------------------------------
    //  Colores de sitio, no de material: son los que pisa cada bioma
    //  con su propia paleta. Los de aquí son los de la mansión, que es
    //  el aspecto que tenía el juego antes de haber comarcas.
    // ----------------------------------------------------------
    fondoAlto: '#16274d', fondoBajo: '#101c3a',        // lo que hay más allá
    suelo: '#6f9a63', sueloLuz: '#82ad72', sueloSombra: '#4f7350',
    junta: 'rgba(28, 44, 34, 0.6)',                    // lo que separa una pieza de otra
    zocalo: '#8a5f3e', zocaloLuz: '#ad7c53', zocaloSombra: '#5d3d29',
    bordeBase: '#2f7a76', bordeLuz: '#4ea79c', bordeSombra: '#1d4f54',
    mota: '#c8b98f',                                   // el menudeo del fondo
    tinte: '#ffcf72'                                   // el color con que se firma la comarca
};

// ============================================================
//  El tema de la senda: la paleta de arriba, pisada por la del bioma
//  que toque. Los sprites siguen leyendo P -el héroe y los adversarios
//  no cambian de color al mudar de comarca-; todo el decorado lee T.
// ============================================================
let BIOMA = null;                       // la ficha de biomas.js, tal cual
let T = Object.assign({}, P);           // sus colores, ya fusionados

// lo que se usa cuando se juega sin biomas.js cargado: la mansión de siempre
const AIRE_BASE = { forma: 'petalo', cuantas: 34, color: P.sakuraLuz, vel: [14, 34],
                    luciernagas: 16, oscuridad: 0.82, velo: '14, 22, 54' };

function aplicarTema() {
    const antes = BIOMA;
    BIOMA = (typeof Biomas !== 'undefined') ? Biomas.deNivel(J.nivel) : null;
    T = Object.assign({}, P, BIOMA && BIOMA.paleta);
    // la viñeta se tiñe del velo de la comarca: al cambiar hay que rehacerla
    if (!antes || !BIOMA || antes.id !== BIOMA.id) capaVineta = null;
}

const aire = () => (BIOMA && BIOMA.ambiente) || AIRE_BASE;

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

// Las afueras del recinto no son un fondo aparte: forman parte del mismo
// lienzo del nivel, y por eso se mueven con él sin costura alguna. Cuánto
// bosque hay que pintar de más depende de la ventana: lo justo para que su
// borde nunca llegue a verse, ni siquiera en una pantalla muy ancha.
let MARGEN = 0;               // casillas de afueras a cada lado
let OFF = 0;                  // esas mismas casillas, en píxeles

function margenAfueras() {
    const sobraX = Math.max(0, (AN - ANCHO * TILE) / 2);
    const sobraY = Math.max(0, (AL - ALTO * TILE) / 2);
    return Math.ceil((Math.max(sobraX, sobraY) + TILE * 2) / TILE);
}

function construirLienzoNivel() {
    // lo primero es saber en qué comarca se anda: de ahí salen los colores,
    // el suelo, lo que corona los muros y lo que se ve más allá
    aplicarTema();

    const W = ANCHO * TILE, H = ALTO * TILE;
    MARGEN = margenAfueras();
    OFF = MARGEN * TILE;
    const WT = W + OFF * 2, HT = H + OFF * 2;   // el lienzo entero, afueras incluidas
    const dist = distanciasAlSuelo();

    // 1) Silueta del recinto: el suelo tal cual, con el filo intacto. Estas
    //    capas solo cubren el recinto; el margen es bosque y nada más
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

    const nivel = lienzoOculto(WT, HT), ng = nivel.getContext('2d');
    pintarExterior(ng, WT, HT, dist);                  // lo que hay más allá del recinto
    ng.drawImage(capaBorde(W, H, silueta, bordes), OFF, OFF);
    ng.drawImage(capaSuelo(W, H, silueta, bordes), OFF, OFF);

    // 3) Línea de tinta que cierra el recinto, como el entintado de un cel
    ng.save();
    ng.translate(OFF, OFF);
    ng.lineCap = 'square';
    ng.strokeStyle = T.tinta;
    ng.lineWidth = 3.5;
    ng.stroke(bordes);
    ng.restore();

    lienzoNivel = nivel;
    sembrarAdornos();
    prepararMinimapa();
    prepararAmbiente();          // el aire también cambia con la comarca
}

// ============================================================
//  Fuera del recinto: lo que se ve más allá de los muros. Cada comarca
//  tiene lo suyo -roca maciza, cañaveral, jardín, pueblo, el vacío del
//  foso o el mar de nubes del santuario- y todas se pintan sobre el
//  mismo lienzo del nivel, así que se mueven con él sin costura alguna.
//  Las casillas del recinto viven desplazadas OFF píxeles; todo lo que
//  cae fuera de ellas es campo libre.
// ============================================================
function pintarExterior(g, W, H, dist) {
    const fondo = g.createLinearGradient(0, 0, W * 0.4, H);
    fondo.addColorStop(0, T.fondoAlto || P.nocheAlta);
    fondo.addColorStop(1, T.fondoBajo || P.nocheBaja);
    g.fillStyle = fondo;
    g.fillRect(0, 0, W, H);

    // de píxel del lienzo a casilla del recinto, que empieza en OFF
    const casillaX = px => Math.floor((px - OFF) / TILE);
    const casillaY = py => Math.floor((py - OFF) / TILE);

    // fuera del recinto siempre hay sitio: allí no hay muros de los que
    // guardar distancia, solo campo abierto
    const hueco = (cx, cy, min) =>
        cx < 0 || cy < 0 || cx >= ANCHO || cy >= ALTO || dist[cy * ANCHO + cx] >= min;

    // el cuaderno que se pasan los pintores de afueras: el lienzo, el mapa de
    // distancias y cuánto hay que multiplicar una cantidad pensada para el
    // recinto para que cubra también el margen
    const A = {
        g, W, H, dist, hueco,
        despejado: (px, py, min) => hueco(casillaX(px), casillaY(py), min),
        escala: (W * H) / (ANCHO * TILE * ALTO * TILE)
    };

    switch ((BIOMA && BIOMA.afueras) || 'arboleda') {
        case 'roca':      afuerasRoca(A); break;
        case 'canaveral': afuerasCanaveral(A); break;
        case 'jardin':    afuerasJardin(A); break;
        case 'pueblo':    afuerasPueblo(A); break;
        case 'vacio':     afuerasVacio(A); break;
        case 'nubes':     afuerasNubes(A); break;
        default:          afuerasArboleda(A);
    }
}

// ---------- Herramientas que comparten todas las afueras ----------

// Manchas amplias y blandas, para que el fondo no quede liso
function manchones(A, densidad, color, rx, ry, alfa) {
    const { g, W, H } = A;
    const cuantas = Math.round(densidad * A.escala);
    for (let i = 0; i < cuantas; i++) {
        const x = azar(0, W), y = azar(0, H);
        if (!A.despejado(x, y, 2)) continue;
        g.save();
        g.globalAlpha = azar(alfa[0], alfa[1]);
        g.fillStyle = color;
        g.beginPath();
        g.ellipse(x, y, azar(rx[0], rx[1]), azar(ry[0], ry[1]), azar(0, 3.14), 0, 6.2832);
        g.fill();
        g.restore();
    }
}

// Solares tomados: las claves se corren para que las casillas de las afueras,
// que son negativas, no se pisen con las de dentro
function solares() {
    const clave = (cx, cy) => (cy + 2048) * 8192 + (cx + 2048);
    const tomados = new Set();
    return {
        libre: (cx, cy) => !tomados.has(clave(cx, cy)),
        tomar(cx, cy, w, h) {
            for (let y = cy - 1; y <= cy + h; y++)
                for (let x = cx - 1; x <= cx + w; x++) tomados.add(clave(x, y));
        }
    };
}

// Tejados sueltos donde el recinto deja sitio de sobra. Devuelve el registro
// de solares para que quien siembre después no plante encima.
function sembrarCasas(A, intentos, separacion) {
    const s = solares();
    for (let i = 0; i < intentos; i++) {
        const cx = azarEnt(-MARGEN + 1, ANCHO + MARGEN - 6);
        const cy = azarEnt(-MARGEN + 1, ALTO + MARGEN - 7);
        let cabe = true;
        for (let y = cy; y < cy + 6 && cabe; y++)
            for (let x = cx; x < cx + 5 && cabe; x++)
                cabe = A.hueco(x, y, separacion) && s.libre(x, y);
        if (!cabe) continue;
        casaDeAldea(A.g, OFF + cx * TILE + TILE, OFF + cy * TILE + TILE, TILE * 3, TILE * 4);
        s.tomar(cx, cy, 5, 6);
        for (let y = cy - 1; y < cy + 7; y++)          // el solar deja de ser hueco
            for (let x = cx - 1; x < cx + 6; x++)
                if (x >= 0 && y >= 0 && x < ANCHO && y < ALTO) A.dist[y * ANCHO + x] = 1;
    }
    return s;
}

// Helechos y piedras sueltas: el menudeo que llena los claros
function sotobosque(A, densidad) {
    const { g, W, H } = A;
    const cuantas = Math.round(densidad * A.escala);
    for (let i = 0; i < cuantas; i++) {
        const x = azar(0, W), y = azar(0, H);
        if (!A.despejado(x, y, 2)) continue;
        if (Math.random() < 0.62) {
            g.save();
            g.globalAlpha = azar(0.12, 0.3);
            g.strokeStyle = T.mota || P.hojaFriaLuz;
            g.lineWidth = 1.6; g.lineCap = 'round';
            const a = azar(0, 6.28), l = azar(6, 14);
            g.beginPath(); g.moveTo(x, y);
            g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 - 4, y + Math.sin(a) * l * 0.5,
                               x + Math.cos(a) * l, y + Math.sin(a) * l);
            g.stroke();
            g.restore();
        } else {
            pieza(g, x, y, azar(3, 7), azar(2.5, 5), T.zocaloSombra, null, null, azar(0, 3), 1.6);
        }
    }
}

// ---------- Bosque nocturno: pinos en masa y algún tejado de aldea ----------
function afuerasArboleda(A) {
    const { g } = A;
    manchones(A, 300, T.hoja, [30, 90], [20, 60], [0.05, 0.14]);
    const s = sembrarCasas(A, 220, 4);

    // copas apretadas, más frías cuanto más lejos del recinto. En las afueras
    // la distancia es la que hay hasta el borde, así que el monte se cierra
    // del todo según se aleja
    for (let y = -MARGEN; y < ALTO + MARGEN; y++)
        for (let x = -MARGEN; x < ANCHO + MARGEN; x++) {
            const dentro = x >= 0 && y >= 0 && x < ANCHO && y < ALTO;
            const d = dentro ? A.dist[y * ANCHO + x] : 999;
            if (d < 3 || !s.libre(x, y) || Math.random() > 0.45) continue;
            copaDeArbol(g, OFF + x * TILE + azar(3, TILE - 3),
                        OFF + y * TILE + azar(3, TILE - 3),
                        azar(TILE * 0.6, TILE * 1.15), Math.min(1, (d - 3) / 7));
        }
    sotobosque(A, 460);
}

// ---------- Roca maciza: no hay afueras, hay montaña ----------
// Bajo tierra el recinto no da a ningún paisaje: lo que rodea los muros es
// piedra sin excavar, y lo único que la rompe son sus propias vetas.
function afuerasRoca(A) {
    const { g, W, H } = A;
    manchones(A, 380, T.bordeSombra, [40, 110], [26, 70], [0.3, 0.7]);
    manchones(A, 260, T.bordeBase, [24, 70], [16, 44], [0.18, 0.45]);

    // caras de roca: polígonos angulosos, que es como se rompe la piedra
    const bloques = Math.round(300 * A.escala);
    for (let i = 0; i < bloques; i++) {
        const x = azar(0, W), y = azar(0, H);
        if (!A.despejado(x, y, 2)) continue;
        const r = azar(TILE * 0.35, TILE * 1.1);
        g.save();
        g.translate(x, y);
        g.rotate(azar(0, 3.14));
        g.globalAlpha = azar(0.2, 0.5);
        g.fillStyle = Math.random() < 0.6 ? T.bordeSombra : T.bordeLuz;
        g.beginPath();
        for (let k = 0; k < 6; k++) {
            const a = k / 6 * 6.2832, rr = r * azar(0.6, 1);
            const px = Math.cos(a) * rr, py = Math.sin(a) * rr * 0.72;
            k ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.closePath(); g.fill();
        g.restore();
    }

    // grietas y algún filón que devuelve un poco de luz
    const vetas = Math.round(420 * A.escala);
    g.lineCap = 'round';
    for (let i = 0; i < vetas; i++) {
        const x = azar(0, W), y = azar(0, H);
        if (!A.despejado(x, y, 2)) continue;
        const mineral = Math.random() < 0.18;
        g.save();
        g.globalAlpha = mineral ? azar(0.18, 0.4) : azar(0.2, 0.45);
        g.strokeStyle = mineral ? (T.mota || P.piedraLuz) : T.tinta;
        g.lineWidth = mineral ? 1.4 : azar(1.6, 3);
        const a = azar(0, 6.28), l = azar(10, 34);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5);
        g.lineTo(x + Math.cos(a + azar(-0.7, 0.7)) * l, y + Math.sin(a + azar(-0.7, 0.7)) * l);
        g.stroke();
        g.restore();
    }
}

// ---------- Cañaveral: bambú tan cerrado que no se ve el suelo ----------
function afuerasCanaveral(A) {
    const { g, W, H } = A;
    manchones(A, 340, T.hojaSombra || T.bordeSombra, [34, 96], [24, 64], [0.12, 0.3]);

    const cuantas = Math.round(1200 * A.escala);
    for (let i = 0; i < cuantas; i++) {
        const x = azar(0, W), y = azar(0, H);
        if (!A.despejado(x, y, 2)) continue;
        matoDeCanas(g, x, y, azar(TILE * 0.35, TILE * 0.8), azar(0, 6.28));
    }
    sotobosque(A, 300);
}

// Un puñado de cañas vistas desde arriba: los cortes redondos del tronco y
// las hojas largas saliendo en abanico.
// Todo lo que varía sale del giro que se le pasa, no de un sorteo: así el
// mismo mato sale idéntico cuadro tras cuadro cuando se dibuja en directo.
function matoDeCanas(g, cx, cy, r, giro) {
    g.save();
    g.translate(cx, cy);
    g.rotate(giro);
    g.lineCap = 'round';

    g.globalAlpha = 0.75;
    g.strokeStyle = T.bordeSombra;
    g.lineWidth = 2.6;
    for (let i = 0; i < 5; i++) {                      // las hojas, en abanico
        const a = (i / 5) * 6.2832 + Math.sin(giro * 3 + i) * 0.3;
        const l = r * (1.7 + Math.sin(giro * 2 + i * 1.7) * 0.4);
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(Math.cos(a) * l * 0.5 - 3, Math.sin(a) * l * 0.5,
                           Math.cos(a) * l, Math.sin(a) * l);
        g.stroke();
    }
    g.strokeStyle = T.bordeLuz;
    g.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
        const a = (i / 3) * 6.2832 + 0.6;
        const l = r * (1.4 + Math.cos(giro + i * 2.1) * 0.3);
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(Math.cos(a) * l * 0.5, Math.sin(a) * l * 0.5 - 3,
                           Math.cos(a) * l, Math.sin(a) * l);
        g.stroke();
    }

    g.globalAlpha = 1;
    for (let i = 0; i < 3; i++) {                      // los cortes de la caña
        const a = giro * 1.7 + i * 2.094;
        const d = r * (0.25 + Math.sin(giro + i) * 0.2);
        pieza(g, Math.cos(a) * d, Math.sin(a) * d, r * 0.24, r * 0.24,
              T.zocalo, T.zocaloLuz, T.zocaloSombra, 0, 1.8);
    }
    g.restore();
}

// ---------- Jardín: musgo, setos, estanques y algún tejado ----------
function afuerasJardin(A) {
    const { g, W, H } = A;
    manchones(A, 320, T.hoja || T.bordeBase, [40, 110], [26, 68], [0.1, 0.26]);

    // estanques: lámina oscura con su orilla de piedra y un brillo encima
    const charcas = Math.round(26 * A.escala);
    for (let i = 0; i < charcas; i++) {
        const x = azar(0, W), y = azar(0, H);
        if (!A.despejado(x, y, 4)) continue;
        const rx = azar(TILE * 0.9, TILE * 2.2), ry = rx * azar(0.5, 0.8);
        pieza(g, x, y, rx, ry, T.zocaloSombra, null, null, azar(0, 3), 3);
        pieza(g, x, y, rx * 0.86, ry * 0.86, '#1e3a5c', '#2f5c86', '#12243c', 0, 0);
        brillo(g, x - rx * 0.3, y - ry * 0.3, rx * 0.28, ry * 0.16, -0.5, 0.2);
    }

    const s = sembrarCasas(A, 60, 5);

    // setos y arbolillos: la vegetación cuidada del jardín
    for (let y = -MARGEN; y < ALTO + MARGEN; y++)
        for (let x = -MARGEN; x < ANCHO + MARGEN; x++) {
            const dentro = x >= 0 && y >= 0 && x < ANCHO && y < ALTO;
            const d = dentro ? A.dist[y * ANCHO + x] : 999;
            if (d < 3 || !s.libre(x, y) || Math.random() > 0.3) continue;
            copaDeArbol(g, OFF + x * TILE + azar(3, TILE - 3),
                        OFF + y * TILE + azar(3, TILE - 3),
                        azar(TILE * 0.5, TILE * 0.95), Math.min(1, (d - 3) / 8));
        }
    sotobosque(A, 520);
}

// ---------- Pueblo: tejados apretados hasta donde alcanza la vista ----------
function afuerasPueblo(A) {
    manchones(A, 240, T.bordeSombra, [40, 120], [26, 70], [0.15, 0.35]);
    // dos pasadas: la primera deja las casas holgadas, la segunda las aprieta
    sembrarCasas(A, 400, 4);
    sembrarCasas(A, 320, 3);
    sotobosque(A, 260);
}

// ---------- El vacío: bajo el puente no hay suelo, hay noche ----------
function afuerasVacio(A) {
    const { g, W, H } = A;
    // el fondo ya viene oscuro; aquí solo se hunde más según se aleja del borde
    manchones(A, 300, '#04060c', [60, 160], [40, 100], [0.25, 0.55]);

    // espolones de roca que asoman del barranco y se pierden abajo
    const picos = Math.round(90 * A.escala);
    for (let i = 0; i < picos; i++) {
        const x = azar(0, W), y = azar(0, H);
        if (!A.despejado(x, y, 3)) continue;
        const r = azar(TILE * 0.6, TILE * 1.8);
        g.save();
        g.globalAlpha = azar(0.25, 0.6);
        g.fillStyle = T.bordeSombra;
        g.beginPath();
        g.moveTo(x, y - r);
        g.lineTo(x + r * azar(0.4, 0.8), y + r * 0.7);
        g.lineTo(x - r * azar(0.4, 0.8), y + r * 0.6);
        g.closePath(); g.fill();
        g.restore();
    }

    // jirones de niebla cruzando el foso, que es lo que da la altura
    const jirones = Math.round(70 * A.escala);
    for (let i = 0; i < jirones; i++) {
        const x = azar(0, W), y = azar(0, H);
        if (!A.despejado(x, y, 2)) continue;
        g.save();
        g.globalAlpha = azar(0.05, 0.14);
        g.fillStyle = T.mota || '#8f9bb0';
        g.beginPath();
        g.ellipse(x, y, azar(TILE * 2, TILE * 5), azar(TILE * 0.25, TILE * 0.7),
                  azar(-0.2, 0.2), 0, 6.2832);
        g.fill();
        g.restore();
    }
}

// ---------- Mar de nubes: se ha subido por encima del tiempo ----------
function afuerasNubes(A) {
    const { g, W, H } = A;

    // las crestas lejanas, antes que las nubes: quedan detrás
    const montes = Math.round(40 * A.escala);
    for (let i = 0; i < montes; i++) {
        const x = azar(0, W), y = azar(0, H);
        if (!A.despejado(x, y, 4)) continue;
        const r = azar(TILE * 1.2, TILE * 3);
        g.save();
        g.globalAlpha = azar(0.2, 0.4);
        g.fillStyle = T.bordeSombra;
        g.beginPath();
        g.moveTo(x, y - r);
        g.lineTo(x + r * 0.9, y + r * 0.5);
        g.lineTo(x - r * 0.9, y + r * 0.5);
        g.closePath(); g.fill();
        g.fillStyle = T.mota;                          // la nieve de la cumbre
        g.globalAlpha = azar(0.25, 0.5);
        g.beginPath();
        g.moveTo(x, y - r);
        g.lineTo(x + r * 0.3, y - r * 0.4);
        g.lineTo(x - r * 0.3, y - r * 0.4);
        g.closePath(); g.fill();
        g.restore();
    }

    // y encima el algodón: lóbulos claros, apilados sin prisa
    const nubes = Math.round(260 * A.escala);
    for (let i = 0; i < nubes; i++) {
        const x = azar(0, W), y = azar(0, H);
        if (!A.despejado(x, y, 2)) continue;
        const r = azar(TILE * 0.8, TILE * 2.4);
        g.save();
        g.globalAlpha = azar(0.08, 0.22);
        g.fillStyle = Math.random() < 0.65 ? '#e8eefc' : (T.mota || '#ffe8b0');
        g.beginPath();
        for (let k = 0; k < 4; k++) {
            const a = azar(0, 6.28), d = r * azar(0, 0.6);
            g.moveTo(x + Math.cos(a) * d + r * 0.6, y + Math.sin(a) * d);
            g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * azar(0.4, 0.7), 0, 6.2832);
        }
        g.fill();
        g.restore();
    }
}

// ============================================================

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

    g.fillStyle = T.tinta;
    camino(1.14); g.fill();
    g.fillStyle = lejos > 0.55 ? T.hojaFria : T.hoja;
    camino(1); g.fill();

    g.save();
    camino(1); g.clip();
    g.fillStyle = T.hojaSombra;                        // el lado de sombra
    g.beginPath(); g.ellipse(cx + r * 0.45, cy + r * 0.5, r, r * 0.9, 0, 0, 6.2832); g.fill();
    g.fillStyle = lejos > 0.55 ? T.hojaFriaLuz : T.hojaLuz;
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

    g.fillStyle = T.tinta;
    g.fillRect(x - 5, y - 5, w + 10, h + 10);
    g.fillStyle = T.bordeBase;
    g.fillRect(x, y, w, h);
    g.fillStyle = T.bordeSombra;                       // el faldón de la derecha
    g.fillRect(x + w * 0.52, y, w * 0.48, h);
    g.fillStyle = T.bordeLuz;                          // caballete iluminado
    g.fillRect(x + w * 0.4, y, w * 0.14, h);

    g.strokeStyle = T.junta;                           // hiladas de teja
    g.lineWidth = 1.4;
    for (let ty = y + 7; ty < y + h; ty += 7) {
        g.beginPath(); g.moveTo(x, ty); g.lineTo(x + w, ty); g.stroke();
    }
    g.fillStyle = T.tinta;                             // remate del caballete
    g.fillRect(x + w * 0.47, y - 3, 3, h + 6);
    g.restore();
}

// ============================================================
//  Lo que corona los muros del recinto: una banda que corre por fuera
//  de todos ellos y que cambia con la comarca -teja vidriada, roca
//  viva, cañaveral, sillería, parapeto de puente, almenas o talud-.
//  El gesto es siempre el mismo: cuatro trazos cada vez más finos
//  siguiendo el borde, y encima el relieve que le toque.
// ============================================================
function capaBorde(W, H, silueta, bordes) {
    const c = lienzoOculto(W, H), g = c.getContext('2d');
    g.lineJoin = 'round'; g.lineCap = 'round';

    const remate = (BIOMA && BIOMA.remate) || 'teja';
    // la roca come más sitio que un alero; el cañaveral, bastante menos
    const grueso = remate === 'roca' ? 3.1 : remate === 'canaveral' ? 2.0 : 2.5;

    g.strokeStyle = T.tinta;       g.lineWidth = TILE * grueso + 9;    g.stroke(bordes);
    g.strokeStyle = T.bordeSombra; g.lineWidth = TILE * grueso;        g.stroke(bordes);
    g.strokeStyle = T.bordeBase;   g.lineWidth = TILE * grueso * 0.68; g.stroke(bordes);
    g.strokeStyle = T.bordeLuz;    g.lineWidth = TILE * 0.45;          g.stroke(bordes);

    // los dos hilos que marcan el canto: el de abajo y el de la cumbre
    g.strokeStyle = T.junta;
    g.lineWidth = 2;
    g.save(); g.translate(0, 5); g.stroke(bordes); g.restore();
    g.save(); g.translate(0, -TILE * 0.34 * grueso); g.stroke(bordes); g.restore();

    // el relieve del remate, pero solo sobre la banda ya pintada
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = g.createPattern(tileRemate(remate), 'repeat');
    g.fillRect(0, 0, W, H);

    // y nada de esto puede invadir el interior
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(silueta, 0, 0);
    return c;
}

// Los relieves se pintan en blanco y negro translúcido: así valen para
// cualquier color de banda sin tener que repetir la paleta en cada uno.
function tileRemate(remate) {
    switch (remate) {
        case 'roca':      return tileRoca();
        case 'canaveral': return tileCanas();
        case 'muro':      return tileSillar(TILE * 1.1, TILE * 0.55);
        case 'almenado':  return tileAlmenado();
        case 'parapeto':  return tileParapeto();
        case 'talud':     return tileTalud();
        default:          return tileTeja();
    }
}

// Hiladas de teja: la media caña vista desde arriba, dos por baldosa
function tileTeja() {
    const L = 18;
    const c = lienzoOculto(L, L), g = c.getContext('2d');
    g.globalAlpha = 0.32;
    g.strokeStyle = '#000';
    g.lineWidth = 1.6;
    for (let i = 0; i <= 1; i++) {
        g.beginPath();
        g.arc(L * 0.25 + i * L * 0.5, L * 0.5, L * 0.26, 0, Math.PI);
        g.stroke();
    }
    g.globalAlpha = 0.14;
    g.strokeStyle = '#fff';
    g.beginPath(); g.moveTo(0, 1); g.lineTo(L, 1); g.stroke();
    return c;
}

// Roca viva: manchas irregulares y grietas, sin una sola línea recta
function tileRoca() {
    const L = 64;
    const c = lienzoOculto(L, L), g = c.getContext('2d');
    for (let i = 0; i < 16; i++) {
        g.globalAlpha = azar(0.05, 0.2);
        g.fillStyle = Math.random() < 0.55 ? '#000' : '#fff';
        g.beginPath();
        g.ellipse(azar(0, L), azar(0, L), azar(4, 15), azar(3, 11), azar(0, 3), 0, 6.2832);
        g.fill();
    }
    g.globalAlpha = 0.26;
    g.strokeStyle = '#000'; g.lineWidth = 1.4; g.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
        const x = azar(0, L), y = azar(0, L), a = azar(0, 6.28), l = azar(8, 20);
        g.beginPath(); g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.stroke();
    }
    return c;
}

// Cañas apretadas: tallos verticales con sus nudos cruzándolos
function tileCanas() {
    const L = 26;
    const c = lienzoOculto(L, L * 2), g = c.getContext('2d');
    g.globalAlpha = 0.3;
    g.strokeStyle = '#000'; g.lineWidth = 3;
    for (const x of [L * 0.2, L * 0.62]) {
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, L * 2); g.stroke();
    }
    g.globalAlpha = 0.2;
    g.strokeStyle = '#fff'; g.lineWidth = 2;
    for (const x of [L * 0.38, L * 0.82]) {
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, L * 2); g.stroke();
    }
    g.globalAlpha = 0.32;                              // los nudos de la caña
    g.strokeStyle = '#000'; g.lineWidth = 2;
    for (let y = L * 0.5; y < L * 2; y += L * 0.9) {
        g.beginPath(); g.moveTo(0, y); g.lineTo(L, y); g.stroke();
    }
    return c;
}

// Sillares trabados: hiladas corridas media pieza, como se levanta un muro
function tileSillar(w, h) {
    const bw = Math.max(8, Math.round(w)), bh = Math.max(6, Math.round(h));
    const c = lienzoOculto(bw * 2, bh * 2), g = c.getContext('2d');

    g.globalAlpha = 0.38;
    g.strokeStyle = '#000'; g.lineWidth = 2;
    for (let f = 0; f < 2; f++) {
        const y = f * bh, off = (f % 2) * bw / 2;
        g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(bw * 2, y + 0.5); g.stroke();
        for (let k = 0; k <= 2; k++) {
            const x = off + k * bw + 0.5;
            g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + bh); g.stroke();
        }
    }
    g.globalAlpha = 0.12;                              // el canto que da la luz
    g.strokeStyle = '#fff'; g.lineWidth = 1.4;
    for (let f = 0; f < 2; f++) {
        g.beginPath(); g.moveTo(0, f * bh + 2.5); g.lineTo(bw * 2, f * bh + 2.5); g.stroke();
    }
    return c;
}

// Almenas: merlón, hueco, merlón. Desde arriba se leen como bloques sueltos
function tileAlmenado() {
    const L = Math.round(TILE * 0.9);
    const c = lienzoOculto(L * 2, L), g = c.getContext('2d');
    g.globalAlpha = 0.42;                              // el vano entre merlones
    g.fillStyle = '#000';
    g.fillRect(L + 2, 0, L * 0.7, L);
    g.globalAlpha = 0.18;                              // y el merlón, más claro
    g.fillStyle = '#fff';
    g.fillRect(2, 2, L - 4, L - 4);
    g.globalAlpha = 0.35;
    g.strokeStyle = '#000'; g.lineWidth = 2;
    g.strokeRect(1, 1, L - 2, L - 2);
    return c;
}

// Parapeto de puente: tablones cruzados y los pernos que los sujetan
function tileParapeto() {
    const L = Math.round(TILE * 0.75);
    const c = lienzoOculto(L, L), g = c.getContext('2d');
    g.globalAlpha = 0.4;
    g.strokeStyle = '#000'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, 1); g.lineTo(L, 1); g.stroke();
    g.beginPath(); g.moveTo(L - 1, 0); g.lineTo(L - 1, L); g.stroke();
    g.globalAlpha = 0.15;
    g.strokeStyle = '#fff'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(0, 4.5); g.lineTo(L, 4.5); g.stroke();
    g.globalAlpha = 0.45;                              // los pernos
    g.fillStyle = '#000';
    for (const x of [L * 0.25, L * 0.75]) {
        g.beginPath(); g.arc(x, L * 0.5, 2, 0, 6.2832); g.fill();
    }
    return c;
}

// Talud: matojos sueltos aferrados a la tierra de la ladera
function tileTalud() {
    const L = 30;
    const c = lienzoOculto(L, L), g = c.getContext('2d');
    g.lineCap = 'round';
    for (let i = 0; i < 10; i++) {
        const x = azar(0, L), y = azar(0, L), a = azar(-0.6, 0.6), l = azar(4, 9);
        g.globalAlpha = azar(0.1, 0.3);
        g.strokeStyle = Math.random() < 0.5 ? '#000' : '#fff';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.sin(a) * l, y - Math.cos(a) * l);
        g.stroke();
    }
    return c;
}

// ============================================================
//  Dentro: el piso de la comarca, el zócalo pegado a los muros y la
//  sombra dura que el muro echa sobre el suelo
// ============================================================
function capaSuelo(W, H, silueta, bordes) {
    const c = lienzoOculto(W, H), g = c.getContext('2d');

    g.fillStyle = g.createPattern(tileSuelo(), 'repeat');
    g.fillRect(0, 0, W, H);

    // zócalo perimetral: en la mansión es la tarima; en la muralla, el
    // bordillo de piedra; en el bosque, el canto de tierra. Cambia el
    // color, nunca el gesto.
    g.lineCap = 'butt'; g.lineJoin = 'miter';
    g.strokeStyle = T.zocalo;    g.lineWidth = TILE * 1.05; g.stroke(bordes);
    g.strokeStyle = T.zocaloLuz; g.lineWidth = TILE * 0.2;
    g.save(); g.translate(0, 3); g.stroke(bordes); g.restore();
    g.strokeStyle = T.zocaloSombra; g.lineWidth = 3;
    g.save(); g.translate(0, TILE * 0.52); g.stroke(bordes); g.restore();

    // sombra del muro, corrida hacia dentro: el recurso de cel para levantarlo
    // sin recurrir a un solo degradado
    g.strokeStyle = 'rgba(20, 26, 60, 0.4)';
    g.lineWidth = TILE * 0.55;
    g.save(); g.translate(4, 7); g.stroke(bordes); g.restore();

    g.globalCompositeOperation = 'destination-in';
    g.drawImage(silueta, 0, 0);
    return c;
}

// Cada comarca pisa lo suyo, pero todos los pisos se pintan igual: una
// baldosa que encaja consigo misma y se repite por todo el recinto.
function tileSuelo() {
    switch ((BIOMA && BIOMA.piso) || 'tatami') {
        case 'losa':      return tileBloques(TILE * 1.0, TILE * 1.0, 0.5);
        case 'ladrillo':  return tileBloques(TILE * 0.62, TILE * 0.3, 0.5);
        case 'adoquin':   return tileBloques(TILE * 0.44, TILE * 0.44, 0.5);
        case 'silleria':  return tileBloques(TILE * 1.3, TILE * 0.65, 0.5);
        case 'tablon':    return tileFranjas(TILE * 0.55, false, false);
        case 'escalones': return tileFranjas(TILE * 0.9, true, false);
        case 'sagrado':   return tileFranjas(TILE * 0.7, false, true);
        case 'grava':     return tileGrava();
        case 'tierra':    return tileTierra();
        default:          return tileTatami();
    }
}

// Piezas rectangulares trabadas: losa, ladrillo, adoquín y sillería salen
// todas de aquí, y solo se diferencian en la medida de la pieza.
// La que asoma por la derecha vuelve a entrar por la izquierda, que es lo
// que hace que la baldosa encaje consigo misma.
function tileBloques(w, h, desfase) {
    const cols = 3, filas = 4;
    const L = Math.max(6, Math.round(w * cols));
    const A = Math.max(6, Math.round(h * filas));
    const bw = L / cols, bh = A / filas;
    const c = lienzoOculto(L, A), g = c.getContext('2d');

    g.fillStyle = T.junta;                             // el mortero, debajo de todo
    g.fillRect(0, 0, L, A);

    const tonos = [T.suelo, T.suelo, T.sueloLuz, T.sueloSombra];
    for (let f = 0; f < filas; f++) {
        const y = f * bh, off = (f % 2) * desfase * bw;
        for (let k = 0; k < cols; k++) {
            const x = off + k * bw;
            g.fillStyle = tonos[azarEnt(0, tonos.length - 1)];
            g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
            if (x + bw > L) g.fillRect(x - L + 1, y + 1, bw - 2, bh - 2);
        }
    }

    // el desgaste: unas pocas grietas y algún canto iluminado
    g.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
        g.globalAlpha = azar(0.1, 0.25);
        g.strokeStyle = T.tinta;
        g.lineWidth = 1.2;
        const x = azar(0, L), y = azar(0, L), a = azar(0, 6.28), l = azar(4, 12);
        g.beginPath(); g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.stroke();
    }
    return c;
}

// Franjas tendidas: tablas de tarima, peldaños de escalera o las tablas
// doradas del santuario, según cómo se rematen
function tileFranjas(paso, escalon, dorado) {
    const p = Math.max(5, Math.round(paso));
    const L = Math.round(TILE * 2), A = p * 4;
    const c = lienzoOculto(L, A), g = c.getContext('2d');
    const tonos = [T.suelo, T.sueloLuz, T.suelo, T.sueloSombra];

    for (let i = 0; i < 4; i++) {
        const y = i * p;
        g.fillStyle = tonos[i];
        g.fillRect(0, y, L, p);

        if (escalon) {                                 // el canto del peldaño
            g.globalAlpha = 0.16;
            g.fillStyle = '#fff';
            g.fillRect(0, y, L, 2.5);
            g.globalAlpha = 1;
            g.fillStyle = T.junta;
            g.fillRect(0, y + p - 3, L, 3);
        } else {                                       // la veta de la madera
            g.globalAlpha = 0.06;
            g.strokeStyle = '#fff';
            g.lineWidth = 1;
            for (let v = 4; v < p - 2; v += 4) {
                g.beginPath(); g.moveTo(0, y + v); g.lineTo(L, y + v); g.stroke();
            }
            g.globalAlpha = 1;
            g.fillStyle = T.junta;
            g.fillRect(0, y + p - 1.5, L, 1.5);
            // la testa de una tabla, para que no parezcan infinitas
            g.fillRect(azar(L * 0.2, L * 0.7), y, 1.5, p);
        }

        if (dorado && i % 2 === 0) {                   // el hilo de oro del santuario
            g.globalAlpha = 0.35;
            g.fillStyle = P.oroLuz;
            g.fillRect(0, y + p * 0.5, L, 1.5);
            g.globalAlpha = 1;
        }
    }
    return c;
}

// Grava rastrillada del jardín seco: el fondo, el menudo y las ondas que
// deja el rastrillo. Las ondas van en periodo entero para que cierren solas.
function tileGrava() {
    const L = Math.round(TILE * 3);
    const c = lienzoOculto(L, L), g = c.getContext('2d');
    g.fillStyle = T.suelo;
    g.fillRect(0, 0, L, L);

    for (let i = 0; i < 420; i++) {                    // el chinarro suelto
        g.globalAlpha = azar(0.1, 0.35);
        g.fillStyle = Math.random() < 0.5 ? T.sueloLuz : T.sueloSombra;
        g.beginPath();
        g.arc(azar(0, L), azar(0, L), azar(0.7, 1.8), 0, 6.2832);
        g.fill();
    }

    g.globalAlpha = 0.2;
    g.lineWidth = 2;
    for (let y = 5; y < L; y += 11) {
        g.strokeStyle = (y / 11) % 2 ? T.sueloSombra : T.sueloLuz;
        g.beginPath();
        for (let x = 0; x <= L; x += 4)
            g.lineTo(x, y + Math.sin(x / L * 6.2832 * 2) * 3);
        g.stroke();
    }
    return c;
}

// Tierra apisonada con hojarasca: el suelo del bosque, sin una sola recta
function tileTierra() {
    const L = Math.round(TILE * 3);
    const c = lienzoOculto(L, L), g = c.getContext('2d');
    g.fillStyle = T.suelo;
    g.fillRect(0, 0, L, L);

    for (let i = 0; i < 60; i++) {                     // el calvero y la sombra
        g.globalAlpha = azar(0.06, 0.2);
        g.fillStyle = Math.random() < 0.5 ? T.sueloLuz : T.sueloSombra;
        g.beginPath();
        g.ellipse(azar(0, L), azar(0, L), azar(6, 20), azar(4, 14), azar(0, 3), 0, 6.2832);
        g.fill();
    }
    for (let i = 0; i < 34; i++) {                     // hojas caídas
        g.globalAlpha = azar(0.12, 0.32);
        g.fillStyle = T.mota;
        g.beginPath();
        g.ellipse(azar(0, L), azar(0, L), azar(2.5, 5), azar(1, 2), azar(0, 3), 0, 6.2832);
        g.fill();
    }
    return c;
}

// Esteras cruzadas, a la manera de las salas de té: dos tendidas arriba,
// dos de canto abajo, y el patrón encaja consigo mismo al repetirse
function tileTatami() {
    const M = TILE * 2, L = M * 2;
    const c = lienzoOculto(L, L), g = c.getContext('2d');
    g.fillStyle = T.suelo;
    g.fillRect(0, 0, L, L);

    let alterna = 0;
    const estera = (x, y, w, h) => {
        g.fillStyle = (alterna++ % 2) ? T.suelo : T.sueloLuz;
        g.fillRect(x, y, w, h);
        g.strokeStyle = T.junta;                       // ribete de tela
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

    estera(0, 0, M, M / 2);
    estera(0, M / 2, M, M / 2);
    estera(M, 0, M, M / 2);
    estera(M, M / 2, M, M / 2);
    estera(0, M, M / 2, M);
    estera(M / 2, M, M / 2, M);
    estera(M, M, M / 2, M);
    estera(M * 1.5, M, M / 2, M);
    return c;
}

// ============================================================
//  Adornos del interior: se colocan pegados a los muros, donde no
//  estorban el paso. Los que llevan llama se apuntan como focos.
// ============================================================
function sembrarAdornos() {
    adornos = [];
    luces = [];
    // qué se planta y con qué frecuencia lo dice la comarca, no este archivo
    const tabla = (BIOMA && BIOMA.adornos) || [];
    if (!tabla.length) return;

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
            // ni encima de una trampa: el hierro tiene que verse limpio
            if (J.trampas.some(t => Math.hypot(cx - t.x, cy - t.y) < 1.4)) continue;

            // arrimado al muro: así el adorno queda fuera de la línea de paso
            let ox = 0, oy = 0;
            if (esMuro(x, y - 1)) oy = -0.22; else if (esMuro(x, y + 1)) oy = 0.22;
            if (esMuro(x - 1, y)) ox = -0.22; else if (esMuro(x + 1, y)) ox = 0.22;

            // se echa un dado y se mira en qué franja de la tabla del bioma
            // cae: la primera que lo recoge es la que se planta, si es que
            // hay sitio y si el adorno admite ese rincón
            const r = Math.random();
            let acumulado = 0, ficha = null;
            for (const f of tabla) {
                acumulado += f.prob;
                if (r >= acumulado) continue;
                if (f.esquina && contra < 2) break;    // este solo va en rincón
                if (lejosDe(cx, cy, f.sep, f.tipo)) ficha = f;
                break;
            }
            if (!ficha) continue;

            const a = { x: cx + ox, y: cy + oy, tipo: ficha.tipo,
                        fase: azar(0, 6.28), giro: azar(0, 6.28) };
            adornos.push(a);
            (puestos[ficha.tipo] ||= []).push(a);

            // los que llevan llama alumbran, y con la fuerza que diga su ficha
            if (ficha.luz)
                luces.push({ x: a.x, y: a.y, r: TILE * ficha.luz.r, color: ficha.luz.color,
                             fuerza: ficha.luz.fuerza, fase: a.fase, mez: 0, enPantalla: false });
        }
}

// Los adornos que van a ras de suelo no echan sombra: no hay nada levantado
// que la proyecte, y ponérsela los haría flotar
const ADORNOS_RASOS = new Set(['rejilla', 'musgo', 'estanque', 'cadena',
                               'huesos', 'shimenawa', 'banderola', 'nicho']);

// Un cráneo, que sale en más de un sitio bajo tierra
function craneo(px, py, r) {
    pieza(ctx, px, py, r, r * 0.85, '#ddd3bc', '#fff8e8', '#9c9280', 0, 1.8);
    ctx.fillStyle = P.tinta;
    ctx.beginPath(); ctx.arc(px - r * 0.35, py - r * 0.12, r * 0.24, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(px + r * 0.35, py - r * 0.12, r * 0.24, 0, 6.2832); ctx.fill();
}

// ============================================================
//  El repertorio de adornos. Ninguno sortea nada al dibujarse: todo lo
//  que varía sale del giro y la fase que se le apuntaron al sembrarlo,
//  o del reloj de la partida. Si aquí se llamase a azar(), el adorno
//  temblaría en cada fotograma.
// ============================================================
const ADORNO = {

    // ---- luz y ceremonia ----
    farol(px, py, a, parpadeo) {                   // chōchin colgado de su vara
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
    },

    toro(px, py, a, parpadeo) {                    // linterna de piedra del jardín
        pieza(ctx, px, py, 13, 12, T.zocalo, T.zocaloLuz, T.zocaloSombra, 0, 2.6);
        ctx.fillStyle = P.tinta;
        ctx.fillRect(px - 14, py - 3, 28, 2.5);
        pieza(ctx, px, py, 5.5, 5, P.papelLuz, null, null, 0, 2);
        brillo(ctx, px, py, 3.4, 3, 0, 0.5 + parpadeo * 0.35);
    },

    velon(px, py, a, parpadeo) {                   // cirio sobre su repisa
        pieza(ctx, px, py + 3, 9, 6, T.zocalo, T.zocaloLuz, T.zocaloSombra, 0, 2.4);
        pieza(ctx, px, py - 2, 4.5, 4.5, '#efe4c8', '#fffaf0', '#b8a882', 0, 2);
        ctx.save();
        ctx.globalAlpha = parpadeo;
        pieza(ctx, px, py - 7, 3, 5 * parpadeo, '#ff9c3c', P.papelLuz, null, 0, 0);
        ctx.restore();
        brillo(ctx, px, py - 8, 1.4, 2.2, 0, 0.7 * parpadeo);
    },

    antorcha(px, py, a, parpadeo) {                // hachón clavado en el muro
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = P.tinta; ctx.lineWidth = 5.5;
        ctx.beginPath(); ctx.moveTo(px - 7, py + 9); ctx.lineTo(px + 2, py - 2); ctx.stroke();
        ctx.strokeStyle = T.zocaloSombra; ctx.lineWidth = 2.8;
        ctx.beginPath(); ctx.moveTo(px - 7, py + 9); ctx.lineTo(px + 2, py - 2); ctx.stroke();
        ctx.restore();
        const f = 1 + Math.sin(J.tiempo * 9 + a.fase) * 0.18;
        pieza(ctx, px + 3, py - 5, 6 * f, 8 * f, T.tinte, P.papelLuz, null, 0, 0);
        brillo(ctx, px + 3, py - 7, 2.4, 3.4, 0, 0.55 * parpadeo);
    },

    brasero(px, py, a, parpadeo) {                 // pebetero de tres pies
        pieza(ctx, px, py + 3, 12, 7, T.zocaloSombra, T.zocalo, null, 0, 2.4);
        pieza(ctx, px, py, 11, 9, '#3a3a44', '#5c5c68', '#22222a', 0, 2.6);
        pieza(ctx, px, py, 7, 5.5, '#8a2b18', '#ff8a3c', null, 0, 0);
        ctx.save();
        ctx.globalAlpha = parpadeo;
        pieza(ctx, px, py - 2, 4.5 * parpadeo, 5 * parpadeo, T.tinte, P.papelLuz, null, 0, 0);
        ctx.restore();
    },

    // ---- lo que dejaron los muertos ----
    urna(px, py) {                                 // urna funeraria
        pieza(ctx, px, py + 2, 10, 8, T.zocaloSombra, T.zocalo, null, 0, 2.6);
        pieza(ctx, px, py - 5, 6, 4, T.zocalo, T.zocaloLuz, T.zocaloSombra, 0, 2.2);
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = P.tinta; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(px, py + 2, 6.5, 5, 0, 0, 6.2832); ctx.stroke();
        ctx.restore();
        brillo(ctx, px - 3, py, 2.2, 1.6, -0.5, 0.35);
    },

    nicho(px, py) {                                // hornacina abierta en la pared
        ctx.fillStyle = P.tinta;
        ctx.fillRect(px - 13, py - 11, 26, 22);
        ctx.fillStyle = '#0b0913';
        ctx.fillRect(px - 10, py - 8, 20, 16);
        craneo(px, py + 1, 5);
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = T.zocaloLuz; ctx.lineWidth = 1.6;
        ctx.strokeRect(px - 12.5, py - 10.5, 25, 21);
        ctx.restore();
    },

    huesos(px, py, a) {                            // osamenta suelta en el suelo
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
            const ang = a.giro + i * 1.1, l = 7 + i;
            const dx = Math.cos(ang) * l, dy = Math.sin(ang) * l * 0.8;
            ctx.strokeStyle = P.tinta; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(px - dx, py - dy); ctx.lineTo(px + dx, py + dy); ctx.stroke();
            ctx.strokeStyle = '#ddd3bc'; ctx.lineWidth = 2.6;
            ctx.beginPath(); ctx.moveTo(px - dx, py - dy); ctx.lineTo(px + dx, py + dy); ctx.stroke();
        }
        ctx.restore();
        craneo(px + 5, py + 3, 4.5);
    },

    // ---- el hierro y la mugre de las galerías ----
    tuberia(px, py, a) {                           // tubo con sus bridas, goteando
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a.giro < 3.14 ? 0 : 1.5708);
        ctx.fillStyle = P.tinta;        ctx.fillRect(-17, -9, 34, 18);
        ctx.fillStyle = T.zocalo;       ctx.fillRect(-15, -7, 30, 14);
        ctx.fillStyle = T.zocaloLuz;    ctx.fillRect(-15, -7, 30, 3.5);
        ctx.fillStyle = T.zocaloSombra; ctx.fillRect(-15, 3.5, 30, 3.5);
        ctx.fillStyle = P.tinta;
        ctx.fillRect(-11, -10, 3, 20);
        ctx.fillRect(8, -10, 3, 20);
        ctx.restore();
        pieza(ctx, px, py, 4.5, 4.5, '#0c1410', null, null, 0, 2);
        ctx.save();
        ctx.globalAlpha = 0.4 + Math.sin(J.tiempo * 2 + a.fase) * 0.35;
        ctx.fillStyle = T.tinte;
        ctx.beginPath(); ctx.arc(px, py + 9, 1.8, 0, 6.2832); ctx.fill();
        ctx.restore();
    },

    rejilla(px, py) {                              // sumidero enrejado
        ctx.fillStyle = P.tinta;
        ctx.fillRect(px - 13, py - 10, 26, 20);
        ctx.fillStyle = '#0a1210';
        ctx.fillRect(px - 11, py - 8, 22, 16);
        ctx.strokeStyle = T.zocaloLuz; ctx.lineWidth = 2.4;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(px + i * 7, py - 8); ctx.lineTo(px + i * 7, py + 8);
            ctx.stroke();
        }
        ctx.strokeStyle = T.zocaloSombra; ctx.lineWidth = 1.4;
        ctx.strokeRect(px - 11, py - 8, 22, 16);
    },

    musgo(px, py, a) {                             // el verdín de las paredes
        ctx.save();
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < 5; i++) {
            const ang = a.giro + i * 1.256;
            ctx.fillStyle = i % 2 ? T.mota : T.bordeLuz;
            ctx.beginPath();
            ctx.ellipse(px + Math.cos(ang) * 6, py + Math.sin(ang) * 4.5,
                        4.5 + (i % 3), 3 + (i % 2), ang, 0, 6.2832);
            ctx.fill();
        }
        ctx.restore();
    },

    barril(px, py) {                               // barrica con sus aros
        pieza(ctx, px, py, 10, 10, T.zocalo, T.zocaloLuz, T.zocaloSombra, 0, 2.6);
        ctx.save();
        ctx.strokeStyle = P.tinta; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, py, 6.5, 0, 6.2832); ctx.stroke();
        ctx.beginPath(); ctx.arc(px, py, 3, 0, 6.2832); ctx.stroke();
        ctx.restore();
        brillo(ctx, px - 3.5, py - 4, 2.6, 1.8, -0.5, 0.4);
    },

    // ---- lo que crece ----
    cana(px, py, a) { matoDeCanas(ctx, px, py, 11, a.giro); },

    matorral(px, py, a) {
        for (let i = 0; i < 5; i++) {
            const ang = a.giro + i * 1.256;
            pieza(ctx, px + Math.cos(ang) * 5, py + Math.sin(ang) * 4, 6.5, 5.5,
                  T.hoja, T.hojaLuz, T.hojaSombra, ang, 2);
        }
    },

    pino(px, py, a) {
        for (let i = 0; i < 6; i++) {
            const ang = a.giro + i * 1.047;
            pieza(ctx, px + Math.cos(ang) * 7, py + Math.sin(ang) * 6, 8, 7,
                  T.hoja, T.hojaLuz, T.hojaSombra, ang, 2.4);
        }
        pieza(ctx, px, py, 6, 5.5, T.hojaLuz, null, null, 0, 2);
    },

    sakura(px, py, a) {                            // cerezo enano en su macetón
        pieza(ctx, px, py + 2, 11, 9, P.maderaSombra, P.madera, null, 0, 2.4);
        ctx.save();
        ctx.translate(px, py);
        for (let i = 0; i < 5; i++) {
            const ang = a.giro + i * 1.256;
            pieza(ctx, Math.cos(ang) * 7, Math.sin(ang) * 6, 7.5, 6.5,
                  T.sakura, T.sakuraLuz, '#d07ca2', ang, 2.2);
        }
        ctx.restore();
        pieza(ctx, px, py, 5, 4.5, T.sakuraLuz, null, null, 0, 1.8);
    },

    // ---- agua y vasija ----
    tinaja(px, py) {                               // tinaja de agua, con reflejo
        pieza(ctx, px, py, 10, 9, '#4b5a72', '#6d7f9c', '#2e3a4e', 0, 2.6);
        pieza(ctx, px, py, 6.5, 5.8, '#2b527a', '#3f7aa8', null, 0, 1.6);
        brillo(ctx, px - 2, py - 2, 2.6, 1.6, -0.5, 0.5);
    },

    estanque(px, py, a) {                          // charca del jardín, con su onda
        pieza(ctx, px, py, 16, 11, T.zocaloSombra, null, null, 0, 3);
        pieza(ctx, px, py, 13, 8.5, '#1e3a5c', '#2f5c86', '#12243c', 0, 0);
        const k = (J.tiempo * 0.5 + a.fase) % 1;
        ctx.save();
        ctx.globalAlpha = 0.45 * (1 - k);
        ctx.strokeStyle = '#9fd8ff'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(px, py, 3 + k * 9, (3 + k * 9) * 0.62, 0, 0, 6.2832);
        ctx.stroke();
        ctx.restore();
        pieza(ctx, px + 5, py - 2, 4, 2.6, T.hoja, T.hojaLuz, null, 0.4, 1.6);
    },

    // ---- lo que dejó la gente ----
    biombo(px, py, a) {                            // byōbu de tres hojas
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a.giro < 3.14 ? 0 : 1.5708);
        ctx.fillStyle = P.tinta; ctx.fillRect(-18, -7, 36, 14);
        for (let i = 0; i < 3; i++) {
            const x = -16 + i * 11;
            ctx.fillStyle = i === 1 ? '#e8dfc4' : '#d8cfb0';
            ctx.fillRect(x, -5, 10, 10);
            ctx.strokeStyle = P.maderaSombra; ctx.lineWidth = 1.4;
            ctx.strokeRect(x, -5, 10, 10);
        }
        ctx.globalAlpha = 0.55;                    // la pincelada del biombo
        ctx.fillStyle = P.tinta;
        ctx.beginPath(); ctx.ellipse(-2, 0, 7, 3, -0.4, 0, 6.2832); ctx.fill();
        ctx.restore();
    },

    puesto(px, py, a) {                            // tenderete de mercado
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a.giro < 3.14 ? 0 : 1.5708);
        ctx.fillStyle = P.tinta; ctx.fillRect(-20, -13, 40, 26);
        ctx.fillStyle = P.bermellon; ctx.fillRect(-18, -11, 36, 22);
        ctx.fillStyle = '#e8dfc4';                 // las franjas del toldo
        for (let i = 0; i < 3; i++) ctx.fillRect(-18 + i * 12, -11, 6, 22);
        ctx.globalAlpha = 0.35; ctx.fillStyle = '#000';
        ctx.fillRect(-18, 3, 36, 8);               // la sombra del mostrador
        ctx.restore();
    },

    cajas(px, py, a) {                             // dos cajones apilados
        const caja = (x, y, s, giro) => {
            ctx.save();
            ctx.translate(x, y); ctx.rotate(giro);
            ctx.fillStyle = P.tinta;        ctx.fillRect(-s - 2, -s - 2, s * 2 + 4, s * 2 + 4);
            ctx.fillStyle = P.madera;       ctx.fillRect(-s, -s, s * 2, s * 2);
            ctx.fillStyle = P.maderaSombra; ctx.fillRect(0, -s, s, s * 2);
            ctx.strokeStyle = P.maderaLuz; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(-s, -s); ctx.lineTo(s, s); ctx.stroke();
            ctx.restore();
        };
        caja(px - 4, py + 3, 7, a.giro * 0.12);
        caja(px + 5, py - 3, 5.5, -a.giro * 0.12);
    },

    cartel(px, py) {                               // rótulo de madera en su poste
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = P.tinta; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(px, py + 10); ctx.lineTo(px, py - 4); ctx.stroke();
        ctx.strokeStyle = P.maderaSombra; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(px, py + 10); ctx.lineTo(px, py - 4); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = P.tinta;   ctx.fillRect(px - 9, py - 14, 18, 14);
        ctx.fillStyle = '#e8dfc4'; ctx.fillRect(px - 7, py - 12, 14, 10);
        ctx.save();
        ctx.globalAlpha = 0.6; ctx.fillStyle = P.tinta;   // los trazos del rótulo
        ctx.fillRect(px - 4, py - 10, 8, 1.6);
        ctx.fillRect(px - 4, py - 7.5, 8, 1.6);
        ctx.fillRect(px - 4, py - 5, 5, 1.6);
        ctx.restore();
    },

    // ---- la guerra ----
    cadena(px, py, a) {                            // eslabones tirados en el tablón
        ctx.save();
        ctx.translate(px, py); ctx.rotate(a.giro);
        for (let i = -2; i <= 2; i++) {
            ctx.strokeStyle = P.tinta; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.ellipse(i * 7, 0, 4, 2.6, 0, 0, 6.2832); ctx.stroke();
            ctx.strokeStyle = '#8a90a0'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(i * 7, 0, 4, 2.6, 0, 0, 6.2832); ctx.stroke();
        }
        ctx.restore();
    },

    banderola(px, py, a) {                         // estandarte que ondea en su vara
        const onda = Math.sin(J.tiempo * 2 + a.fase) * 2.5;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = P.tinta; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(px - 11, py - 12); ctx.lineTo(px + 11, py - 12); ctx.stroke();
        ctx.restore();
        const pano = (w, h, color) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(px - w, py - 12); ctx.lineTo(px + w, py - 12);
            ctx.lineTo(px + w + onda, py + h); ctx.lineTo(px - w + onda, py + h);
            ctx.closePath(); ctx.fill();
        };
        pano(9, 12, P.tinta);
        pano(7, 10, P.bermellon);
        ctx.save();
        ctx.globalAlpha = 0.75; ctx.fillStyle = P.oroLuz;
        ctx.beginPath(); ctx.arc(px + onda * 0.5, py - 1, 3.2, 0, 6.2832); ctx.fill();
        ctx.restore();
    },

    almena(px, py) {                               // merlón con su aspillera
        ctx.fillStyle = P.tinta;      ctx.fillRect(px - 12, py - 10, 24, 20);
        ctx.fillStyle = T.bordeBase;  ctx.fillRect(px - 10, py - 8, 20, 16);
        ctx.fillStyle = T.bordeLuz;   ctx.fillRect(px - 10, py - 8, 20, 4);
        ctx.fillStyle = T.bordeSombra; ctx.fillRect(px - 10, py + 4, 20, 4);
        ctx.fillStyle = '#0b0e18';    ctx.fillRect(px - 2, py - 5, 4, 10);
    },

    // ---- lo sagrado ----
    torii(px, py, a) {                             // pórtico bermellón, visto de arriba
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a.giro < 3.14 ? 0 : 1.5708);
        ctx.fillStyle = P.tinta;     ctx.fillRect(-17, -12, 34, 6);
        ctx.fillStyle = P.bermellon; ctx.fillRect(-16, -11, 32, 4);
        ctx.fillStyle = P.tinta;     ctx.fillRect(-14, -3, 28, 5);
        ctx.fillStyle = '#e8583f';   ctx.fillRect(-13, -2, 26, 3);
        for (const x of [-13, 13])
            pieza(ctx, x, 7, 4.5, 4.5, P.bermellon, '#ff8a70', '#8d2517', 0, 2.2);
        ctx.restore();
    },

    estela(px, py, a) {                            // estela de piedra con inscripción
        ctx.save();
        ctx.translate(px, py); ctx.rotate((a.giro - 3.14) * 0.03);
        ctx.fillStyle = P.tinta;     ctx.fillRect(-8, -12, 16, 24);
        ctx.fillStyle = T.zocalo;    ctx.fillRect(-6, -10, 12, 20);
        ctx.fillStyle = T.zocaloLuz; ctx.fillRect(-6, -10, 4, 20);
        ctx.globalAlpha = 0.5; ctx.fillStyle = P.tinta;
        for (let i = 0; i < 3; i++) ctx.fillRect(-2.5, -7 + i * 6, 5, 1.8);
        ctx.restore();
    },

    shimenawa(px, py, a) {                         // la soga sagrada y sus papeles
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a.giro < 3.14 ? 0 : 1.5708);
        ctx.lineCap = 'round';
        ctx.strokeStyle = P.tinta; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.stroke();
        ctx.strokeStyle = '#e8dfc4'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.stroke();
        ctx.strokeStyle = '#b8a882'; ctx.lineWidth = 1.4;      // el trenzado
        for (let i = -3; i <= 3; i++) {
            ctx.beginPath(); ctx.moveTo(i * 5 - 2, -3); ctx.lineTo(i * 5 + 2, 3); ctx.stroke();
        }
        ctx.fillStyle = '#fffaf0';                             // los shide de papel
        for (const x of [-9, 0, 9]) {
            ctx.beginPath();
            ctx.moveTo(x - 3, 3); ctx.lineTo(x + 3, 3);
            ctx.lineTo(x + 1, 12); ctx.lineTo(x - 4, 10);
            ctx.closePath(); ctx.fill();
        }
        ctx.restore();
    },

    campana(px, py, a) {                           // campana de bronce, balanceándose
        const balanceo = Math.sin(J.tiempo * 1.3 + a.fase) * 0.12;
        ctx.save();
        ctx.translate(px, py); ctx.rotate(balanceo);
        pieza(ctx, 0, 0, 12, 11, '#5a5a3c', '#8a8a5c', '#33331f', 0, 3);
        ctx.strokeStyle = P.tinta; ctx.lineWidth = 1.6;
        for (let i = 1; i <= 2; i++) {
            ctx.beginPath(); ctx.arc(0, 0, 4 * i, 0, 6.2832); ctx.stroke();
        }
        pieza(ctx, 0, 0, 3, 3, P.oro, P.oroLuz, P.oroSombra, 0, 1.6);
        ctx.restore();
        brillo(ctx, px - 4, py - 5, 2.6, 1.8, -0.5, 0.4);
    },

    ofrenda(px, py, a) {                           // bandeja con arroz, fruta e incienso
        pieza(ctx, px, py, 10, 7, P.madera, P.maderaLuz, P.maderaSombra, 0, 2.4);
        pieza(ctx, px - 3, py - 1, 3.4, 2.6, '#fffaf0', null, '#d8cfb0', 0, 1.6);
        pieza(ctx, px + 3, py, 3, 2.6, P.elixir, P.elixirLuz, null, 0, 1.6);
        ctx.save();
        ctx.globalAlpha = 0.22 + Math.sin(J.tiempo * 1.6 + a.fase) * 0.14;
        ctx.fillStyle = T.mota;
        ctx.beginPath(); ctx.ellipse(px, py - 9, 3, 6, 0, 0, 6.2832); ctx.fill();
        ctx.restore();
    },

    rocalla(px, py, a) {                           // piedra suelta del jardín seco
        pieza(ctx, px, py, 8, 6, T.zocalo, T.zocaloLuz, T.zocaloSombra, a.giro, 2.2);
    }
};

function dibujarAdornos() {
    for (const a of adornos) {
        const px = aPantallaX(a.x), py = aPantallaY(a.y);
        if (px < -60 || py < -60 || px > AN + 60 || py > AL + 60) continue;
        const parpadeo = 0.85 + Math.sin(J.tiempo * 6 + a.fase) * 0.15;
        if (!ADORNOS_RASOS.has(a.tipo)) sombraElipse(px, py + 6, 13, 6, 0.32);
        (ADORNO[a.tipo] || ADORNO.rocalla)(px, py, a, parpadeo);
    }
}

// ============================================================
//  Trampas: el hierro que sube del suelo. La boca se ve siempre, para
//  que se pueda esquivar; lo que cambia es cuánto asoma el diente, y
//  eso lo lleva la propia trampa en mazmorra.js.
// ============================================================

// Cuánto sobresale el hierro, de 0 a 1, según la vuelta que lleve dada
function alturaTrampa(fase) {
    if (fase < TRAMPA_AVISO) return 0;
    if (fase < TRAMPA_FUERA) return (fase - TRAMPA_AVISO) / (TRAMPA_FUERA - TRAMPA_AVISO);
    if (fase < TRAMPA_VUELVE) return 1;
    return 1 - (fase - TRAMPA_VUELVE) / (1 - TRAMPA_VUELVE);
}

function dibujarTrampas() {
    for (const t of J.trampas) {
        const px = aPantallaX(t.x), py = aPantallaY(t.y);
        if (px < -60 || py < -60 || px > AN + 60 || py > AL + 60) continue;

        const r = t.r * TILE;
        // la boca: una placa de hierro embutida en el suelo, con sus ranuras
        ctx.fillStyle = P.tinta;
        ctx.beginPath(); ctx.ellipse(px, py, r + 3, r * 0.72 + 3, 0, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#0a0f0c';
        ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.72, 0, 0, 6.2832); ctx.fill();
        ctx.save();
        ctx.strokeStyle = T.zocaloSombra; ctx.lineWidth = 1.6;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(px + i * r * 0.5, py - r * 0.6);
            ctx.lineTo(px + i * r * 0.5, py + r * 0.6);
            ctx.stroke();
        }
        ctx.restore();

        const salida = alturaTrampa(t.fase);

        // mientras se prepara, la boca se enciende: el aviso que da tiempo a
        // quitarse de encima
        if (t.fase >= TRAMPA_AVISO && t.fase < TRAMPA_FUERA) {
            ctx.save();
            ctx.globalAlpha = 0.5 * (1 - salida) + 0.2;
            ctx.strokeStyle = '#ff5a48'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.ellipse(px, py, r + 2, r * 0.72 + 2, 0, 0, 6.2832); ctx.stroke();
            ctx.restore();
        }

        if (salida <= 0.01) continue;

        // los dientes, que crecen del centro hacia fuera
        const alto = 16 * salida;
        for (let i = 0; i < 5; i++) {
            const ang = i * 1.2566 + t.fase * 0.4;
            const dx = Math.cos(ang) * r * 0.5, dy = Math.sin(ang) * r * 0.35;
            ctx.fillStyle = P.tinta;
            ctx.beginPath();
            ctx.moveTo(px + dx - 4, py + dy + 2);
            ctx.lineTo(px + dx + 4, py + dy + 2);
            ctx.lineTo(px + dx, py + dy - alto);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#9aa4b4';
            ctx.beginPath();
            ctx.moveTo(px + dx - 2.4, py + dy + 1);
            ctx.lineTo(px + dx + 2.4, py + dy + 1);
            ctx.lineTo(px + dx, py + dy - alto + 2);
            ctx.closePath(); ctx.fill();
        }
        brillo(ctx, px, py - alto * 0.6, 3.4, 2, 0, 0.35 * salida);
    }
}

// ============================================================
//  Sprites: figuras de animación, entintadas y con dos tonos
// ============================================================
let sprites;

// El lienzo se hace del tamaño con que va a verse y el dibujo se escala
// dentro: así las figuras salen nítidas por grande que sea la casilla, sin
// tocar una sola de las coordenadas con que están dibujadas
function nuevoSprite(pintar) {
    const lado = Math.ceil(SPR * ESCALA_SPR);
    const c = lienzoOculto(lado, lado);
    const g = c.getContext('2d');
    g.scale(lado / SPR, lado / SPR);
    pintar(g, SPR / 2);
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
//  Ambiente: lo que flota en el aire de cada comarca. Pétalos en el
//  jardín, polvo bajo tierra, goterones en las galerías, hojas en el
//  bambú, pavesas en la plaza. Todas se mueven igual; lo que cambia es
//  la forma, el color, cuántas hay y hacia dónde van.
// ============================================================
const petalos = [];
const luciernagas = [];

function prepararAmbiente() {
    const amb = aire();
    petalos.length = 0;
    luciernagas.length = 0;
    for (let i = 0; i < amb.cuantas; i++)
        petalos.push({ x: azar(0, AN), y: azar(0, AL), v: azar(amb.vel[0], amb.vel[1]),
                       giro: azar(0, 6.28), vGiro: azar(-1.6, 1.6), t: azar(6, 15),
                       tam: azar(0.75, 1.35) });
    for (let i = 0; i < (amb.luciernagas || 0); i++)
        luciernagas.push({ x: azar(0, AN), y: azar(0, AL), fase: azar(0, 6.28),
                           vx: azar(-9, 9), vy: azar(-9, 9) });
}

function actualizarAmbiente(dt) {
    for (const p of petalos) {
        p.y += p.v * dt;
        p.x += Math.sin(J.tiempo * 1.4 + p.giro) * 16 * dt - 8 * dt;
        p.giro += p.vGiro * dt;
        // lo que cae vuelve por arriba y lo que sube vuelve por abajo
        if (p.y > AL + 12) { p.y = -12; p.x = azar(-20, AN); }
        else if (p.y < -12) { p.y = AL + 12; p.x = azar(-20, AN); }
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

function dibujarParticulas() {
    const amb = aire();
    ctx.save();
    ctx.fillStyle = amb.color;
    for (const p of petalos) {
        ctx.save();
        ctx.translate(p.x, p.y);
        switch (amb.forma) {
            case 'mota':                               // polvo suspendido
                ctx.globalAlpha = 0.2 + Math.abs(Math.sin(J.tiempo * 1.2 + p.t)) * 0.3;
                ctx.beginPath(); ctx.arc(0, 0, 1.6 * p.tam, 0, 6.2832); ctx.fill();
                break;
            case 'gota':                               // goterón que se despeña
                ctx.globalAlpha = 0.45;
                ctx.beginPath();
                ctx.ellipse(0, 0, 1.1 * p.tam, 6 * p.tam, 0, 0, 6.2832);
                ctx.fill();
                break;
            case 'hoja':                               // hoja alargada, dando vueltas
                ctx.rotate(p.giro);
                ctx.globalAlpha = 0.42;
                ctx.beginPath();
                ctx.ellipse(0, 0, 6 * p.tam,
                            1.8 * p.tam * Math.abs(Math.cos(J.tiempo * 2.4 + p.t)),
                            0, 0, 6.2832);
                ctx.fill();
                break;
            case 'ceniza':                             // pavesa que se apaga y se enciende
                ctx.globalAlpha = 0.15 + Math.abs(Math.sin(J.tiempo * 2.6 + p.t)) * 0.4;
                ctx.beginPath(); ctx.arc(0, 0, 1.3 * p.tam, 0, 6.2832); ctx.fill();
                break;
            default:                                   // pétalo, que respira al girar
                ctx.rotate(p.giro);
                ctx.globalAlpha = 0.42;
                ctx.beginPath();
                ctx.ellipse(0, 0, 4.2 * p.tam,
                            2.2 * p.tam * Math.abs(Math.cos(J.tiempo * 3 + p.t)),
                            0, 0, 6.2832);
                ctx.fill();
        }
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

    // el lienzo del nivel trae ya sus afueras alrededor, así que basta con
    // recortarle la ventana: bosque y recinto se mueven a una, sin costura
    ctx.drawImage(lienzoNivel, cam.x + OFF, cam.y + OFF, AN, AL, 0, 0, AN, AL);

    dibujarAdornos();
    dibujarTrampas();
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
    dibujarParticulas();

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
        const velo = aire().velo;
        const v = g.createRadialGradient(AN / 2, AL / 2, AL * 0.4, AN / 2, AL / 2, AL * 0.95);
        v.addColorStop(0, `rgba(${velo}, 0)`);
        v.addColorStop(1, `rgba(${velo}, 0.6)`);
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
    const s = SPR * ESCALA_SPR;
    // los apartes de la hoja y el escudo van en partes del propio muñeco, no
    // en píxeles sueltos: si la figura crece, crecen con ella
    const empuje = j.golpe > 0 ? Math.sin(prog * Math.PI) * s * 0.138 : 0;

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
        ctx.drawImage(sprites.katana, -s / 2 + s * 0.123, -s / 2 + s * 0.185, s, s);
        ctx.restore();
    }

    ctx.globalAlpha = J.muerto ? 0.35 : (j.invulnerable > 0 ? 0.55 : 1);
    const cadenciaPaso = j.corriendo ? 21 : 14;
    const paso = j.andando ? Math.sin(J.tiempo * cadenciaPaso) * (j.corriendo ? 1.5 : 0.9) : 0;
    ctx.drawImage(sprites.heroe, -s / 2, -s / 2 + paso, s, s);

    // el escudo va en el brazo contrario a la hoja; al cubrirse se alza de frente
    ctx.translate(j.cubriendo ? s * 0.231 : s * 0.046, j.cubriendo ? 0 : -s * 0.169);
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
        ctx.translate(px - Math.cos(j.mira) * i * s * 0.138, py - Math.sin(j.mira) * i * s * 0.138);
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

    // el manto se tiñe del velo de la comarca, y cala más o menos según lo
    // cerrada que sea: la cripta es casi negra y el santuario, casi de día
    const amb = aire();
    sctx.globalCompositeOperation = 'source-over';
    sctx.clearRect(-m, -m, AN + m * 2, AL + m * 2);
    sctx.fillStyle = `rgba(${amb.velo}, ${amb.oscuridad !== undefined ? amb.oscuridad : OSCURIDAD})`;
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
// lo último que se escribió en el rótulo de la senda, para no rehacerlo cada cuadro
let rotuloNivel = '';

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

    // el rótulo solo se reescribe cuando dice algo distinto: nombre de la
    // comarca incluido, que sale de biomas.js y no de aquí
    const rotulo = `Senda ${J.nivel} · <b>${nombreDelBioma()}</b>`
                 + ` · Enemigos ${J.enemigos.length}<br>${J.arma}`;
    if (rotulo !== rotuloNivel) {
        rotuloNivel = rotulo;
        document.getElementById('estadoNivel').innerHTML = rotulo;
    }
    document.getElementById('muerte').style.display = J.muerto ? 'flex' : 'none';
    // la cuenta de lo dejado atrás se escribe una sola vez, al caer, no en
    // cada cuadro que el velo pasa por delante
    if (J.muerto !== caidaEscrita) {
        caidaEscrita = J.muerto;
        // al caer se recoge todo lo que hubiera abierto: la caída manda
        if (J.muerto) { pintarCaida(); alternarMenu(false); }
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

    // los colores del plano también son los de la comarca
    const tintaMini = (BIOMA && BIOMA.minimapa) || { suelo: '#6f9a63', muro: '#1b2c4e' };
    for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
            const i = y * ANCHO + x;
            if (!J.explorado[i] || volcado[i]) continue;
            volcado[i] = 1;
            tctx.fillStyle = J.mapa[y][x] === 1 ? tintaMini.muro : tintaMini.suelo;
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

    // las trampas ya descubiertas quedan marcadas: se pisan una vez, no dos
    for (const t of J.trampas) {
        const i = Math.floor(t.y) * ANCHO + Math.floor(t.x);
        if (!J.explorado[i]) continue;
        puntoMini(t.x, t.y, alturaTrampa(t.fase) > 0.5 ? '#ff5a48' : '#7a5060', 2);
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
    // los ajustes se piden aparte: el menú siempre se abre recogido
    ventanaAjustes(false);
    // el héroe no se queda corriendo ni cubriéndose por tener el menú delante
    teclas.clear();
    raton.izq = raton.der = false;
}

document.getElementById('mjCerrar').addEventListener('click', () => alternarMenu(false));

// ---------- La ventana de los ajustes ----------
// ajustes.html asomada encima de la partida en vez de una pantalla aparte:
// salir del santuario costaría la senda empezada. La página se carga la
// primera vez que se pide, y no antes.
const cajaAjustes = document.getElementById('ventanaAjustes');
const marcoAjustes = document.getElementById('marcoAjustes');

function ventanaAjustes(abrir) {
    if (abrir && !marcoAjustes.dataset.puesta) {
        // el ?marco=1 no es adorno: es como ajustes.html distingue esta
        // ventanita del marco del armazón, donde va entera y con música
        marcoAjustes.src = 'ajustes.html?marco=1';
        marcoAjustes.dataset.puesta = '1';
    }
    cajaAjustes.hidden = !abrir;
    if (!abrir) return;
    // el menú se aparta mientras dura la ventana y vuelve al cerrarla
    menuJuego.hidden = true;
    // el héroe no se queda corriendo ni cubriéndose por tener la ventana delante
    teclas.clear();
    raton.izq = raton.der = false;
}

document.getElementById('mjAjustes').addEventListener('click', () => ventanaAjustes(true));

// pinchar en la penumbra de alrededor también la cierra
cajaAjustes.addEventListener('mousedown', ev => {
    if (ev.target === cajaAjustes) alternarMenu(true);
});

// Lo que se toca dentro de la ventana llega por aquí: el marco puede no
// compartir almacén con la partida (según el navegador, y desde file:// casi
// nunca), así que sus cambios se anotan y se aplican de este lado también.
addEventListener('message', ev => {
    const aviso = ev.data;
    if (!aviso || aviso.tipo !== 'ajustes') return;
    if (aviso.cerrar) { alternarMenu(true); return; }
    Ajustes.guardar({ volumen: aviso.volumen, musica: aviso.musica, hud: aviso.hud });
});

// no hay nada que anotar al salir: el arma y las esquirlas se guardan solas
// en cuanto se ganan o se cambian
document.getElementById('mjInicio').addEventListener('click', () => {
    location.href = '../index.html';
});

document.getElementById('mjSalir').addEventListener('click', () => {
    window.close();
    // los navegadores solo cierran las pestañas que ellos abrieron: si seguimos
    // aquí un instante después, se lo decimos al jugador en vez de callar
    setTimeout(() => { document.getElementById('mjNota').hidden = false; }, 250);
});

// ---------- El final del camino ----------
// Cruzada la última puerta se deja anotado el recuento de la partida y se
// pasa a la pantalla de despedida. Si el navegador no deja guardar, la
// pantalla sale igual, solo que sin las cifras.
function irAlFinal() {
    try {
        sessionStorage.setItem('sendas.final', JSON.stringify({
            arma: J.arma,
            jade: J.esquirlas,
            lapis: J.lapis,
            sendas: J.nivel,
            tiempo: Math.round(J.tiempo)
        }));
    } catch (e) { /* nada: la despedida no depende de esto */ }
    volverAlMenu('final.html');
}

// La partida vive fuera del marco, así que salir de ella es volver al armazón
// y decirle con qué pantalla abrirse. Se podría ir derecho a html/final.html y
// dejar que menu.js la mandara para acá, pero entonces se cargaría dos veces, y
// la despedida lee su recuento una sola vez y lo borra: la primera carga se lo
// llevaría por delante.
function volverAlMenu(pantalla) {
    location.href = '../index.html?ir=' + encodeURIComponent(pantalla);
}

// ---------- La pantalla de caída ----------
// Ya no se reinicia en el sitio: continuar deja al héroe otra vez en el zaguán,
// donde puede rehacerse en la armería antes de volver a entrar.
document.getElementById('mtContinuar').addEventListener('click', () => {
    volverAlMenu('prev.html');
});

document.getElementById('mtSalir').addEventListener('click', () => {
    location.href = '../index.html';
});

addEventListener('keydown', ev => {
    // mientras se teclea en la consola las letras son suyas, no del héroe
    if (ev.target.tagName === 'INPUT') return;
    const k = ev.key.toLowerCase();
    if (k === 'escape') { alternarMenu(); return; }
    if (k === 'e') {
        if (!ev.repeat && cruzar()) {
            // tras la última puerta no hay senda que trazar: hay final
            if (J.completado) irAlFinal(); else construirLienzoNivel();
        }
        return;
    }
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

// El lienzo tiene siempre la misma resolución (ANCHO_JUEGO x ALTO_JUEGO): así
// se ve igual de grande sin importar la pantalla. Solo se llama una vez, al
// arrancar; lo que cambia con la ventana es la escala visual, ver abajo.
function ajustarLienzo() {
    AN = lienzo.width = ANCHO_JUEGO;
    AL = lienzo.height = ALTO_JUEGO;
    capaVineta = null;
    lienzoSombra = null; sctx = null;
    raton.x = AN / 2; raton.y = AL / 2;
    if (petalos.length) prepararAmbiente();
    if (lienzoNivel && margenAfueras() > MARGEN) construirLienzoNivel();
}

// Esto sí reacciona a la ventana: agranda el lienzo lo justo para tapar toda
// la pantalla sin deformarse (de sobra se recorta un poco de arriba/abajo o
// de los lados, según la forma de la ventana, en vez de dejar bandas negras).
// El hud, en cambio, es dom normal y se acomoda solo al tamaño real de la pantalla.
function ajustarEscalaLienzo() {
    const escala = Math.max(innerWidth / AN, innerHeight / AL);
    lienzo.style.width = Math.round(AN * escala) + 'px';
    lienzo.style.height = Math.round(AL * escala) + 'px';
}
addEventListener('resize', ajustarEscalaLienzo);

prepararSprites();
ajustarLienzo();
ajustarEscalaLienzo();
comenzar();
requestAnimationFrame(bucle);
