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
        efectos: 80,    // 0..100, y este los orbes, el vidrio y las puertas
        // lo que hace el héroe con sus manos -por ahora, el acero al cortar-.
        // Va aparte de Efectos porque suena en cada golpe: quien lo encuentre
        // machacón puede bajarlo sin quedarse sordo para el resto de la senda
        jugador: 80,    // 0..100, también colgando del maestro
        hud: HUD_DE_SERIE, // 60..160, el tamaño del marcador dentro de la partida
        idioma: 'es'    // la lengua en que habla el juego; la lista, en idiomas.js
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
    if (canal === 'jugador') return maestro * (a.jugador / 100);
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
            jugador: acotar(guardado.jugador, 0, 100) ?? base.jugador,
            hud: acotar(guardado.hud, HUD_MIN, HUD_MAX) ?? base.hud,
            // una lengua que no exista -o un valor a mano en el almacén- no
            // puede dejar el juego mudo: se cae a la de casa
            idioma: (typeof TEXTOS !== 'undefined' && TEXTOS[guardado.idioma])
                ? guardado.idioma : base.idioma
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

// ---------- Cerrar el juego ----------
// Lo piden dos botones -el de la portada y el del menú de la partida- y
// antes cada uno lo hacía a su manera. Ahora comparten esta función, que es
// la única forma de asegurar que se comporten igual.
//
// Quien puede cerrar la ventana es siempre el documento de arriba. La partida
// lo es (sale del marco a pantalla completa), así que se cierra ella misma;
// la portada no (vive dentro del marco del armazón), así que se lo pide a
// index.html, que es quien manda sobre la ventana.
//
// La ventana de ajustes de la partida no entra aquí: esa va enmarcada de otro
// marco y no tiene botón de cerrar el juego.
//
// En los dos casos, si un cuarto de segundo después seguimos vivos es que el
// navegador no ha dejado cerrar, y se le dice al jugador en vez de callar.
// Si el cierre sí ocurre no queda nadie para enseñar nada.
function cerrarJuego(idNota) {
    const enArmazon = hayPadre && !enMarco;
    if (enArmazon) parent.postMessage({ tipo: 'armazon', cerrarJuego: true }, '*');
    else window.close();

    setTimeout(() => {
        const nota = document.getElementById(idNota);
        if (nota) nota.hidden = false;
    }, 250);
}

// la marca la lleva el <html>, para que el css recorte el rótulo: dentro del
// marco hay bastante menos alto que en una pantalla entera
if (enMarco) document.documentElement.classList.add('enMarco');

// ---------- La hoja de ajustes ----------
// Igual que las ranuras: quien quiera la hoja pone la caja y aquí se monta
// sola. La única que la pone es ajustes.html, que se abre entera desde la
// portada y asomada dentro de su ventana desde la partida.
// La tecla se escribe tal cual donde es una tecla -W A S D, E, Esc- y por
// clave donde es una palabra, que esa sí cambia de lengua.
const CONTROLES = [
    ['control.andar', 'W A S D'],
    ['control.apuntar', 'tecla.raton'],
    ['control.atacar', 'tecla.clicIzq'],
    ['control.cubrirse', 'tecla.clicDer'],
    ['control.correr', 'tecla.mayus'],
    ['control.esquiva', 'tecla.espacio'],
    ['control.cruzar', 'E'],
    ['control.menu', 'Esc']
];

// Las reglas de cada sección. Tres columnas, en este orden: pantalla, sonido
// y controles al final, que es lo que menos hace falta tocar.
// Cada una: [clave, mínimo, máximo, paso] y, opcional, el valor que lleva
// muesca en el riel — el de casa, para saber de dónde se partió. El nombre
// no se escribe aquí: se saca del diccionario con 'ajustes.' + la clave.
const SECCIONES = [
    ['ajustes.general', [['hud', HUD_MIN, HUD_MAX, 5, HUD_DE_SERIE]]],
    ['ajustes.sonido',  [['volumen', 0, 100, 1, VOLUMEN_DE_SERIE],
                         ['musica', 0, 100, 1],
                         ['efectos', 0, 100, 1],
                         ['jugador', 0, 100, 1]]]
];

// ---------- Lo que espera a que digas cuándo ----------
// Nada de aquí se aplica solo. Se toca lo que se quiera -el volumen, el
// marcador, la lengua-, se ve el botón encenderse, y hasta que no se pulsa el
// juego sigue como estaba. Volver sin pulsarlo lo deja todo intacto, que es lo
// que espera cualquiera que haya entrado a mirar y se haya puesto a trastear.
//
// El precio es que el volumen ya no se afina de oído mientras se arrastra: hay
// que soltar, aplicar y escuchar. A cambio, no hay manera de dejarse los
// ajustes revueltos sin querer y no saber cómo estaban.
//
// Aquí solo vive lo tocado y sin guardar. Vacío = no hay nada que aplicar, y
// esa es exactamente la condición que apaga el botón.
const pendientes = {};
let notaReinicio = false;   // si toca enseñar la nota tras repintar la hoja

