// ============================================================
//  mazmorra.js - lógica del juego en tiempo real (sin dibujado)
//  Las plantas se trazan con dos o tres salas amplias apiladas,
//  unidas por corredores rectos. Las entidades se mueven en
//  coordenadas continuas (casillas con decimales), no a saltos.
// ============================================================

const ANCHO = 36, ALTO = 44;

// Trazado de la planta: unas cuantas salas apiladas de abajo arriba. Se entra
// siempre por la de abajo y se sale por la puerta de la de arriba.
// Estas medidas son solo el patrón de la casa: cada bioma trae las suyas en su
// ficha, y estas quedan de red por si se juega sin biomas cargados.
const PLANTA_BASE = {
    salas: [2, 3],                // cuántas salas se apilan
    ancho: [15, 26],              // lo que mide cada una, en casillas
    alto: [9, 13],
    pasillo: 3,                   // casillas de ancho de los corredores
    chaflan: 0.6,                 // con qué frecuencia se recorta una esquina
    atajos: 1                     // corredores de más, para que no haya embudo
};

let ANCHO_PASILLO = PLANTA_BASE.pasillo;   // lo fija el bioma al trazar la planta

// Maniobras del héroe
const FACTOR_CARRERA = 1.55;      // lo que acelera Shift
const FACTOR_GUARDIA = 0.45;      // lo que frena ir cubierto
const REDUCCION_GUARDIA = 0.5;    // mitad de daño al parar de frente
const ARCO_GUARDIA = 1.3;         // radianes a cada lado que abarca el escudo
const FUERZA_DASH = 19;           // impulso del salto lateral
const ESPERA_DASH = 0.9;          // segundos hasta poder repetirlo
const DURACION_DASH = 0.18;

// El aliento: se gasta esquivando y golpeando, y se repone solo, sin pausa
// previa ni descanso que haya que buscarse.
//
// Vuelve despacio a propósito -10 cada cinco segundos-, muchísimo menos de lo
// que cuesta pelear: ninguna arma se sostiene con lo que repone, ni siquiera
// el nodachi. Eso convierte la barra en una reserva que se administra y no en
// un grifo del que beber: el golpeo continuo se acaba, y hay que retirarse a
// tomar aire. Es la diferencia entre un freno y un recurso.
const ESTAMINA_BASE = 50;
const COSTE_DASH = 25;            // media barra por esquiva
const COSTE_GOLPE = 5;
const ESTAMINA_RITMO = 2;         // puntos por segundo andando: 10 cada 5 segundos
const ESTAMINA_QUIETO = 2;        // y el doble plantado, sin dar un paso
const ESTAMINA_CURANDO = 5;       // y a cinco veces con los pies en el elixir

// Hasta dónde llegan los ojos del héroe. Algo menos que RADIO_LUZ, la antorcha
// que dibuja la vista: se alumbra más terreno del que de verdad se abarca.
const RADIO_VISION = 8.5;

const VEL_PUERTA = 1.4;           // lo que tardan en separarse las hojas

// El elixir no se bebe de un trago al pasarle por encima: la botella hay que
// romperla a golpes, igual que a un enemigo, y lo que llevaba se derrama en el
// suelo. Ese charco cura mientras se está encima -no se lleva puesto- y no
// espera: dura lo que dura y luego se seca. Quien lo rompe con la vida llena
// desperdicia media botella, y esa es justamente la decisión que se le pide.
const CHARCO_VIDA = 5;       // segundos que aguanta antes de empezar a secarse
const CHARCO_CURA = 10;      // PV que da entero, como mucho
const CHARCO_RITMO = 4;      // PV por segundo mientras se pisa: los 10 en 2,5 s
const CHARCO_SECADO = 0.9;   // lo que tarda en irse del todo una vez agotado
const CHARCO_RADIO = 0.8;    // el círculo que hay que pisar, en casillas

// Cuánta compaña hay en cada senda. Como la puerta no se abre hasta que no
// queda nadie, este número es también lo larga que se hace la planta.
const ENEMIGOS_BASE = 12;         // los de la primera senda
const ENEMIGOS_POR_NIVEL = 5;     // los que se suman por cada una que se baja
const ENEMIGOS_TOPE = 45;         // más no caben con holgura en el mapa

const J = {
    mapa: [],            // 1 = roca, 0 = suelo
    jugador: null,
    enemigos: [],
    objetos: [],
    trampas: [],         // las que planta el bioma, si es que planta alguna
    efectos: [],         // chispas y números de daño, solo decorativos
    orbesSueltos: [],    // los orbes azules que aún van por el aire
    charcos: [],         // lo derramado por las botellas rotas, curando en el suelo
    puerta: { x: 0, y: 0, apertura: 0 },   // apertura: 0 cerrada, 1 abierta del todo
    nivel: 1,
    log: [],
    muerto: false,
    completado: false,   // se cruzó la última puerta: el camino llegó a su fin
    tiempo: 0,
    arma: 'tanto',       // nombre del acero equipado, solo para el HUD
    esquirlas: 0,        // saldo de jade, copiado de la ranura al empezar
    orbes: 0,            // y el de orbes azules, que pagan las mejoras
    // lo juntado en la senda de ahora: no llega a la ranura hasta cruzar su
    // puerta, y se pierde entero si el héroe cae antes
    pendiente: { jade: 0, orbes: 0 },
    // y lo que se quedó en el suelo al caer, para poder decírselo al jugador
    perdido: { jade: 0, orbes: 0 }
};

const azar = (min, max) => Math.random() * (max - min) + min;
const azarEnt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function mensaje(texto) {
    J.log.push(texto);
    if (J.log.length > 60) J.log.shift();
}

// el nombre del enemigo no se traduce -un oni es un oni-, pero el artículo
// que lo precede sí, que es gramática de la lengua y no nombre propio
const sujeto = e => `${TR(e.art === 'el' ? 'msg.articuloEl' : 'msg.articuloLa')} ${e.nombre}`;

const esMuro = (cx, cy) =>
    cx < 0 || cy < 0 || cx >= ANCHO || cy >= ALTO || J.mapa[cy][cx] === 1;

// ¿Cabe una entidad de radio r centrada en (x, y)?
function libre(x, y, r) {
    for (let cy = Math.floor(y - r); cy <= Math.floor(y + r); cy++)
        for (let cx = Math.floor(x - r); cx <= Math.floor(x + r); cx++)
            if (esMuro(cx, cy)) return false;
    return true;
}

// Movimiento con deslizamiento: si un eje choca, el otro sigue avanzando.
function moverEntidad(e, dx, dy) {
    if (dx && libre(e.x + dx, e.y, e.r)) e.x += dx;
    if (dy && libre(e.x, e.y + dy, e.r)) e.y += dy;
}

// ============================================================
//  Generación de plantas: dos o tres salas amplias unidas por
//  corredores en ángulo recto. Nada de contornos orgánicos: aquí
//  todo son rectas, y las esquinas achaflanadas dan las diagonales.
// ============================================================
// La planta que toca trazar: la del bioma de esta senda, con la de serie de
// red por si biomas.js no está cargado
function plantaDelNivel() {
    const bioma = (typeof Biomas !== 'undefined') ? Biomas.deNivel(J.nivel) : null;
    return Object.assign({}, PLANTA_BASE, bioma && bioma.planta);
}

