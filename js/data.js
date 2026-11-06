/* Datos base: aeropuertos, aerolíneas y contenido de la guía.
 * r = región (EU Europa, US Estados Unidos, MX México, CA Centroamérica/Caribe, SA Sudamérica)
 * s = tamaño (3 hub internacional, 2 mediano, 1 secundario)
 * lc = base de aerolíneas low cost
 * tz = huso horario aproximado (horas respecto a UTC)
 */
const AIRPORTS = [
  // España
  { c: 'MAD', city: 'Madrid', n: 'Adolfo Suárez Madrid-Barajas', cc: 'ES', lat: 40.47, lon: -3.56, r: 'EU', s: 3, tz: 1 },
  { c: 'BCN', city: 'Barcelona', n: 'Josep Tarradellas El Prat', cc: 'ES', lat: 41.30, lon: 2.08, r: 'EU', s: 3, tz: 1 },
  { c: 'GRO', city: 'Girona', n: 'Girona-Costa Brava', cc: 'ES', lat: 41.90, lon: 2.76, r: 'EU', s: 1, lc: true, tz: 1 },
  { c: 'REU', city: 'Reus', n: 'Aeropuerto de Reus', cc: 'ES', lat: 41.15, lon: 1.17, r: 'EU', s: 1, lc: true, tz: 1 },
  { c: 'VLC', city: 'Valencia', n: 'Aeropuerto de Valencia', cc: 'ES', lat: 39.49, lon: -0.48, r: 'EU', s: 2, tz: 1 },
  { c: 'ALC', city: 'Alicante', n: 'Alicante-Elche', cc: 'ES', lat: 38.28, lon: -0.56, r: 'EU', s: 2, lc: true, tz: 1 },
  { c: 'AGP', city: 'Málaga', n: 'Málaga-Costa del Sol', cc: 'ES', lat: 36.67, lon: -4.50, r: 'EU', s: 2, lc: true, tz: 1 },
  { c: 'SVQ', city: 'Sevilla', n: 'Aeropuerto de Sevilla', cc: 'ES', lat: 37.42, lon: -5.89, r: 'EU', s: 2, tz: 1 },
  { c: 'BIO', city: 'Bilbao', n: 'Aeropuerto de Bilbao', cc: 'ES', lat: 43.30, lon: -2.91, r: 'EU', s: 2, tz: 1 },
  { c: 'PMI', city: 'Palma de Mallorca', n: 'Son Sant Joan', cc: 'ES', lat: 39.55, lon: 2.74, r: 'EU', s: 2, tz: 1 },
  // Portugal
  { c: 'LIS', city: 'Lisboa', n: 'Humberto Delgado', cc: 'PT', lat: 38.77, lon: -9.13, r: 'EU', s: 3, tz: 0 },
  { c: 'OPO', city: 'Oporto', n: 'Francisco Sá Carneiro', cc: 'PT', lat: 41.24, lon: -8.68, r: 'EU', s: 2, lc: true, tz: 0 },
  // Francia
  { c: 'CDG', city: 'París', n: 'Charles de Gaulle', cc: 'FR', lat: 49.01, lon: 2.55, r: 'EU', s: 3, tz: 1 },
  { c: 'ORY', city: 'París', n: 'Orly', cc: 'FR', lat: 48.72, lon: 2.38, r: 'EU', s: 2, tz: 1 },
  { c: 'BVA', city: 'París', n: 'Beauvais-Tillé', cc: 'FR', lat: 49.45, lon: 2.11, r: 'EU', s: 1, lc: true, tz: 1 },
  // Reino Unido
  { c: 'LHR', city: 'Londres', n: 'Heathrow', cc: 'GB', lat: 51.47, lon: -0.45, r: 'EU', s: 3, tz: 0 },
  { c: 'LGW', city: 'Londres', n: 'Gatwick', cc: 'GB', lat: 51.15, lon: -0.18, r: 'EU', s: 2, lc: true, tz: 0 },
  { c: 'STN', city: 'Londres', n: 'Stansted', cc: 'GB', lat: 51.88, lon: 0.24, r: 'EU', s: 1, lc: true, tz: 0 },
  // Italia
  { c: 'FCO', city: 'Roma', n: 'Fiumicino', cc: 'IT', lat: 41.80, lon: 12.25, r: 'EU', s: 3, tz: 1 },
  { c: 'CIA', city: 'Roma', n: 'Ciampino', cc: 'IT', lat: 41.80, lon: 12.59, r: 'EU', s: 1, lc: true, tz: 1 },
  { c: 'MXP', city: 'Milán', n: 'Malpensa', cc: 'IT', lat: 45.63, lon: 8.72, r: 'EU', s: 3, tz: 1 },
  { c: 'BGY', city: 'Bérgamo (Milán)', n: 'Orio al Serio', cc: 'IT', lat: 45.67, lon: 9.70, r: 'EU', s: 1, lc: true, tz: 1 },
  // Alemania / Países Bajos
  { c: 'FRA', city: 'Fráncfort', n: 'Frankfurt am Main', cc: 'DE', lat: 50.03, lon: 8.56, r: 'EU', s: 3, tz: 1 },
  { c: 'MUC', city: 'Múnich', n: 'Franz Josef Strauss', cc: 'DE', lat: 48.35, lon: 11.79, r: 'EU', s: 3, tz: 1 },
  { c: 'AMS', city: 'Ámsterdam', n: 'Schiphol', cc: 'NL', lat: 52.31, lon: 4.76, r: 'EU', s: 3, tz: 1 },
  { c: 'EIN', city: 'Eindhoven', n: 'Aeropuerto de Eindhoven', cc: 'NL', lat: 51.45, lon: 5.37, r: 'EU', s: 1, lc: true, tz: 1 },
  // México
  { c: 'MEX', city: 'Ciudad de México', n: 'Benito Juárez (AICM)', cc: 'MX', lat: 19.44, lon: -99.07, r: 'MX', s: 3, tz: -6 },
  { c: 'NLU', city: 'Ciudad de México', n: 'Felipe Ángeles (AIFA)', cc: 'MX', lat: 19.74, lon: -99.02, r: 'MX', s: 1, lc: true, tz: -6 },
  { c: 'TLC', city: 'Toluca', n: 'Aeropuerto de Toluca', cc: 'MX', lat: 19.34, lon: -99.57, r: 'MX', s: 1, lc: true, tz: -6 },
  { c: 'PBC', city: 'Puebla', n: 'Hermanos Serdán', cc: 'MX', lat: 19.16, lon: -98.37, r: 'MX', s: 1, lc: true, tz: -6 },
  { c: 'QRO', city: 'Querétaro', n: 'Aeropuerto de Querétaro', cc: 'MX', lat: 20.62, lon: -100.19, r: 'MX', s: 1, lc: true, tz: -6 },
  { c: 'GDL', city: 'Guadalajara', n: 'Miguel Hidalgo', cc: 'MX', lat: 20.52, lon: -103.31, r: 'MX', s: 2, lc: true, tz: -6 },
  { c: 'MTY', city: 'Monterrey', n: 'Mariano Escobedo', cc: 'MX', lat: 25.78, lon: -100.11, r: 'MX', s: 2, tz: -6 },
  { c: 'CUN', city: 'Cancún', n: 'Aeropuerto de Cancún', cc: 'MX', lat: 21.04, lon: -86.87, r: 'MX', s: 3, tz: -5 },
  { c: 'TIJ', city: 'Tijuana', n: 'Abelardo L. Rodríguez', cc: 'MX', lat: 32.54, lon: -116.97, r: 'MX', s: 2, lc: true, tz: -8,
    note: 'Desde San Diego se cruza a pie por el puente Cross Border Xpress (CBX).' },
  // Estados Unidos
  { c: 'JFK', city: 'Nueva York', n: 'John F. Kennedy', cc: 'US', lat: 40.64, lon: -73.78, r: 'US', s: 3, tz: -5 },
  { c: 'EWR', city: 'Nueva York', n: 'Newark Liberty', cc: 'US', lat: 40.69, lon: -74.17, r: 'US', s: 3, tz: -5 },
  { c: 'LGA', city: 'Nueva York', n: 'LaGuardia', cc: 'US', lat: 40.78, lon: -73.87, r: 'US', s: 2, tz: -5 },
  { c: 'MIA', city: 'Miami', n: 'Aeropuerto Internacional de Miami', cc: 'US', lat: 25.79, lon: -80.29, r: 'US', s: 3, tz: -5 },
  { c: 'FLL', city: 'Fort Lauderdale', n: 'Fort Lauderdale-Hollywood', cc: 'US', lat: 26.07, lon: -80.15, r: 'US', s: 2, lc: true, tz: -5 },
  { c: 'MCO', city: 'Orlando', n: 'Aeropuerto Internacional de Orlando', cc: 'US', lat: 28.43, lon: -81.31, r: 'US', s: 2, lc: true, tz: -5 },
  { c: 'LAX', city: 'Los Ángeles', n: 'Los Angeles International', cc: 'US', lat: 33.94, lon: -118.41, r: 'US', s: 3, tz: -8 },
  { c: 'SAN', city: 'San Diego', n: 'San Diego International', cc: 'US', lat: 32.73, lon: -117.19, r: 'US', s: 2, tz: -8 },
  // Centroamérica
  { c: 'PTY', city: 'Ciudad de Panamá', n: 'Tocumen', cc: 'PA', lat: 9.07, lon: -79.38, r: 'CA', s: 3, tz: -5 },
  { c: 'SJO', city: 'San José', n: 'Juan Santamaría', cc: 'CR', lat: 9.99, lon: -84.20, r: 'CA', s: 2, tz: -6 },
  // Sudamérica
  { c: 'BOG', city: 'Bogotá', n: 'El Dorado', cc: 'CO', lat: 4.70, lon: -74.15, r: 'SA', s: 3, tz: -5 },
  { c: 'MDE', city: 'Medellín', n: 'José María Córdova', cc: 'CO', lat: 6.16, lon: -75.42, r: 'SA', s: 2, tz: -5 },
  { c: 'CTG', city: 'Cartagena', n: 'Rafael Núñez', cc: 'CO', lat: 10.44, lon: -75.51, r: 'SA', s: 2, lc: true, tz: -5 },
  { c: 'LIM', city: 'Lima', n: 'Jorge Chávez', cc: 'PE', lat: -12.02, lon: -77.11, r: 'SA', s: 3, tz: -5 },
  { c: 'SCL', city: 'Santiago de Chile', n: 'Arturo Merino Benítez', cc: 'CL', lat: -33.39, lon: -70.79, r: 'SA', s: 3, tz: -3 },
  { c: 'EZE', city: 'Buenos Aires', n: 'Ezeiza Ministro Pistarini', cc: 'AR', lat: -34.82, lon: -58.54, r: 'SA', s: 3, tz: -3 },
  { c: 'AEP', city: 'Buenos Aires', n: 'Aeroparque Jorge Newbery', cc: 'AR', lat: -34.56, lon: -58.42, r: 'SA', s: 2, tz: -3 },
  { c: 'GRU', city: 'São Paulo', n: 'Guarulhos', cc: 'BR', lat: -23.43, lon: -46.47, r: 'SA', s: 3, tz: -3 },
  { c: 'GIG', city: 'Río de Janeiro', n: 'Galeão', cc: 'BR', lat: -22.81, lon: -43.25, r: 'SA', s: 2, tz: -3 },
];

