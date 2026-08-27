// ============================================================
//  mazmorra.js - lógica del juego (sin nada de dibujado)
//  La usan tanto ascii.html como index.html (versión 3D).
// ============================================================

const ANCHO = 48, ALTO = 40;
const MAX_SALAS = 12, SALA_MIN = 5, SALA_MAX = 9;

// Estado de la partida. Todo lo que necesita saber un renderizador.
const J = {
  mapa: [],
  jugador: null,
  enemigos: [],
  objetos: [],
  escalera: { x: 0, y: 0 },
  nivel: 1,
  log: [],
  muerto: false
};

const azar = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function mensaje(texto) {
  J.log.push(texto);
  if (J.log.length > 60) J.log.shift();
}

// "el trol" -> "El trol" / "al trol";  "la rata" -> "La rata" / "a la rata"
const sujeto = e => `${e.art === 'el' ? 'El' : 'La'} ${e.nombre}`;
const complemento = e => `${e.art === 'el' ? 'al' : 'a la'} ${e.nombre}`;

const esMuro = (x, y) =>
  x < 0 || y < 0 || x >= ANCHO || y >= ALTO || J.mapa[y][x] === '#';

// ---------- Generación del mapa ----------
function generarMapa() {
  J.mapa = [];
  for (let y = 0; y < ALTO; y++) J.mapa.push(new Array(ANCHO).fill('#'));

  const salas = [];
  for (let i = 0; i < MAX_SALAS; i++) {
    const w = azar(SALA_MIN, SALA_MAX);
    const h = azar(SALA_MIN, SALA_MAX);
    const x = azar(1, ANCHO - w - 2);
    const y = azar(1, ALTO - h - 2);
    const nueva = { x, y, w, h };

    if (salas.some(s => solapan(nueva, s))) continue;   // descartar solapadas

    excavarSala(nueva);
    if (salas.length > 0) {
      const ant = centro(salas[salas.length - 1]);
      const act = centro(nueva);
      if (Math.random() < 0.5) {                        // pasillo en L
        excavarH(ant.x, act.x, ant.y);
        excavarV(ant.y, act.y, act.x);
      } else {
        excavarV(ant.y, act.y, ant.x);
        excavarH(ant.x, act.x, act.y);
      }
    }
    salas.push(nueva);
  }
  return salas;
}

function solapan(a, b) {
  return a.x <= b.x + b.w + 1 && a.x + a.w + 1 >= b.x &&
         a.y <= b.y + b.h + 1 && a.y + a.h + 1 >= b.y;
}

const centro = s => ({ x: Math.floor(s.x + s.w / 2), y: Math.floor(s.y + s.h / 2) });

function excavarSala(s) {
  for (let y = s.y; y < s.y + s.h; y++)
    for (let x = s.x; x < s.x + s.w; x++)
      J.mapa[y][x] = '.';
}

const excavarH = (x1, x2, y) => {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) J.mapa[y][x] = '.';
};

const excavarV = (y1, y2, x) => {
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) J.mapa[y][x] = '.';
};

// ---------- Creación de un nivel ----------
function nuevoNivel() {
  const salas = generarMapa();

  const inicio = centro(salas[0]);
  J.jugador.x = inicio.x;
  J.jugador.y = inicio.y;

  J.escalera = centro(salas[salas.length - 1]);

  J.enemigos = [];
  J.objetos = [];

  for (let i = 1; i < salas.length; i++) {
    const cuantos = azar(1, 2);
    for (let k = 0; k < cuantos; k++) {
      const p = posicionLibreEn(salas[i]);
      if (p) J.enemigos.push(crearEnemigo(p.x, p.y));
    }
    if (Math.random() < 0.45) {
      const p = posicionLibreEn(salas[i]);
      if (p) J.objetos.push({ x: p.x, y: p.y, tipo: 'pocion' });
    }
  }

  mensaje(`--- Nivel ${J.nivel} de la mazmorra ---`);
}

function crearEnemigo(x, y) {
  // Cuanto más hondo, más probable que salga el enemigo duro
  const duro = Math.random() < Math.min(0.15 + J.nivel * 0.08, 0.6);
  return duro
    ? { x, y, art: 'el', nombre: 'trol', tipo: 'trol', hp: 10, hpMax: 10, dano: 4 }
    : { x, y, art: 'la', nombre: 'rata', tipo: 'rata', hp: 4,  hpMax: 4,  dano: 2 };
}