// Un tramo de valores [min, max] recortado a lo que de verdad cabe. Así un
// bioma puede pedir salas enormes o diminutas sin romper el trazado.
function medida(tramo, tope, suelo) {
    const max = Math.max(suelo, Math.min(tramo[1], tope));
    const min = Math.max(suelo, Math.min(tramo[0], max));
    return azarEnt(min, max);
}

function generarSalas() {
    const p = plantaDelNivel();
    ANCHO_PASILLO = Math.max(2, Math.min(p.pasillo, 6));

    const m = [];
    for (let y = 0; y < ALTO; y++) m.push(new Array(ANCHO).fill(1));
    J.mapa = m;

    // El mapa se reparte en franjas horizontales, una por sala. La franja 0 es
    // la de abajo, donde se aparece; la última, arriba, es la de la puerta.
    const cuantas = azarEnt(p.salas[0], p.salas[1]);
    const franja = Math.floor((ALTO - 4) / cuantas);

    const salas = [];
    for (let i = 0; i < cuantas; i++) {
        const w = medida(p.ancho, ANCHO - 6, 6);
        const h = medida(p.alto, franja - 3, 4);
        const pie = ALTO - 2 - i * franja;                  // borde bajo de la franja
        const hueco = Math.max(1, franja - h - 1);          // aire que sobra dentro
        const sala = {
            x: azarEnt(2, Math.max(2, ANCHO - w - 3)),
            y: pie - h - azarEnt(1, hueco),
            w, h
        };
        excavarSala(sala);
        if (Math.random() < p.chaflan) achaflanar(sala);
        salas.push(sala);
    }

    // Un corredor entre cada dos salas seguidas...
    for (let i = 1; i < salas.length; i++)
        unirSalas(centro(salas[i - 1]), centro(salas[i]));

    // ...y los que pida el bioma por un costado, para que haya más de un
    // camino y la planta no se convierta en un embudo
    for (let k = 0; k < p.atajos && salas.length > 1; k++) {
        const par = azarEnt(0, salas.length - 2);
        unirSalas(puntoLateral(salas[par], -1), puntoLateral(salas[par + 1], 1));
    }

    // lo que no cuelgue de la zona principal se vuelve roca maciza
    const region = mayorRegion(m);
    const dentro = new Set(region.map(([x, y]) => y * ANCHO + x));
    for (let y = 0; y < ALTO; y++)
        for (let x = 0; x < ANCHO; x++)
            if (!dentro.has(y * ANCHO + x)) m[y][x] = 1;

    J.mapa = m;
    return { region, salas };
}

// Punto a un costado de la sala: sirve para abrir el segundo corredor lejos
// del primero, que sale del centro
const puntoLateral = (s, lado) => ({
    x: Math.floor(s.x + (lado < 0 ? s.w * 0.2 : s.w * 0.8)),
    y: Math.floor(s.y + s.h / 2)
});

const centro = s => ({ x: Math.floor(s.x + s.w / 2), y: Math.floor(s.y + s.h / 2) });

function excavarSala(s) {
    for (let y = s.y; y < s.y + s.h; y++)
        for (let x = s.x; x < s.x + s.w; x++)
            J.mapa[y][x] = 0;
}

// Recorta en diagonal una o dos esquinas: es lo único que rompe el ángulo recto
function achaflanar(s) {
    const esquinas = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
    const cuantas = azarEnt(1, 2);
    for (let k = 0; k < cuantas; k++) {
        const [sx, sy] = esquinas.splice(azarEnt(0, esquinas.length - 1), 1)[0];
        const corte = azarEnt(2, Math.min(3, Math.min(s.w, s.h) - 2));
        const ox = sx > 0 ? s.x : s.x + s.w - 1;
        const oy = sy > 0 ? s.y : s.y + s.h - 1;
        for (let i = 0; i < corte; i++)
            for (let j = 0; j < corte - i; j++)
                J.mapa[oy + sy * i][ox + sx * j] = 1;
    }
}

// Pasillo en L: primero un tramo, luego el otro. Siempre en ángulo recto.
function unirSalas(a, b) {
    if (Math.random() < 0.5) {
        excavarH(a.x, b.x, a.y);
        excavarV(a.y, b.y, b.x);
    } else {
        excavarV(a.y, b.y, a.x);
        excavarH(a.x, b.x, b.y);
    }
}

// Los pasillos se abren de ANCHO_PASILLO casillas: de una sola no se puede
// esquivar ni usar el impulso, y el oni apenas cabe.
function excavarH(x1, x2, y) {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
        for (let k = 0; k < ANCHO_PASILLO; k++)
            if (dentroDelBorde(x, y + k)) J.mapa[y + k][x] = 0;
}

function excavarV(y1, y2, x) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
        for (let k = 0; k < ANCHO_PASILLO; k++)
            if (dentroDelBorde(x + k, y)) J.mapa[y][x + k] = 0;
}

const dentroDelBorde = (x, y) => x >= 2 && y >= 2 && x < ANCHO - 2 && y < ALTO - 2;

// Zona abierta más grande, para garantizar que todo es alcanzable
function mayorRegion(m) {
    const visto = new Uint8Array(ANCHO * ALTO);
    let mejor = [];
    for (let y = 0; y < ALTO; y++) {
        for (let x = 0; x < ANCHO; x++) {
            if (m[y][x] === 1 || visto[y * ANCHO + x]) continue;
            const region = [], cola = [[x, y]];
            visto[y * ANCHO + x] = 1;
            while (cola.length) {
                const [cx, cy] = cola.pop();
                region.push([cx, cy]);
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const nx = cx + dx, ny = cy + dy;
                    if (nx < 0 || ny < 0 || nx >= ANCHO || ny >= ALTO) continue;
                    if (m[ny][nx] === 1 || visto[ny * ANCHO + nx]) continue;
                    visto[ny * ANCHO + nx] = 1;
                    cola.push([nx, ny]);
                }
            }
            if (region.length > mejor.length) mejor = region;
        }
    }
    return mejor;
}

// Distancias por pasillos desde un origen: sirve para poner la puerta lejos
function distanciasDesde(ox, oy) {
    const dist = new Int32Array(ANCHO * ALTO).fill(-1);
    dist[oy * ANCHO + ox] = 0;
    const cola = [[ox, oy]];
    for (let i = 0; i < cola.length; i++) {
        const [cx, cy] = cola[i];
        const d = dist[cy * ANCHO + cx];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx, ny = cy + dy;
            if (esMuro(nx, ny) || dist[ny * ANCHO + nx] !== -1) continue;
            dist[ny * ANCHO + nx] = d + 1;
            cola.push([nx, ny]);
        }
    }
    return dist;
}

