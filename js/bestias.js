/* bestias.js - quiénes salen al paso, en un solo sitio: cifras y figura de
   cada bestia. Beben de aquí la mazmorra (BESTIAS.ficha, para plantarlas), la
   vista (la figura, para pintarlas) y el bestiario del zaguán.

   Las figuras se dibujan a código: el juego no tiene carpeta de imágenes. Van
   sobre el mismo cuadro de 56 que el héroe y los aceros, mirando a la derecha,
   con su aire alrededor -recortarlas al bulto las movería de sitio-. Cada una
   recibe la pose y, al andar, la fase del paso, que es continua y no una tira
   de cuadros.

   Y con ellas va la cuenta de la ranura: cuántos ha eliminado de cada uno y
   cuántas veces la ha eliminado él. No se pierde al caer.
   ============================================================ */
'use strict';

const BESTIAS = (function () {

    // El cuadro sobre el que están trazadas todas las figuras. Quien las pinte
    // le pone la escala que quiera; ellas siempre se dibujan sobre 56.
    const CUADRO = 56;

    // Las poses. Quieto vale cuando no pasa nada; ataque y daño duran lo que
    // dure el golpe; andar no es postura fija, sino la fase del paso.
    const POSES = ['quieto', 'andar', 'ataque', 'dano'];

    // El pincel va aquí dentro y no suelto: vista.js tiene sus propios pieza() y
    // brillo() en el ámbito global, y repetir el nombre ahí fuera tumba el archivo.

    const TINTA = '#17132b';

    function pieza(g, cx, cy, rx, ry, base, luz, sombra, giro = 0, grosor = 2.4) {
        g.save();
        if (grosor) {
            g.fillStyle = TINTA;
            g.beginPath(); g.ellipse(cx, cy, rx + grosor, ry + grosor, giro, 0, 6.2832); g.fill();
        }
        g.beginPath(); g.ellipse(cx, cy, rx, ry, giro, 0, 6.2832);
        g.fillStyle = base; g.fill();
        g.clip();
        if (sombra) {
            g.fillStyle = sombra;
            g.beginPath(); g.ellipse(cx + rx * 0.45, cy + ry * 0.5, rx, ry, giro, 0, 6.2832); g.fill();
        }
        if (luz) {
            g.fillStyle = luz;
            g.beginPath(); g.ellipse(cx - rx * 0.36, cy - ry * 0.48, rx * 0.62, ry * 0.54, giro, 0, 6.2832); g.fill();
        }
        g.restore();
    }

    function brillo(g, cx, cy, rx, ry, giro = 0, alfa = 0.8) {
        g.save();
        g.globalAlpha = alfa; g.fillStyle = '#fff';
        g.beginPath(); g.ellipse(cx, cy, rx, ry, giro, 0, 6.2832); g.fill();
        g.restore();
    }

    const disco = (g, x, y, r) => { g.beginPath(); g.arc(x, y, Math.max(r, 0.15), 0, 6.2832); g.fill(); };
    const P2 = (x, y) => ({ x, y });

    function enCurva(p, t) {
        const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
        return { x: a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x,
                 y: a * p[0].y + b * p[1].y + c * p[2].y + d * p[3].y };
    }

    function apendice(g, p, base, r0, r1, filo = 1.2, luz) {
        const largo = Math.hypot(p[3].x - p[0].x, p[3].y - p[0].y) +
                      Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y);
        const n = Math.max(16, Math.ceil(largo / Math.max(r1, 0.25) * 1.6));
        for (let paso = 0; paso < (luz ? 3 : 2); paso++)
            for (let i = 0; i <= n; i++) {
                const t = i / n, q = enCurva(p, t), r = r0 + (r1 - r0) * t;
                if (paso === 0) { g.fillStyle = TINTA; disco(g, q.x, q.y, r + filo); }
                else if (paso === 1) { g.fillStyle = base; disco(g, q.x, q.y, r); }
                else if (t < 0.7) { g.fillStyle = luz; disco(g, q.x - r * 0.3, q.y - r * 0.35, r * 0.42); }
            }
    }

    function girar(p, o, a) {
        const dx = p.x - o.x, dy = p.y - o.y, s = Math.sin(a), k = Math.cos(a);
        return { x: o.x + dx * k - dy * s, y: o.y + dx * s + dy * k };
    }

    // ---------- La rata · un nezumi de templo ----------
    const R = {
        pelo: '#9c8b74', peloLuz: '#cbbb9d', peloSombra: '#5f5140',
        sarna: '#b3937a',
        rosa: '#d7a79f', rosaLuz: '#f2cfc7', rosaSombra: '#a2726a',
        cordon: '#b3392f', cordonLuz: '#e0645a',
        diente: '#f0e2b8',
        ojo: '#140d16'
    };

    function dibujarRata(g, c, pose = 'quieto', fase = 0) {
        const anda = pose === 'andar', ataca = pose === 'ataque', herida = pose === 'dano';
        const vaiven = anda ? Math.sin(fase) : 0;
        const paso = anda ? Math.cos(fase) : 0;
        const avance = ataca ? 3 : herida ? -2.6 : 0;
        const cx = c + avance, cy = c + vaiven * 0.6;

        // ---------- la cola, por detrás de todo ----------
        const cerrada = herida ? 0.6 : 1;
        const raiz = P2(cx - 13, cy + 1);
        let camino = [raiz,
            P2(cx - 13 - 6.5 * cerrada, cy + 1 + 7 * cerrada),
            P2(cx - 13 - 12 * cerrada, cy + 1 - 3.5 * cerrada),
            P2(cx - 13 - 9 * cerrada, cy + 1 - 11.5 * cerrada)];
        if (vaiven) camino = camino.map((p, i) => i ? girar(p, raiz, vaiven * 0.07 * i) : p);
        apendice(g, camino, R.rosa, 1.35, 0.4, 0.95);
        for (let i = 0; i <= 10; i++) {
            const q = enCurva(camino, i / 30);
            g.fillStyle = R.rosaLuz; disco(g, q.x, q.y - 0.4, 0.4);
        }

        // ---------- las patas ----------
        const pata = (bx, by, lado, d, larga) => {
            const o = d * 2.2, pie = P2(bx + o + (larga ? 2 : 0), by + lado * 11);
            apendice(g, [P2(bx, by + lado * 5), P2(bx - 1 + o * .5, by + lado * 9),
                         P2(bx + o, by + lado * 10), pie], R.rosa, 1.25, 0.95, 0.9);
            pieza(g, pie.x, pie.y, 2.2, 1.6, R.rosa, R.rosaLuz, R.rosaSombra, lado * 0.35, 1.3);
            g.fillStyle = TINTA;
            for (let i = -1; i <= 1; i++) disco(g, pie.x + 1.6 + i * 0.5, pie.y + lado * i * 1.1, 0.55);
        };
        pata(cx - 6, cy, -1, -paso, false); pata(cx - 6, cy, 1, paso, false);
        pata(cx + 4, cy, -1, paso, ataca);  pata(cx + 4, cy, 1, -paso, ataca);

        // ---------- el cuerpo ----------
        // estrecho y algo ladeado, con el anca marcada por dentro: así se le
        // lee el lomo arqueado y el afile hacia la nuca
        pieza(g, cx - 4.5, cy, 11.2, 7.4, R.pelo, R.peloLuz, R.peloSombra, -0.1, 2.6);
        g.save();
        g.beginPath(); g.ellipse(cx - 4.5, cy, 11.2, 7.4, -0.1, 0, 6.2832); g.clip();
        g.globalAlpha = 0.5; g.fillStyle = R.peloSombra;
        g.beginPath(); g.ellipse(cx - 11, cy + 2.6, 5.8, 5.2, -0.2, 0, 6.2832); g.fill();
        g.globalAlpha = 1;
        g.fillStyle = R.sarna;
        g.beginPath(); g.ellipse(cx - 7, cy - 3.4, 3, 1.7, -0.5, 0, 6.2832); g.fill();
        g.beginPath(); g.ellipse(cx - 1.5, cy + 3.6, 2.4, 1.4, 0.4, 0, 6.2832); g.fill();
        g.beginPath(); g.ellipse(cx - 11, cy + 1.2, 1.9, 1.2, 0.2, 0, 6.2832); g.fill();
        g.restore();

        // ---------- el cordón rojo ----------
        // De cuando fue de alguien. Es lo único de color vivo que lleva, y va
        // justo detrás de la nuca: más adelante la cabeza lo taparía entero.
        g.strokeStyle = TINTA; g.lineWidth = 3.6;
        g.beginPath(); g.ellipse(cx + 1.5, cy, 4.2, 9.2, 0, -1.25, 1.25); g.stroke();
        g.strokeStyle = R.cordon; g.lineWidth = 2.2;
        g.beginPath(); g.ellipse(cx + 1.5, cy, 4.2, 9.2, 0, -1.25, 1.25); g.stroke();
        g.strokeStyle = R.cordonLuz; g.lineWidth = 0.8;
        g.beginPath(); g.ellipse(cx + 1.5, cy, 4.2, 9.2, 0, -1.1, -0.1); g.stroke();

        // ---------- la cabeza ----------
        const giroCabeza = herida ? -0.3 : anda ? vaiven * 0.12 : 0;
        g.save();
        g.translate(cx + 6, cy); g.rotate(giroCabeza); g.translate(-(cx + 6), -cy);

        // las orejas, redondas y por delante del cráneo: media rata está aquí
        for (const lado of [-1, 1]) {
            const oy = cy + lado * 6.6;
            pieza(g, cx + 7.4, oy, 4, 3.5, R.rosa, R.rosaLuz, R.rosaSombra, lado * 0.45, 1.7);
            g.fillStyle = R.rosaSombra;
            g.beginPath(); g.ellipse(cx + 7.7, oy + lado * 0.3, 2.2, 1.8, lado * 0.45, 0, 6.2832); g.fill();
        }

        // el cráneo y, saliendo de él, el hocico en cuña, que es el perfil que
        // de verdad distingue a la rata. Se traza con el filo abierto -para que
        // la tinta no cruce la cabeza- y se rellena cerrado
        pieza(g, cx + 8.4, cy, 5.6, 5, R.pelo, R.peloLuz, R.peloSombra, 0, 2.4);

        const perfil = () => {
            g.beginPath();
            g.moveTo(cx + 9, cy - 4.4);
            g.quadraticCurveTo(cx + 15, cy - 3.5, cx + 18.4, cy - 1);
            g.quadraticCurveTo(cx + 19.3, cy, cx + 18.4, cy + 1);
            g.quadraticCurveTo(cx + 15, cy + 3.5, cx + 9, cy + 4.4);
        };
        g.lineJoin = 'round'; g.lineCap = 'round';
        g.strokeStyle = TINTA; g.lineWidth = 4; perfil(); g.stroke();
        g.fillStyle = R.pelo; perfil(); g.closePath(); g.fill();
        g.save();
        perfil(); g.closePath(); g.clip();
        g.fillStyle = R.peloLuz;
        g.beginPath(); g.ellipse(cx + 13.5, cy - 2.6, 5.5, 1.7, -0.1, 0, 6.2832); g.fill();
        g.fillStyle = R.peloSombra;
        g.beginPath(); g.ellipse(cx + 13.5, cy + 3.2, 5.5, 1.5, 0.1, 0, 6.2832); g.fill();
        g.restore();

        if (ataca) {
            g.fillStyle = '#3a1420';
            g.beginPath(); g.ellipse(cx + 16.6, cy, 3, 3.2, 0, 0, 6.2832); g.fill();
        }
        // la nariz en la punta y los dos incisivos, siempre fuera: es lo que
        // dice «rata» de un vistazo
        pieza(g, cx + 18.2, cy, 1.5, 1.2, R.rosa, R.rosaLuz, R.rosaSombra, 0, 1.2);
        const saca = ataca ? 3.4 : 1.7;
        for (const lado of [-1, 1]) {
            g.strokeStyle = TINTA; g.lineWidth = 1.5;
            g.beginPath();
            g.moveTo(cx + 16.2, cy + lado * 0.5);
            g.lineTo(cx + 17.2 + saca, cy + lado * (1.1 + saca * 0.4));
            g.lineTo(cx + 15.8, cy + lado * 2.4);
            g.closePath(); g.stroke();
            g.fillStyle = R.diente; g.fill();
        }

        // los bigotes: claros y cortos, solo para romper el canto del morro
        g.strokeStyle = R.peloLuz; g.lineWidth = 0.55;
        for (let i = -1; i <= 1; i++) for (const lado of [-1, 1]) {
            g.beginPath();
            g.moveTo(cx + 16, cy + lado * 1.4);
            g.quadraticCurveTo(cx + 18.2, cy + lado * (2.9 + i * 1.4), cx + 20.4, cy + lado * (4 + i * 2.1));
            g.stroke();
        }

        for (const lado of [-1, 1]) {
            const oy = cy + lado * 3.1;
            if (herida) {
                g.strokeStyle = TINTA; g.lineWidth = 1.3;
                g.beginPath(); g.moveTo(cx + 9, oy - 1.1); g.lineTo(cx + 12, oy + 1.1); g.stroke();
            } else {
                g.fillStyle = R.ojo;
                g.beginPath(); g.ellipse(cx + 10.6, oy, 1.9, 1.7, lado * 0.3, 0, 6.2832); g.fill();
                brillo(g, cx + 11.2, oy - 0.6, 0.65, 0.5, 0, 0.85);
            }
        }
        g.restore();
    }

    // ---------- El esqueleto · huesos, no bulto ----------
    // Va desnudo -ni capa ni jirones- y sin costillar de por medio: solo los
    // huesos que se ven de verdad, colgados de un espinazo que hace de eje. El
    // cráneo queda en medio de los dos hombros y los brazos salen de ellos, con
    // la hoja en el de la mano. Es la traza del hueso la que dice «esqueleto».
    const H = {
        hueso: '#e6dcc0', huesoLuz: '#fff8e4', huesoSombra: '#9c8f70',
        herrumbre: '#8a5a34', herrumbreLuz: '#b8814d',
        acero: '#b6c0cd', aceroLuz: '#e6edf6',
        brasa: '#e05a2a', brasaLuz: '#ffb066'
    };

    // Un hueso cualquiera: tinta por fuera, hueso dentro y una luz encima. Con
    // esto están hechos el espinazo y los dos brazos.
    function traza(g, camino, ancho) {
        g.lineCap = 'round'; g.lineJoin = 'round';
        for (const par of [[TINTA, ancho + 1.6], [H.hueso, ancho], [H.huesoLuz, ancho * 0.36]]) {
            g.strokeStyle = par[0]; g.lineWidth = par[1];
            g.beginPath(); camino(); g.stroke();
        }
    }

    function dibujarEsqueleto(g, c, pose = 'quieto', fase = 0) {
        const anda = pose === 'andar', ataca = pose === 'ataque', herida = pose === 'dano';
        const vaiven = anda ? Math.sin(fase) : 0;
        const cx = c + (ataca ? 2.5 : herida ? -2 : 0), cy = c + vaiven * 0.6;

        // ---------- las costillas ----------
        // Por detrás de la calavera y no debajo, en una placa de hueso propia de
        // la que solo asoma la mitad: centradas quedaban tapadas casi enteras.
        pieza(g, cx - 9, cy, 7, 9.2, H.hueso, H.huesoLuz, H.huesoSombra, 0, 2.4);
        g.save();
        g.beginPath(); g.ellipse(cx - 9, cy, 7, 9.2, 0, 0, 6.2832); g.clip();
        g.strokeStyle = H.huesoSombra; g.lineWidth = 1;
        for (let i = -2; i <= 2; i++) {
            g.beginPath();
            g.moveTo(cx - 15.5, cy + i * 3.1);
            g.quadraticCurveTo(cx - 9, cy + i * 3.6, cx - 2.5, cy + i * 3.1);
            g.stroke();
        }
        g.restore();

        // ---------- los hombros y el brazo suelto ----------
        // Cuelgan del mismo punto que el cráneo, que es lo que deja la cabeza
        // justo en medio. El otro brazo va con la hoja y se dibuja más abajo,
        // dentro de su mismo giro.
        const hombro = lado => P2(cx - 1, cy + lado * 11.5);
        const balanceo = anda ? vaiven * 2.2 : herida ? -2.5 : 0;
        for (const lado of [-1, 1]) {
            const o = hombro(lado);
            pieza(g, o.x, o.y, 3.4, 3, H.hueso, H.huesoLuz, H.huesoSombra, 0, 2);
        }
        const libre = hombro(-1);
        traza(g, () => {
            g.moveTo(libre.x, libre.y);
            g.quadraticCurveTo(cx - 6.5, cy - 16 - balanceo, cx - 2.5, cy - 13 - balanceo);
        }, 2.8);
        pieza(g, cx - 2, cy - 12.8 - balanceo, 2.3, 2, H.hueso, H.huesoLuz, H.huesoSombra, 0, 1.5);

        // ---------- el cráneo ----------
        // Centrado entre los dos hombros, no por delante: es lo que lo lee como
        // esqueleto plantado y no como calavera con un torso pegado detrás.
        const giroCabeza = herida ? -0.3 : vaiven * 0.07;
        g.save();
        g.translate(cx - 1, cy); g.rotate(giroCabeza); g.translate(-(cx - 1), -cy);
        pieza(g, cx - 1, cy, 8.4, 7.6, H.hueso, H.huesoLuz, H.huesoSombra, 0, 2.6);

        // La sutura en diente de sierra y su sombra: es lo que dice que ese
        // redondel pálido es un cráneo y no un huevo.
        const sutura = [];
        for (let i = 0; i <= 8; i++)
            sutura.push(P2(cx - 7.6 + i * 1.15, cy + 0.9 + (i % 2 ? -1.5 : 1.5)));
        g.save();
        g.beginPath(); g.ellipse(cx - 1, cy, 8.4, 7.6, 0, 0, 6.2832); g.clip();
        g.globalAlpha = 0.5; g.fillStyle = H.huesoSombra;
        g.beginPath(); g.moveTo(sutura[0].x - 6, cy + 12);
        for (const q of sutura) g.lineTo(q.x, q.y);
        g.lineTo(cx + 11, cy + 12); g.closePath(); g.fill();
        g.restore();
        g.strokeStyle = H.huesoSombra; g.lineWidth = 0.85; g.lineJoin = 'round';
        g.beginPath();
        sutura.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y));
        g.stroke();

        // las cuencas, con su brasa; al recibir se le apagan
        for (const lado of [-1, 1]) {
            const ox = cx + 2.4, oy = cy + lado * 3.3;
            g.fillStyle = TINTA;
            g.beginPath(); g.ellipse(ox, oy, 3.1, 2.8, lado * 0.3, 0, 6.2832); g.fill();
            g.fillStyle = '#120d16';
            g.beginPath(); g.ellipse(ox, oy, 2.4, 2.1, lado * 0.3, 0, 6.2832); g.fill();
            if (!herida) {
                g.fillStyle = H.brasa;
                g.beginPath(); g.ellipse(ox + 0.7, oy, 1.15, 1, 0, 0, 6.2832); g.fill();
                brillo(g, ox + 0.9, oy - 0.3, 0.5, 0.4, 0, 0.8);
            }
        }
        // el hueco de la nariz, entre las cuencas y en el canto de delante
        g.fillStyle = '#120d16';
        g.beginPath();
        g.moveTo(cx + 4.4, cy - 1.4); g.lineTo(cx + 6.2, cy); g.lineTo(cx + 4.4, cy + 1.4);
        g.closePath(); g.fill();
        g.restore();

        // ---------- el brazo de la hoja ----------
        // Brazo y hoja giran juntos sobre el hombro, no sobre el centro del
        // bicho: así el tajo barre de verdad y el hueso no se desprende.
        const gozne = hombro(1);
        const tajo = ataca ? (fase - 0.5) * 0.85 : vaiven * 0.06;
        g.save();
        g.translate(gozne.x, gozne.y); g.rotate(tajo); g.translate(-gozne.x, -gozne.y);
        traza(g, () => {
            g.moveTo(gozne.x, gozne.y);
            g.quadraticCurveTo(cx + 4.5, cy + 14.5, cx + 7.5, cy + 9.5);
        }, 2.8);
        pieza(g, cx + 7.6, cy + 9.2, 2.4, 2.1, H.hueso, H.huesoLuz, H.huesoSombra, 0, 1.5);

        // la hoja mellada barre de abajo arriba mientras dura el golpe: la pose
        // dice que pega y la fase, por dónde va el tajo
        const hoja = [P2(cx + 8, cy + 7.5), P2(cx + 12.5, cy + 5),
                      P2(cx + 15.5, cy + 0.5), P2(cx + 15.5, cy - 5.5)];
        apendice(g, hoja, H.acero, 2.6, 0.9, 1.5, H.aceroLuz);
        g.fillStyle = H.herrumbre;
        for (let i = 0; i < 5; i++) {
            const q = enCurva(hoja, 0.2 + i * 0.16);
            disco(g, q.x + 0.5, q.y + 0.4, 0.75);
        }
        // las mellas: mordiscos de tinta en el filo
        g.fillStyle = TINTA;
        for (const t of [0.35, 0.62, 0.8]) {
            const q = enCurva(hoja, t);
            disco(g, q.x + 1.2, q.y - 0.9, 1);
        }
        g.restore();
    }

    // ---------- El ciempiés · el ōmukade ----------
    const C = {
        laca: '#a82a1e', lacaLuz: '#d9604a', lacaSombra: '#5c1210',
        oro: '#c9a24e', oroLuz: '#f2d78e',
        pata: '#57323a',
        ojo: '#f0d68a'
    };

    const ANILLOS = 12;
    const suave = x => { const k = Math.min(Math.max(x, 0), 1); return k * k * (3 - 2 * k); };
    const grueso = t => 2 + 2.9 * suave(t / 0.3) * (1 - 0.2 * suave((t - 0.78) / 0.22));

    function ondaCiempies(t, pose, fase) {
        const amplitud = pose === 'dano' ? 4.2 : pose === 'ataque' ? 3.2 : pose === 'andar' ? 2.2 : 1.4;
        const vueltas = pose === 'dano' ? 0.85 : pose === 'ataque' ? 1.05 : 1.2;
        const corrimiento = pose === 'andar' ? fase : pose === 'ataque' ? 1.2
            : pose === 'dano' ? 2.4 : 0.6;
        return Math.sin(t * vueltas * 6.2832 + corrimiento) * amplitud;
    }

    function dibujarCiempies(g, c, pose = 'quieto', fase = 0) {
        const ataca = pose === 'ataque', herida = pose === 'dano', anda = pose === 'andar';
        const largo = herida ? 23 : 26;

        const eje = [];
        for (let i = 0; i < ANILLOS; i++) {
            const t = i / (ANILLOS - 1);
            eje.push({ t, x: c - 2.5 - largo / 2 + t * largo, y: c + ondaCiempies(t, pose, fase) });
        }
        for (let i = 0; i < ANILLOS; i++) {
            const a = eje[Math.max(i - 1, 0)], b = eje[Math.min(i + 1, ANILLOS - 1)];
            eje[i].giro = Math.atan2(b.y - a.y, b.x - a.x);
        }

        // ---------- las patas ----------
        // Largas, finas y quebradas por la rodilla hacia atrás: es la orla de
        // patas, y no el bulto, lo que dice ciempiés de un vistazo.
        for (let i = 1; i < ANILLOS - 1; i++) {
            const s = eje[i], an = grueso(s.t);
            for (const lado of [-1, 1]) {
                const remo = anda ? Math.sin(fase - i * 0.55) * 0.3 : 0;
                const recoge = herida ? 0.5 : ataca ? 1.12 : 1;
                const a = s.giro + lado * (1.42 + remo);
                const l = (an * 1.5 + 3.8) * recoge;
                const cad = P2(s.x + Math.cos(a) * an * 0.7, s.y + Math.sin(a) * an * 0.7);
                const codo = P2(cad.x + Math.cos(a) * l * 0.7, cad.y + Math.sin(a) * l * 0.7);
                const pie = P2(codo.x + Math.cos(a) * l * 0.34 - Math.cos(s.giro) * l * 0.72,
                               codo.y + Math.sin(a) * l * 0.34 - Math.sin(s.giro) * l * 0.72);
                apendice(g, [cad, codo, codo, pie], C.pata, 0.75, 0.3, 0.4);
            }
        }

        // ---------- las patas del último anillo ----------
        // Dos patas más, finas y tendidas hacia atrás, que es lo que arrastra
        // un ciempiés por detrás (gordas y abiertas eran una cola en abanico).
        const cola = eje[0];
        for (const lado of [-1, 1]) {
            const a = cola.giro + 3.1416;
            apendice(g, [P2(cola.x, cola.y + lado * 1.6),
                P2(cola.x + Math.cos(a) * 4, cola.y + Math.sin(a) * 4 + lado * 2.4),
                P2(cola.x + Math.cos(a) * 7, cola.y + Math.sin(a) * 7 + lado * 3.4),
                P2(cola.x + Math.cos(a) * 9.5, cola.y + Math.sin(a) * 9.5 + lado * 4.2)], C.pata, 0.95, 0.28, 0.5);
        }

        // ---------- el caparazón: placas de laca con el filo dorado ----------
        for (let i = 0; i < ANILLOS - 1; i++) {
            const s = eje[i], an = grueso(s.t);
            // el filete de oro asoma por delante de cada placa, que es por donde
            // se le ve el canto a una escama de laca que otra monta
            pieza(g, s.x + Math.cos(s.giro) * 1.1, s.y + Math.sin(s.giro) * 1.1,
                  an * 0.62, an * 0.9, C.oro, C.oroLuz, null, s.giro, 1.4);
            pieza(g, s.x, s.y, an * 0.58, an * 0.86, C.laca, C.lacaLuz, C.lacaSombra, s.giro, 1.2);
        }

        // ---------- la cabeza ----------
        const h = eje[ANILLOS - 1], an = grueso(1) * 1.05;
        pieza(g, h.x + 1, h.y, an * 1.15, an, '#2a1418', '#4a2028', '#150a0e', h.giro, 1.8);

        // las antenas: dos hilos largos y finos barriendo por delante
        for (const lado of [-1, 1]) {
            const r0 = P2(h.x + an * 0.75, h.y + lado * an * 0.6);
            apendice(g, [r0, P2(r0.x + 3.5, r0.y + lado * 2.4),
                         P2(r0.x + 6.5, r0.y + lado * 3.6),
                         P2(r0.x + 9, r0.y + lado * 3.4)], C.pata, 0.7, 0.26, 0.4);
        }
        // las pinzas, doradas: es lo que se le ve primero
        const abre = ataca ? 1 : herida ? 0.2 : 0.5;
        for (const lado of [-1, 1]) {
            const r0 = P2(h.x + an * 1.05, h.y + lado * an * 0.3);
            apendice(g, [r0, P2(r0.x + 2.4, r0.y + lado * 3 * abre),
                         P2(r0.x + 4.8, r0.y + lado * 3 * abre),
                         P2(r0.x + 6, r0.y + lado * (0.3 - abre * 0.2))], C.oro, 1.35, 0.28, 0.8);
        }
        for (const lado of [-1, 1]) {
            const oy = h.y + lado * an * 0.5;
            if (herida) {
                g.strokeStyle = TINTA; g.lineWidth = 1.3;
                g.beginPath(); g.moveTo(h.x, oy - 1.2); g.lineTo(h.x + 3.4, oy + 1.2); g.stroke();
            } else {
                g.fillStyle = C.ojo;
                g.beginPath(); g.ellipse(h.x + 1.8, oy, 1.7, 1.4, lado * 0.3, 0, 6.2832); g.fill();
                brillo(g, h.x + 2.4, oy - 0.5, 0.6, 0.45, 0, 0.85);
            }
        }
    }

    // ---------- Las fichas ----------
    // Lo que mide y lo que pega cada uno: las mismas cifras con que la mazmorra
    // los planta, así el bestiario no promete nada que no se cumpla en la senda.
    //
    //   art    - el artículo, que sí se traduce (msg.articuloEl / msg.articuloLa).
    //   clase  - separa el paso llano del semijefe, que es lo que el bestiario
    //            mira para enseñar una pestaña u otra; sin ella cuenta 'enemigo'.
    //   zonas  - en qué comarcas sale, por el id de biomas.js, y en lista porque
    //            un bicho puede repetirse en varias. Los jefes la declaran en
    //            singular (zona), que es la que les reserva su columna.
    //   vista  - hasta dónde se dan por enterados, en pasos de camino.
    //   talla  - lo que se agranda su figura al dibujarla; sin ella todos salen
    //            del mismo tamaño, porque todas las láminas llenan igual el cuadro.
    //   largo  - cuántas veces es más largo que ancho. Con 1 el cuerpo es el
    //            círculo de siempre; con más se le tumba un palo de ese largo en
    //            la dirección a la que mira y se le mide contra él, para que se
    //            le acierte por el lomo. Sale de medirle el bulto, no la silueta
    //            (la cola de la rata se arrastra solo por detrás y el palo crece
    //            por los dos lados).
    const fichas = [
        {
            id: 'rata', art: 'la', nombre: 'rata', clase: 'enemigo',
            zonas: ['catacumbas'],
            figura: dibujarRata,
            // 0,93 la deja en 1,48 casillas de punta a punta; el bulto -lo que
            // de verdad choca- se queda en las 0,94 de su cerco
            r: 0.26, vel: 3.3, hp: 10, dano: 5,
            alcance: 0.6, cadencia: 0.9, vista: 13, talla: 0.93, largo: 1.8
        },
        {
            id: 'esqueleto', art: 'el', nombre: 'esqueleto', clase: 'enemigo',
            zonas: ['catacumbas'],
            figura: dibujarEsqueleto,
            // Con 1 se dibuja del mismo tamaño que el héroe. Alcanza más que
            // ninguno -para eso lleva hoja- y lo paga siendo lento.
            r: 0.45, vel: 2.5, hp: 22, dano: 9,
            alcance: 0.95, cadencia: 1.2, vista: 14, talla: 1
        },
        {
            id: 'ciempies', art: 'el', nombre: 'ciempiés', clase: 'enemigo',
            zonas: ['alcantarillas'],
            figura: dibujarCiempies,
            r: 0.6, vel: 2.1, hp: 30, dano: 10,
            alcance: 0.45, cadencia: 1.3, vista: 13, talla: 2, largo: 2.8
        }
    ];

    const ficha = id => fichas.find(f => f.id === id) || null;

    // La bestia sin figura devuelve nulo y quien la pida no pinta nada.
    const figura = id => (ficha(id) || {}).figura || null;

    // Pintar una bestia en un lienzo cuadrado del tamaño que sea. Lo usan los
    // dos sitios que la enseñan -la senda y el bestiario-, que es la razón de
    // que viva aquí y no en cada uno por su cuenta.
    function pintar(g, lado, id, pose, fase) {
        const dibujar = figura(id);
        if (!dibujar) return false;
        g.save();
        g.scale(lado / CUADRO, lado / CUADRO);
        dibujar(g, CUADRO / 2, pose || 'quieto', fase || 0);
        g.restore();
        return true;
    }

    return { CUADRO, POSES, fichas, ficha, figura, pintar };
})();