// Lo de fábrica, menos la lengua. Restablecer no la toca a propósito: quien
// juega en inglés y quiere el sonido de siempre no está pidiendo que el juego
// vuelva a hablarle en español. La lengua es de quien juega, no un ajuste más
// del sonido, y devolvérsela sin avisar sería el peor momento para hacerlo
// -justo cuando ya no sabe leer los botones para deshacerlo-.
function deFabrica() {
    const base = ajustesNuevos();
    delete base.idioma;
    return base;
}

// Cada botón se enciende por su motivo. Aplicar, si hay algo esperando.
// Restablecer, si algo se aparta de lo de fábrica -mirando lo pendiente antes
// que lo guardado, que es lo que el jugador tiene delante-; ya en su sitio,
// se apaga, porque un botón que promete devolver lo que ya está devuelto solo
// hace dudar de si funcionó.
function refrescarBotones() {
    const a = Ajustes.leer();
    const efectivo = clave => (clave in pendientes ? pendientes[clave] : a[clave]);
    const base = deFabrica();

    const aplicar = document.getElementById('axAplicar');
    if (aplicar) aplicar.disabled = !Object.keys(pendientes).length;

    const reset = document.getElementById('axReset');
    if (reset) reset.disabled = Object.keys(base).every(c => efectivo(c) === base[c]);
}

// Anota un cambio... o lo borra. Devolver una regla a donde estaba no es un
// cambio pendiente: es no haber cambiado nada, y el botón tiene que apagarse
// igual que si no se hubiera tocado. Si no, se quedaría encendido prometiendo
// aplicar algo que ya está aplicado.
function anotar(clave, valor, guardado) {
    if (valor === guardado) delete pendientes[clave];
    else pendientes[clave] = valor;
    refrescarBotones();
}

function montarAjustes() {
    const caja = document.getElementById('ajustes');
    if (!caja) return;

    const a = Ajustes.leer();
    // Lo pendiente manda sobre lo guardado al pintar: si se movió un riel y
    // aún no se ha aplicado, el mando tiene que seguir donde lo dejaron o
    // parecería que el tirón no se registró.
    const enEspera = clave => clave in pendientes;
    const valor = clave => (enEspera(clave) ? pendientes[clave] : a[clave]);

    // La cifra va antes que el riel a propósito: la regla es una rejilla de
    // dos columnas y el riel las cruza enteras por debajo, así que si la cifra
    // fuese la última caería a un renglón suyo en vez de junto al nombre.
    const regla = ([clave, min, max, paso, muesca]) => {
        // La muesca se le da a la hoja de estilo como fracción de 0 a 1 del
        // recorrido del riel. Así el css la coloca sin saber nada de mínimos
        // ni de máximos, y vale igual para el hud que para lo que se marque
        // mañana, tenga el tramo que tenga.
        const marcada = muesca !== undefined;
        const clases = ['regla'];
        if (marcada) clases.push('marcada');
        if (enEspera(clave)) clases.push('pendiente');
        const sitio = marcada ? ` style="--muesca: ${(muesca - min) / (max - min)}"` : '';
        return `
        <div class="${clases.join(' ')}"${sitio}>
            <label for="ax_${clave}">${TR('ajustes.' + clave)}</label>
            <output for="ax_${clave}">${valor(clave)}%</output>
            <input id="ax_${clave}" type="range" data-clave="${clave}"
                   min="${min}" max="${max}" step="${paso}" value="${valor(clave)}">
        </div>`;
    };

    // El idioma no es una regla deslizante: no tiene un recorrido con mínimo y
    // máximo, sino una lista cerrada. Va con la misma rejilla de dos columnas
    // que las reglas -nombre a la izquierda, mando a la derecha- para que no
    // desentone, pero sin riel y sin cifra.
    const desplegable = () => `
        <div class="regla lista${enEspera('idioma') ? ' pendiente' : ''}">
            <label for="ax_idioma">${TR('ajustes.idioma')}</label>
            <select id="ax_idioma">
                ${Idioma.lista().map(i =>
                    `<option value="${i.id}"${i.id === valor('idioma') ? ' selected' : ''}>${i.nombre}</option>`
                ).join('')}
            </select>
        </div>`;

    // tres columnas lado a lado, cada una con sus propias filas apiladas, y
    // debajo el pie: la nota a la izquierda y los dos botones a la derecha,
    // restablecer primero y aplicar el último, que es el que cierra el gesto
    caja.innerHTML = `<div class="secciones">` +
        SECCIONES.map(([titulo, reglas]) => `
            <section class="seccion">
                <h2>${TR(titulo)}</h2>
                ${reglas.map(regla).join('')}
                ${titulo === 'ajustes.general' ? desplegable() : ''}
            </section>`).join('') + `
            <section class="seccion">
                <h2>${TR('ajustes.controles')}</h2>
                <ul class="controles">
                    ${CONTROLES.map(([que, como]) =>
                        `<li><span>${TR(que)}</span><b>${TR(como)}</b></li>`).join('')}
                </ul>
            </section>
        </div>
        <div class="cierre">
            <p class="nota"${notaReinicio ? '' : ' hidden'}>${TR('ajustes.reinicio')}</p>
            <button id="axReset" type="button" class="boton reset">${TR('ajustes.restablecer')}</button>
            <button id="axAplicar" type="button" class="boton aplicar">${TR('ajustes.aplicar')}</button>
        </div>`;

    // Los botones se pintan encendidos y es esto lo que los apaga si toca, en
    // vez de decidirlo dentro de la plantilla: así hay un solo sitio en todo
    // el archivo que sabe cuándo va apagado cada uno, y no dos que se puedan
    // contradecir con el tiempo.
    refrescarBotones();

    // Arrastrar mueve la cifra pero no toca el juego: el número de al lado es
    // dónde está el pulgar, no lo que está sonando. La fila se marca aparte
    // para que con cinco reglas se vea de un vistazo cuáles quedan por aplicar
    // y no haya que acordarse.
    for (const riel of caja.querySelectorAll('input[data-clave]')) {
        const clave = riel.dataset.clave;
        const cifra = caja.querySelector(`output[for="${riel.id}"]`);
        riel.addEventListener('input', () => {
            if (cifra) cifra.textContent = riel.value + '%';
            anotar(clave, +riel.value, a[clave]);
            const fila = riel.parentElement;
            if (fila) fila.classList.toggle('pendiente', enEspera(clave));
        });
    }

    const menu = document.getElementById('ax_idioma');
    if (menu) menu.addEventListener('change', () => {
        anotar('idioma', menu.value, a.idioma);
        const fila = menu.parentElement;
        if (fila) fila.classList.toggle('pendiente', enEspera('idioma'));
    });

    const aplicar = document.getElementById('axAplicar');
    if (aplicar) aplicar.addEventListener('click', aplicarPendientes);

    const reset = document.getElementById('axReset');
    if (reset) reset.addEventListener('click', restablecer);
}