// ============================================================
//  Creación de un nivel
// ============================================================
function nuevoNivel() {
    const { region, salas } = generarSalas();
    // la planta es otra: el campo por el que se guiaban los bichos ya no vale,
    // y se traza de nuevo en cuanto haga falta
    olvidarCampo();

    // Se entra siempre por la sala de abajo, pegado a su pared del fondo...
    const entrada = salas[0];
    const inicio = casillaLibreCercaDe(region,
        entrada.x + entrada.w / 2, entrada.y + entrada.h - 1.5, 0.75);
    J.jugador.x = inicio[0];
    J.jugador.y = inicio[1];

    // ...y se sale por arriba: la puerta preside la última sala
    const salida = salas[salas.length - 1];
    const vano = casillaLibreCercaDe(region,
        salida.x + salida.w / 2, salida.y + 1.5, 0.6);
    J.puerta = { x: vano[0], y: vano[1], apertura: 0 };

    J.enemigos = [];
    J.objetos = [];
    J.charcos = [];
    J.trampas = [];
    J.efectos = [];
    J.orbesSueltos = [];

    // ni enemigos ni elixires encima de la puerta, ni en las narices del héroe
    const dist = distanciasDesde(Math.floor(J.jugador.x), Math.floor(J.jugador.y));
    const candidatas = region.filter(([x, y]) => {
        const d = dist[y * ANCHO + x];
        return d > 7 && libre(x + 0.5, y + 0.5, 0.6) &&
               Math.hypot(x + 0.5 - J.puerta.x, y + 0.5 - J.puerta.y) > 2;
    });
    const coger = () => candidatas.length
        ? candidatas.splice(azarEnt(0, candidatas.length - 1), 1)[0]
        : null;

    // los elixires se reparten antes: con la senda llena de enemigos, si no se
    // reservan su sitio se quedarían sin hueco donde caer
    for (let i = 0; i < 3; i++) {
        const p = coger();
        if (p) J.objetos.push({ x: p[0] + 0.5, y: p[1] + 0.5, tipo: 'elixir', r: 0.35, giro: azar(0, 6.28) });
    }

    // el hierro del suelo, si el bioma lo tiene: se reparte antes que los
    // enemigos por lo mismo que los elixires, para que le quede sitio
    sembrarTrampas(coger);

    const cuantos = Math.min(ENEMIGOS_TOPE, ENEMIGOS_BASE + (J.nivel - 1) * ENEMIGOS_POR_NIVEL);
    for (let i = 0; i < cuantos; i++) {
        const p = coger();
        if (p) J.enemigos.push(crearEnemigo(p[0] + 0.5, p[1] + 0.5));
    }

    mensaje(`--- ${TR('hud.senda')} ${J.nivel} · ${nombreDelBioma()} ---`);
}

// El rótulo de la comarca en que se anda. Sale de biomas.js y de ningún otro
// sitio: el HUD y los mensajes leen los dos de aquí.
function nombreDelBioma() {
    return (typeof Biomas !== 'undefined') ? Biomas.nombre(J.nivel) : 'santuario';
}

// Y las otras dos señas de la comarca, que el marcador enseña juntas: el
// emblema con que firma y el tinte con que se pinta. Igual que el nombre,
// salen de su ficha; sin biomas.js cargado no hay dibujo y el color es el
// oro de la casa, que es lo que ya usa el resto del marcador.
function emblemaDelBioma() {
    return (typeof Biomas !== 'undefined') ? Biomas.emblema(J.nivel) : '';
}

function tinteDelBioma() {
    return (typeof Biomas !== 'undefined') ? Biomas.tinte(J.nivel) : '#e8b44f';
}

// ============================================================
//  Trampas: hierro que sube y baja del suelo por su cuenta. Solo las
//  planta el bioma que las tiene declaradas en su ficha; los demás
//  tramos se recorren igual que siempre.
// ============================================================
function sembrarTrampas(coger) {
    const bioma = (typeof Biomas !== 'undefined') ? Biomas.deNivel(J.nivel) : null;
    const ficha = bioma && bioma.trampas;
    if (!ficha) return;

    const cuantas = azarEnt(ficha.cuantas[0], ficha.cuantas[1]);
    for (let i = 0; i < cuantas; i++) {
        const p = coger();
        if (!p) break;
        const ciclo = azar(ficha.ciclo[0], ficha.ciclo[1]);
        J.trampas.push({
            x: p[0] + 0.5, y: p[1] + 0.5,
            tipo: ficha.tipo, r: ficha.r, dano: ficha.dano,
            ciclo, t: azar(0, ciclo),      // cada una lleva su propio compás
            fase: 0, cd: 0
        });
    }
}

// Cuánto de su vuelta lleva andado la trampa, de 0 a 1. El tramo que hace
// daño está declarado aquí, y es el mismo que dibuja la vista: así lo que se
// ve en el suelo es exactamente lo que muerde.
const TRAMPA_AVISO = 0.62;        // empieza a asomar y a chirriar
const TRAMPA_FUERA = 0.74;        // el hierro está arriba: a partir de aquí hiere
const TRAMPA_VUELVE = 0.94;       // y se recoge

function actualizarTrampas(dt) {
    const j = J.jugador;
    for (const t of J.trampas) {
        t.t = (t.t + dt) % t.ciclo;
        t.fase = t.t / t.ciclo;
        t.cd -= dt;

        const armada = t.fase >= TRAMPA_FUERA && t.fase < TRAMPA_VUELVE;
        if (!armada || t.cd > 0 || J.muerto) continue;
        if (Math.hypot(t.x - j.x, t.y - j.y) > t.r + j.r) continue;

        t.cd = t.ciclo * 0.5;      // no vuelve a morder en la misma subida
        danarPorTrampa(t);
    }
}

// El hierro no entiende de guardias ni de escudos: viene de abajo. Lo único
// que salva es no estar encima, o el amparo del impulso.
function danarPorTrampa(t) {
    const j = J.jugador;
    if (j.inmortal || j.invulnerable > 0) return;

    j.hp -= t.dano;
    j.invulnerable = 0.5;
    chispas(t.x, t.y, '#c04040', 8);
    numero(j.x, j.y, t.dano, '#ff3b30');
    mensaje(TR('msg.pinchos'));
    comprobarCaida();
}

// La casilla transitable más próxima al punto pedido: así ni la entrada ni la
// puerta acaban dentro de la roca por culpa de un chaflán
function casillaLibreCercaDe(region, px, py, r) {
    let mejor = null, mejorD = Infinity;
    for (const [x, y] of region) {
        if (!libre(x + 0.5, y + 0.5, r)) continue;
        const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
        if (d < mejorD) { mejorD = d; mejor = [x + 0.5, y + 0.5]; }
    }
    return mejor || [px, py];
}

function crearEnemigo(x, y) {
    const duro = Math.random() < Math.min(0.15 + J.nivel * 0.08, 0.6);
    // alerta: lo que le queda de ir a por el héroe; a cero, se va de ronda.
    // ronda y alto son el tramo que anda mientras tanto y lo que se para al
    // acabarlo -desacompasado de salida, para que no arranquen todos a la vez-.
    // golpe y herido son lo mismo por los dos lados: lo que le queda de estar
    // dando o recibiendo, que es lo que la vista mira para saber qué lámina
    // suya toca pintar. andado es el camino que lleva hecho, de donde sale por
    // qué cuadro del paso va; antes, dónde estaba la vuelta pasada.
    const base = { x, y, ex: 0, ey: 0, cd: azar(0, 1), herido: 0, golpe: 0,
                   mira: azar(0, 6.2832), andado: 0, andando: false, antes: { x, y },
                   alerta: 0, ronda: null, alto: azar(0, 1.5) };
    // las cifras no están aquí: están en la ficha de bestias.js, que es la
    // misma que lee el bestiario del zaguán. Así lo que se promete allí es
    // exactamente lo que sale al paso
    const f = BESTIAS.ficha(duro ? 'oni' : 'rata');
    return { ...base, tipo: f.id, art: f.art, nombre: f.nombre,
             r: f.r, vel: f.vel, hp: f.hp, hpMax: f.hp,
             dano: f.dano, alcance: f.alcance, cadencia: f.cadencia, vista: f.vista };
}