const COUNTRIES = {
  ES: 'España', PT: 'Portugal', FR: 'Francia', GB: 'Reino Unido', IT: 'Italia', DE: 'Alemania', NL: 'Países Bajos',
  MX: 'México', US: 'Estados Unidos', PA: 'Panamá', CR: 'Costa Rica', CO: 'Colombia', PE: 'Perú', CL: 'Chile',
  AR: 'Argentina', BR: 'Brasil',
};

const REGIONS = { EU: 'Europa', US: 'Estados Unidos', MX: 'México', CA: 'Centroamérica', SA: 'Sudamérica' };

/* home = región donde vuela rutas internas; r = regiones que conecta; lh = largo radio; lc = low cost; q = valoración */
const AIRLINES = {
  IB: { n: 'Iberia', home: 'EU', r: ['EU', 'SA', 'MX', 'US', 'CA'], lh: true, q: 4.1, col: '#d7192d', hub: 'MAD' },
  UX: { n: 'Air Europa', home: 'EU', r: ['EU', 'SA', 'CA', 'US'], lh: true, q: 3.7, col: '#0a3d91', hub: 'MAD' },
  VY: { n: 'Vueling', home: 'EU', r: ['EU'], lc: true, q: 3.4, col: '#c9a400', hub: 'BCN' },
  FR: { n: 'Ryanair', home: 'EU', r: ['EU'], lc: true, q: 3.2, col: '#073590', hub: 'BGY' },
  U2: { n: 'easyJet', home: 'EU', r: ['EU'], lc: true, q: 3.5, col: '#ff6600', hub: 'LGW' },
  AF: { n: 'Air France', home: 'EU', r: ['EU', 'US', 'MX', 'SA', 'CA'], lh: true, q: 4.0, col: '#002157', hub: 'CDG' },
  LH: { n: 'Lufthansa', home: 'EU', r: ['EU', 'US', 'MX', 'SA'], lh: true, q: 4.1, col: '#05164d', hub: 'FRA' },
  KL: { n: 'KLM', home: 'EU', r: ['EU', 'US', 'MX', 'SA', 'CA'], lh: true, q: 4.1, col: '#00a1de', hub: 'AMS' },
  BA: { n: 'British Airways', home: 'EU', r: ['EU', 'US', 'MX'], lh: true, q: 3.9, col: '#075aaa', hub: 'LHR' },
  TP: { n: 'TAP Air Portugal', home: 'EU', r: ['EU', 'SA', 'US'], lh: true, q: 3.6, col: '#00b2a9', hub: 'LIS' },
  AZ: { n: 'ITA Airways', home: 'EU', r: ['EU', 'US', 'SA'], lh: true, q: 3.8, col: '#0c2a6b', hub: 'FCO' },
  LV: { n: 'Level', home: 'EU', r: ['EU', 'US', 'SA'], lh: true, lc: true, q: 3.5, col: '#1d1d1b', hub: 'BCN' },
  AM: { n: 'Aeroméxico', home: 'MX', r: ['MX', 'US', 'SA', 'EU', 'CA'], lh: true, q: 3.9, col: '#0b2343', hub: 'MEX' },
  Y4: { n: 'Volaris', home: 'MX', r: ['MX', 'US', 'CA'], lc: true, q: 3.3, col: '#a3007d', hub: 'GDL' },
  VB: { n: 'Viva Aerobus', home: 'MX', r: ['MX', 'US'], lc: true, q: 3.3, col: '#00a650', hub: 'MTY' },
  AA: { n: 'American Airlines', home: 'US', r: ['US', 'MX', 'SA', 'EU', 'CA'], lh: true, q: 3.7, col: '#0078d2', hub: 'MIA' },
  DL: { n: 'Delta', home: 'US', r: ['US', 'MX', 'EU', 'SA', 'CA'], lh: true, q: 4.0, col: '#9b1631', hub: 'JFK' },
  UA: { n: 'United', home: 'US', r: ['US', 'MX', 'EU', 'SA', 'CA'], lh: true, q: 3.7, col: '#005daa', hub: 'EWR' },
  B6: { n: 'JetBlue', home: 'US', r: ['US', 'MX', 'CA', 'EU', 'SA'], lh: true, q: 3.8, col: '#003876', hub: 'JFK' },
  NK: { n: 'Spirit', home: 'US', r: ['US', 'MX', 'CA', 'SA'], lc: true, q: 2.9, col: '#c7a600', hub: 'FLL' },
  CM: { n: 'Copa Airlines', home: 'CA', r: ['CA', 'SA', 'US', 'MX'], lh: true, q: 3.9, col: '#00205b', hub: 'PTY' },
  AV: { n: 'Avianca', home: 'SA', r: ['SA', 'CA', 'US', 'MX', 'EU'], lh: true, q: 3.6, col: '#da291c', hub: 'BOG' },
  LA: { n: 'LATAM', home: 'SA', r: ['SA', 'US', 'EU', 'MX', 'CA'], lh: true, q: 3.8, col: '#1b0088', hub: 'LIM' },
  AR: { n: 'Aerolíneas Argentinas', home: 'SA', r: ['SA', 'US', 'EU'], lh: true, q: 3.5, col: '#0b72b5', hub: 'AEP' },
  JA: { n: 'JetSMART', home: 'SA', r: ['SA'], lc: true, q: 3.2, col: '#1a3c8f', hub: 'SCL' },
  H2: { n: 'SKY Airline', home: 'SA', r: ['SA'], lc: true, q: 3.3, col: '#5b1b8f', hub: 'SCL' },
  P5: { n: 'Wingo', home: 'SA', r: ['SA', 'CA'], lc: true, q: 3.2, col: '#6d2077', hub: 'BOG' },
};

