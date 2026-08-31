/* ============================================================
biomas.js - las diez comarcas que atraviesa la senda

Aquí no se dibuja ni se juega: solo se declara cómo es cada tramo
del camino. La senda 1 arranca bajo tierra y la 100 termina en el
santuario, y cada diez peldaños el mundo cambia de piel.

Todo lo que distingue a un bioma vive en su ficha: el trazado de la
planta, los colores, qué corona los muros, qué se ve más allá del
recinto, con qué se adorna, qué trampas esconde y cómo es su aire.
Quien quiera añadir, quitar o reordenar comarcas solo tiene que
tocar la lista: el HUD, el mapa y el decorado leen de aquí.
   ============================================================ */
'use strict';

// Cuántas sendas se anda dentro de un mismo bioma
const TRAMO_BIOMA = 10;

const BIOMAS = [

    // ---------------------------------------------------------
    //  1-10 · Bajo tierra, entre los que ya no hablan
    // ---------------------------------------------------------
    {
        id: 'catacumbas',
        nombre: 'Catacumbas',
        emblema: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.4 20.4V10.4a7.6 7.6 0 0 1 15.2 0v10Z" fill="#000" opacity=".45"/><path d="M4.4 20.4V10.4a7.6 7.6 0 0 1 15.2 0v10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 4.2v16.2M8.4 5.6v14.8M15.6 5.6v14.8M5.4 13.6h13.2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="2.6" y="20.2" width="18.8" height="2.6" rx=".9"/></svg>',
        lore: '',
        planta: { salas: [2, 3], ancho: [13, 22], alto: [8, 12], pasillo: 3, chaflan: 0.7, atajos: 1 },
        piso: 'losa',
        remate: 'roca',
        afueras: 'roca',
        paleta: {
            fondoAlto: '#1a1626', fondoBajo: '#0f0c19',
            suelo: '#4a4657', sueloLuz: '#5b5668', sueloSombra: '#322e3d',
            junta: 'rgba(18, 14, 28, 0.65)',
            zocalo: '#3c3847', zocaloLuz: '#544f60', zocaloSombra: '#25222e',
            bordeBase: '#332f3e', bordeLuz: '#4a4557', bordeSombra: '#1c1926',
            mota: '#6b6478', tinte: '#8f7fb0'
        },
        adornos: [
            { tipo: 'velon', prob: 0.09, sep: 5, luz: { r: 3.4, color: [255, 196, 120], fuerza: 0.7 } },
            { tipo: 'urna', prob: 0.08, sep: 4 },
            { tipo: 'nicho', prob: 0.07, sep: 4, esquina: true },
            { tipo: 'huesos', prob: 0.09, sep: 3 },
            { tipo: 'rocalla', prob: 0.09, sep: 2.4 }
        ],
        trampas: null,
        ambiente: { forma: 'mota', cuantas: 28, color: '#9a8fb8', vel: [-8, -20],
                    luciernagas: 0, oscuridad: 0.87, velo: '18, 14, 34' },
        minimapa: { suelo: '#4a4657', muro: '#211e2b' }
    },

    // ---------------------------------------------------------
    //  11-20 · Lo que la ciudad tira y olvida
    // ---------------------------------------------------------
    {
        id: 'alcantarillas',
        nombre: 'Alcantarillas',
        emblema: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="8.4" opacity=".3"/><path d="M3.6 12h16.8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M5 8h14M5 16h14" stroke="currentColor" stroke-width="1.7" fill="none"/><circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
        lore: '',
        planta: { salas: [3, 4], ancho: [11, 18], alto: [6, 9], pasillo: 4, chaflan: 0.15, atajos: 2 },
        piso: 'ladrillo',
        remate: 'roca',
        afueras: 'roca',
        paleta: {
            fondoAlto: '#152018', fondoBajo: '#0c130e',
            suelo: '#4a4a3e', sueloLuz: '#5b5a4c', sueloSombra: '#32332a',
            junta: 'rgba(14, 20, 14, 0.6)',
            zocalo: '#3a4038', zocaloLuz: '#4e5549', zocaloSombra: '#242a24',
            bordeBase: '#2c332c', bordeLuz: '#41493f', bordeSombra: '#191e19',
            mota: '#7d8f5e', tinte: '#8fc46a'
        },
        adornos: [
            { tipo: 'antorcha', prob: 0.07, sep: 5.5, luz: { r: 3.8, color: [180, 230, 120], fuerza: 0.6 } },
            { tipo: 'tuberia', prob: 0.10, sep: 4, esquina: true },
            { tipo: 'rejilla', prob: 0.08, sep: 3.5 },
            { tipo: 'musgo', prob: 0.12, sep: 2 },
            { tipo: 'barril', prob: 0.06, sep: 4 }
        ],
        // el único tramo con hierro en el suelo: los pinchos suben y bajan
        // solos, y no hay guardia que valga contra lo que viene de abajo
        trampas: { tipo: 'pinchos', cuantas: [5, 8], dano: 8, ciclo: [2.2, 3.4], r: 0.55 },
        ambiente: { forma: 'gota', cuantas: 34, color: '#a8c48a', vel: [70, 130],
                    luciernagas: 0, oscuridad: 0.88, velo: '10, 20, 16' },
        minimapa: { suelo: '#4a4a3e', muro: '#1e241e' }
    },

    // ---------------------------------------------------------
    //  21-30 · La primera bocanada de aire libre
    // ---------------------------------------------------------
    {
        id: 'bambu',
        nombre: 'Bosque de bambú',
        emblema: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="9.4" y="2" width="4.4" height="20" rx="1.2"/><rect x="8.8" y="7.4" width="5.6" height="1.5" fill="#000" opacity=".45"/><rect x="8.8" y="13.4" width="5.6" height="1.5" fill="#000" opacity=".45"/><path d="M13.8 6.6c3.6-.6 5.8.4 6.6 2.2-2.8 1-5.2.4-6.6-2.2Z"/><path d="M9.4 12.2c-3.4-.8-5.4.2-6.2 2-2.8 1.2 4.8.8 6.2-2Z" opacity=".8"/></svg>',
        lore: '',
        planta: { salas: [2, 3], ancho: [18, 28], alto: [10, 13], pasillo: 5, chaflan: 0.85, atajos: 2 },
        piso: 'tierra',
        remate: 'canaveral',
        afueras: 'canaveral',
        paleta: {
            fondoAlto: '#142a2c', fondoBajo: '#0d1b21',
            suelo: '#3f4a35', sueloLuz: '#4e5a41', sueloSombra: '#2a321f',
            junta: 'rgba(16, 26, 18, 0.5)',
            zocalo: '#5d7a3a', zocaloLuz: '#7f9e50', zocaloSombra: '#3a5126',
            bordeBase: '#3d5c2e', bordeLuz: '#6d9048', bordeSombra: '#23381b',
            mota: '#9fd08a', tinte: '#b8e88a',
            hoja: '#2b6b3e', hojaLuz: '#4f9a5c', hojaSombra: '#1a4429',
            hojaFria: '#2a6f6b', hojaFriaLuz: '#4aa197'
        },
        adornos: [
            { tipo: 'toro', prob: 0.06, sep: 6, luz: { r: 3.6, color: [255, 214, 140], fuerza: 0.65 } },
            { tipo: 'cana', prob: 0.14, sep: 2.6 },
            { tipo: 'matorral', prob: 0.10, sep: 2.4 },
            { tipo: 'rocalla', prob: 0.07, sep: 3 },
            { tipo: 'estela', prob: 0.04, sep: 7 }
        ],
        trampas: null,
        ambiente: { forma: 'hoja', cuantas: 30, color: '#7fc46a', vel: [16, 38],
                    luciernagas: 22, oscuridad: 0.76, velo: '12, 30, 34' },
        minimapa: { suelo: '#3f4a35', muro: '#1d3120' }
    },

    // ---------------------------------------------------------
    //  31-40 · Jardines que alguien barrió cada mañana
    // ---------------------------------------------------------
    {
        id: 'patios',
        nombre: 'Patios exteriores',
        emblema: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1.6 20 6H4Z"/><rect x="7.4" y="7.2" width="9.2" height="6" rx="1"/><rect x="9.4" y="8.8" width="5.2" height="3" fill="#000" opacity=".5"/><rect x="10.4" y="13.6" width="3.2" height="4.4"/><path d="M6.6 18.4h10.8L19 22H5Z"/></svg>',
        lore: '',
        planta: { salas: [3, 4], ancho: [14, 22], alto: [7, 10], pasillo: 4, chaflan: 0.4, atajos: 2 },
        piso: 'grava',
        remate: 'muro',
        afueras: 'jardin',
        paleta: {
            fondoAlto: '#152a35', fondoBajo: '#0d1c26',
            suelo: '#6f7166', sueloLuz: '#878978', sueloSombra: '#4d4f48',
            junta: 'rgba(30, 34, 32, 0.35)',
            zocalo: '#7a7d86', zocaloLuz: '#9ba0ab', zocaloSombra: '#53565f',
            bordeBase: '#5c6070', bordeLuz: '#7d8293', bordeSombra: '#383c48',
            mota: '#8fb0a0', tinte: '#a8dcff',
            hoja: '#25543f', hojaLuz: '#3d7f5c', hojaSombra: '#153427',
            hojaFria: '#22585e', hojaFriaLuz: '#3d8a8a'
        },
        adornos: [
            { tipo: 'toro', prob: 0.08, sep: 5, luz: { r: 3.4, color: [255, 210, 130], fuerza: 0.6 } },
            { tipo: 'estanque', prob: 0.05, sep: 6, esquina: true },
            { tipo: 'rocalla', prob: 0.12, sep: 2.4 },
            { tipo: 'sakura', prob: 0.07, sep: 4.5 },
            { tipo: 'matorral', prob: 0.08, sep: 3 }
        ],
        trampas: null,
        ambiente: { forma: 'petalo', cuantas: 32, color: '#ffd3e4', vel: [14, 34],
                    luciernagas: 16, oscuridad: 0.72, velo: '14, 30, 48' },
        minimapa: { suelo: '#6f7166', muro: '#2e3a3e' }
    },

    // ---------------------------------------------------------
    //  41-50 · Bajo techo, entre biombos y tatami
    // ---------------------------------------------------------
    {
        id: 'mansion',
        nombre: 'Mansión señorial',
        emblema: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3 22.4 11H1.6Z"/><rect x="2.6" y="10.4" width="18.8" height="2.2" rx="1"/><rect x="5" y="13.4" width="14" height="8.2" rx=".8" opacity=".75"/><rect x="10.6" y="16.4" width="2.8" height="5.2" fill="#000" opacity=".45"/></svg>',
        lore: '',
        planta: { salas: [3, 4], ancho: [12, 20], alto: [6, 9], pasillo: 3, chaflan: 0.1, atajos: 1 },
        piso: 'tatami',
        remate: 'teja',
        afueras: 'jardin',
        paleta: {
            fondoAlto: '#16274d', fondoBajo: '#101c3a',
            suelo: '#6f9a63', sueloLuz: '#82ad72', sueloSombra: '#4f7350',
            junta: 'rgba(28, 44, 34, 0.6)',
            zocalo: '#8a5f3e', zocaloLuz: '#ad7c53', zocaloSombra: '#5d3d29',
            bordeBase: '#2f7a76', bordeLuz: '#4ea79c', bordeSombra: '#1d4f54',
            mota: '#c8b98f', tinte: '#ffcf72'
        },
        adornos: [
            { tipo: 'farol', prob: 0.10, sep: 5, luz: { r: 4.6, color: [255, 186, 92], fuerza: 0.85 } },
            { tipo: 'brasero', prob: 0.05, sep: 6, luz: { r: 3.4, color: [255, 160, 90], fuerza: 0.7 } },
            { tipo: 'biombo', prob: 0.07, sep: 5, esquina: true },
            { tipo: 'tinaja', prob: 0.07, sep: 3 },
            { tipo: 'sakura', prob: 0.05, sep: 4.5 }
        ],
        trampas: null,
        ambiente: { forma: 'petalo', cuantas: 26, color: '#ffd3e4', vel: [12, 30],
                    luciernagas: 10, oscuridad: 0.82, velo: '14, 22, 54' },
        minimapa: { suelo: '#6f9a63', muro: '#1b2c4e' }
    },

    // ---------------------------------------------------------
    //  51-60 · El pueblo que se marchó y dejó la luz puesta
    // ---------------------------------------------------------
    {
        id: 'plaza',
        nombre: 'Plaza abandonada',
        emblema: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="2.4" y="6.6" width="19.2" height="12.6" rx="1.2" opacity=".7"/><path d="M9.6 6.6 8 19.2M15 6.6l1.4 12.6M2.4 12.8h19.2" stroke="#000" stroke-opacity=".45" stroke-width="1.5" fill="none"/><path d="M11.2 2.4h1.8l-.5 3.6h-.8Z"/><circle cx="12.1" cy="2" r="1.5"/></svg>',
        lore: '',
        planta: { salas: [2, 3], ancho: [20, 30], alto: [11, 13], pasillo: 5, chaflan: 0.3, atajos: 2 },
        piso: 'adoquin',
        remate: 'teja',
        afueras: 'pueblo',
        paleta: {
            fondoAlto: '#1b1f33', fondoBajo: '#111528',
            suelo: '#585c6b', sueloLuz: '#6d7183', sueloSombra: '#3c4050',
            junta: 'rgba(18, 20, 34, 0.55)',
            zocalo: '#6b543c', zocaloLuz: '#8a6e4e', zocaloSombra: '#453626',
            bordeBase: '#46525e', bordeLuz: '#657483', bordeSombra: '#2b333c',
            mota: '#b0a288', tinte: '#ff9a6a'
        },
        adornos: [
            { tipo: 'farol', prob: 0.11, sep: 4.5, luz: { r: 4.8, color: [255, 150, 90], fuerza: 0.9 } },
            { tipo: 'puesto', prob: 0.07, sep: 6, esquina: true },
            { tipo: 'cajas', prob: 0.09, sep: 3 },
            { tipo: 'cartel', prob: 0.06, sep: 5 },
            { tipo: 'barril', prob: 0.06, sep: 3.5 }
        ],
        trampas: null,
        ambiente: { forma: 'ceniza', cuantas: 30, color: '#d8c8a8', vel: [-6, -22],
                    luciernagas: 8, oscuridad: 0.80, velo: '16, 18, 40' },
        minimapa: { suelo: '#585c6b', muro: '#242a3c' }
    },

    // ---------------------------------------------------------
    //  61-70 · Sobre el vacío, con el castillo encima
    // ---------------------------------------------------------
    {
        id: 'foso',
        nombre: 'Foso del castillo',
        emblema: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 9.6h20v2.6H2Z"/><path d="M6.4 12.2a5.6 5.6 0 0 1 11.2 0Z" fill="#000" opacity=".4"/><rect x="4.6" y="6.6" width="2.6" height="3.4"/><rect x="16.8" y="6.6" width="2.6" height="3.4"/><path d="M2 16.4c2.4 0 2.4 1.8 5 1.8s2.6-1.8 5-1.8 2.4 1.8 5 1.8 2.6-1.8 5-1.8v2.4c-2.4 0-2.4 1.8-5 1.8s-2.6-1.8-5-1.8-2.4 1.8-5 1.8-2.6-1.8-5-1.8Z" opacity=".8"/></svg>',
        lore: '',
        planta: { salas: [3, 4], ancho: [10, 16], alto: [6, 9], pasillo: 3, chaflan: 0.05, atajos: 0 },
        piso: 'tablon',
        remate: 'parapeto',
        afueras: 'vacio',
        paleta: {
            fondoAlto: '#0d1220', fondoBajo: '#06090f',
            suelo: '#6b4f36', sueloLuz: '#87664a', sueloSombra: '#44301f',
            junta: 'rgba(20, 14, 8, 0.6)',
            zocalo: '#565b6b', zocaloLuz: '#767c8d', zocaloSombra: '#363a46',
            bordeBase: '#3a3f4d', bordeLuz: '#565d6e', bordeSombra: '#20242e',
            mota: '#8f9bb0', tinte: '#ff7a4a'
        },
        adornos: [
            { tipo: 'antorcha', prob: 0.10, sep: 4.5, luz: { r: 4.2, color: [255, 140, 70], fuerza: 0.9 } },
            { tipo: 'cadena', prob: 0.09, sep: 3.5, esquina: true },
            { tipo: 'banderola', prob: 0.07, sep: 5 },
            { tipo: 'cajas', prob: 0.06, sep: 4 }
        ],
        trampas: null,
        ambiente: { forma: 'ceniza', cuantas: 26, color: '#9fb0c8', vel: [-10, -26],
                    luciernagas: 0, oscuridad: 0.86, velo: '8, 12, 28' },
        minimapa: { suelo: '#6b4f36', muro: '#141926' }
    },

    // ---------------------------------------------------------
    //  71-80 · Arriba, donde el viento no calla
    // ---------------------------------------------------------
    {
        id: 'torreones',
        nombre: 'Torreones',
        emblema: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.6 5.2h2.6v2h2.5v-2h2.6v2h2.5v-2h2.6v4.4H4.6Z"/><rect x="5.8" y="9.2" width="12.4" height="12.6" rx=".8" opacity=".82"/><path d="M10.6 13.4h2.8v3.2h-2.8Z" fill="#000" opacity=".45"/><path d="M10.2 18h3.6v3.8h-3.6Z" fill="#000" opacity=".35"/></svg>',
        lore: '',
        planta: { salas: [3, 4], ancho: [12, 18], alto: [7, 10], pasillo: 3, chaflan: 0.5, atajos: 1 },
        piso: 'silleria',
        remate: 'almenado',
        afueras: 'pueblo',
        paleta: {
            fondoAlto: '#1c2540', fondoBajo: '#121a30',
            suelo: '#7a7f8e', sueloLuz: '#949aa8', sueloSombra: '#555a69',
            junta: 'rgba(26, 30, 44, 0.5)',
            zocalo: '#5f6577', zocaloLuz: '#818799', zocaloSombra: '#3b4050',
            bordeBase: '#4c5364', bordeLuz: '#6e7688', bordeSombra: '#2c3140',
            mota: '#b8c4d8', tinte: '#ffd784'
        },
        adornos: [
            { tipo: 'brasero', prob: 0.10, sep: 5, luz: { r: 4.4, color: [255, 170, 90], fuerza: 0.85 } },
            { tipo: 'almena', prob: 0.09, sep: 3.5, esquina: true },
            { tipo: 'banderola', prob: 0.08, sep: 4.5 },
            { tipo: 'barril', prob: 0.06, sep: 4 },
            { tipo: 'rocalla', prob: 0.05, sep: 3 }
        ],
        trampas: null,
        ambiente: { forma: 'mota', cuantas: 24, color: '#c8d8f0', vel: [-14, -34],
                    luciernagas: 0, oscuridad: 0.74, velo: '16, 24, 52' },
        minimapa: { suelo: '#7a7f8e', muro: '#232c48' }
    },

    // ---------------------------------------------------------
    //  81-90 · Peldaño a peldaño, bajo los pórticos rojos
    // ---------------------------------------------------------
    {
        id: 'torii',
        nombre: 'Senda de torii',
        emblema: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 4.4c3.6-1.2 16.4-1.2 20 0l-.5 2.2c-3.4-1-15.6-1-19 0Z"/><rect x="3.4" y="7.4" width="17.2" height="2.2" rx=".7"/><path d="M6.2 9.6h3.1l-1 12.2H6.6Z"/><path d="M14.7 9.6h3.1l.9 12.2h-2.7Z"/><rect x="8.4" y="12.4" width="7.2" height="1.9" rx=".6" opacity=".85"/></svg>',
        lore: '',
        planta: { salas: [4, 4], ancho: [10, 15], alto: [5, 7], pasillo: 4, chaflan: 0.2, atajos: 0 },
        piso: 'escalones',
        remate: 'talud',
        afueras: 'arboleda',
        paleta: {
            fondoAlto: '#1d2438', fondoBajo: '#13192a',
            suelo: '#6e6a63', sueloLuz: '#87837a', sueloSombra: '#4a4740',
            junta: 'rgba(24, 22, 20, 0.55)',
            zocalo: '#5a4a38', zocaloLuz: '#7a6449', zocaloSombra: '#3a3024',
            bordeBase: '#3c4a30', bordeLuz: '#5a6f47', bordeSombra: '#232d1d',
            mota: '#d8a08f', tinte: '#e8583f',
            hoja: '#28503a', hojaLuz: '#417a55', hojaSombra: '#183024',
            hojaFria: '#24505f', hojaFriaLuz: '#3f7f8f'
        },
        adornos: [
            { tipo: 'torii', prob: 0.06, sep: 6 },
            { tipo: 'toro', prob: 0.09, sep: 4.5, luz: { r: 3.8, color: [255, 200, 120], fuerza: 0.75 } },
            { tipo: 'estela', prob: 0.08, sep: 4 },
            { tipo: 'pino', prob: 0.08, sep: 4 },
            { tipo: 'rocalla', prob: 0.07, sep: 2.6 }
        ],
        trampas: null,
        ambiente: { forma: 'hoja', cuantas: 28, color: '#e88a6a', vel: [18, 40],
                    luciernagas: 14, oscuridad: 0.76, velo: '18, 22, 46' },
        minimapa: { suelo: '#6e6a63', muro: '#26301f' }
    },

    // ---------------------------------------------------------
    //  91-100 · El final del camino
    // ---------------------------------------------------------
    {
        id: 'santuario',
        nombre: 'Santuario',
        emblema: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="5.2"/><path d="M12 .8l1.5 3.4h-3ZM12 23.2l-1.5-3.4h3ZM.8 12l3.4-1.5v3ZM23.2 12l-3.4 1.5v-3Z"/><path d="M4.2 4.2 7.5 5.4 5.4 7.5ZM19.8 19.8 16.5 18.6l2.1-2.1ZM4.2 19.8 5.4 16.5l2.1 2.1ZM19.8 4.2 18.6 7.5l-2.1-2.1Z" opacity=".8"/><circle cx="12" cy="12" r="2.4" fill="#000" opacity=".35"/></svg>',
        lore: '',
        planta: { salas: [2, 3], ancho: [20, 28], alto: [11, 13], pasillo: 4, chaflan: 0.9, atajos: 2 },
        piso: 'sagrado',
        remate: 'teja',
        afueras: 'nubes',
        paleta: {
            fondoAlto: '#232a4a', fondoBajo: '#161c36',
            suelo: '#9a7d5c', sueloLuz: '#b89873', sueloSombra: '#6c5740',
            junta: 'rgba(50, 36, 24, 0.45)',
            zocalo: '#a8874f', zocaloLuz: '#d8b47a', zocaloSombra: '#6f5730',
            bordeBase: '#3f7f7a', bordeLuz: '#68b8a8', bordeSombra: '#26544f',
            mota: '#ffe8b0', tinte: '#ffd784',
            // aquí el cerezo florece blanco, no rosa
            sakura: '#e8dcc8', sakuraLuz: '#fffaf0'
        },
        adornos: [
            { tipo: 'farol', prob: 0.10, sep: 4.5, luz: { r: 5.0, color: [255, 210, 140], fuerza: 0.95 } },
            { tipo: 'shimenawa', prob: 0.06, sep: 6, esquina: true },
            { tipo: 'campana', prob: 0.04, sep: 8 },
            { tipo: 'ofrenda', prob: 0.09, sep: 3.5 },
            { tipo: 'sakura', prob: 0.08, sep: 4 }
        ],
        trampas: null,
        ambiente: { forma: 'petalo', cuantas: 38, color: '#fff0d8', vel: [10, 26],
                    luciernagas: 20, oscuridad: 0.62, velo: '22, 26, 60' },
        minimapa: { suelo: '#9a7d5c', muro: '#2a3358' }
    }
];