// ============================================================
//  Bucle de juego
// ============================================================
// entrada: { dx, dy, mira (radianes), atacar, cubrir, correr, dash }
function actualizar(dt, entrada) {
    J.tiempo += dt;
    actualizarEfectos(dt);
    // el hierro sigue subiendo y bajando aunque el héroe haya caído: lo que se
    // para es que muerda, no que se mueva
    actualizarTrampas(dt);
    if (J.muerto) {
        // el que ha caído ni bebe ni resuella: los dos bucles se cortan aquí,
        // que si no seguirían sonando por encima de la pantalla de derrota
        if (typeof sonarCurando === 'function') sonarCurando(false);
        if (typeof sonarAgotado === 'function') sonarAgotado(false);
        return;
    }

    const j = J.jugador;
    j.mira = entrada.mira;
    j.cdAtaque -= dt;
    j.golpe -= dt;
    j.invulnerable -= dt;
    j.cdDash -= dt;
    j.dash -= dt;

    // Cubrirse ocupa las manos: ni se ataca ni se corre, y se anda despacio.
    // Durante el impulso no hay guardia que valga.
    j.cubriendo = entrada.cubrir && j.dash <= 0;

    // --- movimiento del héroe ---
    let dx = entrada.dx, dy = entrada.dy;
    const n = Math.hypot(dx, dy);
    if (n > 0) {
        dx /= n; dy /= n;
        j.corriendo = entrada.correr && !j.cubriendo;
        const vel = j.vel * (j.cubriendo ? FACTOR_GUARDIA : j.corriendo ? FACTOR_CARRERA : 1);
        moverEntidad(j, dx * vel * dt, dy * vel * dt);
        j.andando = true;
    } else {
        j.andando = false;
        j.corriendo = false;
    }
    aplicarEmpuje(j, dt);

    // El aliento vuelve solo, sin descanso previo que haya que buscarse, pero
    // no siempre al mismo paso: el doble plantado que en marcha, y a cinco
    // veces con los pies en el elixir derramado -cure o no cure, que con la
    // vida llena el charco sigue siendo un respiro-. Pararse a tomar aire es
    // una decisión con precio -quieto se está a merced de lo que venga-, y el
    // charco es el único descanso de verdad, que además se agota solo.
    //
    // Manda el mayor de los dos y no el producto: quieto sobre un charco
    // repone a cinco, no a diez. Así cada número dice lo que promete y el
    // respiro no se dispara por juntarse con lo otro.
    //
    // Va aquí abajo, después de mover, porque es donde ya se sabe si este
    // fotograma se ha andado o no.
    const soplo = ESTAMINA_RITMO * Math.max(
        j.andando ? 1 : ESTAMINA_QUIETO,
        j.enCharco ? ESTAMINA_CURANDO : 1);
    j.estamina = Math.min(j.estaminaMax, j.estamina + soplo * dt);

    // por debajo de lo que cuesta una esquiva el héroe resuella, y calla en
    // cuanto vuelve a tener para una. Se le dice en cada fotograma: el propio
    // sonido sabe si ya estaba sonando y no se reinicia por que se lo repitan
    if (typeof sonarAgotado === 'function') sonarAgotado(j.estamina < COSTE_DASH);

    // sin aliento no hay esquiva ni tajo: la espera del dash sigue contando
    // aparte, y manda la que llegue más tarde de las dos
    if (entrada.dash && j.cdDash <= 0 && j.estamina >= COSTE_DASH) impulsar();
    if (entrada.atacar && !j.cubriendo && j.cdAtaque <= 0 && j.estamina >= COSTE_GOLPE) golpear();

    actualizarEnemigos(dt);
    actualizarCharcos(dt);
    actualizarOrbes(dt);
    abrirPuertaSiToca(dt);
}

// ============================================================
//  El seso de los adversarios
//
//  Tienen dos estados y nada más: de ronda y a por el héroe.
//
//  De ronda andan sus tramos y se paran a ratos, en vez de esperar
//  plantados a que alguien pase por delante. Una senda con doce bichos
//  quietos es un museo; con doce bichos que se mueven, se cruzan y se
//  paran, la misma sala ya no se recorre igual: no se sabe de antemano
//  quién va a estar dónde.
//
//  Y cuando van a por ti no van en línea recta contra las paredes: hay
//  un campo de distancias -un solo BFS desde el héroe, compartido por
//  todos- y cada uno lo baja como si fuera cuesta abajo, así que doblan
//  las esquinas y salen de las salas por donde se sale. Solo van derechos
//  cuando de verdad no hay nada en medio, que es cuando ir derecho es lo
//  natural. Antes se quedaban raspando el muro que los separaba de ti.
// ============================================================
// hasta dónde se da uno por enterado va en su ficha (bestias.js), que es de
// donde lo lee también el bestiario: no todos tienen por qué ver lo mismo
const MEMORIA_ENEMIGO = 3.5;      // segundos que sigue buscando después de perderte
const GOLPE_ENEMIGO = 0.25;       // lo que se le ve la pose de descargar el golpe
const PASO_RONDA = 0.5;           // lo que anda de ronda, sobre su paso de perseguir
const RONDA_RADIO = 9;            // lo más lejos que se busca el siguiente tramo
const RONDA_MINIMO = 2.5;         // y lo más cerca, para que el tramo valga la pena
const RONDA_ALTO = [0.4, 1.8];    // lo que se para al terminar uno
const RONDA_ATASCO = 1.2;         // sin acercarse a su destino, se busca otro

// El campo de distancias hasta el héroe. Es uno solo para todos los bichos y
// se rehace únicamente cuando el héroe cambia de casilla: perseguir a doce a
// la vez cuesta entonces lo mismo que perseguir a uno.
let campoHeroe = null;
let campoEn = -1;                 // la casilla desde la que está trazado

function olvidarCampo() { campoHeroe = null; campoEn = -1; }

function campoHastaHeroe() {
    const cx = Math.floor(J.jugador.x), cy = Math.floor(J.jugador.y);
    const clave = cy * ANCHO + cx;
    if (clave === campoEn) return campoHeroe;
    if (esMuro(cx, cy)) return campoHeroe;         // empotrado en la roca: vale el de antes
    campoHeroe = distanciasDesde(cx, cy);
    campoEn = clave;
    return campoHeroe;
}

// ¿Se ven dos puntos sin roca de por medio? Se va probando la recta que los
// une a tres muestras por casilla: no es un trazado exacto, pero para decidir
// si se va derecho o se dobla la esquina sobra, y cuesta casi nada.
function hayVision(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    const pasos = Math.ceil(Math.hypot(dx, dy) * 3);
    for (let i = 1; i < pasos; i++) {
        const t = i / pasos;
        if (esMuro(Math.floor(x0 + dx * t), Math.floor(y0 + dy * t))) return false;
    }
    return true;
}

// Lo que hay que apartarse de los demás para no acabar todos en el mismo
// punto. Se usa igual persiguiendo que de ronda.
function separacionEnemigos(e) {
    let sx = 0, sy = 0;
    for (const o of J.enemigos) {
        if (o === e) continue;
        const ox = e.x - o.x, oy = e.y - o.y;
        const od = Math.hypot(ox, oy);
        if (od > 0 && od < e.r + o.r + 0.2) { sx += ox / od * 0.9; sy += oy / od * 0.9; }
    }
    return [sx, sy];
}

