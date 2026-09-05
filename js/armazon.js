/* armazon.js - index.html es un marco que no se recarga: dentro van pasando
   las pantallas del menú y fuera queda la caja de música, así el tema no se
   corta al cambiar de pantalla. La partida sale del marco a pantalla completa.
   ============================================================ */
'use strict';

// Lo que el marco puede abrir. El ?ir= viene de la barra de direcciones, así
// que se valida contra esta lista.
const PANTALLAS = ['portada.html', 'ranura.html', 'ajustes.html',
    'prev.html', 'final.html'];

const CLAVE_SEGUNDO = 'sendas.musica.segundo';

const marco = document.getElementById('marco');
const musica = document.getElementById('musicaFondo');

// ---------- Con qué pantalla se abre ----------
// La portada, salvo que llegue un ?ir= (menu.js manda aquí toda pantalla de
// menú que se encuentre suelta).
(function abrirPrimera() {
    const pedida = new URLSearchParams(location.search).get('ir') || '';
    const nombre = pedida.split('?')[0].split('#')[0];
    marco.src = 'html/' + (PANTALLAS.includes(nombre) ? pedida : 'portada.html');
})();

// ---------- La música ----------
// Suena seguida mientras dure la visita al menú. Solo la corta marcharse a la
// partida: se apunta el segundo por el que iba y al volver se retoma ahí, en
// sessionStorage (dura lo que la pestaña).
let esperandoToque = false;

(function retomarSegundo() {
    try {
        const segundo = parseFloat(sessionStorage.getItem(CLAVE_SEGUNDO));
        // ponerlo antes de cargar no se pierde: el navegador arranca ahí
        if (segundo > 0) musica.currentTime = segundo;
    } catch (e) { /* nada */ }
})();

const apuntarSegundo = () => {
    try { sessionStorage.setItem(CLAVE_SEGUNDO, musica.currentTime); } catch (e) { /* nada */ }
};
musica.addEventListener('timeupdate', apuntarSegundo);
addEventListener('pagehide', apuntarSegundo);

// El navegador no deja sonar hasta que el jugador toque algo, y los clics caen
// dentro del marco: las pantallas avisan de su primer toque y se reintenta.
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

    // Cerrar la ventana solo puede el documento de arriba. Puede no permitirse;
    // quien lo pidió ya avisa al jugador si sigue vivo un instante después.
    if (aviso.cerrarJuego) { window.close(); return; }

    // el primer toque del jugador desbloquea el sonido
    if (aviso.toque) { if (esperandoToque) sonar(); return; }

    // cada pantalla dice si en ella suena música o no
    if ('musica' in aviso) {
        if (aviso.musica) sonar(); else callar();
    }
});
