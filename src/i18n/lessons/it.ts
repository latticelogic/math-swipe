/**
 * it (Italiano) — Magic-Trick lesson STEP overlays, keyed by trick id.
 *
 * Empty until translated; English (src/utils/mathTricks.ts) is the fallback.
 * Populate as `'<trickId>': ['...step 1...', '...step 2...']`. Worded results
 * (only `divisible-11` today) go under the `'<trickId>.result'` key as a
 * one-element array.
 *
 * Keep the embedded MATH intact (numbers, ×, ÷, digits, worked examples) —
 * translate only the surrounding words. See src/i18n/lessons.ts for the wiring
 * and scratchpad/lessons-inventory.json for the English source.
 */
export const it_lessons: Record<string, readonly string[]> = {
  'square-5': [
    'Prima, prendi la cifra delle decine: 6',
    'Moltiplicala per il numero successivo: 6 × 7 = 42',
    'Infine, attacca 25 in fondo!',
    '42... 25... -> 4225',
  ],
  'diff-squares': [
    'Idea di fondo: (a − b)(a + b) = a² − b². Due numeri alla stessa distanza da un valore centrale si riducono a un quadrato meno un altro.',
    'Qui entrambi i numeri distano 2 da 100: cioè (100 − 2)(100 + 2).',
    'Applica la formula: 100² − 2² = 10000 − 4.',
    '= 9996.',
  ],
  'multiply-11': [
    'Separa le cifre: 4 _ 3.',
    'Sommale e infila la somma nel mezzo: 4 + 3 = 7 → 4 7 3.',
    'Perché funziona: 43 × 11 = 43 × 10 + 43 = 430 + 43. Allineandoli, la somma delle cifre finisce nella colonna delle decine.',
    "Attenzione: se la somma è 10 o più, riporta l'1. (87 × 11: 8+7 = 15 → riporta l'1 sull'8 → 9, 5, 7 → 957.)",
  ],
  'near-100': [
    "Idea di fondo: (100 − d)² = 100² − 200d + d² = (100 − 2d)(100) + d². La prima parte diventa le cifre iniziali; il d² diventa le ultime due.",
    'Passo 1 — trova la distanza da 100: 100 − 96 = 4.',
    'Passo 2 — sottrai la distanza dal numero: 96 − 4 = 92. (Prima metà.)',
    'Passo 3 — eleva al quadrato la distanza: 4² = 16. (Seconda metà, riempita a 2 cifre.)',
    'Uniscile: 92 poi 16 → 9216.',
  ],
  'sum-odds': [
    'Conta i numeri: 5 numeri dispari di fila.',
    "L'idea di fondo: i primi N numeri dispari sommano SEMPRE a N².",
    "Perché? Immagina una griglia N×N. Ogni nuovo numero dispari aggiunge una forma a L attorno all'angolo — un quadretto, poi 3, poi 5… completando il quadrato.",
    '5 numeri, quindi 5² = 25.',
  ],
  'multiply-5': [
    'Pensa a 5 come 10 diviso 2.',
    'Quindi prima dimezza il numero: 48 ÷ 2 = 24.',
    'Poi moltiplica per 10 (basta aggiungere uno zero): 240.',
  ],
  'multiply-9': [
    '9 è semplicemente 10 meno 1.',
    'Prima, moltiplica per 10: 480',
    'Poi sottrai il numero di partenza: 480 - 48',
    '480 - 40 = 440, poi 440 - 8 = 432',
  ],
  'multiply-12': [
    '12 è 10 più 2.',
    'Moltiplica per 10: 340',
    'Raddoppia il numero: 68',
    'Sommali: 340 + 68 = 408',
  ],
  'multiply-15': [
    '15 è 10 più 5 (metà di 10).',
    'Moltiplica per 10: 340',
    'Prendi la metà di quel risultato: 170',
    'Sommali: 340 + 170 = 510',
  ],
  'multiply-25': [
    '25 è esattamente 100 diviso 4.',
    'Quindi basta dividere il numero per 4: 32 ÷ 4 = 8.',
    'Poi moltiplica per 100 (aggiungi due zeri): 800.',
  ],
  'double-halve': [
    "Idea di fondo: ½ e ×2 si annullano. Puoi dimezzare un fattore e raddoppiare l'altro, e il prodotto resta lo stesso.",
    'Obiettivo: trasformare un prodotto scomodo in uno con un fattore "comodo" (×10, ×100…).',
    "Per 14 × 45: dimezza quello pari (14 → 7), raddoppia l'altro (45 → 90).",
    'Ora 7 × 90 è facile: 7 × 9 = 63, aggiungi uno zero → 630.',
  ],
  'rule-of-101': [
    'Perché funziona: 101 = 100 + 1. Quindi n × 101 = n × 100 + n. Il "× 100" sposta le cifre di due posti a sinistra; il "+ n" riempie di nuovo quei due posti più a destra.',
    'Per 43: 43 × 100 = 4300, poi + 43 = 4343.',
    'Scorciatoia: scrivi semplicemente il numero due volte. "43 43" → 4343.',
    'Funziona con qualsiasi numero a 2 cifre.',
  ],
  'rule-of-99': [
    '99 è semplicemente 100 meno 1.',
    'Moltiplica il numero per 100: 4300',
    'Sottrai da quello il numero esatto: 4300 - 43.',
    '4300 - 40 = 4260, poi meno 3 fa 4257',
  ],
  'just-over-100': [
    "Idea di fondo: (100 + a)(100 + b) = 100·(100 + a + b) + a·b. La parte a sinistra diventa le cifre iniziali; a·b diventa le ultime due.",
    "Passo 1 — aggiungi un numero all'\"extra\" dell'altro: 104 + 6 = 110 (uguale a 106 + 4). Questa è la prima parte.",
    'Passo 2 — moltiplica gli extra: 4 × 6 = 24. Queste sono le ultime due cifre (riempi a 2 cifre se serve).',
    'Uniscile: 110 poi 24 → 11024.',
  ],
  'cross-multiply': [
    'Idea di fondo: ogni prodotto tra numeri a 2 cifre si divide in tre pezzi — centinaia, decine, unità. Calcola ciascuno a parte, poi somma.',
    'Centinaia = sinistra × sinistra: 2 × 1 = 2 → scrivi 2.',
    'Decine = la croce — (sinistra × destra) + (destra × sinistra): (2×2) + (3×1) = 4 + 3 = 7 → scrivi 7.',
    'Unità = destra × destra: 3 × 2 = 6 → scrivi 6.',
    'Leggi: 2, 7, 6 → 276. Nessun riporto quando ogni parte è di una cifra sola.',
  ],
  'square-50s': [
    'Perché 25? Perché 50² = 2500, e il "25" è la parte delle centinaia. Qualsiasi numero sui 50 inizia con quel 25.',
    "Passo 1 — aggiungi la cifra delle unità a 25: 25 + 4 = 29. Questa è la prima metà.",
    'Passo 2 — eleva al quadrato la cifra delle unità: 4² = 16. Questa è la seconda metà (sempre 2 cifre — riempi con 0 se serve).',
    'Uniscile: 29 poi 16 → 2916.',
  ],
  'square-40s': [
    'Idea di fondo: ancora tutto a 50. Il numero è "50 meno qualcosa" — per 48, quel qualcosa è 2.',
    'Passo 1 — sottrai quella distanza da 25: 25 − 2 = 23. (Prima metà.)',
    'Passo 2 — eleva al quadrato la distanza: 2² = 4 → riempi a "04". (La seconda metà è sempre di 2 cifre.)',
    'Uniscile: 23 poi 04 → 2304.',
  ],
  'near-1000': [
    'Stessa idea dei Quadrati vicini a 100, ma con 1000 come àncora. (1000 − d)² = (1000 − 2d)(1000) + d².',
    'Passo 1 — trova la distanza da 1000: 1000 − 996 = 4.',
    'Passo 2 — sottrai quella distanza dal numero: 996 − 4 = 992. (Prima parte.)',
    'Passo 3 — eleva al quadrato la distanza, riempita a 3 cifre: 4² = 016. (Seconda parte.)',
    'Uniscile: 992 poi 016 → 992016.',
  ],
  'divide-5': [
    'Perché funziona: ÷5 è lo stesso che ÷10 poi ×2. Oppure al contrario, ×2 poi ÷10.',
    'Passo 1 — raddoppia: 130 × 2 = 260.',
    'Passo 2 — togli uno zero: 26.',
    'Togliere uno zero è solo dividere per 10. Più facile che dividere per 5 a mente.',
  ],
  'divide-25': [
    'Perché funziona: 25 × 4 = 100. Quindi ÷25 è lo stesso che ×4 ÷100.',
    'Passo 1 — moltiplica per 4: 800 × 4 = 3200.',
    'Passo 2 — togli due zeri (÷100): 32.',
    'Moltiplicare per 4 è solo raddoppiare due volte — più facile che dividere per 25.',
  ],
  'sub-1000': [
    "Perché: 1000 = 999 + 1. Quindi 1000 − abc = (999 − abc) + 1. Ognuna delle prime due cifre viene da 9 (senza prestito), e l'ultima da 10 (il +1).",
    'Passo 1 — sottrai ogni cifra da 9: 9 − 4 = 5, 9 − 7 = 2.',
    "Passo 2 — sottrai l'ultima cifra da 10: 10 − 3 = 7.",
    'Uniscile: 5, 2, 7 → 527. Nessun prestito da nessuna parte.',
  ],
  'add-reversed': [
    'Individua le due cifre: 4 e 7',
    'Sommale: 4 + 7 = 11',
    'Moltiplica per 11: 11 × 11 = 121',
    'Perché? (10a+b) + (10b+a) = 11a + 11b',
  ],
  'sub-reversed': [
    'Individua le due cifre: 8 e 2',
    'Trova la loro differenza: 8 - 2 = 6',
    'Moltiplica per 9: 6 × 9 = 54',
    'Perché? (10a+b) - (10b+a) = 9a - 9b',
  ],
  'multiply-ends-5-10-apart': [
    'Funziona ogni volta che entrambi i numeri finiscono per 5 E distano esattamente 10.',
    'Passo 1 — moltiplica le cifre delle decine: 3 × 4 = 12.',
    'Passo 2 — aggiungi la cifra delle decine più piccola: 12 + 3 = 15. (Questa è la prima parte della risposta.)',
    'Passo 3 — attacca sempre 75: 1575.',
    'Perché "75"? Perché 5 × 5 = 25, più il mezzo passo dal termine centrale mancante che ti porta a ...75 ogni volta.',
  ],
  'divide-3': [
    'Verifica con la somma delle cifre: 5+7+1+2 = 15. Poiché 15 è divisibile per 3, lo è anche il numero di partenza. (Ti risparmia un calcolo inutile.)',
    'Ora procedi da sinistra a destra: 3 in 5 = 1, resto 2. Abbassa il 7 → 27.',
    '3 in 27 = 9 esatto. Abbassa l\'1 → 1.',
    '3 in 1 = 0, resto 1. Abbassa il 2 → 12. 3 in 12 = 4.',
    'Leggi: 1, 9, 0, 4 → 1904.',
  ],
  'complement-100': [
    'Perché: (100 − a)(100 − b) = 100·(100 − a − b) + a·b. La prima parte diventa le cifre iniziali; a·b finisce nelle ultime due.',
    'Passo 1 — trova ogni "mancanza" (distanza da 100): 100 − 97 = 3, e 100 − 94 = 6.',
    "Passo 2 — sottrai una mancanza dall'ALTRO numero: 97 − 6 = 91. (Stesso risultato se fai 94 − 3.) Questa è la prima parte.",
    'Passo 3 — moltiplica le mancanze: 3 × 6 = 18. (Riempi a 2 cifre se serve.) Questa è la parte finale.',
    'Uniscile: 91 poi 18 → 9118.',
  ],
  'divisible-11': [
    'Perché funziona: 10 = 11 − 1, quindi 100 = 11×9 + 1, 1000 = 11×91 − 1, ecc. Ogni posizione alterna tra un resto +1 e −1 quando divisa per 11.',
    'Segna ogni cifra con segni + e − alternati (la cifra più a destra prende +, poi si alterna spostandosi a sinistra).',
    "Per 2728: −2 + 7 − 2 + 8 = +11. (Oppure 2 − 7 + 2 − 8 = −11 leggendo nell'altra direzione. Stessa grandezza.)",
    'Un risultato di 0 o un multiplo di 11 significa che il numero di partenza si divide esattamente. ±11 → sì.',
  ],
  'divisible-11.result': [
    'Sì!',
  ],
  'flip-percent': [
    "Perché funziona: l'A% di B è A × B / 100. La moltiplicazione non bada all'ordine, quindi equivale a B × A / 100, cioè il B% di A.",
    "L'8% di 50 è seccante. Ma il 50% di 8 è semplicemente la metà di 8.",
    'Il 50% di 8 = 4. Stessa risposta, molto più facile.',
    'Quando vedi una percentuale scomoda di un numero comodo, rovesciala.',
  ],
  'telescoping-sum': [
    'Riscrivi ogni termine: ¼⅛… ↨ 1/k - 1/(k+1)',
    'La somma diventa: (1-½) + (½-⅓) + (⅓-¼) ...',
    'Tutti i termini centrali si annullano! (Il telescopio si richiude)',
    'Resta solo 1 - 1/(N+1) = N/(N+1)',
  ],
  'zeno-paradox': [
    'Cammina fino a metà del muro. Poi di nuovo a metà...',
    'In infiniti passi, lo raggiungi!',
    'Serie geometrica: S = a ÷ (1 - r)',
    'Qui a = ½, r = ½. Quindi S = ½ ÷ ½ = 1',
  ],
  'digit-sum-mod': [
    'Perché funziona: ogni potenza di 10 lascia resto 1 quando divisa per 9 (10 = 9+1, 100 = 99+1, ecc.). Quindi ogni cifra contribuisce con sé stessa al resto.',
    'Somma le cifre: 4 + 5 + 7 + 3 = 19.',
    'Ancora ≥ 10? Somma di nuovo: 1 + 9 = 10 → 1 + 0 = 1.',
    'Quella cifra singola finale È il resto. 4573 ÷ 9 lascia resto 1.',
  ],
  'power-last-digit': [
    'Le potenze di 7 seguono un ciclo: 7, 9, 3, 1, 7, 9, 3, 1...',
    'La lunghezza del ciclo è 4.',
    '43 mod 4 = 3, quindi prendi il 3° valore del ciclo.',
    'Il 3° valore è 3!',
  ],
  'product-last-digit': [
    "Perché: quando moltiplichi due numeri, solo le cifre delle unità contribuiscono alla cifra delle unità della risposta. Le centinaia e le decine di entrambi i numeri influenzano solo le colonne più alte.",
    'Riduci alle ultime cifre: 7 × 3.',
    "7 × 3 = 21. Prendi l'ultima cifra: 1.",
    'Quindi 347 × 893 finisce per 1. (Non serve calcolare tutto il prodotto!)',
  ],
  'gauss-sum': [
    'La storia: al piccolo Gauss di 9 anni fu chiesto di sommare da 1 a 100. Notò che le coppie (1+100), (2+99), (3+98)… fanno tutte 101.',
    'Quante coppie? 100 numeri formano 50 coppie.',
    'Quindi il totale è 50 × 101 = 5050.',
    'Regola generale: 1 + 2 + … + N = N × (N+1) ÷ 2.',
  ],
  'golden-ratio': [
    'Il denominatore ha lo stesso schema di x stesso!',
    'Quindi x = 1 + 1/x',
    'Moltiplica per x: x² = x + 1, cioè x² - x - 1 = 0',
    'Radice positiva: x = (1 + √5) / 2 ≈ 1.618',
  ],
  'large-power-cycles': [
    'Le potenze di 7 ciclano ogni 4: 7, 9, 3, 1, 7, 9, 3, 1...',
    'Quindi 7^N mod 10 dipende solo da N mod 4.',
    '100 mod 4 = 0, che corrisponde al 4° valore del ciclo.',
    'Il 4° valore è 1!',
  ],
};
