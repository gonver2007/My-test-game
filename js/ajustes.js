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

// Los valores de casa, los que la regla enseña con una muesca para saber de
// dónde se partió. El del hud no es el 100: el marcador se dibujó pensando en
// pantallas grandes y a tamaño exacto se queda corto, así que va un punto
// crecido. El maestro va a media asta a propósito, para dejar sitio a subirlo
// tanto como a bajarlo.
const HUD_DE_SERIE = 110;
const VOLUMEN_DE_SERIE = 50;

function ajustesNuevos() {
    return {
        volumen: VOLUMEN_DE_SERIE,  // 0..100, el maestro: de él cuelga todo lo que suena
        musica: 70,     // 0..100, y este solo la música, colgando del maestro
        efectos: 80,    // 0..100, y este los golpes y los orbes, también colgando
        hud: HUD_DE_SERIE  // 60..160, el tamaño del marcador dentro de la partida
    };
}

// entre 'a' y 'b' no se sale ni con un valor a mano en el almacén
function acotar(n, a, b) {
    n = Number(n);
    return Number.isFinite(n) ? Math.min(b, Math.max(a, Math.round(n))) : null;
}

// Lo que le toca sonar a un canal, de 0 a 1, sobre unos ajustes ya leídos.
// Va suelto y no dentro de Ajustes porque aplicarValores recibe los suyos de
// fuera -la partida se los pasa por la ventana- y no puede releerlos.
function volumenDeCanal(a, canal) {
    const maestro = a.volumen / 100;
    if (canal === 'musica') return maestro * (a.musica / 100);
    if (canal === 'efectos') return maestro * (a.efectos / 100);
    return maestro;
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
            efectos: acotar(guardado.efectos, 0, 100) ?? base.efectos,
            hud: acotar(guardado.hud, HUD_MIN, HUD_MAX) ?? base.hud
        };
    },

    guardar(cambios) {
        const nuevos = Object.assign(this.leer(), cambios);
        try { localStorage.setItem(CLAVE_AJUSTES, JSON.stringify(nuevos)); } catch (e) { /* nada */ }
        this.aplicar();
        return nuevos;
    },

    // 0..1, que es como lo quieren los elementos de audio. Los canales
    // cuelgan del maestro: bajar el maestro baja la música y los efectos,
    // pero no al revés. Lo que no diga canal se queda solo con el maestro.
    volumen(canal) { return volumenDeCanal(this.leer(), canal); },

    // Se llama al cargar cada pantalla y con cada tirón de las reglas. El hud
    // se agranda con zoom y no con scale: así el marcador sigue pegado a sus
    // esquinas en vez de encogerse hacia el centro de la pantalla.
    aplicar() { this.aplicarValores(this.leer()); },

    // Aparte, porque la partida los recibe de su ventana de ajustes ya
    // medidos y no puede fiarse de releerlos del almacén: el marco no siempre
    // lo comparte con quien lo abre. Cada caja de sonido dice de qué canal es
    // con data-canal.
    aplicarValores(a) {
        document.documentElement.style.setProperty('--escalaHud', a.hud / 100);
        for (const sonido of document.querySelectorAll('audio, video'))
            sonido.volume = volumenDeCanal(a, sonido.dataset.canal);
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
// Cada una: [clave, nombre, mínimo, máximo, paso] y, opcional, el valor que
// lleva muesca en el riel — el de casa, para saber de dónde se partió.
const SECCIONES = [
    ['GENERAL', [['hud', 'Tamaño del HUD', HUD_MIN, HUD_MAX, 5, HUD_DE_SERIE]]],
    ['SONIDO',   [['volumen', 'Volumen maestro', 0, 100, 1, VOLUMEN_DE_SERIE],
                  ['musica', 'Música', 0, 100, 1],
                  ['efectos', 'Efectos', 0, 100, 1]]]
];

(function montarAjustes() {
    const caja = document.getElementById('ajustes');
    if (!caja) return;

    const a = Ajustes.leer();

    // La cifra va antes que el riel a propósito: la regla es una rejilla de
    // dos columnas y el riel las cruza enteras por debajo, así que si la cifra
    // fuese la última caería a un renglón suyo en vez de junto al nombre.
    const regla = ([clave, nombre, min, max, paso, muesca]) => {
        // La muesca se le da a la hoja de estilo como fracción de 0 a 1 del
        // recorrido del riel. Así el css la coloca sin saber nada de mínimos
        // ni de máximos, y vale igual para el hud que para lo que se marque
        // mañana, tenga el tramo que tenga.
        const marcada = muesca !== undefined;
        const clase = marcada ? 'regla marcada' : 'regla';
        const sitio = marcada ? ` style="--muesca: ${(muesca - min) / (max - min)}"` : '';
        return `
        <div class="${clase}"${sitio}>
            <label for="ax_${clave}">${nombre}</label>
            <output for="ax_${clave}">${a[clave]}%</output>
            <input id="ax_${clave}" type="range" data-clave="${clave}"
                   min="${min}" max="${max}" step="${paso}" value="${a[clave]}">
        </div>`;
    };

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