// Repinta la hoja dejándola donde estaba. Dentro de la partida va enmarcada y
// puede quedar scrolleada; saltar arriba en cada pulsación sería perder el
// sitio justo cuando acabas de tocar algo de abajo.
function repintar() {
    const altura = window.scrollY || 0;
    montarAjustes();
    if (altura) window.scrollTo(0, altura);
}

// Restablecer no guarda: deja lo de fábrica esperando como si lo hubieras
// puesto tú a mano, riel por riel. Así se ve antes de que pase, las filas se
// marcan solas, y volver sin aplicar lo deja todo como estaba. Un botón que
// borrase los ajustes de golpe y sin vuelta atrás no pega en una hoja donde
// todo lo demás espera.
function restablecer() {
    const a = Ajustes.leer();
    const base = deFabrica();
    for (const clave of Object.keys(base)) anotar(clave, base[clave], a[clave]);
    repintar();
}

// Guarda de una vez todo lo que estaba esperando y repinta la hoja, para que
// lo que se ve sea lo que hay guardado y no quede colgada ninguna marca de
// pendiente. El repintado hace falta además cuando cambia la lengua: es la
// única manera de que los rótulos de aquí -y el propio desplegable- se pongan
// al día sin recargar.
//
// La nota de reinicio, solo dentro de la partida. En el menú no hay nada que
// reiniciar: cada pantalla se traduce sola al abrirse. Dentro sí, porque el
// registro ya escrito, el bioma y los rótulos que game.html tradujo al cargar
// se quedan en la lengua vieja hasta la senda siguiente.
function aplicarPendientes() {
    const cambios = Object.keys(pendientes);
    if (!cambios.length) return;

    const cambioLaLengua = 'idioma' in pendientes;
    // Se copia antes de vaciar: guardar recibe su propio objeto y no uno que
    // le vamos a desmontar por debajo en la línea siguiente.
    avisarAlPadre(Ajustes.guardar(Object.assign({}, pendientes)));
    for (const clave of cambios) delete pendientes[clave];

    if (cambioLaLengua) {
        notaReinicio = enMarco;
        Idioma.aplicar();   // el HTML de alrededor: título, lema y VOLVER
    }
    repintar();
}

montarAjustes();
