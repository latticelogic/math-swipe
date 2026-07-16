/**
 * pt-BR (Português do Brasil) — Magic-Trick lesson STEP overlays, keyed by
 * trick id.
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
export const ptBR_lessons: Record<string, readonly string[]> = {
    'square-5': [
        'Primeiro, pegue o algarismo das dezenas: 6',
        'Multiplique pelo número seguinte: 6 × 7 = 42',
        'Por fim, coloque 25 no final!',
        '42... 25... -> 4225',
    ],
    'diff-squares': [
        'Ideia principal: (a − b)(a + b) = a² − b². Dois números à mesma distância de um valor central viram um quadrado menos o outro.',
        'Aqui, os dois números estão a 2 de distância de 100: isso é (100 − 2)(100 + 2).',
        'Aplique a fórmula: 100² − 2² = 10000 − 4.',
        '= 9996.',
    ],
    'multiply-11': [
        'Separe os dígitos: 4 _ 3.',
        'Some os dois e encaixe a soma no meio: 4 + 3 = 7 → 4 7 3.',
        'Por que funciona: 43 × 11 = 43 × 10 + 43 = 430 + 43. Alinhar isso coloca a soma dos algarismos na coluna das dezenas.',
        'Atenção: se a soma for 10 ou mais, leve o 1. (87 × 11: 8+7 = 15 → leve o 1 para o 8 → 9, 5, 7 → 957.)',
    ],
    'near-100': [
        'Ideia principal: (100 − d)² = 100² − 200d + d² = (100 − 2d)(100) + d². A primeira parte forma os primeiros dígitos; o d² forma os dois últimos.',
        'Passo 1 — ache a distância até 100: 100 − 96 = 4.',
        'Passo 2 — subtraia a distância do número: 96 − 4 = 92. (Primeira metade.)',
        'Passo 3 — eleve a distância ao quadrado: 4² = 16. (Segunda metade, completada com 2 dígitos.)',
        'Junte tudo: 92 e depois 16 → 9216.',
    ],
    'sum-odds': [
        'Conte os números: 5 números ímpares seguidos.',
        'A ideia principal: os primeiros N números ímpares SEMPRE somam N².',
        'Por quê? Imagine uma grade N×N. Cada novo número ímpar acrescenta um L em volta do canto — um quadradinho, depois 3, depois 5… preenchendo o quadrado.',
        '5 números, então 5² = 25.',
    ],
    'multiply-5': [
        'Pense no 5 como 10 dividido por 2.',
        'Então, primeiro divida o número pela metade: 48 ÷ 2 = 24.',
        'Depois multiplique por 10 (é só acrescentar um zero): 240.',
    ],
    'multiply-9': [
        '9 é só 10 menos 1.',
        'Primeiro, multiplique por 10: 480',
        'Depois subtraia o número original: 480 - 48',
        '480 - 40 = 440, depois 440 - 8 = 432',
    ],
    'multiply-12': [
        '12 é 10 mais 2.',
        'Multiplique por 10: 340',
        'Dobre o número: 68',
        'Some os dois: 340 + 68 = 408',
    ],
    'multiply-15': [
        '15 é 10 mais 5 (metade de 10).',
        'Multiplique por 10: 340',
        'Pegue a metade desse resultado: 170',
        'Some os dois: 340 + 170 = 510',
    ],
    'multiply-25': [
        '25 é exatamente 100 dividido por 4.',
        'Então é só dividir o número por 4: 32 ÷ 4 = 8.',
        'Depois multiplique por 100 (acrescente dois zeros): 800.',
    ],
    'double-halve': [
        'Ideia principal: ½ e ×2 se cancelam. Então você pode reduzir um fator à metade e dobrar o outro, e o produto continua igual.',
        'Objetivo: transformar um produto complicado em um com um fator "amigável" (×10, ×100…).',
        'Para 14 × 45: reduza o par à metade (14 → 7) e dobre o outro (45 → 90).',
        'Agora 7 × 90 é fácil: 7 × 9 = 63, acrescente um zero → 630.',
    ],
    'rule-of-101': [
        'Por que funciona: 101 = 100 + 1. Então n × 101 = n × 100 + n. O "× 100" empurra os dígitos duas casas para a esquerda; o "+ n" preenche de volta essas duas casas da direita.',
        'Para 43: 43 × 100 = 4300, depois + 43 = 4343.',
        'Atalho: é só escrever o número duas vezes. "43 43" → 4343.',
        'Funciona com qualquer número de 2 dígitos.',
    ],
    'rule-of-99': [
        '99 é só 100 menos 1.',
        'Multiplique o número por 100: 4300',
        'Subtraia o número exato disso: 4300 - 43.',
        '4300 - 40 = 4260, depois menos 3 dá 4257',
    ],
    'just-over-100': [
        'Ideia principal: (100 + a)(100 + b) = 100·(100 + a + b) + a·b. A parte da esquerda forma os primeiros dígitos; a·b forma os dois últimos.',
        'Passo 1 — some um dos números ao "extra" do outro: 104 + 6 = 110 (o mesmo que 106 + 4). Essa é a primeira parte.',
        'Passo 2 — multiplique os extras: 4 × 6 = 24. Esses são os dois últimos dígitos (complete com 2 dígitos se precisar).',
        'Junte tudo: 110 e depois 24 → 11024.',
    ],
    'cross-multiply': [
        'Ideia principal: qualquer 2 dígitos × 2 dígitos se divide em três partes — centenas, dezenas, unidades. Calcule cada uma separadamente e some.',
        'Centenas = esquerda × esquerda: 2 × 1 = 2 → anote 2.',
        'Dezenas = o cruzamento — (esquerda × direita) + (direita × esquerda): (2×2) + (3×1) = 4 + 3 = 7 → anote 7.',
        'Unidades = direita × direita: 3 × 2 = 6 → anote 6.',
        'Leia: 2, 7, 6 → 276. Não precisa levar nada quando cada parte tem um só dígito.',
    ],
    'square-50s': [
        'Por que 25? Porque 50² = 2500, e o "25" é a parte das centenas. Todo número na casa dos 50 começa com esse 25.',
        'Passo 1 — some o algarismo das unidades a 25: 25 + 4 = 29. Essa é a primeira metade.',
        'Passo 2 — eleve o algarismo das unidades ao quadrado: 4² = 16. Essa é a segunda metade (sempre 2 dígitos — complete com 0 se precisar).',
        'Junte tudo: 29 e depois 16 → 2916.',
    ],
    'square-40s': [
        'Ideia principal: ancore no 50. O número é "50 menos alguma coisa" — para 48, essa coisa é 2.',
        'Passo 1 — subtraia essa distância de 25: 25 − 2 = 23. (Primeira metade.)',
        'Passo 2 — eleve a distância ao quadrado: 2² = 4 → complete para "04". (A segunda metade sempre tem 2 dígitos.)',
        'Junte tudo: 23 e depois 04 → 2304.',
    ],
    'near-1000': [
        'A mesma ideia dos Quadrados perto de 100, mas com 1000 como âncora. (1000 − d)² = (1000 − 2d)(1000) + d².',
        'Passo 1 — ache a distância até 1000: 1000 − 996 = 4.',
        'Passo 2 — subtraia essa distância do número: 996 − 4 = 992. (Primeira parte.)',
        'Passo 3 — eleve a distância ao quadrado, completando com 3 dígitos: 4² = 016. (Segunda parte.)',
        'Junte tudo: 992 e depois 016 → 992016.',
    ],
    'divide-5': [
        'Por que funciona: ÷5 é o mesmo que ÷10 e depois ×2. Ou ao contrário, ×2 e depois ÷10.',
        'Passo 1 — dobre: 130 × 2 = 260.',
        'Passo 2 — corte um zero: 26.',
        'Cortar um zero é só dividir por 10. Mais fácil que dividir por 5 de cabeça.',
    ],
    'divide-25': [
        'Por que funciona: 25 × 4 = 100. Então ÷25 é o mesmo que ×4 ÷100.',
        'Passo 1 — multiplique por 4: 800 × 4 = 3200.',
        'Passo 2 — corte dois zeros (÷100): 32.',
        'Multiplicar por 4 é só dobrar duas vezes — mais fácil que dividir por 25.',
    ],
    'sub-1000': [
        'Por quê: 1000 = 999 + 1. Então 1000 − abc = (999 − abc) + 1. Cada um dos dois primeiros dígitos sai do 9 (sem empréstimo), e o último sai do 10 (o +1).',
        'Passo 1 — subtraia cada dígito de 9: 9 − 4 = 5, 9 − 7 = 2.',
        'Passo 2 — subtraia o último dígito de 10: 10 − 3 = 7.',
        'Junte tudo: 5, 2, 7 → 527. Sem empréstimo em lugar nenhum.',
    ],
    'add-reversed': [
        'Identifique os dois dígitos: 4 e 7',
        'Some os dois: 4 + 7 = 11',
        'Multiplique por 11: 11 × 11 = 121',
        'Por quê? (10a+b) + (10b+a) = 11a + 11b',
    ],
    'sub-reversed': [
        'Identifique os dois dígitos: 8 e 2',
        'Ache a diferença entre eles: 8 - 2 = 6',
        'Multiplique por 9: 6 × 9 = 54',
        'Por quê? (10a+b) - (10b+a) = 9a - 9b',
    ],
    'multiply-ends-5-10-apart': [
        'Funciona sempre que os dois números terminam em 5 E têm exatamente 10 de diferença.',
        'Passo 1 — multiplique os algarismos das dezenas: 3 × 4 = 12.',
        'Passo 2 — some o menor algarismo das dezenas: 12 + 3 = 15. (Essa é a primeira parte da resposta.)',
        'Passo 3 — sempre acrescente 75 no final: 1575.',
        'Por que "75"? Porque 5 × 5 = 25, mais o meio-passo do termo do meio que falta te leva a ...75 toda vez.',
    ],
    'divide-3': [
        'Confira pela soma dos algarismos: 5+7+1+2 = 15. Como 15 é divisível por 3, o número original também é. (Poupa você de uma conta inútil.)',
        'Agora vá da esquerda para a direita: 3 cabe em 5 = 1, resto 2. Desça o 7 → 27.',
        '3 cabe em 27 = 9 certinho. Desça o 1 → 1.',
        '3 cabe em 1 = 0, resto 1. Desça o 2 → 12. 3 cabe em 12 = 4.',
        'Leia: 1, 9, 0, 4 → 1904.',
    ],
    'complement-100': [
        'Por quê: (100 − a)(100 − b) = 100·(100 − a − b) + a·b. A primeira parte são os primeiros dígitos; a·b forma os dois últimos.',
        'Passo 1 — ache cada "déficit" (distância até 100): 100 − 97 = 3, e 100 − 94 = 6.',
        'Passo 2 — subtraia um déficit do OUTRO número: 97 − 6 = 91. (O mesmo resultado se você fizer 94 − 3.) Essa é a primeira parte.',
        'Passo 3 — multiplique os déficits: 3 × 6 = 18. (Complete com 2 dígitos se precisar.) Essa é a última parte.',
        'Junte tudo: 91 e depois 18 → 9118.',
    ],
    'divisible-11': [
        'Por que funciona: 10 = 11 − 1, então 100 = 11×9 + 1, 1000 = 11×91 − 1, e assim por diante. Cada casa alterna entre deixar resto +1 e −1 na divisão por 11.',
        'Marque cada dígito com sinais + e − alternados (o dígito mais à direita recebe +, depois alterne indo para a esquerda).',
        'Para 2728: −2 + 7 − 2 + 8 = +11. (Ou 2 − 7 + 2 − 8 = −11 lendo no outro sentido. Mesmo valor.)',
        'Um resultado 0 ou qualquer múltiplo de 11 significa que o número original divide certinho. ±11 → sim.',
    ],
    'divisible-11.result': [
        'Sim!',
    ],
    'flip-percent': [
        'Por que funciona: A% de B é A × B / 100. A multiplicação não liga para a ordem, então isso é igual a B × A / 100, que é B% de A.',
        '8% de 50 é chato. Mas 50% de 8 é só a metade de 8.',
        '50% de 8 = 4. Mesma resposta, muito mais fácil.',
        'Quando você vir uma porcentagem feia de um número amigável, inverta.',
    ],
    'telescoping-sum': [
        'Reescreva cada termo: ¼⅛… ↨ 1/k - 1/(k+1)',
        'A soma vira: (1-½) + (½-⅓) + (⅓-¼) ...',
        'Todos os termos do meio se cancelam! (O telescópio se fecha)',
        'Só sobra 1 - 1/(N+1) = N/(N+1)',
    ],
    'zeno-paradox': [
        'Ande metade do caminho até a parede. Depois metade de novo...',
        'Em infinitos passos, você chega lá!',
        'Série geométrica: S = a ÷ (1 - r)',
        'Aqui a = ½, r = ½. Então S = ½ ÷ ½ = 1',
    ],
    'digit-sum-mod': [
        'Por que funciona: toda potência de 10 deixa resto 1 na divisão por 9 (10 = 9+1, 100 = 99+1, etc.). Então cada dígito contribui com ele mesmo para o resto.',
        'Some os dígitos: 4 + 5 + 7 + 3 = 19.',
        'Ainda ≥ 10? Some de novo: 1 + 9 = 10 → 1 + 0 = 1.',
        'Esse último dígito único É o resto. 4573 ÷ 9 deixa resto 1.',
    ],
    'power-last-digit': [
        'As potências de 7 se repetem em ciclo: 7, 9, 3, 1, 7, 9, 3, 1...',
        'O ciclo tem tamanho 4.',
        '43 mod 4 = 3, então pegue o 3º valor do ciclo.',
        'O 3º valor é 3!',
    ],
    'product-last-digit': [
        'Por quê: quando você multiplica dois números, só os algarismos das unidades influenciam o algarismo das unidades da resposta. As casas das centenas e das dezenas de cada número só afetam as colunas mais altas.',
        'Reduza aos últimos dígitos: 7 × 3.',
        '7 × 3 = 21. Pegue o último dígito: 1.',
        'Então 347 × 893 termina em 1. (Sem precisar calcular o produto inteiro!)',
    ],
    'gauss-sum': [
        'A história: com 9 anos, pediram a Gauss para somar de 1 a 100. Ele reparou que os pares (1+100), (2+99), (3+98)… davam todos 101.',
        'Quantos pares? 100 números formam 50 pares.',
        'Então o total é 50 × 101 = 5050.',
        'Regra geral: 1 + 2 + … + N = N × (N+1) ÷ 2.',
    ],
    'golden-ratio': [
        'O denominador é o mesmo padrão do próprio x!',
        'Então x = 1 + 1/x',
        'Multiplique por x: x² = x + 1, ou seja, x² - x - 1 = 0',
        'Raiz positiva: x = (1 + √5) / 2 ≈ 1.618',
    ],
    'large-power-cycles': [
        'As potências de 7 se repetem a cada 4: 7, 9, 3, 1, 7, 9, 3, 1...',
        'Então 7^N mod 10 depende só de N mod 4.',
        '100 mod 4 = 0, que corresponde ao 4º valor do ciclo.',
        'O 4º valor é 1!',
    ],
};