const HUBS = ['MAD', 'CDG', 'AMS', 'FRA', 'LHR', 'LIS', 'MIA', 'JFK', 'MEX', 'BOG', 'PTY', 'LIM', 'GRU', 'SCL', 'BCN', 'MUC', 'FCO'];

const POPULAR_ROUTES = [
  ['MAD', 'JFK'], ['MEX', 'CUN'], ['BCN', 'LHR'], ['BOG', 'MIA'], ['EZE', 'MAD'], ['MEX', 'MAD'], ['SCL', 'LIM'],
];

const GUIDE = [
  { i: '📍', t: 'Aeropuertos alternativos', d: 'Muchas ciudades tienen varios aeropuertos o uno cercano que usan las low cost. Salir desde allí puede ser mucho más barato, aunque hay que sumar el transporte y el tiempo extra.', tip: 'VueloJusto calcula el ahorro neto por ti.' },
  { i: '🧳', t: 'Costes ocultos de las low cost', d: 'La tarifa base de Ryanair, Volaris, Spirit o JetSMART suele incluir solo un bolso pequeño. Maleta de cabina, facturada, asiento y hasta la tarjeta de embarque pueden cobrarse aparte.', tip: 'Activa "Precio con maleta" para compararlo todo igual.' },
  { i: '🗓️', t: 'El día importa', d: 'Martes y miércoles suelen ser los días más baratos para volar; viernes y domingo, los más caros. Las temporadas altas (julio, agosto y Navidad) encarecen todo.', tip: 'Usa la tira de fechas flexibles para verlo.' },
  { i: '⏳', t: 'Cuándo comprar', d: 'Para vuelos nacionales o regionales, el punto dulce suele estar entre 3 y 8 semanas antes. Para vuelos intercontinentales, entre 2 y 5 meses. En la última semana los precios se disparan.', tip: 'Crea una alerta y revisa la ruta cada pocos días.' },
  { i: '🔀', t: 'Combinar aerolíneas', d: 'A veces la ida con una aerolínea y la vuelta con otra sale más barata que un billete único. Cuidado: si los vuelos van en reservas separadas y pierdes una conexión, nadie te recoloca.', tip: 'Deja al menos 3 horas entre vuelos de reservas distintas.' },
  { i: '🌙', t: 'Vuelos nocturnos', d: 'Los vuelos de madrugada (red-eye) son más baratos y te ahorran una noche de hotel. A cambio, llegarás más cansado.', tip: 'Ideal para viajes cortos de presupuesto ajustado.' },
  { i: '🛑', t: 'Stopover gratis', d: 'Algunas aerolíneas (TAP en Lisboa, Copa en Panamá, Icelandair en Reikiavik) permiten quedarse varios días en su hub sin coste extra. Dos destinos por el precio de uno.', tip: 'Busca la opción "stopover" en la web de la aerolínea.' },
  { i: '🌱', t: 'Huella de carbono', d: 'Un vuelo directo suele emitir menos CO₂ que uno con escalas, porque despegar es la fase que más combustible consume. Las clases premium emiten más por pasajero.', tip: 'Mostramos los kg de CO₂ estimados en cada vuelo.' },
  { i: '💳', t: 'Moneda y comisiones', d: 'Pagar en la moneda local de la aerolínea a veces es más barato que dejar que tu banco convierta. Revisa las comisiones por pago con tarjeta.', tip: 'Cambia la moneda arriba a la derecha.' },
];

