/**
 * es (Español) — Magic-Trick lesson STEP overlays, keyed by trick id.
 *
 * English (src/utils/mathTricks.ts) is the fallback for any missing key.
 * Worded results (only `divisible-11` today) go under the `'<trickId>.result'`
 * key as a one-element array, e.g. `'divisible-11.result': ['¡Sí!']`.
 *
 * Keep the embedded MATH intact (numbers, ×, ÷, digits, worked examples) —
 * translate only the surrounding words. See src/i18n/lessons.ts for the wiring
 * and scratchpad/lessons-inventory.json for the English source.
 */
export const es_lessons: Record<string, readonly string[]> = {
  'square-5': [
    'Primero, toma la cifra de las decenas: 6',
    'Multiplícala por el número siguiente: 6 × 7 = 42',
    'Por último, ¡añade 25 al final!',
    '42... 25... -> 4225',
  ],
  'diff-squares': [
    'Idea clave: (a − b)(a + b) = a² − b². Dos números a la misma distancia de un valor central se reducen a un cuadrado menos otro.',
    'Aquí, ambos números están a 2 de 100: es (100 − 2)(100 + 2).',
    'Aplica la fórmula: 100² − 2² = 10000 − 4.',
    '= 9996.',
  ],
  'multiply-11': [
    'Separa las cifras: 4 _ 3.',
    'Súmalas y coloca el resultado en el medio: 4 + 3 = 7 → 4 7 3.',
    'Por qué funciona: 43 × 11 = 43 × 10 + 43 = 430 + 43. Al alinearlos, la suma de las cifras cae en la columna de las decenas.',
    'Ojo: si la suma es 10 o más, lleva 1. (87 × 11: 8+7 = 15 → lleva el 1 al 8 → 9, 5, 7 → 957.)',
  ],
  'near-100': [
    'Idea clave: (100 − d)² = 100² − 200d + d² = (100 − 2d)(100) + d². La primera parte forma las cifras iniciales; d² forma las dos últimas.',
    'Paso 1 — halla la distancia hasta 100: 100 − 96 = 4.',
    'Paso 2 — resta la distancia al número: 96 − 4 = 92. (Primera mitad.)',
    'Paso 3 — eleva la distancia al cuadrado: 4² = 16. (Segunda mitad, completada a 2 cifras.)',
    'Únelas: 92 y luego 16 → 9216.',
  ],
  'sum-odds': [
    'Cuenta los números: 5 números impares seguidos.',
    'La idea clave: los primeros N números impares SIEMPRE suman N².',
    '¿Por qué? Imagina una cuadrícula de N×N. Cada nuevo número impar añade una forma de L alrededor de la esquina — un cuadrito, luego 3, luego 5… hasta completar el cuadrado.',
    '5 números, así que 5² = 25.',
  ],
  'multiply-5': [
    'Piensa en 5 como 10 dividido entre 2.',
    'Así que primero, parte el número a la mitad: 48 ÷ 2 = 24.',
    'Luego multiplica por 10 (solo añade un cero): 240.',
  ],
  'multiply-9': [
    '9 es simplemente 10 menos 1.',
    'Primero, multiplica por 10: 480',
    'Luego resta el número original: 480 - 48',
    '480 - 40 = 440, luego 440 - 8 = 432',
  ],
  'multiply-12': [
    '12 es 10 más 2.',
    'Multiplica por 10: 340',
    'Dobla el número: 68',
    'Súmalos: 340 + 68 = 408',
  ],
  'multiply-15': [
    '15 es 10 más 5 (la mitad de 10).',
    'Multiplica por 10: 340',
    'Toma la mitad de ese resultado: 170',
    'Súmalos: 340 + 170 = 510',
  ],
  'multiply-25': [
    '25 es exactamente 100 dividido entre 4.',
    'Así que solo divide el número entre 4: 32 ÷ 4 = 8.',
    'Luego multiplica por 100 (añade dos ceros): 800.',
  ],
  'double-halve': [
    'Idea clave: ½ y ×2 se cancelan. Así que puedes partir a la mitad un factor y doblar el otro, y el producto no cambia.',
    'Objetivo: convertir un producto incómodo en uno con un factor "amigable" (×10, ×100…).',
    'Para 14 × 45: parte a la mitad el par (14 → 7), dobla el otro (45 → 90).',
    'Ahora 7 × 90 es fácil: 7 × 9 = 63, añade un cero → 630.',
  ],
  'rule-of-101': [
    'Por qué funciona: 101 = 100 + 1. Así que n × 101 = n × 100 + n. El "× 100" empuja las cifras dos lugares a la izquierda; el "+ n" rellena esos dos huecos de la derecha.',
    'Para 43: 43 × 100 = 4300, luego + 43 = 4343.',
    'Atajo: solo escribe el número dos veces. "43 43" → 4343.',
    'Funciona con cualquier número de 2 cifras.',
  ],
  'rule-of-99': [
    '99 es simplemente 100 menos 1.',
    'Multiplica el número por 100: 4300',
    'Réstale el número exacto: 4300 - 43.',
    '4300 - 40 = 4260, luego menos 3 es 4257',
  ],
  'just-over-100': [
    'Idea clave: (100 + a)(100 + b) = 100·(100 + a + b) + a·b. La parte izquierda forma las cifras iniciales; a·b forma las dos últimas.',
    'Paso 1 — suma a uno de los números el "extra" del otro: 104 + 6 = 110 (igual que 106 + 4). Esa es la primera parte.',
    'Paso 2 — multiplica los extras: 4 × 6 = 24. Esas son las dos últimas cifras (complétalas a 2 si hace falta).',
    'Únelas: 110 y luego 24 → 11024.',
  ],
  'cross-multiply': [
    'Idea clave: cualquier producto de 2 cifras × 2 cifras se divide en tres partes — centenas, decenas, unidades. Calcula cada una por separado y luego suma.',
    'Centenas = izquierda × izquierda: 2 × 1 = 2 → anota 2.',
    'Decenas = el cruce — (izquierda × derecha) + (derecha × izquierda): (2×2) + (3×1) = 4 + 3 = 7 → anota 7.',
    'Unidades = derecha × derecha: 3 × 2 = 6 → anota 6.',
    'Lee: 2, 7, 6 → 276. No hace falta llevar cuando cada parte es de una cifra.',
  ],
  'square-50s': [
    '¿Por qué 25? Porque 50² = 2500, y el "25" es la parte de las centenas. Todo número de los cincuenta empieza por ese 25.',
    'Paso 1 — suma la cifra de las unidades a 25: 25 + 4 = 29. Esa es la primera mitad.',
    'Paso 2 — eleva al cuadrado la cifra de las unidades: 4² = 16. Esa es la segunda mitad (siempre 2 cifras — completa con 0 si hace falta).',
    'Únelas: 29 y luego 16 → 2916.',
  ],
  'square-40s': [
    'Idea clave: apóyate en 50. El número es "50 menos algo" — para 48, ese algo es 2.',
    'Paso 1 — resta esa distancia a 25: 25 − 2 = 23. (Primera mitad.)',
    'Paso 2 — eleva la distancia al cuadrado: 2² = 4 → complétalo a "04". (La segunda mitad siempre tiene 2 cifras.)',
    'Únelas: 23 y luego 04 → 2304.',
  ],
  'near-1000': [
    'La misma idea que los cuadrados cerca de 100, pero apoyándote en 1000. (1000 − d)² = (1000 − 2d)(1000) + d².',
    'Paso 1 — halla la distancia hasta 1000: 1000 − 996 = 4.',
    'Paso 2 — resta esa distancia al número: 996 − 4 = 992. (Primera parte.)',
    'Paso 3 — eleva la distancia al cuadrado, completada a 3 cifras: 4² = 016. (Segunda parte.)',
    'Únelas: 992 y luego 016 → 992016.',
  ],
  'divide-5': [
    'Por qué funciona: ÷5 es lo mismo que ÷10 y luego ×2. O al revés, ×2 y luego ÷10.',
    'Paso 1 — dobla: 130 × 2 = 260.',
    'Paso 2 — quita un cero: 26.',
    'Quitar un cero es simplemente dividir entre 10. Más fácil que dividir entre 5 de cabeza.',
  ],
  'divide-25': [
    'Por qué funciona: 25 × 4 = 100. Así que ÷25 es lo mismo que ×4 ÷100.',
    'Paso 1 — multiplica por 4: 800 × 4 = 3200.',
    'Paso 2 — quita dos ceros (÷100): 32.',
    'Multiplicar por 4 es solo doblar dos veces — más fácil que dividir entre 25.',
  ],
  'sub-1000': [
    'Por qué: 1000 = 999 + 1. Así que 1000 − abc = (999 − abc) + 1. Cada una de las dos primeras cifras sale de 9 (sin llevar), y la última de 10 (el +1).',
    'Paso 1 — resta cada cifra a 9: 9 − 4 = 5, 9 − 7 = 2.',
    'Paso 2 — resta la última cifra a 10: 10 − 3 = 7.',
    'Únelas: 5, 2, 7 → 527. Sin llevar en ningún momento.',
  ],
  'add-reversed': [
    'Identifica las dos cifras: 4 y 7',
    'Súmalas: 4 + 7 = 11',
    'Multiplica por 11: 11 × 11 = 121',
    '¿Por qué? (10a+b) + (10b+a) = 11a + 11b',
  ],
  'sub-reversed': [
    'Identifica las dos cifras: 8 y 2',
    'Halla su diferencia: 8 - 2 = 6',
    'Multiplica por 9: 6 × 9 = 54',
    '¿Por qué? (10a+b) - (10b+a) = 9a - 9b',
  ],
  'multiply-ends-5-10-apart': [
    'Funciona siempre que ambos números terminen en 5 Y estén separados exactamente por 10.',
    'Paso 1 — multiplica las cifras de las decenas: 3 × 4 = 12.',
    'Paso 2 — suma la cifra de las decenas más pequeña: 12 + 3 = 15. (Esa es la primera parte de la respuesta.)',
    'Paso 3 — añade siempre 75: 1575.',
    '¿Por qué "75"? Porque 5 × 5 = 25, y el medio paso del término intermedio que falta te deja en ...75 siempre.',
  ],
  'divide-3': [
    'Comprobación con la suma de cifras: 5+7+1+2 = 15. Como 15 es divisible entre 3, el original también lo es. (Te ahorra un cálculo inútil.)',
    'Ahora ve de izquierda a derecha: 3 en 5 = 1, resto 2. Baja el 7 → 27.',
    '3 en 27 = 9 exacto. Baja el 1 → 1.',
    '3 en 1 = 0, resto 1. Baja el 2 → 12. 3 en 12 = 4.',
    'Lee: 1, 9, 0, 4 → 1904.',
  ],
  'complement-100': [
    'Por qué: (100 − a)(100 − b) = 100·(100 − a − b) + a·b. La primera parte son las cifras iniciales; a·b cae en las dos últimas.',
    'Paso 1 — halla cada "déficit" (distancia hasta 100): 100 − 97 = 3, y 100 − 94 = 6.',
    'Paso 2 — resta un déficit al OTRO número: 97 − 6 = 91. (El mismo resultado si haces 94 − 3.) Esa es la primera parte.',
    'Paso 3 — multiplica los déficits: 3 × 6 = 18. (Complétalo a 2 cifras si hace falta.) Esa es la última parte.',
    'Únelas: 91 y luego 18 → 9118.',
  ],
  'divisible-11': [
    'Por qué funciona: 10 = 11 − 1, así que 100 = 11×9 + 1, 1000 = 11×91 − 1, etc. Cada posición alterna entre dejar resto +1 y −1 al dividir entre 11.',
    'Marca cada cifra con signos + y − alternos (la cifra de la derecha lleva +, luego alterna hacia la izquierda).',
    'Para 2728: −2 + 7 − 2 + 8 = +11. (O 2 − 7 + 2 − 8 = −11 leyendo en el otro sentido. La misma magnitud.)',
    'Un resultado de 0 o cualquier múltiplo de 11 significa que el original divide exacto. ±11 → sí.',
  ],
  'divisible-11.result': [
    '¡Sí!',
  ],
  'flip-percent': [
    'Por qué funciona: A% de B es A × B / 100. A la multiplicación no le importa el orden, así que equivale a B × A / 100, que es B% de A.',
    '8% de 50 es molesto. Pero 50% de 8 es simplemente la mitad de 8.',
    '50% de 8 = 4. La misma respuesta, mucho más fácil.',
    'Cuando veas un porcentaje feo de un número amigable, dale la vuelta.',
  ],
  'telescoping-sum': [
    'Reescribe cada término: ¼⅛… ↨ 1/k - 1/(k+1)',
    'La suma queda: (1-½) + (½-⅓) + (⅓-¼) ...',
    '¡Todos los términos intermedios se cancelan! (El telescopio se cierra)',
    'Solo queda 1 - 1/(N+1) = N/(N+1)',
  ],
  'zeno-paradox': [
    'Camina la mitad hacia la pared. Luego otra vez la mitad...',
    '¡En infinitos pasos, la alcanzas!',
    'Serie geométrica: S = a ÷ (1 - r)',
    'Aquí a = ½, r = ½. Así que S = ½ ÷ ½ = 1',
  ],
  'digit-sum-mod': [
    'Por qué funciona: cada potencia de 10 deja resto 1 al dividir entre 9 (10 = 9+1, 100 = 99+1, etc.). Así que cada cifra aporta su propio valor al resto.',
    'Suma las cifras: 4 + 5 + 7 + 3 = 19.',
    '¿Sigue siendo ≥ 10? Suma otra vez: 1 + 9 = 10 → 1 + 0 = 1.',
    'Esa última cifra única ES el resto. 4573 ÷ 9 deja resto 1.',
  ],
  'power-last-digit': [
    'Las potencias de 7 se repiten en ciclo: 7, 9, 3, 1, 7, 9, 3, 1...',
    'El ciclo tiene longitud 4.',
    '43 mod 4 = 3, así que toma el 3.er valor del ciclo.',
    '¡El 3.er valor es 3!',
  ],
  'product-last-digit': [
    'Por qué: al multiplicar dos números, solo las cifras de las unidades influyen en la cifra de las unidades de la respuesta. Las centenas y decenas de cada número solo afectan a columnas superiores.',
    'Quédate solo con las últimas cifras: 7 × 3.',
    '7 × 3 = 21. Toma la última cifra: 1.',
    'Así que 347 × 893 termina en 1. (¡No hace falta calcular el producto completo!)',
  ],
  'gauss-sum': [
    'La historia: a Gauss, con 9 años, le pidieron sumar del 1 al 100. Se dio cuenta de que las parejas (1+100), (2+99), (3+98)… todas dan 101.',
    '¿Cuántas parejas? 100 números forman 50 parejas.',
    'Así que el total es 50 × 101 = 5050.',
    'Regla general: 1 + 2 + … + N = N × (N+1) ÷ 2.',
  ],
  'golden-ratio': [
    '¡El denominador es el mismo patrón que la propia x!',
    'Así que x = 1 + 1/x',
    'Multiplica por x: x² = x + 1, es decir, x² - x - 1 = 0',
    'Raíz positiva: x = (1 + √5) / 2 ≈ 1.618',
  ],
  'large-power-cycles': [
    'Las potencias de 7 se repiten cada 4: 7, 9, 3, 1, 7, 9, 3, 1...',
    'Así que 7^N mod 10 solo depende de N mod 4.',
    '100 mod 4 = 0, que corresponde al 4.º valor del ciclo.',
    '¡El 4.º valor es 1!',
  ],
};