// ============================================================
//  La cuenta: lo eliminado y lo que te ha eliminado
// ============================================================
// Vive en la ranura, bajo 'bestiario', con la forma
// { rata: { caidos, caidas }, ... }. Sin la clave, todo empieza a cero.
const MARCA_VACIA = { caidos: 0, caidas: 0 };

// El ninja pasó a ser rata y el oni, ciempiés: lo contado bajo el nombre viejo
// se traspasa al leer. Se llama distinto del NOMBRES_VIEJOS de personaje.js
// porque repetir un const global tumba el archivo.
const RENOMBRADAS = { ninja: 'rata', oni: 'ciempies' };

const Bestiario = {

    leer() {
        const guardado = (typeof Partidas !== 'undefined')
            ? (Partidas.actual().bestiario || {}) : {};
        return this.alDia(guardado);
    },

    // pasa los nombres viejos a los de ahora; si ya hay algo bajo el nuevo,
    // manda ese y el viejo deja de mirarse
    alDia(cuenta) {
        const puesta = Object.assign({}, cuenta);
        for (const viejo in RENOMBRADAS) {
            const nuevo = RENOMBRADAS[viejo];
            if (puesta[viejo] !== undefined && puesta[nuevo] === undefined)
                puesta[nuevo] = puesta[viejo];
        }
        return puesta;
    },

    guardar(cuenta) {
        if (typeof Partidas !== 'undefined') Partidas.guardarActual({ bestiario: cuenta });
    },

    // nunca devuelve nulo: lo que no se ha visto todavía vale cero
    marca(id) {
        return Object.assign({}, MARCA_VACIA, this.leer()[id]);
    },

    // se anota al momento, no al cruzar la puerta: caer cuesta el botín, pero
    // lo aprendido no se desaprende
    anotar(id, campo) {
        if (!BESTIAS.ficha(id)) return;
        const cuenta = this.leer();
        const marca = Object.assign({}, MARCA_VACIA, cuenta[id]);
        marca[campo]++;
        this.guardar(Object.assign({}, cuenta, { [id]: marca }));
    },

    anotarCaido(id) { this.anotar(id, 'caidos'); },
    anotarCaida(id) { this.anotar(id, 'caidas'); }
};

