// ============================================================
//  mazmorra.js - lógica del juego en tiempo real (sin dibujado)
//  Las cuevas se generan con un autómata celular: nada de salas
//  rectangulares. Las entidades se mueven en coordenadas
//  continuas (casillas con decimales), no de casilla en casilla.
// ============================================================

const ANCHO = 64, ALTO = 48;

// Maniobras del héroe
const FACTOR_CARRERA = 1.55;      // lo que acelera Shift
const FACTOR_GUARDIA = 0.45;      // lo que frena ir cubierto
const REDUCCION_GUARDIA = 0.5;    // mitad de daño al parar de frente
const ARCO_GUARDIA = 1.3;         // radianes a cada lado que abarca el escudo
const FUERZA_DASH = 19;           // impulso del salto lateral
const ESPERA_DASH = 0.9;          // segundos hasta poder repetirlo
const DURACION_DASH = 0.18;

// Lo que el héroe alcanza a ver y recuerda. Algo menos que RADIO_LUZ, la
// antorcha que dibuja la vista, para que el minimapa no se adelante a los ojos.
const RADIO_VISION = 8.5;

const VEL_PUERTA = 1.4;           // lo que tardan en separarse las hojas

const J = {
  mapa: [],            // 1 = roca, 0 = suelo
  jugador: null,
  enemigos: [],
  objetos: [],
  efectos: [],         // chispas y números de daño, solo decorativos
  explorado: null,     // 1 = casilla ya vista; lo que recuerda el minimapa
  puerta: { x: 0, y: 0, apertura: 0 },   // apertura: 0 cerrada, 1 abierta del todo
  nivel: 1,
  log: [],
  muerto: false,
  tiempo: 0
};

const azar = (min, max) => Math.random() * (max - min) + min;
const azarEnt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function mensaje(texto) {
  J.log.push(texto);
  if (J.log.length > 60) J.log.shift();
}

const sujeto = e => `${e.art === 'el' ? 'El' : 'La'} ${e.nombre}`;

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

// Marca como vista la redonda de casillas alrededor del héroe. No hay línea
// de visión: lo que queda cerca se da por conocido, aunque medie una pared.
function descubrir() {
  const j = J.jugador;
  const r = Math.ceil(RADIO_VISION);
  const y0 = Math.max(0, Math.floor(j.y - r)), y1 = Math.min(ALTO - 1, Math.floor(j.y + r));
  const x0 = Math.max(0, Math.floor(j.x - r)), x1 = Math.min(ANCHO - 1, Math.floor(j.x + r));
  for (let cy = y0; cy <= y1; cy++)
    for (let cx = x0; cx <= x1; cx++)
      if (Math.hypot(cx + 0.5 - j.x, cy + 0.5 - j.y) <= RADIO_VISION)
        J.explorado[cy * ANCHO + cx] = 1;
}

// ============================================================
//  Generación de cuevas
// ============================================================
function generarCueva() {
  for (let intento = 0; intento < 12; intento++) {
    let m = [];
    for (let y = 0; y < ALTO; y++) {
      const fila = [];
      for (let x = 0; x < ANCHO; x++) {
        const borde = x < 2 || y < 2 || x >= ANCHO - 2 || y >= ALTO - 2;
        fila.push(borde || Math.random() < 0.45 ? 1 : 0);
      }
      m.push(fila);
    }

    for (let paso = 0; paso < 5; paso++) m = suavizarCueva(m);

    J.mapa = m;
    const region = mayorRegion(m);
    if (region.length > ANCHO * ALTO * 0.18) {
      // todo lo que no sea la cueva principal pasa a ser roca maciza
      const dentro = new Set(region.map(([x, y]) => y * ANCHO + x));
      for (let y = 0; y < ALTO; y++)
        for (let x = 0; x < ANCHO; x++)
          if (!dentro.has(y * ANCHO + x)) m[y][x] = 1;
      J.mapa = m;
      return region;
    }
  }
  return mayorRegion(J.mapa);   // salida de emergencia: lo mejor que haya
}