// Hacia dónde tirar para llegar al héroe. Con el camino despejado, derecho a
// él; si no, a la casilla vecina que menos pasos deje, que es lo que hace que
// rodeen los muros en vez de empujarlos.
function rumboAlHeroe(e) {
    const j = J.jugador;
    if (hayVision(e.x, e.y, j.x, j.y)) return [j.x - e.x, j.y - e.y];

    const campo = campoHastaHeroe();
    if (!campo) return [j.x - e.x, j.y - e.y];

    const cx = Math.floor(e.x), cy = Math.floor(e.y);
    let mejor = campo[cy * ANCHO + cx], bx = -1, by = -1;
    for (let ny = cy - 1; ny <= cy + 1; ny++)
        for (let nx = cx - 1; nx <= cx + 1; nx++) {
            if ((nx === cx && ny === cy) || esMuro(nx, ny)) continue;
            // en diagonal no se cortan esquinas: los dos lados han de estar libres
            if (nx !== cx && ny !== cy && (esMuro(nx, cy) || esMuro(cx, ny))) continue;
            const d = campo[ny * ANCHO + nx];
            if (d < 0 || (mejor >= 0 && d >= mejor)) continue;   // -1 = allí no se llega
            mejor = d; bx = nx; by = ny;
        }
    // ninguna vecina mejora: se tira derecho, que es lo único que queda
    if (bx < 0) return [j.x - e.x, j.y - e.y];
    return [bx + 0.5 - e.x, by + 0.5 - e.y];
}

// El siguiente tramo de ronda: cerca, libre y a la vista desde donde se está,
// para que se pueda andar de una tirada sin acabar de morros contra una
// esquina. Si tras unos cuantos tanteos no sale ninguno, se queda parado y
// vuelve a probar al rato: mejor eso que empeñarse en un sitio imposible.
function tramoDeRonda(e) {
    for (let i = 0; i < 12; i++) {
        const a = azar(0, 6.2832), r = azar(RONDA_MINIMO, RONDA_RADIO);
        const x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r;
        if (!libre(x, y, e.r + 0.1)) continue;
        if (!hayVision(e.x, e.y, x, y)) continue;
        return { x, y, resto: Math.hypot(x - e.x, y - e.y), sinAvanzar: 0 };
    }
    return null;
}

// La ronda de uno que no tiene a nadie a quien ir a buscar.
function rondar(e, dt) {
    if (e.alto > 0) { e.alto -= dt; return; }       // parado al final del tramo
    if (!e.ronda) {
        e.ronda = tramoDeRonda(e);
        if (!e.ronda) { e.alto = azar(0.5, 1.2); return; }
    }

    const vx = e.ronda.x - e.x, vy = e.ronda.y - e.y;
    const d = Math.hypot(vx, vy);
    // llegado, o atascado contra algo que no estaba previsto: tramo nuevo
    if (d < 0.45 || e.ronda.sinAvanzar > RONDA_ATASCO) {
        e.ronda = null;
        e.alto = azar(RONDA_ALTO[0], RONDA_ALTO[1]);
        return;
    }
    // se cuenta el tiempo que lleva sin recortar camino, no el que lleva
    // andando: quien avanza aunque sea despacio no está atascado
    if (d < e.ronda.resto - 0.05) { e.ronda.resto = d; e.ronda.sinAvanzar = 0; }
    else e.ronda.sinAvanzar += dt;

    const [sx, sy] = separacionEnemigos(e);
    const mx = vx / d + sx, my = vy / d + sy;
    const m = Math.hypot(mx, my) || 1;
    const paso = e.vel * PASO_RONDA;
    moverEntidad(e, mx / m * paso * dt, my / m * paso * dt);
    e.mira = Math.atan2(my, mx);
}

// Lo que de verdad ha andado, que no es lo que quería andar: contra un muro se
// empuja y no se avanza, y midiendo el avance real el paso no patina ni se
// mueven las patas de quien está clavado. Se mira al empezar la vuelta, así que
// cuenta lo de la vuelta anterior: un fotograma de retraso que no se ve.
function apuntarPaso(e, dt) {
    const andado = Math.hypot(e.x - e.antes.x, e.y - e.antes.y);
    e.andado += andado;
    e.andando = andado > dt * 0.2;      // que a uno lo empujen no es que ande
    e.antes.x = e.x; e.antes.y = e.y;
}

function actualizarEnemigos(dt) {
    const j = J.jugador;
    const campo = campoHastaHeroe();

    for (const e of J.enemigos) {
        apuntarPaso(e, dt);
        e.cd -= dt;
        e.herido -= dt;
        e.golpe -= dt;
        e.alerta -= dt;
        aplicarEmpuje(e, dt);

        // Se cuenta por pasos de camino y no a vuelo de pájaro: al otro lado
        // de un muro se puede estar a tres casillas y a cuarenta de camino, y
        // entonces no hay nada de que enterarse. Un tajo despierta igual,
        // venga de donde venga: a quien le pegan, mira.
        const paso = campo ? campo[Math.floor(e.y) * ANCHO + Math.floor(e.x)] : -1;
        if ((paso >= 0 && paso <= e.vista) || e.herido > 0) e.alerta = MEMORIA_ENEMIGO;

        if (e.alerta <= 0) { rondar(e, dt); continue; }

        // a por él: en cuanto se alerta, la ronda que llevara ya no vale
        e.ronda = null;
        e.alto = 0;

        const vx = j.x - e.x, vy = j.y - e.y;
        const d = Math.hypot(vx, vy) || 1e-6;
        e.mira = Math.atan2(vy, vx);

        if (d > e.alcance + j.r) {
            const [rx, ry] = rumboAlHeroe(e);
            const rd = Math.hypot(rx, ry) || 1;
            const [sx, sy] = separacionEnemigos(e);
            const mx = rx / rd + sx, my = ry / rd + sy;
            const m = Math.hypot(mx, my) || 1;
            moverEntidad(e, mx / m * e.vel * dt, my / m * e.vel * dt);
        } else if (e.cd <= 0) {
            e.cd = e.cadencia;
            // la pose se enciende aunque el golpe no entre: lo ha tirado
            // igual, y verlo venir es lo que da margen a cubrirse
            e.golpe = GOLPE_ENEMIGO;
            danarJugador(e);
        }
    }
}
// El sello cede cuando no queda nada vivo en la senda. Las hojas tardan un
// momento en separarse: hasta que no acaban, la puerta no deja pasar.
function abrirPuertaSiToca(dt) {
    if (J.enemigos.length) return;
    if (J.puerta.apertura === 0) {
        mensaje(TR('msg.selloRoto'));
        if (typeof sonarAbrirPuerta === 'function') sonarAbrirPuerta();
        chispas(J.puerta.x, J.puerta.y, '#a8dcff', 18);
    }
    J.puerta.apertura = Math.min(1, J.puerta.apertura + dt * VEL_PUERTA);
}

function aplicarEmpuje(e, dt) {
    if (!e.ex && !e.ey) return;
    moverEntidad(e, e.ex * dt, e.ey * dt);
    const freno = Math.max(0, 1 - dt * 9);
    e.ex *= freno;
    e.ey *= freno;
    if (Math.abs(e.ex) < 0.01) e.ex = 0;
    if (Math.abs(e.ey) < 0.01) e.ey = 0;
}

