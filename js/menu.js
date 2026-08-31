/* ============================================================
menu.js - las pantallas del menú: botones, paneles y navegación
Aquí ya no se pinta nada. Hubo un fondo de noche azul dibujado a
mano en un lienzo -bosque, torii, farolillos y pétalos-, que era el
aspecto que tenía el juego antes del ocaso. Hoy la portada pinta su
cielo con CSS y ninguna pantalla trae ese lienzo, así que el pintor
entero se ha ido: quedaba muerto y era la última guarida del azul.
   ============================================================ */
'use strict';

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


// los huecos que se abren en el sitio del menú: armería, personaje,
// habilidades, pergaminos y amuletos, todos del zaguán. Cada pantalla trae
// los suyos y los que no existen sencillamente no se abren
const PANELES = ['armeria', 'personaje',
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
enlazar('btSalir', () => cerrarJuego('salirNota'));   // la de ajustes.js
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
// qué ir a buscar la barra de abajo. Ojo con la unidad, que aquí estuvo el
// fallo: no todos los ratones hablan en píxeles -hay quien manda líneas, y
// entonces deltaY vale 3-, así que tomarlo a la letra movía el renglón tres
// míseros píxeles por tirón y no se llegaba nunca al final
addEventListener('wheel', e => {
    const fila = e.target.closest && e.target.closest('.armas');
    if (!fila || fila.scrollWidth <= fila.clientWidth) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;   // ya viene de lado
    const unidad = e.deltaMode === 1 ? 40                   // viene en líneas
        : e.deltaMode === 2 ? fila.clientWidth              // en páginas enteras
            : 1;                                            // ya son píxeles
    fila.scrollLeft += e.deltaY * unidad;
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