// Regla clásica: la roca crece donde hay roca alrededor, y se disuelve donde no.
function suavizarCueva(m) {
  const n = [];
  for (let y = 0; y < ALTO; y++) {
    const fila = [];
    for (let x = 0; x < ANCHO; x++) {
      let vecinos = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= ANCHO || ny >= ALTO) { vecinos++; continue; }
          vecinos += m[ny][nx];
        }
      const borde = x < 2 || y < 2 || x >= ANCHO - 2 || y >= ALTO - 2;
      fila.push(borde ? 1 : (vecinos > 4 ? 1 : (vecinos < 4 ? 0 : m[y][x])));
    }
    n.push(fila);
  }
  return n;
}

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
  const region = generarCueva();

  // el héroe empieza en un hueco amplio, no pegado a la roca
  const holgadas = region.filter(([x, y]) => libre(x + 0.5, y + 0.5, 0.75));
  const [ix, iy] = (holgadas.length ? holgadas : region)[azarEnt(0, (holgadas.length ? holgadas : region).length - 1)];
  J.jugador.x = ix + 0.5;
  J.jugador.y = iy + 0.5;

  // la puerta, en el punto más lejano por recorrido
  const dist = distanciasDesde(ix, iy);
  let lejos = [ix, iy], maxD = 0;
  for (const [x, y] of region) {
    const d = dist[y * ANCHO + x];
    if (d > maxD) { maxD = d; lejos = [x, y]; }
  }
  J.puerta = { x: lejos[0] + 0.5, y: lejos[1] + 0.5, apertura: 0 };

  J.enemigos = [];
  J.objetos = [];
  J.efectos = [];
  J.explorado = new Uint8Array(ANCHO * ALTO);
  descubrir();

  // ni bichos ni pociones encima de la puerta: hay que poder verla y cruzarla
  const candidatas = region.filter(([x, y]) => {
    const d = dist[y * ANCHO + x];
    return d > 10 && libre(x + 0.5, y + 0.5, 0.6) &&
           Math.hypot(x + 0.5 - J.puerta.x, y + 0.5 - J.puerta.y) > 2;
  });
  const coger = () => candidatas.length
    ? candidatas.splice(azarEnt(0, candidatas.length - 1), 1)[0]
    : null;

  const cuantos = 6 + J.nivel * 2;
  for (let i = 0; i < cuantos; i++) {
    const p = coger();
    if (p) J.enemigos.push(crearEnemigo(p[0] + 0.5, p[1] + 0.5));
  }
  for (let i = 0; i < 3; i++) {
    const p = coger();
    if (p) J.objetos.push({ x: p[0] + 0.5, y: p[1] + 0.5, tipo: 'pocion', r: 0.35, giro: azar(0, 6.28) });
  }

  mensaje(`--- Nivel ${J.nivel} de la mazmorra ---`);
}

function crearEnemigo(x, y) {
  const duro = Math.random() < Math.min(0.15 + J.nivel * 0.08, 0.6);
  const base = { x, y, ex: 0, ey: 0, cd: azar(0, 1), herido: 0, mira: 0 };
  return duro
    ? { ...base, tipo: 'trol', art: 'el', nombre: 'trol', r: 0.38, vel: 2.1,
        hp: 16, hpMax: 16, dano: 7, alcance: 0.85, cadencia: 1.3, exp: 14 }
    : { ...base, tipo: 'rata', art: 'la', nombre: 'rata', r: 0.26, vel: 3.3,
        hp: 6, hpMax: 6, dano: 3, alcance: 0.6, cadencia: 0.9, exp: 5 };
}

// ============================================================
//  Bucle de juego
// ============================================================
// entrada: { dx, dy, mira (radianes), atacar, cubrir, correr, dash }
function actualizar(dt, entrada) {
  J.tiempo += dt;
  actualizarEfectos(dt);
  if (J.muerto) return;

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
  descubrir();

  if (entrada.dash && j.cdDash <= 0) impulsar();
  if (entrada.atacar && !j.cubriendo && j.cdAtaque <= 0) golpear();

  // --- enemigos ---
  for (const e of J.enemigos) {
    e.cd -= dt;
    e.herido -= dt;
    aplicarEmpuje(e, dt);

    const vx = j.x - e.x, vy = j.y - e.y;
    const d = Math.hypot(vx, vy) || 1e-6;
    e.mira = Math.atan2(vy, vx);
    if (d > 13) continue;                       // aún no te ha visto

    if (d > e.alcance + j.r) {
      // avanzar hacia el héroe, apartándose de los otros bichos
      let mx = vx / d, my = vy / d;
      for (const o of J.enemigos) {
        if (o === e) continue;
        const ox = e.x - o.x, oy = e.y - o.y;
        const od = Math.hypot(ox, oy);
        if (od > 0 && od < e.r + o.r + 0.2) { mx += ox / od * 0.9; my += oy / od * 0.9; }
      }
      const m = Math.hypot(mx, my) || 1;
      moverEntidad(e, mx / m * e.vel * dt, my / m * e.vel * dt);
    } else if (e.cd <= 0) {
      e.cd = e.cadencia;
      danarJugador(e);
    }
  }

  // --- pociones: se recogen al pasar por encima ---
  for (const o of J.objetos.slice()) {
    if (Math.hypot(o.x - j.x, o.y - j.y) > j.r + o.r) continue;
    J.objetos = J.objetos.filter(p => p !== o);
    const cura = Math.min(12, j.hpMax - j.hp);
    j.hp += cura;
    mensaje(`Bebes una poción y recuperas ${cura} PV.`);
    chispas(o.x, o.y, '#e06060', 10);
  }

  abrirPuertaSiToca(dt);
}

