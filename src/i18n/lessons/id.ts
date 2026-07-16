/**
 * id (Bahasa Indonesia) — Magic-Trick lesson STEP overlays, keyed by trick id.
 *
 * English (src/utils/mathTricks.ts) stays the fallback. Populate as
 * `'<trickId>': ['...step 1...', '...step 2...']`. Worded results (only
 * `divisible-11` today) go under the `'<trickId>.result'` key as a
 * one-element array.
 *
 * Keep the embedded MATH intact (numbers, ×, ÷, digits, worked examples) —
 * translate only the surrounding words. See src/i18n/lessons.ts for the wiring
 * and scratchpad/lessons-inventory.json for the English source.
 */
export const id_lessons: Record<string, readonly string[]> = {
    'square-5': [
        'Pertama, ambil angka puluhannya: 6',
        'Kalikan dengan angka berikutnya: 6 × 7 = 42',
        'Terakhir, tempelkan 25 di belakangnya!',
        '42... 25... -> 4225',
    ],
    'diff-squares': [
        'Ide besar: (a − b)(a + b) = a² − b². Dua angka yang berjarak sama dari sebuah titik tengah menyusut menjadi satu kuadrat dikurangi kuadrat lain.',
        'Di sini, kedua angka berjarak 2 dari 100: yaitu (100 − 2)(100 + 2).',
        'Terapkan rumusnya: 100² − 2² = 10000 − 4.',
        '= 9996.',
    ],
    'multiply-11': [
        'Pisahkan angka-angkanya: 4 _ 3.',
        'Jumlahkan lalu selipkan hasilnya di tengah: 4 + 3 = 7 → 4 7 3.',
        'Mengapa berhasil: 43 × 11 = 43 × 10 + 43 = 430 + 43. Menyelaraskannya memberi jumlah digit di kolom puluhan.',
        'Hati-hati: jika jumlahnya 10 atau lebih, simpan angka 1-nya. (87 × 11: 8+7 = 15 → bawa 1 ke 8 → 9, 5, 7 → 957.)',
    ],
    'near-100': [
        'Ide besar: (100 − d)² = 100² − 200d + d² = (100 − 2d)(100) + d². Bagian pertama menjadi digit depan; d² menjadi dua digit terakhir.',
        'Langkah 1 — cari jaraknya dari 100: 100 − 96 = 4.',
        'Langkah 2 — kurangi angka dengan jaraknya: 96 − 4 = 92. (Paruh pertama.)',
        'Langkah 3 — kuadratkan jaraknya: 4² = 16. (Paruh kedua, dilengkapi jadi 2 digit.)',
        'Gabungkan: 92 lalu 16 → 9216.',
    ],
    'sum-odds': [
        'Hitung angkanya: 5 bilangan ganjil berturut-turut.',
        'Ide besarnya: N bilangan ganjil pertama SELALU berjumlah N².',
        'Mengapa? Bayangkan kisi N×N. Tiap bilangan ganjil baru menambah bentuk-L di sekitar sudutnya — satu kotak, lalu 3, lalu 5… memenuhi perseginya.',
        '5 angka, jadi 5² = 25.',
    ],
    'multiply-5': [
        'Anggap 5 sebagai 10 dibagi 2.',
        'Jadi pertama, bagi dua angkanya: 48 ÷ 2 = 24.',
        'Lalu kalikan dengan 10 (cukup tambah satu nol): 240.',
    ],
    'multiply-9': [
        '9 hanyalah 10 dikurangi 1.',
        'Pertama, kalikan dengan 10: 480',
        'Lalu kurangi angka aslinya: 480 - 48',
        '480 - 40 = 440, lalu 440 - 8 = 432',
    ],
    'multiply-12': [
        '12 adalah 10 tambah 2.',
        'Kalikan dengan 10: 340',
        'Gandakan angkanya: 68',
        'Jumlahkan keduanya: 340 + 68 = 408',
    ],
    'multiply-15': [
        '15 adalah 10 tambah 5 (setengah dari 10).',
        'Kalikan dengan 10: 340',
        'Ambil setengah dari hasil itu: 170',
        'Jumlahkan keduanya: 340 + 170 = 510',
    ],
    'multiply-25': [
        '25 tepat sama dengan 100 dibagi 4.',
        'Jadi cukup bagi angkanya dengan 4: 32 ÷ 4 = 8.',
        'Lalu kalikan dengan 100 (tambah dua nol): 800.',
    ],
    'double-halve': [
        'Ide besar: ½ dan ×2 saling menghapus. Jadi kamu bisa membagi dua satu faktor sambil menggandakan yang lain, dan hasil kalinya tetap sama.',
        'Tujuan: mengubah perkalian yang canggung menjadi punya faktor yang "bersahabat" (×10, ×100…).',
        'Untuk 14 × 45: bagi dua yang genap (14 → 7), gandakan yang lain (45 → 90).',
        'Sekarang 7 × 90 jadi mudah: 7 × 9 = 63, tambah satu nol → 630.',
    ],
    'rule-of-101': [
        'Mengapa berhasil: 101 = 100 + 1. Jadi n × 101 = n × 100 + n. "× 100" menggeser digit dua tempat ke kiri; "+ n" mengisi kembali dua tempat paling kanan itu.',
        'Untuk 43: 43 × 100 = 4300, lalu + 43 = 4343.',
        'Jalan pintas: cukup tulis angkanya dua kali. "43 43" → 4343.',
        'Berlaku untuk angka 2-digit mana pun.',
    ],
    'rule-of-99': [
        '99 hanyalah 100 dikurangi 1.',
        'Kalikan angkanya dengan 100: 4300',
        'Kurangi hasilnya dengan angka itu sendiri: 4300 - 43.',
        '4300 - 40 = 4260, lalu dikurangi 3 jadi 4257',
    ],
    'just-over-100': [
        'Ide besar: (100 + a)(100 + b) = 100·(100 + a + b) + a·b. Bagian kiri menjadi digit depan; a·b menjadi dua digit terakhir.',
        'Langkah 1 — tambahkan salah satu angka dengan "kelebihan" angka lainnya: 104 + 6 = 110 (sama seperti 106 + 4). Itulah bagian pertama.',
        'Langkah 2 — kalikan kelebihannya: 4 × 6 = 24. Itulah dua digit terakhir (lengkapi jadi 2 digit bila perlu).',
        'Gabungkan: 110 lalu 24 → 11024.',
    ],
    'cross-multiply': [
        'Ide besar: setiap 2-digit × 2-digit terbagi menjadi tiga bagian — ratusan, puluhan, satuan. Hitung masing-masing, lalu jumlahkan.',
        'Ratusan = kiri × kiri: 2 × 1 = 2 → tulis 2.',
        'Puluhan = silangnya — (kiri × kanan) + (kanan × kiri): (2×2) + (3×1) = 4 + 3 = 7 → tulis 7.',
        'Satuan = kanan × kanan: 3 × 2 = 6 → tulis 6.',
        'Baca hasilnya: 2, 7, 6 → 276. Tak perlu menyimpan bila tiap bagian satu digit.',
    ],
    'square-50s': [
        'Mengapa 25? Karena 50² = 2500, dan "25" adalah bagian ratusannya. Semua angka 50-an dimulai dengan 25 itu.',
        'Langkah 1 — tambahkan digit satuan ke 25: 25 + 4 = 29. Itulah paruh pertama.',
        'Langkah 2 — kuadratkan digit satuannya: 4² = 16. Itulah paruh kedua (selalu 2 digit — lengkapi dengan 0 bila perlu).',
        'Gabungkan: 29 lalu 16 → 2916.',
    ],
    'square-40s': [
        'Ide besar: berpatokan pada 50. Angkanya adalah "50 dikurangi sesuatu" — untuk 48, sesuatu itu adalah 2.',
        'Langkah 1 — kurangi 25 dengan jarak itu: 25 − 2 = 23. (Paruh pertama.)',
        'Langkah 2 — kuadratkan jaraknya: 2² = 4 → lengkapi jadi "04". (Paruh kedua selalu 2 digit.)',
        'Gabungkan: 23 lalu 04 → 2304.',
    ],
    'near-1000': [
        'Ide yang sama seperti Kuadrat Dekat 100, tapi dengan 1000 sebagai patokan. (1000 − d)² = (1000 − 2d)(1000) + d².',
        'Langkah 1 — cari jaraknya dari 1000: 1000 − 996 = 4.',
        'Langkah 2 — kurangi angka dengan jarak itu: 996 − 4 = 992. (Bagian pertama.)',
        'Langkah 3 — kuadratkan jaraknya, dilengkapi jadi 3 digit: 4² = 016. (Bagian kedua.)',
        'Gabungkan: 992 lalu 016 → 992016.',
    ],
    'divide-5': [
        'Mengapa berhasil: ÷5 sama dengan ÷10 lalu ×2. Atau sebaliknya, ×2 lalu ÷10.',
        'Langkah 1 — gandakan: 130 × 2 = 260.',
        'Langkah 2 — hapus satu nol: 26.',
        'Menghapus satu nol sama saja dengan membagi 10. Lebih mudah daripada membagi 5 di kepala.',
    ],
    'divide-25': [
        'Mengapa berhasil: 25 × 4 = 100. Jadi ÷25 sama dengan ×4 ÷100.',
        'Langkah 1 — kalikan dengan 4: 800 × 4 = 3200.',
        'Langkah 2 — hapus dua nol (÷100): 32.',
        'Mengalikan dengan 4 hanyalah menggandakan dua kali — lebih mudah daripada membagi 25.',
    ],
    'sub-1000': [
        'Mengapa: 1000 = 999 + 1. Jadi 1000 − abc = (999 − abc) + 1. Dua digit pertama diambil dari 9 (tanpa meminjam), dan yang terakhir dari 10 (yang +1).',
        'Langkah 1 — kurangkan tiap digit dari 9: 9 − 4 = 5, 9 − 7 = 2.',
        'Langkah 2 — kurangkan digit terakhir dari 10: 10 − 3 = 7.',
        'Gabungkan: 5, 2, 7 → 527. Tanpa meminjam sama sekali.',
    ],
    'add-reversed': [
        'Kenali kedua digitnya: 4 dan 7',
        'Jumlahkan keduanya: 4 + 7 = 11',
        'Kalikan dengan 11: 11 × 11 = 121',
        'Mengapa? (10a+b) + (10b+a) = 11a + 11b',
    ],
    'sub-reversed': [
        'Kenali kedua digitnya: 8 dan 2',
        'Cari selisihnya: 8 - 2 = 6',
        'Kalikan dengan 9: 6 × 9 = 54',
        'Mengapa? (10a+b) - (10b+a) = 9a - 9b',
    ],
    'multiply-ends-5-10-apart': [
        'Berhasil bila kedua angka berakhiran 5 DAN berjarak tepat 10.',
        'Langkah 1 — kalikan angka puluhannya: 3 × 4 = 12.',
        'Langkah 2 — tambahkan angka puluhan yang lebih kecil: 12 + 3 = 15. (Itulah bagian pertama jawaban.)',
        'Langkah 3 — selalu tempelkan 75: 1575.',
        'Mengapa "75"? Karena 5 × 5 = 25, ditambah setengah langkah dari suku tengah yang hilang membuatnya selalu berakhir di ...75.',
    ],
    'divide-3': [
        'Cek jumlah digit: 5+7+1+2 = 15. Karena 15 habis dibagi 3, angka aslinya juga. (Menghindarkanmu dari hitungan sia-sia.)',
        'Sekarang telusuri dari kiri ke kanan: 3 masuk ke 5 = 1, sisa 2. Turunkan 7 → 27.',
        '3 masuk ke 27 = 9 tepat. Turunkan 1 → 1.',
        '3 masuk ke 1 = 0, sisa 1. Turunkan 2 → 12. 3 masuk ke 12 = 4.',
        'Baca hasilnya: 1, 9, 0, 4 → 1904.',
    ],
    'complement-100': [
        'Mengapa: (100 − a)(100 − b) = 100·(100 − a − b) + a·b. Bagian pertama adalah digit depan; a·b menjadi dua digit terakhir.',
        'Langkah 1 — cari tiap "kekurangan" (jarak dari 100): 100 − 97 = 3, dan 100 − 94 = 6.',
        'Langkah 2 — kurangkan satu kekurangan dari angka yang LAIN: 97 − 6 = 91. (Hasil sama bila kamu hitung 94 − 3.) Itulah bagian pertama.',
        'Langkah 3 — kalikan kekurangannya: 3 × 6 = 18. (Lengkapi jadi 2 digit bila perlu.) Itulah bagian terakhir.',
        'Gabungkan: 91 lalu 18 → 9118.',
    ],
    'divisible-11': [
        'Mengapa berhasil: 10 = 11 − 1, jadi 100 = 11×9 + 1, 1000 = 11×91 − 1, dan seterusnya. Tiap tempat berganti-ganti meninggalkan sisa +1 dan −1 saat dibagi 11.',
        'Beri tiap digit tanda + dan − bergantian (digit paling kanan dapat +, lalu bergantian ke kiri).',
        'Untuk 2728: −2 + 7 − 2 + 8 = +11. (Atau 2 − 7 + 2 − 8 = −11 bila dibaca arah sebaliknya. Besarnya sama.)',
        'Hasil 0 atau kelipatan 11 mana pun berarti angka aslinya habis dibagi. ±11 → ya.',
    ],
    'divisible-11.result': [
        'Ya!',
    ],
    'flip-percent': [
        'Mengapa berhasil: A% dari B adalah A × B / 100. Perkalian tak peduli urutan, jadi sama dengan B × A / 100, yaitu B% dari A.',
        '8% dari 50 itu menyebalkan. Tapi 50% dari 8 hanyalah setengah dari 8.',
        '50% dari 8 = 4. Jawaban sama, jauh lebih mudah.',
        'Saat kamu melihat persen yang rumit dari angka yang bersahabat, balik saja.',
    ],
    'telescoping-sum': [
        'Tulis ulang tiap suku: ¼⅛… ↨ 1/k - 1/(k+1)',
        'Jumlahnya menjadi: (1-½) + (½-⅓) + (⅓-¼) ...',
        'Semua suku tengah saling menghapus! (Teleskopnya mengempis)',
        'Hanya 1 - 1/(N+1) = N/(N+1) yang tersisa',
    ],
    'zeno-paradox': [
        'Berjalan setengah jalan ke dinding. Lalu setengahnya lagi...',
        'Dalam langkah tak terhingga, kamu sampai juga!',
        'Deret geometri: S = a ÷ (1 - r)',
        'Di sini a = ½, r = ½. Jadi S = ½ ÷ ½ = 1',
    ],
    'digit-sum-mod': [
        'Mengapa berhasil: setiap pangkat 10 meninggalkan sisa 1 saat dibagi 9 (10 = 9+1, 100 = 99+1, dst.). Jadi tiap digit menyumbang dirinya sendiri ke sisa.',
        'Jumlahkan digitnya: 4 + 5 + 7 + 3 = 19.',
        'Masih ≥ 10? Jumlahkan lagi: 1 + 9 = 10 → 1 + 0 = 1.',
        'Digit tunggal terakhir itulah sisanya. 4573 ÷ 9 bersisa 1.',
    ],
    'power-last-digit': [
        'Pangkat 7 berulang: 7, 9, 3, 1, 7, 9, 3, 1...',
        'Panjang siklusnya 4.',
        '43 mod 4 = 3, jadi ambil nilai ke-3 dalam siklusnya.',
        'Nilai ke-3 adalah 3!',
    ],
    'product-last-digit': [
        'Mengapa: saat kamu mengalikan dua angka, hanya digit satuan yang menentukan digit satuan jawabannya. Tempat ratusan dan puluhan dari kedua angka hanya memengaruhi kolom yang lebih tinggi.',
        'Sisakan digit terakhirnya saja: 7 × 3.',
        '7 × 3 = 21. Ambil digit terakhirnya: 1.',
        'Jadi 347 × 893 berakhiran 1. (Tak perlu menghitung hasil kali penuhnya!)',
    ],
    'gauss-sum': [
        'Ceritanya: Gauss yang berumur 9 tahun diminta menjumlahkan 1 sampai 100. Ia menyadari pasangan (1+100), (2+99), (3+98)… semuanya sama dengan 101.',
        'Berapa pasangan? 100 angka membentuk 50 pasang.',
        'Jadi totalnya 50 × 101 = 5050.',
        'Aturan umum: 1 + 2 + … + N = N × (N+1) ÷ 2.',
    ],
    'golden-ratio': [
        'Penyebutnya berpola sama dengan x itu sendiri!',
        'Jadi x = 1 + 1/x',
        'Kalikan dengan x: x² = x + 1, yaitu x² - x - 1 = 0',
        'Akar positifnya: x = (1 + √5) / 2 ≈ 1.618',
    ],
    'large-power-cycles': [
        'Pangkat 7 berulang tiap 4: 7, 9, 3, 1, 7, 9, 3, 1...',
        'Jadi 7^N mod 10 hanya bergantung pada N mod 4.',
        '100 mod 4 = 0, yang sesuai dengan nilai ke-4 dalam siklusnya.',
        'Nilai ke-4 adalah 1!',
    ],
};
