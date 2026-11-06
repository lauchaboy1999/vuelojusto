# ✈️ VueloJusto — comparador de vuelos

Web para comparar vuelos y encontrar los más baratos. Funciona en ordenador y en Android (se instala como app, sin Play Store). Se publica gratis en **GitHub Pages**.

## Qué incluye

| Sección | Qué hace |
|---|---|
| **Buscar** | Ida y vuelta o solo ida, viajeros, clase. Ordena por *Mejor opción*, *Más barato* y *Más rápido*. Filtros por escalas, horario, precio, duración y aerolínea. |
| **¿Desde dónde salir?** | Compara tu aeropuerto con otros a menos de 320 km, **sumando el transporte terrestre**, y te dice cuál sale más a cuenta. Hace lo mismo con el aeropuerto de llegada. |
| **Fechas flexibles** | Precio de ±3 días alrededor de tu fecha, con el día más barato marcado. |
| **Insights** | Nivel de precio (bajo/típico/alto), consejo de cuándo comprar, mejor fecha cercana y cuántas opciones hay sin escalas. |
| **Precio real** | Interruptor *Precio con maleta facturada*: suma la maleta a las low cost y a las tarifas básicas. |
| **Explorar** | Destinos más baratos desde tu ciudad para un mes concreto, con filtro por región y presupuesto. |
| **Alertas** | Guarda rutas y compara el precio de hoy con el de cuando la guardaste. |
| **Guía** | Conceptos para volar barato (stopover, combinar aerolíneas, vuelos nocturnos, CO₂…), checklist antes de pagar y glosario. |
| **Extras** | Modo oscuro, 4 monedas (EUR, USD, MXN, COP), compartir búsqueda por enlace, emisiones de CO₂ por vuelo, funciona sin conexión. |

> ⚠️ **Los precios son estimaciones** generadas por un modelo (distancia, aerolínea, día de la semana, temporada, antelación…). El botón **Ver oferta** abre Google Flights, Skyscanner o Kayak con la misma búsqueda para ver el precio real.

## Publicar en GitHub Pages

### Opción A — desde la web (sin instalar nada)
1. Entra en <https://github.com/new>, crea un repositorio **público** llamado `vuelojusto`.
2. En el repo vacío, pulsa **uploading an existing file** y arrastra **todo el contenido** de esta carpeta (`index.html`, `css/`, `js/`, `icons/`, `manifest.webmanifest`, `sw.js`, `.nojekyll`, `README.md`). Pulsa **Commit changes**.
3. Ve a **Settings → Pages**. En *Source* elige **Deploy from a branch**, rama **main**, carpeta **/ (root)** y guarda.
4. En 1-2 minutos estará en `https://TU-USUARIO.github.io/vuelojusto/`.

### Opción B — con Git
```bash
git init
git add .
git commit -m "VueloJusto: primera versión"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/vuelojusto.git
git push -u origin main
```
Después, el paso 3 de la opción A.

## Instalar en Android
1. Abre la URL de GitHub Pages en **Chrome** en el móvil.
2. Menú **⋮ → Instalar aplicación** (o *Añadir a pantalla de inicio*).
3. Aparece el icono de VueloJusto y se abre a pantalla completa, con barra de navegación inferior como una app nativa.

## Probar en local
```bash
python -m http.server 8765 --directory vuelojusto
```
Y abre <http://localhost:8765>.

## Estructura
```
index.html            Estructura de la página
css/styles.css        Diseño (claro/oscuro, móvil y escritorio)
js/data.js            Aeropuertos, aerolíneas y textos de la guía
js/app.js             Motor de precios, búsqueda, recomendaciones, filtros, alertas
manifest.webmanifest  Datos para instalarla como app
sw.js                 Service worker (modo sin conexión)
icons/                Iconos de la app
```

## Añadir aeropuertos o aerolíneas
Edita `js/data.js`. Cada aeropuerto necesita código IATA, ciudad, país, coordenadas, región, tamaño (`s`) y huso horario (`tz`). Las recomendaciones de aeropuertos cercanos se calculan solas a partir de las coordenadas.

## Siguiente paso: precios reales
Para tener precios en vivo hace falta una API de vuelos (por ejemplo Duffel, Kiwi.com Tequila o Travelpayouts). Esas APIs requieren una clave privada, así que no pueden llamarse directamente desde GitHub Pages: se necesita un pequeño backend (Cloudflare Workers, Netlify Functions, etc.) que guarde la clave. La función a sustituir es `genLeg()` en `js/app.js`.

Al publicar una versión nueva, cambia `CACHE` en `sw.js` (por ejemplo a `vuelojusto-v2`) para que los móviles con la app instalada descarguen los cambios.
