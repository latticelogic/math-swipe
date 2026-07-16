/**
 * de (Deutsch) — Magic-Trick lesson STEP overlays, keyed by trick id.
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
export const de_lessons: Record<string, readonly string[]> = {
    'square-5': [
        'Nimm zuerst die Zehnerziffer: 6',
        'Multipliziere sie mit der nächsthöheren Zahl: 6 × 7 = 42',
        'Häng zum Schluss 25 ans Ende!',
        '42... 25... -> 4225',
    ],
    'diff-squares': [
        'Kerngedanke: (a − b)(a + b) = a² − b². Zwei Zahlen mit gleichem Abstand von einem Mittelwert werden zu einem Quadrat minus einem anderen.',
        'Hier sind beide Zahlen 2 von 100 entfernt: das ist (100 − 2)(100 + 2).',
        'Wende die Formel an: 100² − 2² = 10000 − 4.',
        '= 9996.',
    ],
    'multiply-11': [
        'Teile die Ziffern: 4 _ 3.',
        'Addiere sie und schieb die Summe in die Mitte: 4 + 3 = 7 → 4 7 3.',
        'Warum es klappt: 43 × 11 = 43 × 10 + 43 = 430 + 43. Untereinander ergibt das die Ziffernsumme in der Zehnerspalte.',
        'Achtung: Ist die Summe 10 oder mehr, übertrage die 1. (87 × 11: 8+7 = 15 → die 1 auf die 8 übertragen → 9, 5, 7 → 957.)',
    ],
    'near-100': [
        'Kerngedanke: (100 − d)² = 100² − 200d + d² = (100 − 2d)(100) + d². Der erste Teil bildet die führenden Ziffern; das d² bildet die letzten beiden.',
        'Schritt 1 — finde den Abstand zu 100: 100 − 96 = 4.',
        'Schritt 2 — zieh den Abstand von der Zahl ab: 96 − 4 = 92. (Erste Hälfte.)',
        'Schritt 3 — quadriere den Abstand: 4² = 16. (Zweite Hälfte, auf 2 Ziffern aufgefüllt.)',
        'Setz sie zusammen: 92, dann 16 → 9216.',
    ],
    'sum-odds': [
        'Zähl die Zahlen: 5 ungerade Zahlen hintereinander.',
        'Der Kerngedanke: Die ersten N ungeraden Zahlen ergeben IMMER N².',
        'Warum? Stell dir ein N×N-Gitter vor. Jede neue ungerade Zahl legt ein L um die Ecke — ein Kästchen, dann 3, dann 5 … bis das Quadrat voll ist.',
        '5 Zahlen, also 5² = 25.',
    ],
    'multiply-5': [
        'Denk dir 5 als 10 geteilt durch 2.',
        'Halbiere also zuerst die Zahl: 48 ÷ 2 = 24.',
        'Dann multipliziere mit 10 (einfach eine Null anhängen): 240.',
    ],
    'multiply-9': [
        '9 ist einfach 10 minus 1.',
        'Multipliziere zuerst mit 10: 480',
        'Dann zieh die Ausgangszahl ab: 480 - 48',
        '480 - 40 = 440, dann 440 - 8 = 432',
    ],
    'multiply-12': [
        '12 ist 10 plus 2.',
        'Multipliziere mit 10: 340',
        'Verdopple die Zahl: 68',
        'Addiere beides: 340 + 68 = 408',
    ],
    'multiply-15': [
        '15 ist 10 plus 5 (die Hälfte von 10).',
        'Multipliziere mit 10: 340',
        'Nimm die Hälfte davon: 170',
        'Addiere beides: 340 + 170 = 510',
    ],
    'multiply-25': [
        '25 ist genau 100 geteilt durch 4.',
        'Teile die Zahl also einfach durch 4: 32 ÷ 4 = 8.',
        'Dann multipliziere mit 100 (zwei Nullen anhängen): 800.',
    ],
    'double-halve': [
        'Kerngedanke: ½ und ×2 heben sich auf. Du kannst also einen Faktor halbieren und den anderen verdoppeln — das Produkt bleibt gleich.',
        'Ziel: aus einem sperrigen Produkt eines mit einem „freundlichen“ Faktor machen (×10, ×100 …).',
        'Bei 14 × 45: halbiere die gerade Zahl (14 → 7), verdopple die andere (45 → 90).',
        'Jetzt ist 7 × 90 leicht: 7 × 9 = 63, eine Null anhängen → 630.',
    ],
    'rule-of-101': [
        'Warum es klappt: 101 = 100 + 1. Also n × 101 = n × 100 + n. Das „× 100“ schiebt die Ziffern zwei Stellen nach links; das „+ n“ füllt die beiden rechten Stellen wieder auf.',
        'Bei 43: 43 × 100 = 4300, dann + 43 = 4343.',
        'Abkürzung: schreib die Zahl einfach zweimal. „43 43“ → 4343.',
        'Funktioniert bei jeder zweistelligen Zahl.',
    ],
    'rule-of-99': [
        '99 ist einfach 100 minus 1.',
        'Multipliziere die Zahl mit 100: 4300',
        'Zieh davon genau die Zahl ab: 4300 - 43.',
        '4300 - 40 = 4260, dann minus 3 ergibt 4257',
    ],
    'just-over-100': [
        'Kerngedanke: (100 + a)(100 + b) = 100·(100 + a + b) + a·b. Der linke Teil bildet die führenden Ziffern; a·b bildet die letzten beiden.',
        'Schritt 1 — addiere eine Zahl zum „Überschuss“ der anderen: 104 + 6 = 110 (dasselbe wie 106 + 4). Das ist der erste Teil.',
        'Schritt 2 — multipliziere die Überschüsse: 4 × 6 = 24. Das sind die letzten beiden Ziffern (bei Bedarf auf 2 Ziffern auffüllen).',
        'Setz sie zusammen: 110, dann 24 → 11024.',
    ],
    'cross-multiply': [
        'Kerngedanke: Jedes zweistellig × zweistellig zerfällt in drei Teile — Hunderter, Zehner, Einer. Rechne jeden einzeln und addiere.',
        'Hunderter = links × links: 2 × 1 = 2 → schreib 2.',
        'Zehner = das Kreuz — (links × rechts) + (rechts × links): (2×2) + (3×1) = 4 + 3 = 7 → schreib 7.',
        'Einer = rechts × rechts: 3 × 2 = 6 → schreib 6.',
        'Lies ab: 2, 7, 6 → 276. Kein Übertrag nötig, solange jeder Teil einstellig ist.',
    ],
    'square-50s': [
        'Warum 25? Weil 50² = 2500 ist und die „25“ der Hunderter-Teil ist. Alles in den 50ern beginnt mit dieser 25.',
        'Schritt 1 — addiere die Einerziffer zu 25: 25 + 4 = 29. Das ist die erste Hälfte.',
        'Schritt 2 — quadriere die Einerziffer: 4² = 16. Das ist die zweite Hälfte (immer 2 Ziffern — bei Bedarf mit 0 auffüllen).',
        'Setz sie zusammen: 29, dann 16 → 2916.',
    ],
    'square-40s': [
        'Kerngedanke: Anker bei 50. Die Zahl ist „50 minus etwas“ — bei 48 ist dieses Etwas 2.',
        'Schritt 1 — zieh diesen Abstand von 25 ab: 25 − 2 = 23. (Erste Hälfte.)',
        'Schritt 2 — quadriere den Abstand: 2² = 4 → auf „04“ auffüllen. (Die zweite Hälfte hat immer 2 Ziffern.)',
        'Setz sie zusammen: 23, dann 04 → 2304.',
    ],
    'near-1000': [
        'Gleiche Idee wie bei Quadraten nahe 100, aber mit 1000 als Anker. (1000 − d)² = (1000 − 2d)(1000) + d².',
        'Schritt 1 — finde den Abstand zu 1000: 1000 − 996 = 4.',
        'Schritt 2 — zieh diesen Abstand von der Zahl ab: 996 − 4 = 992. (Erster Teil.)',
        'Schritt 3 — quadriere den Abstand, auf 3 Ziffern aufgefüllt: 4² = 016. (Zweiter Teil.)',
        'Setz sie zusammen: 992, dann 016 → 992016.',
    ],
    'divide-5': [
        'Warum es klappt: ÷5 ist dasselbe wie ÷10, dann ×2. Oder umgekehrt: ×2, dann ÷10.',
        'Schritt 1 — verdopple: 130 × 2 = 260.',
        'Schritt 2 — streich eine Null: 26.',
        'Eine Null streichen ist nichts anderes als durch 10 teilen. Leichter im Kopf als durch 5.',
    ],
    'divide-25': [
        'Warum es klappt: 25 × 4 = 100. Also ist ÷25 dasselbe wie ×4 ÷100.',
        'Schritt 1 — multipliziere mit 4: 800 × 4 = 3200.',
        'Schritt 2 — streich zwei Nullen (÷100): 32.',
        'Mal 4 ist zweimal verdoppeln — leichter als durch 25 zu teilen.',
    ],
    'sub-1000': [
        'Warum: 1000 = 999 + 1. Also 1000 − abc = (999 − abc) + 1. Die ersten beiden Ziffern kommen von 9 (kein Übertrag), die letzte von 10 (das +1).',
        'Schritt 1 — zieh jede Ziffer von 9 ab: 9 − 4 = 5, 9 − 7 = 2.',
        'Schritt 2 — zieh die letzte Ziffer von 10 ab: 10 − 3 = 7.',
        'Setz sie zusammen: 5, 2, 7 → 527. Nirgends ein Übertrag.',
    ],
    'add-reversed': [
        'Bestimme die beiden Ziffern: 4 und 7',
        'Addiere sie: 4 + 7 = 11',
        'Multipliziere mit 11: 11 × 11 = 121',
        'Warum? (10a+b) + (10b+a) = 11a + 11b',
    ],
    'sub-reversed': [
        'Bestimme die beiden Ziffern: 8 und 2',
        'Finde ihre Differenz: 8 - 2 = 6',
        'Multipliziere mit 9: 6 × 9 = 54',
        'Warum? (10a+b) - (10b+a) = 9a - 9b',
    ],
    'multiply-ends-5-10-apart': [
        'Klappt immer, wenn beide Zahlen auf 5 enden UND genau 10 auseinanderliegen.',
        'Schritt 1 — multipliziere die Zehnerziffern: 3 × 4 = 12.',
        'Schritt 2 — addiere die kleinere Zehnerziffer: 12 + 3 = 15. (Das ist der erste Teil der Antwort.)',
        'Schritt 3 — häng immer 75 an: 1575.',
        'Warum „75“? Weil 5 × 5 = 25, plus der halbe Schritt vom fehlenden Mittelterm dich jedes Mal bei ...75 landen lässt.',
    ],
    'divide-3': [
        'Quersummen-Check: 5+7+1+2 = 15. Da 15 durch 3 teilbar ist, ist es die Ausgangszahl auch. (Erspart dir eine sinnlose Rechnung.)',
        'Jetzt von links nach rechts: 3 in 5 = 1, Rest 2. Hol die 7 herunter → 27.',
        '3 in 27 = genau 9. Hol die 1 herunter → 1.',
        '3 in 1 = 0, Rest 1. Hol die 2 herunter → 12. 3 in 12 = 4.',
        'Lies ab: 1, 9, 0, 4 → 1904.',
    ],
    'complement-100': [
        'Warum: (100 − a)(100 − b) = 100·(100 − a − b) + a·b. Der erste Teil sind die führenden Ziffern; a·b bildet die letzten beiden.',
        'Schritt 1 — finde jeden „Fehlbetrag“ (Abstand zu 100): 100 − 97 = 3 und 100 − 94 = 6.',
        'Schritt 2 — zieh einen Fehlbetrag von der ANDEREN Zahl ab: 97 − 6 = 91. (Gleiches Ergebnis mit 94 − 3.) Das ist der erste Teil.',
        'Schritt 3 — multipliziere die Fehlbeträge: 3 × 6 = 18. (Bei Bedarf auf 2 Ziffern auffüllen.) Das ist der letzte Teil.',
        'Setz sie zusammen: 91, dann 18 → 9118.',
    ],
    'divisible-11': [
        'Warum es klappt: 10 = 11 − 1, also 100 = 11×9 + 1, 1000 = 11×91 − 1 usw. Jede Stelle lässt beim Teilen durch 11 abwechselnd Rest +1 und −1.',
        'Versieh jede Ziffer abwechselnd mit + und − (die rechte Ziffer bekommt +, dann abwechselnd nach links).',
        'Bei 2728: −2 + 7 − 2 + 8 = +11. (Oder 2 − 7 + 2 − 8 = −11 aus der anderen Richtung. Gleicher Betrag.)',
        'Ist das Ergebnis 0 oder ein Vielfaches von 11, geht die Zahl glatt auf. ±11 → ja.',
    ],
    'divisible-11.result': [
        'Ja!',
    ],
    'flip-percent': [
        'Warum es klappt: A% von B ist A × B / 100. Bei der Multiplikation zählt die Reihenfolge nicht, also ist es B × A / 100 — und das ist B% von A.',
        '8% von 50 ist lästig. Aber 50% von 8 ist einfach die Hälfte von 8.',
        '50% von 8 = 4. Gleiche Antwort, viel leichter.',
        'Wenn du einen sperrigen Prozentsatz von einer freundlichen Zahl siehst, dreh es um.',
    ],
    'telescoping-sum': [
        'Schreib jeden Term um: ¼⅛… ↨ 1/k - 1/(k+1)',
        'Die Summe wird zu: (1-½) + (½-⅓) + (⅓-¼) ...',
        'Alle mittleren Terme heben sich auf! (Das Teleskop klappt zusammen)',
        'Es bleibt nur 1 - 1/(N+1) = N/(N+1)',
    ],
    'zeno-paradox': [
        'Geh die halbe Strecke zur Wand. Dann wieder die Hälfte …',
        'In unendlich vielen Schritten kommst du an!',
        'Geometrische Reihe: S = a ÷ (1 - r)',
        'Hier a = ½, r = ½. Also S = ½ ÷ ½ = 1',
    ],
    'digit-sum-mod': [
        'Warum es klappt: Jede Zehnerpotenz lässt beim Teilen durch 9 den Rest 1 (10 = 9+1, 100 = 99+1 usw.). Also steuert jede Ziffer sich selbst zum Rest bei.',
        'Bilde die Quersumme: 4 + 5 + 7 + 3 = 19.',
        'Noch ≥ 10? Nochmal summieren: 1 + 9 = 10 → 1 + 0 = 1.',
        'Diese letzte einzelne Ziffer IST der Rest. 4573 ÷ 9 lässt Rest 1.',
    ],
    'power-last-digit': [
        'Potenzen von 7 laufen im Kreis: 7, 9, 3, 1, 7, 9, 3, 1...',
        'Die Zykluslänge ist 4.',
        '43 mod 4 = 3, nimm also den 3. Wert im Zyklus.',
        'Der 3. Wert ist 3!',
    ],
    'product-last-digit': [
        'Warum: Beim Multiplizieren zweier Zahlen bestimmen nur die Einerziffern die Einerziffer der Antwort. Die Hunderter und Zehner beider Zahlen wirken nur auf höhere Spalten.',
        'Reduziere auf die letzten Ziffern: 7 × 3.',
        '7 × 3 = 21. Nimm die letzte Ziffer: 1.',
        'Also endet 347 × 893 auf 1. (Das ganze Produkt musst du nicht ausrechnen!)',
    ],
    'gauss-sum': [
        'Die Geschichte: Der 9-jährige Gauß sollte 1 bis 100 addieren. Ihm fiel auf, dass die Paare (1+100), (2+99), (3+98) … alle 101 ergeben.',
        'Wie viele Paare? 100 Zahlen ergeben 50 Paare.',
        'Also ist die Summe 50 × 101 = 5050.',
        'Allgemeine Regel: 1 + 2 + … + N = N × (N+1) ÷ 2.',
    ],
    'golden-ratio': [
        'Der Nenner ist dasselbe Muster wie x selbst!',
        'Also x = 1 + 1/x',
        'Multipliziere mit x: x² = x + 1, also x² - x - 1 = 0',
        'Positive Lösung: x = (1 + √5) / 2 ≈ 1.618',
    ],
    'large-power-cycles': [
        'Potenzen von 7 wiederholen sich alle 4: 7, 9, 3, 1, 7, 9, 3, 1...',
        'Also hängt 7^N mod 10 nur von N mod 4 ab.',
        '100 mod 4 = 0, was dem 4. Wert im Zyklus entspricht.',
        'Der 4. Wert ist 1!',
    ],
};