// ============================================================
//  Lo que el resto del juego le pregunta a esta lista
// ============================================================
const Biomas = {
    lista: BIOMAS,
    TRAMO: TRAMO_BIOMA,
    // la última senda del camino: pasada esta, se acaba el juego
    FINAL: BIOMAS.length * TRAMO_BIOMA,

    // 1..10 -> 0, 11..20 -> 1, y así. Más allá de la última, la última.
    indice(nivel) {
        const i = Math.floor((Math.max(1, nivel) - 1) / TRAMO_BIOMA);
        return Math.min(i, BIOMAS.length - 1);
    },

    deNivel(nivel) { return BIOMAS[Biomas.indice(nivel)]; },

    // el nombre traducido, buscado por el id de la comarca. El que llevan las
    // fichas aquí arriba queda de red: si idiomas.js no está cargado -o le
    // falta la clave-, se enseña el de siempre en vez de un hueco
    nombre(nivel) {
        const b = Biomas.deNivel(nivel);
        if (typeof TR !== 'function') return b.nombre;
        const dicho = TR('bioma.' + b.id);
        return dicho === 'bioma.' + b.id ? b.nombre : dicho;
    },

    // el dibujo con que firma la comarca. Va en currentColor: lo tiñe quien
    // lo enseñe, y el HUD lo hace con el tinte de esta misma ficha
    emblema(nivel) { return Biomas.deNivel(nivel).emblema || ""; },

    // ese tinte, que es el color con que la comarca se reconoce de un vistazo
    // con red: una ficha nueva a la que se le olvide el tinte no debe tumbar
    // el marcador entero, solo salir del oro de siempre
    tinte(nivel) {
        const p = Biomas.deNivel(nivel).paleta;
        return (p && p.tinte) || "#e8b44f";
    },

    // en qué peldaño del bioma se anda: 1 el primero, TRAMO el último
    peldano(nivel) { return ((Math.max(1, nivel) - 1) % TRAMO_BIOMA) + 1; },

    // ¿es esta la senda que cierra el camino?
    ultima(nivel) { return nivel >= Biomas.FINAL; }
};