const CHECKLIST = [
  'Comparé el precio con maleta incluida',
  'Revisé aeropuertos cercanos de salida y de llegada',
  'Miré fechas ±3 días',
  'Comprobé el tiempo mínimo de escala (y si es en otra terminal)',
  'Verifiqué requisitos de visado o pasaporte en tránsito',
  'Confirmé si la tarifa permite cambios o reembolso',
  'Consulté el transporte desde el aeropuerto de llegada',
  'Comparé el precio en la web oficial de la aerolínea',
];

const GLOSSARY = [
  ['Vuelo directo vs. sin escalas', 'Un vuelo "sin escalas" no aterriza hasta destino. Un vuelo "directo" mantiene el mismo número de vuelo, pero puede aterrizar en el camino.'],
  ['Escala vs. conexión', 'La escala es la parada intermedia. Si cambias de avión con un billete único, la aerolínea te protege si pierdes la conexión; si son billetes separados (self-transfer), no.'],
  ['Tiempo mínimo de conexión (MCT)', 'El tiempo mínimo que el aeropuerto considera suficiente para cambiar de avión. Por debajo de 1 hora en un hub grande es arriesgado.'],
  ['Open jaw (multidestino)', 'Volar a una ciudad y regresar desde otra. Muy útil para recorrer un país sin volver al punto de partida.'],
  ['Tarifa básica (Basic economy)', 'La tarifa más barata de aerolíneas tradicionales: sin maleta facturada, sin elección de asiento y sin cambios. Compárala siempre con la siguiente tarifa.'],
  ['Tarifa error', 'Precios equivocados publicados por error de la aerolínea. Aparecen pocas horas; se recomienda no reservar hotel hasta que la aerolínea confirme el billete.'],
  ['Overbooking', 'Venta de más plazas que asientos. Si te dejan en tierra, en la UE tienes derecho a compensación (Reglamento 261/2004) y en otros países a ayuda según la normativa local.'],
  ['Hub', 'Aeropuerto central donde una aerolínea concentra sus conexiones (Madrid para Iberia, Panamá para Copa, Bogotá para Avianca).'],
];