// Golpe de espada: un arco por delante del héroe, no una casilla
function golpear() {
    const j = J.jugador;
    j.estamina -= COSTE_GOLPE;
    j.cdAtaque = j.cadencia;
    j.golpe = 0.18;

    // el acero suena al salir, dé o no dé: es el gesto lo que se oye, y un
    // tajo al aire que callara se sentiría como que no ha llegado a salir
    if (typeof sonarAtaque === 'function') sonarAtaque(j.armaId);

    // el mismo arco rompe las botellas que pille de paso: no hay que apuntarlas
    // aparte ni pulsar otra tecla, basta con dar un tajo donde están
    for (const o of J.objetos.slice()) {
        const dx = o.x - j.x, dy = o.y - j.y;
        const d = Math.hypot(dx, dy);
        if (d > j.alcance + o.r) continue;
        // a quemarropa el objeto ocupa un cono más ancho que su propio radio
        // visto desde el héroe: por debajo de ese cono, tocarlo ya basta
        if (Math.abs(difAngulo(Math.atan2(dy, dx), j.mira)) > j.arco + Math.atan2(o.r + j.r, d)) continue;
        romperBotella(o);
    }

    for (const e of J.enemigos.slice()) {
        const dx = e.x - j.x, dy = e.y - j.y;
        const d = Math.hypot(dx, dy);
        if (d > j.alcance + e.r) continue;
        // mismo margen que con las botellas: cuanto más pegado el enemigo,
        // más ancho es el cono que en verdad barre el arma, sea cual sea
        if (Math.abs(difAngulo(Math.atan2(dy, dx), j.mira)) > j.arco + Math.atan2(e.r + j.r, d)) continue;

        // el arma pega lo que dice su ficha, ni más ni menos: lo que se lee en
        // la armería es lo que se ve salir del enemigo
        const dano = j.dano;
        e.hp -= dano;
        e.herido = 0.25;
        e.ex += dx / (d || 1) * 6;
        e.ey += dy / (d || 1) * 6;
        chispas(e.x, e.y, '#c04040', 6);
        numero(e.x, e.y, dano, '#00e5ff');   // daño que hace el jugador: cian

        if (e.hp <= 0) {
            J.enemigos = J.enemigos.filter(o => o !== e);
            chispas(e.x, e.y, '#803030', 14);
            // cada caído suelta su orbe, que sale despedido y luego vuela al héroe
            soltarOrbes(e.x, e.y, 1);
            // y queda apuntado en el bestiario de la ranura, que no espera a
            // cruzar la puerta: lo aprendido no es botín y no se pierde al caer
            if (typeof Bestiario !== 'undefined') Bestiario.anotarCaido(e.tipo);
            mensaje(TR('msg.muere', sujeto(e)));
        }
    }
}

// Impulso hacia donde se mira: aprovecha el empuje, que ya frena y choca solo
function impulsar() {
    const j = J.jugador;
    j.estamina -= COSTE_DASH;
    j.cdDash = ESPERA_DASH;
    j.dash = DURACION_DASH;
    j.invulnerable = Math.max(j.invulnerable, DURACION_DASH + 0.04);
    j.ex += Math.cos(j.mira) * FUERZA_DASH;
    j.ey += Math.sin(j.mira) * FUERZA_DASH;
    chispas(j.x, j.y, '#8fa8d8', 8);
}

function danarJugador(e) {
    const j = J.jugador;
    // el modo inmortal de la consola: los golpes ni se sienten
    if (j.inmortal || j.invulnerable > 0) return;

    // el golpe quita lo que dice la ficha del bicho, sin sorteo: así se sabe
    // cuántos aguanta uno y cuántos más si se cubre
    let dano = e.dano;
    // el escudo solo para lo que viene de frente
    const deFrente = Math.abs(difAngulo(Math.atan2(e.y - j.y, e.x - j.x), j.mira)) < ARCO_GUARDIA;
    const parado = j.cubriendo && deFrente;
    if (parado) dano = Math.max(1, Math.round(dano * REDUCCION_GUARDIA));

    j.hp -= dano;
    j.invulnerable = 0.35;
    const dx = j.x - e.x, dy = j.y - e.y, d = Math.hypot(dx, dy) || 1;
    const retroceso = parado ? 2 : 4;
    j.ex += dx / d * retroceso;
    j.ey += dy / d * retroceso;

    if (parado) {
        chispas(j.x + Math.cos(j.mira) * 0.4, j.y + Math.sin(j.mira) * 0.4, '#d8dcf0', 8);
        numero(j.x, j.y, dano, '#9aa0a6');   // parado con escudo: gris
    } else {
        numero(j.x, j.y, dano, '#ff3b30');   // golpe enemigo directo: rojo
    }
    comprobarCaida(e);
}

// Un solo sitio decide que el héroe ha caído, venga el golpe de quien venga.
// Quien lo dé se le pasa cuando lo hay -del hierro del suelo no hay a quién
// apuntarle la muerte-, y es lo único para lo que se mira: el bestiario lleva
// la cuenta de cuántas veces te ha tumbado cada bicho.
function comprobarCaida(culpable) {
    const j = J.jugador;
    if (j.hp > 0) return;
    j.hp = 0;
    j.cubriendo = j.corriendo = false;
    J.muerto = true;
    if (culpable && typeof Bestiario !== 'undefined') Bestiario.anotarCaida(culpable.tipo);
    perderBotin();
    mensaje(TR('msg.hasMuerto'));
}

// diferencia entre dos ángulos, siempre en [-PI, PI]
function difAngulo(a, b) {
    let d = (a - b) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
}

const cercaDePuerta = () =>
    Math.hypot(J.puerta.x - J.jugador.x, J.puerta.y - J.jugador.y) < 0.9;

const puertaAbierta = () => J.puerta.apertura >= 1;

function cruzar() {
    if (J.muerto || !cercaDePuerta()) return false;
    if (!puertaAbierta()) {
        const n = J.enemigos.length;
        // el singular va aparte porque no todas las lenguas lo resuelven
        // metiendo el número y una ese: hay que dejar escribir la frase entera
        mensaje(!n ? TR('msg.puertaAbriendo')
               : n === 1 ? TR('msg.puertaSellada1')
               : TR('msg.puertaSellada', n));
        return false;
    }

    // suena el umbral: solo aquí, cuando ya no hay vuelta atrás
    if (typeof sonarCruzarPuerta === 'function') sonarCruzarPuerta();

    // Los orbes que todavía venían por el aire cruzan contigo: haberlos
    // ganado ya los tenías, y perderlos por no esperarlos quieto delante de
    // la puerta sería castigar la prisa. No se mudan tal cual, eso sí: sus
    // coordenadas son las de la senda que se deja atrás, y en la de al lado
    // caerían en cualquier parte, hasta dentro de la roca. Se apunta cuántos
    // eran y se sueltan de nuevo junto al héroe, ya en su entrada.
    const enVuelo = J.orbesSueltos.length;
    J.orbesSueltos = [];

    // la última puerta no lleva a otra senda: detrás está el final del camino.
    // Quien la cruza se lleva lo juntado y sale del santuario por arriba.
    if (typeof Biomas !== 'undefined' && Biomas.ultima(J.nivel)) {
        // aquí no hay senda al otro lado donde volver a soltarlos, así que
        // los que volaban se cobran en el sitio antes de cerrar la cuenta
        if (enVuelo) premiarOrbes(enVuelo);
        asentarBotin();
        apuntarFinal();
        J.completado = true;
        mensaje(TR('msg.ultimoUmbral'));
        return true;
    }

    J.nivel++;
    apuntarHondura();
    // el umbral paga a cara o cruz, y solo en jade: los orbes azules los dejan
    // los enemigos al caer
    const jade = Math.random() < 0.5;
    if (jade) {
        premiar(1);
        mensaje(TR('msg.jade'));
    }
    asentarBotin();
    nuevoNivel();

    // Cruzar el umbral se cobra el cansancio: al otro lado se entra con el
    // fuelle entero. La vida no, que esa es la cuenta que hay que cuidar de
    // senda en senda; el aliento solo mide el ritmo de una pelea, y arrastrarlo
    // agotado a una senda nueva castigaría por haber ganado la anterior.
    J.jugador.estamina = J.jugador.estaminaMax;
    if (typeof sonarAgotado === 'function') sonarAgotado(false);

    // esto va después de la mudanza: nuevoNivel lo limpia todo y planta al
    // héroe en la senda siguiente, que es donde debe verse
    if (jade) esquirlaGanada(J.jugador.x, J.jugador.y);
    // y los rezagados entran detrás de él, como si hubieran pasado la puerta
    if (enVuelo) soltarOrbes(J.jugador.x, J.jugador.y, enVuelo);
    return true;
}

