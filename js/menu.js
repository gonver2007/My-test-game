/* menu.js - las pantallas del menú: botones, paneles y navegación.
   Aquí ya no se pinta nada: el fondo lo hace el css de cada pantalla.
   ============================================================ */
'use strict';

// ---------- El armazón ----------
// El menú vive dentro del marco de index.html, que sujeta la música. La
// ventanita de ajustes de la partida va en otro marco y se descuenta.
const enArmazon = hayPadre && !enMarco;

function avisarAlArmazon(mensaje) {
    if (enArmazon) parent.postMessage(Object.assign({ tipo: 'armazon' }, mensaje), '*');
}

// Suelta no se queda: una pantalla abierta por su cuenta se manda al armazón
// con el recado de abrirla a ella, para que la música tenga quien la sujete.
// replace y no href: este paso no merece hueco en el historial.
if (!hayPadre) {
    const yo = location.pathname.split('/').pop() + location.search;
    location.replace('../index.html?ir=' + encodeURIComponent(yo));
}

// ---------- Botones ----------
// Cada pantalla dice en <body data-siguiente> a dónde lleva el botón principal;
// las rutas son relativas a quien las declara.

// La partida no cabe en el marco (trae su Esc, su consola y sus ajustes): se le
// pide al armazón que salga a pantalla completa, con la dirección ya resuelta.
function irA(destino) {
    if (enArmazon && /(^|\/)game\.html($|[?#])/.test(destino)) {
        avisarAlArmazon({ salir: new URL(destino, location.href).href });
        return;
    }
    location.href = destino;
}

function continuar() { irA(document.body.dataset.siguiente || 'game.html'); }

// Enmarcada dentro de la partida, volver es cerrar la ventana, no navegar.
// enMarco y cerrarMarco los pone ajustes.js.
function volver() {
    if (enMarco) { cerrarMarco(); return; }
    irA(document.body.dataset.anterior || 'portada.html');
}
function irAjustes() { irA(document.body.dataset.ajustes || 'ajustes.html'); }


// los huecos del zaguán; los que una pantalla no tenga sencillamente no se abren
const PANELES = ['armeria', 'personaje', 'bestiario',
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

// mientras hay alguno abierto el body lleva la marca, que el css usa para
// esconder el rótulo. La miran también armeria.js y personaje.js
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

// el renglón de láminas se corre con la rueda (armas y rejilla del bestiario).
// Ojo con deltaMode: no todos los ratones hablan en píxeles.
addEventListener('wheel', e => {
    const fila = e.target.closest && e.target.closest('.armas, .rejilla');
    if (!fila || fila.scrollWidth <= fila.clientWidth) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;   // ya viene de lado
    const unidad = e.deltaMode === 1 ? 40                   // viene en líneas
        : e.deltaMode === 2 ? fila.clientWidth              // en páginas enteras
            : 1;                                            // ya son píxeles
    fila.scrollLeft += e.deltaY * unidad;
    e.preventDefault();
}, { passive: false });

// ---------- La música ----------
// Vive en el armazón, que es el único documento que no se recarga. Desde aquí
// se le cuentan dos cosas: si en esta pantalla suena (<body data-musica>) y el
// primer toque del jugador, sin el cual el navegador no deja sonar nada.
if (enArmazon) {
    avisarAlArmazon({ musica: document.body.dataset.musica === 'si' });

    const avisarDelToque = () => avisarAlArmazon({ toque: true });
    addEventListener('pointerdown', avisarDelToque, { once: true });
    addEventListener('keydown', avisarDelToque, { once: true });
}


// El menú se diseña para un ancho de referencia: con la ventana cambia el zoom,
// no el diseño. El hud de la partida no pasa por aquí (ver ajustarEscalaLienzo
// en vista.js), y dentro de la ventana de ajustes tampoco: ahí ya manda el marco.
const REF_ANCHO_MENU = 1600;
function fijarEscalaMenu() {
    document.documentElement.style.zoom = enMarco ? 1 : innerWidth / REF_ANCHO_MENU;
}
addEventListener('resize', fijarEscalaMenu);
fijarEscalaMenu();