function posicionLibreEn(sala) {
  for (let intento = 0; intento < 30; intento++) {
    const x = azar(sala.x, sala.x + sala.w - 1);
    const y = azar(sala.y, sala.y + sala.h - 1);
    if (J.mapa[y][x] !== '.') continue;
    if (x === J.jugador.x && y === J.jugador.y) continue;
    if (J.enemigos.some(e => e.x === x && e.y === y)) continue;
    if (J.objetos.some(o => o.x === x && o.y === y)) continue;
    return { x, y };
  }
  return null;
}

// ---------- Acciones del jugador ----------
// Devuelve true si la acción consumió un turno.
function intentarMover(dx, dy) {
  if (J.muerto) return false;

  const nx = J.jugador.x + dx, ny = J.jugador.y + dy;
  if (esMuro(nx, ny)) return false;

  const enemigo = J.enemigos.find(e => e.x === nx && e.y === ny);
  if (enemigo) {
    atacar(J.jugador, enemigo);
  } else {
    J.jugador.x = nx;
    J.jugador.y = ny;
    recoger();
  }

  turnoEnemigos();
  return true;
}

function atacar(atacante, defensor) {
  const dano = azar(1, atacante.dano);
  defensor.hp -= dano;
  const accion = atacante === J.jugador
    ? `Golpeas ${complemento(defensor)}`
    : `${sujeto(atacante)} te golpea`;
  mensaje(`${accion} (${dano} de daño).`);

  if (defensor.hp <= 0) {
    if (defensor === J.jugador) {
      J.muerto = true;
      mensaje('Has muerto. Pulsa R para empezar de nuevo.');
    } else {
      J.enemigos = J.enemigos.filter(e => e !== defensor);
      J.jugador.exp += defensor.hpMax;
      mensaje(`${sujeto(defensor)} muere.`);
      subirNivelSiToca();
    }
  }
}

function subirNivelSiToca() {
  const necesaria = J.jugador.nivel * 20;
  if (J.jugador.exp >= necesaria) {
    J.jugador.exp -= necesaria;
    J.jugador.nivel++;
    J.jugador.hpMax += 5;
    J.jugador.hp = J.jugador.hpMax;
    J.jugador.dano += 1;
    mensaje(`¡Subes al nivel ${J.jugador.nivel}! Te sientes más fuerte.`);
  }
}

function recoger() {
  const obj = J.objetos.find(o => o.x === J.jugador.x && o.y === J.jugador.y);
  if (!obj) return;
  J.objetos = J.objetos.filter(o => o !== obj);
  if (obj.tipo === 'pocion') {
    const cura = Math.min(8, J.jugador.hpMax - J.jugador.hp);
    J.jugador.hp += cura;
    mensaje(`Bebes una poción y recuperas ${cura} PV.`);
  }
}

function bajar() {
  if (J.muerto) return false;
  if (J.jugador.x !== J.escalera.x || J.jugador.y !== J.escalera.y) {
    mensaje('Aquí no hay escaleras.');
    return false;
  }
  J.nivel++;
  nuevoNivel();
  return true;
}

const sobreEscalera = () =>
  J.jugador.x === J.escalera.x && J.jugador.y === J.escalera.y;

// ---------- Turno de los enemigos ----------
function turnoEnemigos() {
  if (J.muerto) return;

  for (const e of J.enemigos) {
    const dist = Math.max(Math.abs(e.x - J.jugador.x), Math.abs(e.y - J.jugador.y));
    if (dist > 8) continue;                       // dormido si está lejos
    if (dist === 1) { atacar(e, J.jugador); continue; }

    // Persecución simple: acercarse por el eje con más diferencia
    let dx = Math.sign(J.jugador.x - e.x);
    let dy = Math.sign(J.jugador.y - e.y);
    if (Math.abs(J.jugador.x - e.x) > Math.abs(J.jugador.y - e.y)) dy = 0; else dx = 0;

    const nx = e.x + dx, ny = e.y + dy;
    if (esMuro(nx, ny)) continue;
    if (nx === J.jugador.x && ny === J.jugador.y) continue;
    if (J.enemigos.some(o => o !== e && o.x === nx && o.y === ny)) continue;
    e.x = nx;
    e.y = ny;
  }
}

// ---------- Arranque ----------
function iniciarPartida() {
  J.jugador = { x: 0, y: 0, hp: 20, hpMax: 20, dano: 4, nivel: 1, exp: 0, nombre: 'héroe' };
  J.nivel = 1;
  J.log = [];
  J.muerto = false;
  J.enemigos = [];
  J.objetos = [];
  mensaje('Desciendes a la mazmorra.');
  nuevoNivel();
}