// ============================================================
//  La botella y su charco
//
//  La botella salta de un solo tajo -aguantar golpes la volvería un
//  enemigo más, y no lo es- y lo que llevaba dentro cae al suelo.
//
//  El charco tiene dos cuerpos distintos a propósito: para la partida
//  es un círculo limpio, porque saber si pisas o no pisas no puede
//  depender de un contorno caprichoso; para la vista es una mancha
//  irregular trazada por código, que se sortea aquí una vez -al
//  derramarse- y viaja con el charco, de modo que ni dos charcos son
//  iguales ni el mismo tiembla de un fotograma a otro.
// ============================================================
function romperBotella(o) {
    if (o.roto) return;          // dos filos en el mismo tajo no la rompen dos veces
    o.roto = true;
    J.objetos = J.objetos.filter(p => p !== o);

    if (typeof sonarCristal === 'function') sonarCristal();
    chispas(o.x, o.y, '#ffd8e6', 14);    // los vidrios
    chispas(o.x, o.y, '#e04f7a', 10);    // y lo que llevaban
    mensaje(TR('msg.botella'));

    J.charcos.push({
        x: o.x, y: o.y,
        r: CHARCO_RADIO,
        t: 0,                    // lo que lleva derramado
        queda: CHARCO_CURA,      // PV que aún puede dar
        secando: 0,              // 0 mientras sirve; sube al agotarse
        forma: formaDeCharco(),
        giro: azar(0, 6.2832)
    });
}

// El contorno de la mancha: un puñado de radios sorteados alrededor del
// centro. Se guardan como números y no como trazado para poder estirarlos
// al secarse sin volver a sortear nada.
function formaDeCharco() {
    const puntas = azarEnt(7, 10);
    const radios = [];
    for (let i = 0; i < puntas; i++) radios.push(azar(0.62, 1.12));
    // se liman los saltos entre vecinos: sin esto salen estrellas de mar,
    // y lo que se derrama no pincha, se extiende
    for (let v = 0; v < 2; v++)
        for (let i = 0; i < puntas; i++) {
            const a = radios[(i - 1 + puntas) % puntas], b = radios[(i + 1) % puntas];
            radios[i] = radios[i] * 0.6 + (a + b) * 0.2;
        }
    return radios;
}

function actualizarCharcos(dt) {
    const j = J.jugador;
    // dos cosas distintas, y hacía falta separarlas: pisar el charco no es lo
    // mismo que beber de él. Con la vida llena no hay nada que curar, pero el
    // héroe sigue teniendo los pies en el elixir y el fuelle lo agradece igual
    let bebiendo = false;      // está curando: manda en el sonido
    let enCharco = false;      // está encima: manda en el aliento
    for (const c of J.charcos.slice()) {
        if (c.secando > 0) {
            c.secando += dt;
            if (c.secando > CHARCO_SECADO) J.charcos = J.charcos.filter(p => p !== c);
            continue;
        }

        c.t += dt;
        // encima de verdad: cuenta el centro del héroe, no rozarlo con el hombro
        const encima = Math.hypot(c.x - j.x, c.y - j.y) < c.r;
        if (encima) enCharco = true;
        if (encima && j.hp < j.hpMax) {
            const cura = Math.min(CHARCO_RITMO * dt, c.queda, j.hpMax - j.hp);
            j.hp += cura;
            c.queda -= cura;
            c.bebido = (c.bebido || 0) + cura;
            bebiendo = true;
        }

        // el registro se entera al final y de una vez: contarlo mientras se
        // bebe llenaría diez líneas con el mismo aviso, y la barra de vida ya
        // está diciendo lo que pasa mucho mejor que cualquier renglón
        if (c.t >= CHARCO_VIDA || c.queda <= 0.001) {
            c.secando = 0.0001;
            const total = Math.round(c.bebido || 0);
            mensaje(!total ? TR('msg.charcoSeco')
                   : c.queda <= 0.001 ? TR('msg.charcoApurado', total)
                   : TR('msg.charcoResto', total));
        }
    }

    // queda apuntado en el héroe porque el aliento lo mira: pisar el elixir
    // repone el fuelle bastante más deprisa, tenga o no vida que reponer.
    // Esto se resuelve después de la cuenta del aliento, así que allí se lee
    // el de este instante con un fotograma de retraso; para un goteo continuo
    // eso no se nota, y adelantar los charcos cambiaría el orden en que curan
    // y muerden los enemigos, que sí importa
    j.enCharco = enCharco;

    // el sonido de beber se enciende y se apaga aquí, y no al pisar el charco:
    // así calla solo cuando deja de curar, sea porque te apartas, porque el
    // charco se agota o porque ya no te falta vida que reponer
    if (typeof sonarCurando === 'function') sonarCurando(bebiendo);
}

// ---------- Efectos decorativos ----------
function chispas(x, y, color, cuantas) {
    for (let i = 0; i < cuantas; i++) {
        const a = azar(0, Math.PI * 2), v = azar(1.5, 5);
        J.efectos.push({ tipo: 'chispa', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
                         vida: azar(0.25, 0.5), t: 0, color });
    }
}

// la esquirla de jade ganada en el umbral: sube girando delante del héroe
// mientras se apaga. Los orbes azules tienen lo suyo, más abajo.
const JADE_CARA = '#2f7a76', JADE_LUZ = '#7fd6c4';

function esquirlaGanada(x, y) {
    J.efectos.push({ tipo: 'esquirla', x, y: y - 0.5, vy: -0.75, vida: 1.5, t: 0,
                     giro: azar(-0.4, 0.4), cara: JADE_CARA, luz: JADE_LUZ });
    chispas(x, y - 0.5, JADE_LUZ, 10);
    numero(x, y - 1.35, '+1', JADE_LUZ);
}

// ============================================================
//  Orbes azules: lo que suelta cada caído. Salen despedidos del cuerpo,
//  se quedan un instante flotando y entonces el héroe tira de ellos
//  hasta metérselos dentro. No chocan con la roca -son luz, no piedra-,
//  así que ninguno se queda trabado al otro lado de un muro.
// ============================================================
const ORBE_CARA = '#24468f', ORBE_LUZ = '#6b9cf2', ORBE_NUCLEO = '#a8c4ff';

const ORBE_ESTALLIDO = 0.34;   // lo que sale despedido antes de volverse
const ORBE_ARRANQUE = 4;       // a qué velocidad emprende la vuelta
const ORBE_TIRON = 34;         // y cuánto gana por segundo de camino
const ORBE_TOPE = 16;          // sin pasar de aquí, que si no ni se ve
const ORBE_DENTRO = 0.45;      // a esta distancia se da por recogido

