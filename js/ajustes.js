/* ============================================================
ajustes.js - las preferencias del jugador
Tres cosas y ninguna de la partida: cuánto suena, cuánto ocupa el
hud y qué tecla hace qué. No van en la ranura, porque no son de una
partida sino de quien juega: viven aparte y valen para las cinco.
   ============================================================ */
'use strict';

const CLAVE_AJUSTES = 'sendas.ajustes';

// el hud se mide en tantos por ciento de su tamaño de siempre
const HUD_MIN = 60, HUD_MAX = 160;

function ajustesNuevos() {
    return {
        volumen: 50,    // 0..100, el maestro: de él cuelga todo lo que suena
        musica: 70,     // 0..100, y este solo la música, colgando del maestro
        hud: 100        // 60..160, el tamaño del marcador dentro de la partida
    };
}

// entre 'a' y 'b' no se sale ni con un valor a mano en el almacén
function acotar(n, a, b) {
    n = Number(n);
    return Number.isFinite(n) ? Math.min(b, Math.max(a, Math.round(n))) : null;
}

const Ajustes = {

    // el navegador puede negarse a recordar; entonces se juega con lo de fábrica
    leer() {
        const base = ajustesNuevos();
        let guardado = null;
        try { guardado = JSON.parse(localStorage.getItem(CLAVE_AJUSTES)); } catch (e) { /* nada */ }
        if (!guardado) return base;
        return {
            volumen: acotar(guardado.volumen, 0, 100) ?? base.volumen,
            musica: acotar(guardado.musica, 0, 100) ?? base.musica,
            hud: acotar(guardado.hud, HUD_MIN, HUD_MAX) ?? base.hud
        };
    },

    guardar(cambios) {
        const nuevos = Object.assign(this.leer(), cambios);
        try { localStorage.setItem(CLAVE_AJUSTES, JSON.stringify(nuevos)); } catch (e) { /* nada */ }
        this.aplicar();
        return nuevos;
    },

    // 0..1, que es como lo quieren los elementos de audio. El canal 'musica'
    // cuelga del maestro: bajar el maestro baja la música, pero no al revés
    volumen(canal) {
        const a = this.leer();
        const maestro = a.volumen / 100;
        return canal === 'musica' ? maestro * (a.musica / 100) : maestro;
    },

    // Se llama al cargar cada pantalla y con cada tirón de las reglas. El hud
    // se agranda con zoom y no con scale: así el marcador sigue pegado a sus
    // esquinas en vez de encogerse hacia el centro de la pantalla.
    aplicar() { this.aplicarValores(this.leer()); },

    // Aparte, porque la partida los recibe de su ventana de ajustes ya
    // medidos y no puede fiarse de releerlos del almacén: el marco no siempre
    // lo comparte con quien lo abre. Cada caja de sonido dice de qué canal es
    // con data-canal; lo que no lo diga se queda solo con el maestro, que es
    // lo que querrán los golpes y las puertas cuando los haya.
    aplicarValores(a) {
        document.documentElement.style.setProperty('--escalaHud', a.hud / 100);
        const maestro = a.volumen / 100;
        for (const sonido of document.querySelectorAll('audio, video')) {
            sonido.volume = sonido.dataset.canal === 'musica'
                ? maestro * (a.musica / 100)
                : maestro;
        }
    }
};

Ajustes.aplicar();

// ---------- Quién nos tiene enmarcados ----------
// Hay dos marcos distintos en el juego y no significan lo mismo, así que no
// vale con preguntar si estamos dentro de uno:
//
//   hayPadre  - cualquiera de los dos. Sirve para avisar de los cambios, que
//               en ambos casos hay alguien fuera que no ve nuestro <audio>
//               ni nuestro marcador y necesita enterarse.
//   enMarco   - solo la ventanita que abre la partida sobre la senda. Es la
//               que va recortada, sin música y con un VOLVER que cierra en
//               vez de navegar. Se reconoce por el ?marco=1 que le pone
//               vista.js al abrirla, y no por estar enmarcada: desde que
//               index.html es un armazón, TODAS las pantallas del menú lo
//               están, y mirar el marco las confundiría con esta.
//
// Las páginas son del mismo juego y desde file:// el origen es «null» para
// todas, así que no hay a quién acotar el postMessage.
const hayPadre = window.self !== window.top;
const enMarco = new URLSearchParams(location.search).has('marco');

function avisarAlPadre(mensaje) {
    if (hayPadre) parent.postMessage(Object.assign({ tipo: 'ajustes' }, mensaje), '*');
}

function cerrarMarco() { avisarAlPadre({ cerrar: true }); }

// la marca la lleva el <html>, para que el css recorte el rótulo: dentro del
// marco hay bastante menos alto que en una pantalla entera
if (enMarco) document.documentElement.classList.add('enMarco');

// ---------- La hoja de ajustes ----------
// Igual que las ranuras: quien quiera la hoja pone la caja y aquí se monta
// sola. La única que la pone es ajustes.html, que se abre entera desde la
// portada y asomada dentro de su ventana desde la partida.
const CONTROLES = [
    ['Andar', 'W A S D'],
    ['Apuntar', 'ratón'],
    ['Atacar', 'clic izquierdo'],
    ['Cubrirse', 'clic derecho'],
    ['Correr', 'Mayús'],
    ['Esquiva', 'Espacio'],
    ['Cruzar puerta', 'E'],
    ['Menú del santuario', 'Esc']
];

// Las reglas de cada sección. Tres columnas, en este orden: pantalla, sonido
// y controles al final, que es lo que menos hace falta tocar.
const SECCIONES = [
    ['PANTALLA', [['hud', 'Tamaño del HUD', HUD_MIN, HUD_MAX, 5]]],
    ['SONIDO',   [['volumen', 'Volumen maestro', 0, 100, 1],
                  ['musica', 'Música', 0, 100, 1]]]
];

(function montarAjustes() {
    const caja = document.getElementById('ajustes');
    if (!caja) return;

    const a = Ajustes.leer();

    // la cifra va antes que el riel a propósito: la regla es una rejilla de
    // dos columnas y el riel las cruza enteras por debajo, así que si la cifra
    // fuese la última caería a un renglón suyo en vez de junto al nombre
    const regla = ([clave, nombre, min, max, paso]) => `
        <div class="regla">
            <label for="ax_${clave}">${nombre}</label>
            <output for="ax_${clave}">${a[clave]}%</output>
            <input id="ax_${clave}" type="range" data-clave="${clave}"
                   min="${min}" max="${max}" step="${paso}" value="${a[clave]}">
        </div>`;

    // tres columnas lado a lado, cada una con sus propias filas apiladas
    caja.innerHTML = `<div class="secciones">` +
        SECCIONES.map(([titulo, reglas]) => `
            <section class="seccion">
                <h2>${titulo}</h2>
                ${reglas.map(regla).join('')}
            </section>`).join('') + `
            <section class="seccion">
                <h2>CONTROLES</h2>
                <ul class="controles">
                    ${CONTROLES.map(([que, como]) => `<li><span>${que}</span><b>${como}</b></li>`).join('')}
                </ul>
            </section>
        </div>`;

    // cada regla escribe mientras se arrastra: lo que se oye y lo que se ve
    // cambia con el pulgar puesto, sin botón de aceptar de por medio
    for (const riel of caja.querySelectorAll('input[data-clave]')) {
        const cifra = caja.querySelector(`output[for="${riel.id}"]`);
        riel.addEventListener('input', () => {
            cifra.textContent = riel.value + '%';
            avisarAlPadre(Ajustes.guardar({ [riel.dataset.clave]: +riel.value }));
        });
    }
})();