// ---------- El panel de prev.html ----------
// Las demás pantallas cargan este archivo solo por las fichas y las láminas.
// El panel tiene dos caras: la rejilla (retrato y nombre) y la hoja, que se
// abre al pulsar una y trae todo lo que se sabe del bicho. La salida es única
// -el botón de debajo del panel-, y lo que cambia es a dónde lleva.
(function montarBestiario() {
    const caja = document.getElementById('bestiario');
    const boton = document.getElementById('btBestiario');
    if (!caja || !boton) return;

    // el de debajo del panel, que es de todos y aquí se toma prestado
    const salida = document.getElementById('btCerrarPanel');

    // Tres renglones desde el primer día, con los sitios vacíos ya hechos, para
    // que el panel no cambie de tamaño al descubrir uno. Diez columnas, las
    // mismas comarcas de biomas.js, que la pestaña de jefes aprovecha para
    // reservarle su columna a cada una (ver celdasJefes).
    // Se llena hacia abajo: lo manda el grid-auto-flow del css y aquí solo se
    // cuenta igual, para no dejar una columna a medio empezar.
    const RENGLONES = 3;
    const COLUMNAS = 10;

    // la bestia que se está mirando en grande; con null se ve la rejilla
    let abierta = null;

    // qué pestaña toca. Empieza -y vuelve a empezar al abrir el panel- en
    // enemigos, que es lo que hay ahora mismo
    const CATEGORIAS = ['enemigo', 'jefe'];
    let categoria = 'enemigo';

    // Si esta ranura ya se ha cruzado con ella. Antes del primer golpe que la
    // tumba no aparece: el hueco queda como el de una bestia que no existe.
    function descubierta(f) { return Bestiario.marca(f.id).caidos > 0; }

    // ---------- La rejilla ----------
    function celda(f, alta) {
        return `
        <button type="button" class="bestia${alta ? ' alta' : ''}" data-bestia="${f.id}">
            <span class="retrato"><canvas class="figura" data-bestia="${f.id}"
                                            width="120" height="120"></canvas></span>
            <span class="nombre">${f.nombre.toUpperCase()}</span>
        </button>`;
    }

    // el sitio que espera bestia. El título es lo único que cambia de un hueco
    // a otro; los de la pestaña de jefes lo afinan más, ver celdaJefe
    function vacia(titulo, alta) {
        return `
        <div class="bestia vacia${alta ? ' alta' : ''}" title="${titulo || TR('bestiario.hueco')}">
            <span class="incognita">？</span>
        </div>`;
    }

    // el nombre de una comarca traducido, teniendo ya su ficha y no el nivel
    function nombreZona(zona) {
        const clave = 'bioma.' + zona.id;
        const dicho = TR(clave);
        return dicho === clave ? zona.nombre : dicho;
    }

    // Los dos rangos de jefe de cada comarca, en el orden en que se plantan.
    // Cuando exista una ficha con clase 'jefe' y estas señas -zona y rango-
    // aparece sola en su sitio; hasta entonces el hueco dice de quién se espera.
    const RANGOS_JEFE = [['semijefe', 'bestiario.semijefe'], ['jefe', 'bestiario.jefeDeZona']];

    function celdaJefe(zona, rango, claveRotulo, alta) {
        const f = BESTIAS.fichas.find(x => x.clase === 'jefe' && x.zona === zona.id && x.rango === rango);
        // sin ficha, o con ficha y sin tumbarla nunca: el mismo hueco
        return (f && descubierta(f)) ? celda(f, alta)
            : vacia(`${TR(claveRotulo)} — ${nombreZona(zona)}`, alta);
    }

    // Una columna por comarca, en el orden en que se atraviesan, con el
    // semijefe y el jefe uno debajo del otro. La columna no son tres sitios
    // iguales: el primero vale por dos renglones (lámina de pie) y el segundo
    // se queda con el que sobra; lo alto lo hace la clase «alta» en el css.
    // Sin biomas.js la lista sale vacía y rejilla() la rellena en blanco.
    function celdasJefes() {
        const zonas = (typeof Biomas !== 'undefined' && Biomas.lista) ? Biomas.lista : [];
        const celdas = [];
        for (const zona of zonas)
            RANGOS_JEFE.forEach(([rango, rotulo], i) =>
                celdas.push(celdaJefe(zona, rango, rotulo, i === 0)));
        return celdas;
    }

    // una columna de jefes en blanco, con sus dos sitios: el alto y el llano
    function columnaVacia() { return [vacia(null, true), vacia()]; }

    // las dos pestañas de arriba: ENEMIGOS y JEFES, con la que toca marcada
    function pestanas() {
        const rotulo = { enemigo: 'bestiario.enemigos', jefe: 'bestiario.jefes' };
        return `
        <div class="pestanas" role="tablist">
            ${CATEGORIAS.map(c => `
            <button type="button" class="pestana${c === categoria ? ' activa' : ''}"
                    role="tab" aria-selected="${c === categoria}" data-categoria="${c}">
                ${TR(rotulo[c])}
            </button>`).join('')}
        </div>`;
    }

    function rejilla() {
        const esJefes = categoria === 'jefe';

        // las bestias que de verdad hay en esta pestaña, para la nota de abajo
        const propias = BESTIAS.fichas.filter(f => (f.clase || 'enemigo') === categoria);

        // en jefes manda la disposición por comarca; en enemigos es el cajón de
        // siempre. El map va con lambda a posta: el segundo argumento de celda
        // es si va alta, y map le pasaría ahí el índice
        const celdas = esJefes ? celdasJefes()
            : propias.map(f => descubierta(f) ? celda(f) : vacia());

        // Nunca menos de diez columnas ni una a medio empezar: en enemigos la
        // columna son tres sitios y en jefes dos, así que se rellena de dos en dos.
        if (esJefes) {
            const columnas = Math.max(COLUMNAS, Math.ceil(celdas.length / RANGOS_JEFE.length));
            while (celdas.length < columnas * RANGOS_JEFE.length)
                celdas.push(...columnaVacia());
        } else {
            const sitios = Math.max(COLUMNAS * RENGLONES,
                Math.ceil(celdas.length / RENGLONES) * RENGLONES);
            while (celdas.length < sitios) celdas.push(vacia());
        }

        // sin nadie en la pestaña, la nota no repite el «pulsa una bestia»
        const nota = propias.length ? TR('bestiario.nota') : TR('bestiario.sinJefes');
        return `
            <h2>${TR('bestiario.titulo')}</h2>
            <p class="saldo">${TR('bestiario.lema')}</p>
            ${pestanas()}
            <div class="rejilla">${celdas.join('')}</div>
            <p class="nota">${nota}</p>`;
    }

    // ---------- La hoja ----------
    // El bicho arriba y lo tuyo con él debajo, en dos listas.
    const dato = (clave, valor) => `<div><dt>${TR(clave)}</dt><dd>${valor}</dd></div>`;

    // Las comarcas en que sale, ya traducidas: los jefes la declaran en
    // singular (zona) y los demás en lista (zonas). Quien no diga nada no
    // enseña el renglón.
    function comarcasDe(f) {
        const ids = f.zonas || (f.zona ? [f.zona] : []);
        const zonas = (typeof Biomas !== 'undefined' && Biomas.lista) ? Biomas.lista : [];
        return ids.map(id => {
            const z = zonas.find(x => x.id === id);
            return z ? nombreZona(z) : id;
        });
    }

    function hoja(f) {
        const marca = Bestiario.marca(f.id);
        const comarcas = comarcasDe(f);
        return `
            <h2>${TR('bestiario.titulo')}</h2>
            <div class="hoja">
                <div class="lamina">
                    <div class="retrato grande"><canvas class="figura" data-bestia="${f.id}"
                                                         width="300" height="300"></canvas></div>
                    ${comarcas.length ? `<p class="comarca">
                        <span>${TR('bestiario.comarca')}</span>${comarcas.join(' · ')}</p>` : ''}
                </div>
                <div class="cuerpo">
                    <h3>${f.nombre.toUpperCase()}</h3>
                    <p class="pie">${TR('bestia.' + f.id + '.pie')}</p>
                    <dl class="fichas">
                        ${dato('bestiario.pv', f.hp)}
                        ${dato('bestiario.dano', f.dano)}
                        ${dato('bestiario.golpes', (1 / f.cadencia).toFixed(1))}
                        ${dato('bestiario.velocidad', f.vel.toFixed(1))}
                        ${dato('bestiario.vista', f.vista)}
                    </dl>
                    <dl class="fichas cuenta">
                        ${dato('bestiario.caidos', marca.caidos)}
                        ${dato('bestiario.caidas', marca.caidas)}
                    </dl>
                </div>
            </div>`;
    }

    // El botón de debajo dice a dónde lleva: VOLVER con una hoja abierta, y
    // CERRAR en la rejilla. Se le cambia también el data-t, que es de donde se
    // resurte al cambiar de lengua.
    function vestirSalida() {
        if (!salida) return;
        const clave = abierta ? 'comun.volver' : 'comun.cerrar';
        salida.dataset.t = clave;
        salida.textContent = TR(clave);
    }

    // Las figuras se pintan a mano tras montar el html: son de código y no
    // archivos, así que no basta con darles un src.
    function pintarFiguras() {
        for (const lienzo of caja.querySelectorAll('canvas.figura')) {
            const g = lienzo.getContext('2d');
            g.clearRect(0, 0, lienzo.width, lienzo.height);
            BESTIAS.pintar(g, lienzo.width, lienzo.dataset.bestia, 'quieto', 0);
        }
    }

    function pintar() {
        const f = abierta && BESTIAS.ficha(abierta);
        caja.innerHTML = f ? hoja(f) : rejilla();
        pintarFiguras();
        // el marco se ciñe por abajo con una hoja delante; la rejilla lo
        // devuelve, que ahí va la barra de desplazamiento
        caja.classList.toggle('enHoja', !!f);
        vestirSalida();
    }

    // un solo oyente en la caja: dentro se repinta entera a cada paso
    caja.addEventListener('click', e => {
        const pestana = e.target.closest('[data-categoria]');
        if (pestana) {
            const c = pestana.dataset.categoria;
            if (c !== categoria) { categoria = c; pintar(); }
            return;
        }
        const elegida = e.target.closest('[data-bestia]');
        if (elegida) { abierta = elegida.dataset.bestia; pintar(); }
    });

    // abrir y cerrar es cosa de menu.js; sin él, esto se abre igual. Se entra
    // siempre por la rejilla de enemigos.
    boton.addEventListener('click', () => {
        if (typeof alternar === 'function') alternar('bestiario');
        else caja.hidden = !caja.hidden;
        abierta = null;
        categoria = 'enemigo';
        if (caja.hidden) vestirSalida(); else pintar();
    });

    // Las dos salidas -el botón de debajo y Esc- deshacen un paso cada vez: con
    // una hoja abierta vuelven a la rejilla, y solo desde ella cierran el panel.
    // Lo segundo lo hace menu.js, que escucha después que este.
    function recogerHoja(e) {
        if (caja.hidden || !abierta) return false;
        abierta = null;
        pintar();
        e.stopImmediatePropagation();
        return true;
    }

    if (salida) salida.addEventListener('click', recogerHoja);

    addEventListener('keydown', e => {
        if (e.key !== 'Escape' || caja.hidden) return;
        if (recogerHoja(e)) return;
        if (typeof cerrarPaneles !== 'function') { caja.hidden = true; vestirSalida(); }
    });
})();