function soltarOrbes(x, y, cuantos) {
    for (let i = 0; i < cuantos; i++) {
        const a = azar(0, Math.PI * 2), v = azar(3, 6);
        J.orbesSueltos.push({
            x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0,
            vel: ORBE_ARRANQUE,
            // no se vuelven todos a la vez: así llegan en fila y no en bloque
            espera: ORBE_ESTALLIDO + azar(0, 0.2),
            fase: azar(0, Math.PI * 2)          // cada uno con su propio latido
        });
    }
}

function actualizarOrbes(dt) {
    const j = J.jugador;
    for (const o of J.orbesSueltos.slice()) {
        o.t += dt;

        // primero sale despedido del cuerpo, frenando hasta quedarse quieto
        if (o.t < o.espera) {
            const freno = Math.max(0, 1 - dt * 5);
            o.vx *= freno;
            o.vy *= freno;
            o.x += o.vx * dt;
            o.y += o.vy * dt;
            continue;
        }

        // y desde que se vuelve va derecho, sin inercia ninguna: se apunta al
        // héroe cada cuadro y anda lo que puede en esa línea. Antes acumulaba
        // velocidad y eso le hacía pasarse de largo y ponerse a dar vueltas;
        // así la distancia solo baja, y siempre acaba entrando.
        const dx = j.x - o.x, dy = j.y - o.y;
        const d = Math.hypot(dx, dy) || 1e-6;
        if (d < ORBE_DENTRO) { recogerOrbe(o); continue; }

        o.vel = Math.min(ORBE_TOPE, o.vel + ORBE_TIRON * dt);
        const paso = Math.min(d, o.vel * dt);
        o.x += dx / d * paso;
        o.y += dy / d * paso;
        // la estela lee vx/vy: aquí son la línea que acaba de seguir
        o.vx = dx / d * o.vel;
        o.vy = dy / d * o.vel;
    }
}

// entrar en el héroe es lo que cuenta: mientras vuela, el orbe no es de nadie
function recogerOrbe(o) {
    J.orbesSueltos = J.orbesSueltos.filter(p => p !== o);
    premiarOrbes(1);
    chispas(o.x, o.y, ORBE_NUCLEO, 6);
    J.efectos.push({ tipo: 'destelloOrbe', x: o.x, y: o.y, vida: 0.32, t: 0 });
    if (typeof sonarOrbe === 'function') sonarOrbe();
}

function numero(x, y, valor, color) {
    J.efectos.push({ tipo: 'numero', x, y: y - 0.3, vy: -1.1, vida: 0.7, t: 0,
                     texto: String(valor), color });
}

function actualizarEfectos(dt) {
    for (const f of J.efectos) {
        f.t += dt;
        f.x += (f.vx || 0) * dt;
        f.y += (f.vy || 0) * dt;
        if (f.tipo === 'chispa') { f.vx *= 0.92; f.vy *= 0.92; }
    }
    J.efectos = J.efectos.filter(f => f.t < f.vida);
}

// ---------- Arranque ----------

// La armería vive en prev.html; si se entra directo a la partida no está
// cargada, y entonces el héroe sale con el tantō de serie.

// Lo que se junta se apunta primero en la cuenta de la senda; el HUD lee de
// aquí, no del almacén
function premiar(esquirlas) {
    J.esquirlas += esquirlas;
    J.pendiente.jade += esquirlas;
}

function premiarOrbes(cuantos) {
    J.orbes += cuantos;
    J.pendiente.orbes += cuantos;
}

// la senda más honda a la que ha llegado esta ranura queda apuntada en ella:
// es lo que enseña la sala de los registros, y solo sube, nunca baja
function apuntarHondura() {
    if (typeof Partidas === 'undefined') return;
    if (J.nivel > (Partidas.actual().hondo || 1)) Partidas.guardarActual({ hondo: J.nivel });
}

// haber llegado al final queda escrito en la ranura, para siempre
function apuntarFinal() {
    if (typeof Partidas === 'undefined') return;
    Partidas.guardarActual({ hondo: J.nivel, completado: true });
}

// cruzar la puerta es lo que hace tuyo el botín de la senda: hasta entonces no
// se escribe nada en la ranura
function asentarBotin() {
    if (typeof Forja !== 'undefined' && J.pendiente.jade) Forja.premiar(J.pendiente.jade);
    if (typeof Personaje !== 'undefined' && J.pendiente.orbes) Personaje.premiar(J.pendiente.orbes);
    J.pendiente.jade = J.pendiente.orbes = 0;
}

// y morir lo deja todo en el suelo de la senda
function perderBotin() {
    const jade = J.pendiente.jade, orbes = J.pendiente.orbes;
    J.esquirlas -= jade;
    J.orbes -= orbes;
    J.pendiente.jade = J.pendiente.orbes = 0;
    J.perdido = { jade, orbes };
    // los que aún volaban se apagan con él: nunca llegaron a ser suyos
    J.orbesSueltos = [];
    if (jade || orbes) mensaje(TR('msg.botinPerdido', jade, orbes));
}

function equiparArma(j) {
    if (typeof Forja === 'undefined') { j.armaId = 'tanto'; J.arma = 'tanto'; return; }
    const arma = Forja.equipada();
    j.armaId = arma.id;
    j.dano = arma.dano;
    j.alcance = arma.alcance;
    j.arco = arma.arco;
    j.cadencia = arma.cadencia;
    J.arma = arma.nombre + (arma.nivel ? ` +${arma.nivel}` : '');
}

// las mejoras del personaje van sobre el arma ya equipada: el daño suma al
// que traiga el acero, y la vida y la energía estiran sus barras antes de llenarlas
function aplicarMejoras(j) {
    if (typeof Personaje === 'undefined') return;
    j.hpMax += Personaje.vida();
    j.hp = j.hpMax;
    j.estaminaMax += Personaje.energia();
    j.estamina = j.estaminaMax;
    j.dano += Personaje.dano();
}

function iniciarPartida() {
    J.jugador = {
        x: 0, y: 0, r: 0.30, vel: 4.6,
        hp: 50, hpMax: 50, dano: 7,
        estamina: ESTAMINA_BASE, estaminaMax: ESTAMINA_BASE,
        alcance: 1.25, arco: 1.0, cadencia: 0.40,
        cdAtaque: 0, golpe: 0, invulnerable: 0,
        cubriendo: false, corriendo: false, enCharco: false, dash: 0, cdDash: 0,
        ex: 0, ey: 0, mira: 0, andando: false, nombre: 'héroe'
    };
    equiparArma(J.jugador);
    aplicarMejoras(J.jugador);
    J.esquirlas = (typeof Forja !== 'undefined') ? Forja.esquirlas() : 0;
    J.orbes = (typeof Personaje !== 'undefined') ? Personaje.orbes() : 0;
    J.pendiente = { jade: 0, orbes: 0 };
    J.perdido = { jade: 0, orbes: 0 };
    // la ranura puede venir marcada como inmortal desde la consola
    J.jugador.inmortal = !!(typeof Partidas !== 'undefined' && Partidas.actual().god);
    // la ranura guarda el acero y el jade, no el camino: siempre se entra por
    // la primera senda
    J.nivel = 1;
    J.log = [];
    J.muerto = false;
    J.completado = false;
    J.tiempo = 0;
    // las listas de la senda no se tocan aquí: nuevoNivel las deja vacías
    mensaje(TR('msg.portal'));
    nuevoNivel();
}