// El cerrojo cede cuando no queda nada vivo en la cueva. Las hojas tardan un
// momento en separarse: hasta que no acaban, la puerta no deja pasar.
function abrirPuertaSiToca(dt) {
  if (J.enemigos.length) return;
  if (J.puerta.apertura === 0) {
    mensaje('Cae el último enemigo: el cerrojo cede y la puerta se abre.');
    mensaje('Sin nada que temer, reconoces la cueva entera.');
    chispas(J.puerta.x, J.puerta.y, '#9ec8f0', 18);
    J.explorado.fill(1);     // ya no hay peligro: se levanta la niebla del mapa
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
  j.cdAtaque = j.cadencia;
  j.golpe = 0.18;

  for (const e of J.enemigos.slice()) {
    const dx = e.x - j.x, dy = e.y - j.y;
    const d = Math.hypot(dx, dy);
    if (d > j.alcance + e.r) continue;
    if (Math.abs(difAngulo(Math.atan2(dy, dx), j.mira)) > j.arco) continue;

    const dano = azarEnt(j.dano - 2, j.dano + 2);
    e.hp -= dano;
    e.herido = 0.25;
    e.ex += dx / (d || 1) * 6;
    e.ey += dy / (d || 1) * 6;
    chispas(e.x, e.y, '#c04040', 6);
    numero(e.x, e.y, dano, '#ffd0d0');

    if (e.hp <= 0) {
      J.enemigos = J.enemigos.filter(o => o !== e);
      chispas(e.x, e.y, '#803030', 14);
      mensaje(`${sujeto(e)} muere.`);
      j.exp += e.exp;
      subirNivelSiToca();
    }
  }
}

// Impulso hacia donde se mira: aprovecha el empuje, que ya frena y choca solo
function impulsar() {
  const j = J.jugador;
  j.cdDash = ESPERA_DASH;
  j.dash = DURACION_DASH;
  j.invulnerable = Math.max(j.invulnerable, DURACION_DASH + 0.04);
  j.ex += Math.cos(j.mira) * FUERZA_DASH;
  j.ey += Math.sin(j.mira) * FUERZA_DASH;
  chispas(j.x, j.y, '#8fa8d8', 8);
}

function danarJugador(e) {
  const j = J.jugador;
  if (j.invulnerable > 0) return;

  let dano = azarEnt(1, e.dano);
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
    numero(j.x, j.y, dano, '#c8ccdd');
  } else {
    numero(j.x, j.y, dano, '#ff8080');
  }
  if (j.hp <= 0) {
    j.hp = 0;
    j.cubriendo = j.corriendo = false;
    J.muerto = true;
    mensaje('Has muerto. Pulsa R para empezar de nuevo.');
  }
}

function subirNivelSiToca() {
  const j = J.jugador;
  const necesaria = j.nivel * 25;
  if (j.exp < necesaria) return;
  j.exp -= necesaria;
  j.nivel++;
  j.hpMax += 8;
  j.hp = j.hpMax;
  j.dano += 2;
  mensaje(`¡Subes al nivel ${j.nivel}! Te sientes más fuerte.`);
  chispas(j.x, j.y, '#e0d070', 20);
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
    mensaje(n
      ? `La puerta está atrancada. Aún ${n === 1 ? 'queda 1 enemigo' : `quedan ${n} enemigos`}.`
      : 'La puerta todavía se está abriendo.');
    return false;
  }
  J.nivel++;
  nuevoNivel();
  return true;
}

// ---------- Efectos decorativos ----------
function chispas(x, y, color, cuantas) {
  for (let i = 0; i < cuantas; i++) {
    const a = azar(0, Math.PI * 2), v = azar(1.5, 5);
    J.efectos.push({ tipo: 'chispa', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
                     vida: azar(0.25, 0.5), t: 0, color });
  }
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
function iniciarPartida() {
  J.jugador = {
    x: 0, y: 0, r: 0.30, vel: 4.6,
    hp: 30, hpMax: 30, dano: 7, nivel: 1, exp: 0,
    alcance: 1.25, arco: 1.0, cadencia: 0.40,
    cdAtaque: 0, golpe: 0, invulnerable: 0,
    cubriendo: false, corriendo: false, dash: 0, cdDash: 0,
    ex: 0, ey: 0, mira: 0, andando: false, nombre: 'héroe'
  };
  J.nivel = 1;
  J.log = [];
  J.muerto = false;
  J.enemigos = [];
  J.objetos = [];
  J.efectos = [];
  J.tiempo = 0;
  mensaje('Desciendes a la cueva.');
  nuevoNivel();
}
