/**
 * fr (Français) — Magic-Trick lesson STEP overlays, keyed by trick id.
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
export const fr_lessons: Record<string, readonly string[]> = {
  'square-5': [
    "D'abord, prends le chiffre des dizaines : 6",
    "Multiplie-le par le nombre juste au-dessus : 6 × 7 = 42",
    "Enfin, colle 25 à la fin !",
    "42... 25... -> 4225",
  ],
  'diff-squares': [
    "Grande idée : (a − b)(a + b) = a² − b². Deux nombres à égale distance d'une valeur centrale se ramènent à un carré moins un autre.",
    "Ici, les deux nombres sont à 2 de 100 : c'est (100 − 2)(100 + 2).",
    "Applique la formule : 100² − 2² = 10000 − 4.",
    "= 9996.",
  ],
  'multiply-11': [
    "Sépare les chiffres : 4 _ 3.",
    "Additionne-les et glisse la somme au milieu : 4 + 3 = 7 → 4 7 3.",
    "Pourquoi ça marche : 43 × 11 = 43 × 10 + 43 = 430 + 43. En les alignant, la somme des chiffres se place dans la colonne des dizaines.",
    "Attention : si la somme fait 10 ou plus, retiens le 1. (87 × 11 : 8+7 = 15 → retiens le 1 vers le 8 → 9, 5, 7 → 957.)",
  ],
  'near-100': [
    "Grande idée : (100 − d)² = 100² − 200d + d² = (100 − 2d)(100) + d². La première partie donne les premiers chiffres ; le d² donne les deux derniers.",
    "Étape 1 — trouve la distance à 100 : 100 − 96 = 4.",
    "Étape 2 — soustrais la distance du nombre : 96 − 4 = 92. (Première moitié.)",
    "Étape 3 — élève la distance au carré : 4² = 16. (Deuxième moitié, complétée à 2 chiffres.)",
    "Colle-les : 92 puis 16 → 9216.",
  ],
  'sum-odds': [
    "Compte les nombres : 5 nombres impairs à la suite.",
    "La grande idée : les N premiers nombres impairs font TOUJOURS N².",
    "Pourquoi ? Imagine une grille N×N. Chaque nouveau nombre impair ajoute un L autour du coin — un carré, puis 3, puis 5… ce qui complète le carré.",
    "5 nombres, donc 5² = 25.",
  ],
  'multiply-5': [
    "Vois le 5 comme 10 divisé par 2.",
    "Alors d'abord, coupe le nombre en deux : 48 ÷ 2 = 24.",
    "Puis multiplie par 10 (ajoute juste un zéro) : 240.",
  ],
  'multiply-9': [
    "9 c'est juste 10 moins 1.",
    "D'abord, multiplie par 10 : 480",
    "Puis soustrais le nombre de départ : 480 - 48",
    "480 - 40 = 440, puis 440 - 8 = 432",
  ],
  'multiply-12': [
    "12 c'est 10 plus 2.",
    "Multiplie par 10 : 340",
    "Double le nombre : 68",
    "Additionne-les : 340 + 68 = 408",
  ],
  'multiply-15': [
    "15 c'est 10 plus 5 (la moitié de 10).",
    "Multiplie par 10 : 340",
    "Prends la moitié de ce résultat : 170",
    "Additionne-les : 340 + 170 = 510",
  ],
  'multiply-25': [
    "25 c'est exactement 100 divisé par 4.",
    "Alors divise simplement le nombre par 4 : 32 ÷ 4 = 8.",
    "Puis multiplie par 100 (ajoute deux zéros) : 800.",
  ],
  'double-halve': [
    "Grande idée : ½ et ×2 s'annulent. Tu peux donc diviser un facteur par deux tout en doublant l'autre, et le produit reste le même.",
    "But : transformer un produit pénible en un produit avec un facteur « pratique » (×10, ×100…).",
    "Pour 14 × 45 : divise le nombre pair par deux (14 → 7), double l'autre (45 → 90).",
    "Maintenant 7 × 90 est facile : 7 × 9 = 63, ajoute un zéro → 630.",
  ],
  'rule-of-101': [
    "Pourquoi ça marche : 101 = 100 + 1. Donc n × 101 = n × 100 + n. Le « × 100 » pousse les chiffres de deux rangs vers la gauche ; le « + n » remplit à nouveau ces deux rangs de droite.",
    "Pour 43 : 43 × 100 = 4300, puis + 43 = 4343.",
    "Astuce : écris juste le nombre deux fois. « 43 43 » → 4343.",
    "Marche sur n'importe quel nombre à 2 chiffres.",
  ],
  'rule-of-99': [
    "99 c'est juste 100 moins 1.",
    "Multiplie le nombre par 100 : 4300",
    "Soustrais le nombre exact de ce résultat : 4300 - 43.",
    "4300 - 40 = 4260, puis moins 3 fait 4257",
  ],
  'just-over-100': [
    "Grande idée : (100 + a)(100 + b) = 100·(100 + a + b) + a·b. La partie de gauche donne les premiers chiffres ; a·b donne les deux derniers.",
    "Étape 1 — ajoute l'un des nombres au « surplus » de l'autre : 104 + 6 = 110 (pareil que 106 + 4). C'est la première partie.",
    "Étape 2 — multiplie les surplus : 4 × 6 = 24. Ce sont les deux derniers chiffres (complète à 2 chiffres si besoin).",
    "Colle-les : 110 puis 24 → 11024.",
  ],
  'cross-multiply': [
    "Grande idée : tout produit à 2 chiffres × 2 chiffres se décompose en trois morceaux — centaines, dizaines, unités. Calcule chacun à part, puis additionne.",
    "Centaines = gauche × gauche : 2 × 1 = 2 → écris 2.",
    "Dizaines = le croisement — (gauche × droite) + (droite × gauche) : (2×2) + (3×1) = 4 + 3 = 7 → écris 7.",
    "Unités = droite × droite : 3 × 2 = 6 → écris 6.",
    "Lis : 2, 7, 6 → 276. Aucune retenue quand chaque partie tient sur un chiffre.",
  ],
  'square-50s': [
    "Pourquoi 25 ? Parce que 50² = 2500, et le « 25 » est la partie des centaines. Tout nombre dans les 50 commence par ce 25.",
    "Étape 1 — ajoute le chiffre des unités à 25 : 25 + 4 = 29. C'est la première moitié.",
    "Étape 2 — élève le chiffre des unités au carré : 4² = 16. C'est la deuxième moitié (toujours 2 chiffres — complète avec un 0 si besoin).",
    "Colle-les : 29 puis 16 → 2916.",
  ],
  'square-40s': [
    "Grande idée : appuie-toi sur 50. Le nombre c'est « 50 moins quelque chose » — pour 48, ce quelque chose est 2.",
    "Étape 1 — soustrais cette distance de 25 : 25 − 2 = 23. (Première moitié.)",
    "Étape 2 — élève la distance au carré : 2² = 4 → complète en « 04 ». (La deuxième moitié fait toujours 2 chiffres.)",
    "Colle-les : 23 puis 04 → 2304.",
  ],
  'near-1000': [
    "Même idée que les Carrés proches de 100, mais avec 1000 comme appui. (1000 − d)² = (1000 − 2d)(1000) + d².",
    "Étape 1 — trouve la distance à 1000 : 1000 − 996 = 4.",
    "Étape 2 — soustrais cette distance du nombre : 996 − 4 = 992. (Première partie.)",
    "Étape 3 — élève la distance au carré, complétée à 3 chiffres : 4² = 016. (Deuxième partie.)",
    "Colle-les : 992 puis 016 → 992016.",
  ],
  'divide-5': [
    "Pourquoi ça marche : ÷5 revient à ÷10 puis ×2. Ou dans l'autre sens, ×2 puis ÷10.",
    "Étape 1 — double : 130 × 2 = 260.",
    "Étape 2 — enlève un zéro : 26.",
    "Enlever un zéro, c'est juste diviser par 10. Plus facile que diviser par 5 dans sa tête.",
  ],
  'divide-25': [
    "Pourquoi ça marche : 25 × 4 = 100. Donc ÷25 revient à ×4 ÷100.",
    "Étape 1 — multiplie par 4 : 800 × 4 = 3200.",
    "Étape 2 — enlève deux zéros (÷100) : 32.",
    "Multiplier par 4, c'est juste doubler deux fois — plus facile que diviser par 25.",
  ],
  'sub-1000': [
    "Pourquoi : 1000 = 999 + 1. Donc 1000 − abc = (999 − abc) + 1. Chacun des deux premiers chiffres vient de 9 (sans retenue), et le dernier de 10 (le +1).",
    "Étape 1 — soustrais chaque chiffre de 9 : 9 − 4 = 5, 9 − 7 = 2.",
    "Étape 2 — soustrais le dernier chiffre de 10 : 10 − 3 = 7.",
    "Colle-les : 5, 2, 7 → 527. Aucune retenue nulle part.",
  ],
  'add-reversed': [
    "Repère les deux chiffres : 4 et 7",
    "Additionne-les : 4 + 7 = 11",
    "Multiplie par 11 : 11 × 11 = 121",
    "Pourquoi ? (10a+b) + (10b+a) = 11a + 11b",
  ],
  'sub-reversed': [
    "Repère les deux chiffres : 8 et 2",
    "Trouve leur différence : 8 - 2 = 6",
    "Multiplie par 9 : 6 × 9 = 54",
    "Pourquoi ? (10a+b) - (10b+a) = 9a - 9b",
  ],
  'multiply-ends-5-10-apart': [
    "Marche dès que les deux nombres finissent par 5 ET sont séparés d'exactement 10.",
    "Étape 1 — multiplie les chiffres des dizaines : 3 × 4 = 12.",
    "Étape 2 — ajoute le plus petit chiffre des dizaines : 12 + 3 = 15. (C'est la première partie de la réponse.)",
    "Étape 3 — colle toujours 75 à la fin : 1575.",
    "Pourquoi « 75 » ? Parce que 5 × 5 = 25, plus le demi-pas du terme central manquant, ce qui te mène à ...75 à chaque fois.",
  ],
  'divide-3': [
    "Vérif par la somme des chiffres : 5+7+1+2 = 15. Comme 15 est divisible par 3, le nombre de départ l'est aussi. (Ça t'évite un calcul inutile.)",
    "Maintenant avance de gauche à droite : 3 dans 5 = 1, reste 2. Abaisse le 7 → 27.",
    "3 dans 27 = 9 pile. Abaisse le 1 → 1.",
    "3 dans 1 = 0, reste 1. Abaisse le 2 → 12. 3 dans 12 = 4.",
    "Lis : 1, 9, 0, 4 → 1904.",
  ],
  'complement-100': [
    "Pourquoi : (100 − a)(100 − b) = 100·(100 − a − b) + a·b. La première partie donne les premiers chiffres ; a·b se place dans les deux derniers.",
    "Étape 1 — trouve chaque « manque » (distance à 100) : 100 − 97 = 3, et 100 − 94 = 6.",
    "Étape 2 — soustrais un manque de l'AUTRE nombre : 97 − 6 = 91. (Même résultat si tu fais 94 − 3.) C'est la première partie.",
    "Étape 3 — multiplie les manques : 3 × 6 = 18. (Complète à 2 chiffres si besoin.) C'est la dernière partie.",
    "Colle-les : 91 puis 18 → 9118.",
  ],
  'divisible-11': [
    "Pourquoi ça marche : 10 = 11 − 1, donc 100 = 11×9 + 1, 1000 = 11×91 − 1, etc. Chaque rang laisse alternativement un reste de +1 et de −1 quand on divise par 11.",
    "Étiquette chaque chiffre avec des signes + et − alternés (le chiffre le plus à droite reçoit +, puis on alterne vers la gauche).",
    "Pour 2728 : −2 + 7 − 2 + 8 = +11. (Ou 2 − 7 + 2 − 8 = −11 en lisant dans l'autre sens. Même grandeur.)",
    "Un résultat de 0 ou un multiple de 11 signifie que le nombre de départ tombe juste. ±11 → oui.",
  ],
  'divisible-11.result': [
    "Oui !",
  ],
  'flip-percent': [
    "Pourquoi ça marche : A% de B c'est A × B / 100. La multiplication se moque de l'ordre, donc ça vaut B × A / 100, c'est-à-dire B% de A.",
    "8% de 50, c'est pénible. Mais 50% de 8, c'est juste la moitié de 8.",
    "50% de 8 = 4. Même réponse, bien plus facile.",
    "Quand tu vois un pourcentage moche d'un nombre pratique, retourne-le.",
  ],
  'telescoping-sum': [
    "Réécris chaque terme : ¼⅛… ↨ 1/k - 1/(k+1)",
    "La somme devient : (1-½) + (½-⅓) + (⅓-¼) ...",
    "Tous les termes du milieu s'annulent ! (Le télescope se replie)",
    "Il ne reste que 1 - 1/(N+1) = N/(N+1)",
  ],
  'zeno-paradox': [
    "Marche jusqu'à la moitié du mur. Puis encore la moitié...",
    "En une infinité de pas, tu l'atteins !",
    "Série géométrique : S = a ÷ (1 - r)",
    "Ici a = ½, r = ½. Donc S = ½ ÷ ½ = 1",
  ],
  'digit-sum-mod': [
    "Pourquoi ça marche : chaque puissance de 10 laisse un reste de 1 quand on divise par 9 (10 = 9+1, 100 = 99+1, etc.). Donc chaque chiffre apporte sa propre valeur au reste.",
    "Additionne les chiffres : 4 + 5 + 7 + 3 = 19.",
    "Encore ≥ 10 ? Additionne de nouveau : 1 + 9 = 10 → 1 + 0 = 1.",
    "Ce dernier chiffre unique EST le reste. 4573 ÷ 9 laisse un reste de 1.",
  ],
  'power-last-digit': [
    "Les puissances de 7 tournent en cycle : 7, 9, 3, 1, 7, 9, 3, 1...",
    "La longueur du cycle est 4.",
    "43 mod 4 = 3, alors prends la 3ᵉ valeur du cycle.",
    "La 3ᵉ valeur est 3 !",
  ],
  'product-last-digit': [
    "Pourquoi : quand tu multiplies deux nombres, seuls les chiffres des unités comptent pour le chiffre des unités de la réponse. Les centaines et les dizaines de chaque nombre n'affectent que les colonnes supérieures.",
    "Ramène-toi aux derniers chiffres : 7 × 3.",
    "7 × 3 = 21. Prends le dernier chiffre : 1.",
    "Donc 347 × 893 finit par 1. (Pas besoin de calculer le produit complet !)",
  ],
  'gauss-sum': [
    "L'histoire : à 9 ans, on demanda à Gauss d'additionner 1 à 100. Il remarqua que les paires (1+100), (2+99), (3+98)… valent toutes 101.",
    "Combien de paires ? 100 nombres font 50 paires.",
    "Donc le total est 50 × 101 = 5050.",
    "Règle générale : 1 + 2 + … + N = N × (N+1) ÷ 2.",
  ],
  'golden-ratio': [
    "Le dénominateur suit exactement le même motif que x lui-même !",
    "Donc x = 1 + 1/x",
    "Multiplie par x : x² = x + 1, c'est-à-dire x² - x - 1 = 0",
    "Racine positive : x = (1 + √5) / 2 ≈ 1.618",
  ],
  'large-power-cycles': [
    "Les puissances de 7 tournent tous les 4 : 7, 9, 3, 1, 7, 9, 3, 1...",
    "Donc 7^N mod 10 ne dépend que de N mod 4.",
    "100 mod 4 = 0, ce qui correspond à la 4ᵉ valeur du cycle.",
    "La 4ᵉ valeur est 1 !",
  ],
};
