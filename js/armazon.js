/* ============================================================
armazon.js - el que sujeta la música
index.html ya no es la portada: es un armazón que no se recarga nunca.
Dentro lleva un marco donde van pasando las pantallas del menú, y
fuera de él la caja de música. Así el tema no se corta al cambiar de
pantalla, que es lo que pasaba cuando cada una traía la suya: al
navegar, el navegador destruye el <audio> con el resto del documento
y hay que volver a leerlo, descodificarlo y arrancarlo.

La partida es la excepción y sale del marco a pantalla completa: trae
su propio Esc, su propia consola y su propia ventana de ajustes, y
anidarla aquí dentro solo daría marcos dentro de marcos.
   ============================================================ */
'use strict';

// Lo que el marco puede abrir. Se comprueba contra esta lista porque el
// ?ir= viene de la barra de direcciones: sin ella, cualquiera podría
// apuntar el marco a donde quisiera.
const PANTALLAS = ['portada.html', 'ranura.html', 'ajustes.html',
    'prev.html', 'final.html'];

const CLAVE_SEGUNDO = 'sendas.musica.segundo';

const marco = document.getElementById('marco');
const musica = document.getElementById('musicaFondo');

// ---------- Con qué pantalla se abre ----------
// Normalmente la portada. Pero al volver de la partida —que vive fuera del
// marco— la pantalla de destino llega aquí en un ?ir=, porque menu.js manda
// al armazón toda pantalla de menú que se encuentre suelta.
(function abrirPrimera() {
    const pedida = new URLSearchParams(location.search).get('ir') || '';
    const nombre = pedida.split('?')[0].split('#')[0];
    marco.src = 'html/' + (PANTALLAS.includes(nombre) ? pedida : 'portada.html');
})();

// ---------- La música ----------
// El armazón vive mientras dure la visita al menú, así que el tema suena
// seguido de una pantalla a otra sin enterarse de nada. Lo único que lo
// interrumpe es marcharse a la partida, que sí se lleva el armazón por
// delante; para ese caso se apunta el segundo por el que iba y al volver
// se retoma ahí. En sessionStorage, que dura lo que la pestaña: cerrar el
// juego y volver a abrirlo sí empieza el tema desde el principio.
let esperandoToque = false;

(function retomarSegundo() {
    try {
        const segundo = parseFloat(sessionStorage.getItem(CLAVE_SEGUNDO));
        // ponerlo antes de que haya cargado no se pierde: el navegador lo
        // guarda como punto de arranque y empieza ahí
        if (segundo > 0) musica.currentTime = segundo;
    } catch (e) { /* nada */ }
})();

const apuntarSegundo = () => {
    try { sessionStorage.setItem(CLAVE_SEGUNDO, musica.currentTime); } catch (e) { /* nada */ }
};
musica.addEventListener('timeupdate', apuntarSegundo);
addEventListener('pagehide', apuntarSegundo);

// El navegador no deja sonar nada hasta que el jugador toque algo. Aquí no
// se le puede esperar: los clics caen dentro del marco, no en el armazón.
// Por eso las pantallas avisan de su primer toque y entonces se reintenta.
function sonar() {
    musica.play().then(() => { esperandoToque = false; })
        .catch(() => { esperandoToque = true; });
}

function callar() { musica.pause(); }

// ---------- Lo que cuentan las pantallas ----------
addEventListener('message', ev => {
    const aviso = ev.data;
    if (!aviso) return;

    // el volumen cambiado en la hoja de ajustes, que va enmarcada y no ve
    // esta caja de música
    if (aviso.tipo === 'ajustes') {
        Ajustes.guardar({ volumen: aviso.volumen, musica: aviso.musica,
                          efectos: aviso.efectos, hud: aviso.hud });
        return;
    }

    if (aviso.tipo !== 'armazon') return;

    // la partida no cabe en el marco: se sale a pantalla completa
    if (aviso.salir) { location.href = aviso.salir; return; }

    // El botón de cerrar de la portada. Dentro del marco nadie puede cerrar la
    // ventana, así que la pantalla lo pide y se hace aquí, que es el documento
    // de arriba. En el navegador esto no siempre se permite; quien lo pidió ya
    // se encarga de avisar al jugador si sigue vivo un instante después.
    if (aviso.cerrarJuego) { window.close(); return; }

    // el primer toque del jugador desbloquea el sonido
    if (aviso.toque) { if (esperandoToque) sonar(); return; }

    // cada pantalla dice si en ella suena música o no
    if ('musica' in aviso) {
        if (aviso.musica) sonar(); else callar();
    }
});
