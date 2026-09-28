// Built-in songs. Notation (see README):
//   note = letter + accidental? + octave     e.g.  C4  F#4  Bb3  Ek4 (koron)  Fs4 (sori)
//   :dur = length in beats (default 1)       e.g.  A4:2  E4:0.5  G4:1/2
//   chord = notes joined with +              e.g.  A4+A2
//   rest  = r:dur      bar lines | are ignored
//   accomp (optional) = a second line on the same timeline; its notes play automatically after each tap
// Classical pieces are public domain; «شبانه‌ی شور», «رنگ چهارگاه» and «بهار ماهور» are original compositions
// written for this game; the other Iranian songs are included with the rights holders' permission.
const bars = (...b) => b.join(' | ');
const SONGS = [
  {
    id: 'twinkle', cat: 'classic', inst: 'piano', level: 1, speed: 2.6,
    title: 'چشمک بزن ستاره‌ی کوچک', by: 'ترانه‌ی فولکلور فرانسوی',
    notes: `
      C4+C3 C4 G4+E3 G4 | A4+F3 A4 G4+E3:2 | F4+D3 F4 E4+C3 E4 | D4+G2 D4 C4+C3:2 |
      G4+E3 G4 F4+D3 F4 | E4+C3 E4 D4+G2:2 | G4+E3 G4 F4+D3 F4 | E4+C3 E4 D4+G2:2 |
      C4+C3 C4 G4+E3 G4 | A4+F3 A4 G4+E3:2 | F4+D3 F4 E4+C3 E4 | D4+G2 D4 C4+C3:2`,
  },
  {
    id: 'ode', cat: 'classic', inst: 'piano', level: 1, speed: 2.8,
    title: 'سرود شادی', by: 'لودویگ فان بتهوون · ۱۸۲۴',
    notes: `
      E4+C3 E4 F4 G4 | G4+G2 F4 E4 D4 | C4+C3 C4 D4 E4 | E4+G2:1.5 D4:0.5 D4:2 |
      E4+C3 E4 F4 G4 | G4+G2 F4 E4 D4 | C4+C3 C4 D4 E4 | D4+G2:1.5 C4:0.5 C4+C3:2 |
      D4+G2 D4 E4 C4 | D4+G2 E4:0.5 F4:0.5 E4 C4 | D4+G2 E4:0.5 F4:0.5 E4 D4 | C4+C3 D4 G3+G2:2 |
      E4+C3 E4 F4 G4 | G4+G2 F4 E4 D4 | C4+C3 C4 D4 E4 | D4+G2:1.5 C4:0.5 C4+C3:2`,
  },
  {
    id: 'minuet', cat: 'classic', inst: 'piano', level: 2, speed: 3.2,
    title: 'مینوئت در سل ماژور', by: 'کریستین پتسولد · ۱۷۲۵',
    notes: `
      D5+G3 G4:0.5 A4:0.5 B4:0.5 C5:0.5 | D5+B2 G4 G4 | E5+C3 C5:0.5 D5:0.5 E5:0.5 F#5:0.5 | G5+B2 G4 G4 |
      C5+A2 D5:0.5 C5:0.5 B4:0.5 A4:0.5 | B4+G2 C5:0.5 B4:0.5 A4:0.5 G4:0.5 | F#4+D3 G4:0.5 A4:0.5 B4:0.5 G4:0.5 | A4+D3:3 |
      D5+G3 G4:0.5 A4:0.5 B4:0.5 C5:0.5 | D5+B2 G4 G4 | E5+C3 C5:0.5 D5:0.5 E5:0.5 F#5:0.5 | G5+B2 G4 G4 |
      C5+A2 D5:0.5 C5:0.5 B4:0.5 A4:0.5 | B4+G2 C5:0.5 B4:0.5 A4:0.5 G4:0.5 | A4+D3 B4:0.5 A4:0.5 G4:0.5 F#4:0.5 | G4+G2:3`,
  },
  {
    id: 'elise', cat: 'classic', inst: 'piano', level: 3, speed: 4.4,
    title: 'برای الیز', by: 'لودویگ فان بتهوون · ۱۸۱۰',
    notes: `
      E5 D#5 E5 D#5 E5 B4 D5 C5 | A4+A2 E3 A3 C4 E4 A4 | B4+E2 E3 G#3 E4 G#4 B4 | C5+A2 E3 A3 E4 E5 D#5 |
      E5 D#5 E5 B4 D5 C5 | A4+A2 E3 A3 C4 E4 A4 | B4+E2 E3 G#3 E4 C5 B4 | A4+A2:2 E3 A3:2`,
  },
  {
    // Transcribed from Mohsen Karbassi's piano arrangement. `notes` is the right hand (one tile per note),
    // `accomp` is the left hand, played in time after each tap. Added with the permission of the composer
    // (Ali Molaei) and the arranger, obtained by the repository owner. 6/8, one beat = one eighth.
    id: 'shabe-toolani', cat: 'iranian', inst: 'piano', level: 3, speed: 4.2,
    title: 'شب طولانی', by: 'علی مولایی · تنظیم محسن کرباسی · با اجازه',
    notes: bars(
      'A4+C5+E5:2 G#4+B4+E5 F4+A4+D5:3', 'r D4 E4 F4 G#4 B4',
      'A4:2 E4:0.5 E4:0.5 E4 E4:2', 'A4:3 G#4:3', 'r:2 E4:0.5 E4:0.5 E4 E4:2', 'A4:3 G#4:3',
      'r:1.5 B4:0.5 B4 D5 C5:2', 'A4:1.5 A4:0.5 A4 C5 B4 A4', 'B4:1.5 A4:0.5 G#4 A4 B4:2', 'C5:2 B4 A4:3',
      'r:1.5 B4:0.5 B4 D5 C5 B4', 'A4:1.5 A4:0.5 A4 C5 B4 A4', 'B4:1.5 A4:0.5 G#4 A4 B4:2', 'C5:2 B4 A4:3',
      'r:1.5 A4:0.5 A4 A4 E4:2', 'C5:1.5 B4:0.5 C5 B4:3', 'r:1.5 A4:0.5 A4:0.5 A4:0.5 A4 E4:2', 'C5:1.5 B4:0.5 C5 B4:3',
      'r:1.5 B4:0.5 C5 D5 D5:2', 'D5:1.5 D5:0.5 C5 D5 C5 B4', 'B4:1.5 B4:0.5 C5 D5:0.5 C5:0.5 D5:2', 'D5:1.5 D5:0.5 C5 D5 C5 B4',
      'B4:1.5 B4:0.5 C5 E5 E5:2', 'E5:1.5 D5:0.5 E5 C5:3', 'D5:1.5 C5:0.5 D5 B4:3', 'C5:2 A4 D5:2 C5', 'B4:3 r:3',
      'A4+C5+E5:2 G#4+B4+E5 F4+A4+D5:3', 'r D4 E4 F4 G#4 B4',
      'A4:1.5 E5:0.5 E5 F5 E5:2', 'F5:2 E5 D5:3', 'r:1.5 B4:0.5 E5 D5:3', 'E5:2 D5 C5:3',
      'F5:1.5 F5:0.5 F5 E5:0.5 E5:0.5 E5:2', 'D5:0.5 D5:2.5 D5:0.5 C5:2.5',
      'r:1.5 B4:0.5 C5 D5 E5:2', 'E5:1.5 E5:0.5 D5 C5:3', 'r:1.5 D5:0.5 D5:0.5 E5:0.5 E5 D5:2', 'E5:1.5 E5:0.5 D5 C5:3',
      'r:1.5 C5:0.5 C5 D5 C5:2', 'D5:1.5 D5:0.5 C5 B4:3', 'D5:1.5 D5:0.5 D5 C5:0.5 C5:0.5 C5:2',
      'B4 B4:2 B4 A4:2', 'G#4 A4 B4 B4:3', 'C5+A4+E4 C5+A4+E4 B4+G#4+E4 A4+C5+E5:3'),
    accomp: bars(
      'A2+E3+A3:2 G#2+E3+G#3 F2+D3+F3:3', 'r D3 E3 F3 G#3 B3',
      'A2+A3:3 r:3', 'F3+A3+C4:3 E3+G#3+B3:3', 'A2 r:5', 'F3+A3+C4:3 E3+G#3+B3:3',
      'D3+F3+A3:3 r:3', 'F3+A3+C4:3 r:3', 'E3+G#3+B3:3 E3+G#3+B3:3', 'F3+A3+C4:2 E3+G#3+B3 E3+A3+C4:3',
      'D3+F3+A3:3 D3+F3+A3:3', 'F3+A3+C4:3 r:3', 'E3+G#3+B3:3 E3+G#3+B3:3', 'F3+A3+C4:2 E3+G#3+B3 E3+A3+C4:3',
      'A2:3 r:3', 'A2 A3+C4+E4 A3+C4+E4 E3 G#3+B3 E2', 'A2:3 r:3', 'A2 A3+C4+E4 A3+C4+E4 E3 G#3+B3 E2',
      'A2 E3 A3 D3 F3 A3', 'E2 G#3+B3 E3+G#3+B3 E3 G#3+B3 E2', 'E2 G#3+B3 E3+G#3+B3 E3 G#3+B3 E2', 'E2 G#3+B3 E3+G#3+B3 E3 G#3+B3 E2',
      'E2 G#3+B3 E3+G#3+B3 A3 E3 C3', 'A2 C4+E4 A3+C4+E4 A2 E3+A3 E3', 'G2 B3+D4 G3+B3+D4 G2 B3+D4 D3', 'F2 A3+C4 F3+A3 A3 F3 E3', 'E2:3 E3+G#3+B3:3',
      'A2+E3+A3:2 G#2+E3+G#3 F2+D3+F3:3', 'r D3 E3 F3 G#3 B3',
      'A2+A3:3 r:3', 'D3 F3+A3+D4 F3+A3 D3 F3+A3 E3', 'E2 G#3+B3 E3+G#3+B3 A3 E3 C3', 'A2 A3+C4+E4 A3+C4+E4 A2 E3+A3 E3',
      'D3 F3+A3+D4 F3+A3 D3 F3+A3 E3', 'D3 F3+A3 F3+A3 D3 F3+A3 E3',
      'E2 G#3+B3 E3+G#3+B3 E3 G#3+B3 E2', 'A2 A3+C4+E4 A3+C4+E4 A2 E3+A3 D3', 'D3 F3+A3+D4 F3+A3 D3 F3+A3 D3', 'E2 G#3+B3 E3+G#3+B3 E3 G#3+B3 A2',
      'D2 F3+A3 F3+A3+C4 D2 F3+A3 E3', 'D2 F3+A3 F3+A3+C4 A3 F3 D3', 'E2 G#3+B3 E3+G#3+B3 E3 G#3+B3 B3',
      'E2 G#3+B3 E3+G#3+B3 E3 G#3+B3 E2', 'D2 F3+A3 F3+A3+C4 D2 F3+A3 E3', 'A3 A3 E3 A2+A3:3'),
  },
  {
    // Transcribed from Mohsen Karbassi's piano arrangement (right hand = tiles, left hand = accompaniment).
    // Added with the permission of the rights holders, obtained by the repository owner. 2/4, one beat = one eighth.
    id: 'gole-sangam', cat: 'iranian', inst: 'piano', level: 3, speed: 4,
    title: 'گل سنگم', by: 'انوشیروان روحانی · تنظیم محسن کرباسی · با اجازه',
    notes: (() => {
      const m1 = 'G#4 A4 B4 A4:0.5 B4:0.5', m3 = 'A4 G#4 A4 G#4:0.5 A4:0.5';
      const turn = 'A4 F5 E5:0.5 F5:0.5 D5', turn2 = 'C5 B4 B4:0.5 C5:0.5 B4:0.5 C5:0.5';
      const verse = [m1, 'A4:4', m3, 'G#4:4', m1, 'A4:4', m3, 'G#4:4',
        'A4 B4 C5:2', 'B4:4', 'B4 A4 B4:2', 'A4:4', 'A4 G#4 A4:2', 'G#4:2 F4 G#4', 'A4:2 B4:2', turn, turn2, 'A4:4'];
      const high = ['C5 D5 E5:2', 'E5:3 F5', 'E5 D5 D5 C#5', 'D5:4', 'B4 C5 D5:2', 'D5:3 E5', 'D5 C5 C5 B4', 'C5:4'];
      const top = ['A5 B5 C6:2', 'C6:4', 'C6 E6 D6 C6', 'B5:4', 'G#5 A5 B5:2', 'B5:4', 'B5 D6 C6 B5', 'A5:4'];
      return bars(...verse, ...verse,
        'C5 D5 E5:2', 'D5:4', 'C5 B4 C5:2', 'B4:4', 'B4 C5 D5:2', 'C5:4', 'B4 A4 B4:2', 'A4:4',
        'C5 D5 E5:2', 'D5:4', 'C5 B4 C5:2', 'B4:4', 'B4 C5 D5:2', 'C5:4', 'B4 A4 B4:2', 'A4:4',
        'A4 B4 C5:2', 'B4:4', 'B4 A4 B4:2', 'A4:4', 'A4 G#4 A4:2', 'G#4:2 F4 G#4', 'A4:2 B4:2', turn, turn2, 'A4:4',
        ...high, ...high, ...top, ...top);
    })(),
    accomp: (() => {
      const am = 'A2 E3 A3 C4', e = 'E2 B2 E3 B3', g = 'G2 D3 G3 B3', gd = 'G3 D3 B2 G2', down = 'C4 A3 E3 B2';
      const f = 'F2 C3 A3 C4', c = 'C2 G2 E3 C4', dm = 'D2 A2 F3 A3', r = 'r:4';
      const verse = [r, 'A2 E3 A3 C4+E4+A4', r, e, r, am, down, e, am, g, gd, am, f, e, am, am, down, am];
      const verse2 = [r, am, 'C4+E4:4', e, r, am, down, e, am, g, gd, am, f, e, am, am, down, am];
      return bars(...verse, ...verse2,
        c, dm, am, g, g, c, g, am, c, dm, am, g, g, c, g, am,
        am, c, e, am, f, e, f, am, down, am,
        c, am, am, dm, g, g, dm, c, c, am, am, dm, g, g, dm, c,
        am, am, c, e, e, down, e, am, am, am, c, e, e, down, e, am);
    })(),
  },
  {
    // Transcribed from Mohsen Karbassi's easy piano arrangement (right hand = tiles, left hand = accompaniment).
    // Added with the permission of the rights holders, obtained by the repository owner. 6/8, one beat = one eighth.
    id: 'do-panjereh', cat: 'iranian', inst: 'piano', level: 2, speed: 3.8,
    title: 'دو پنجره (دیوار سنگی)', by: 'گوگوش · تنظیم محسن کرباسی · با اجازه',
    notes: (() => {
      const intro = ['A4:2 E4 E4:3', 'A4:2 A4 B4:3', 'B4:2 C5 C5:3', 'B4:2 B4 A4:3', 'r:6',
        'A4:2 F4 F4:3', 'A4:2 A4 B4:3', 'B4:2 C5 C5:3', 'B4:2 B4 A4:3', 'r:6',
        'A4:2 E4 E4:3', 'A4:2 A4 B4:3', 'B4:2 C5 C5:3', 'B4:2 B4 A4:3', 'A4:4 G#4:2', 'A4:2 G#4:4', 'F#4:2 G#4:4', 'A4:6'];
      const lick = 'r:2 C5 B4:0.5 C5:0.5 A4:2';
      const a = ['A4 E4 E4:4', 'A4:2 B4:4', 'C5:2 B4:4', 'A4:6', 'A4 F4 F4:4', 'A4:2 B4:4', 'C5:2 B4:3 A4', 'G4:6',
        'G4 D4 D4:4', 'G4:2 A4:4', 'B4:2 A4:3 G4', 'F4:6', 'F4 E4 D4:4', 'D4:2 D4:4', 'C5:2 B4:4', 'A4:6'];
      return bars(...intro, lick, lick, lick, lick, 'A4:6', ...a,
        'A4 E4 E4:4', 'A4:2 B4:4', 'C5:2 B4:4', 'A4:6', 'A4 F4 F4:4', 'A4:2 B4:4', 'C5:2 B4:3 A4', 'G4:6',
        'G4 D4 D4:4', 'G4:2 A4:4', 'B4:2 A4:3 G4', 'F4:6', 'F4 E4 D4:4', 'D4:2 D4:4', 'G4:2 F4:4', 'E4:6',
        'F4 E4 D4:4', 'D4:2 G4:4', 'F4:2 E4:4', 'E4:6', 'E4 D4 C4:4', 'C4:6', 'F4 E4 E4:4', 'D4:6',
        'D4 D4 D4:4', 'D4:2 D4:4', 'G4:2 F4:4', 'E4:6', 'C4 C4 C4:4', 'C4:2 C4:4', 'F4:2 E4:4',
        'A4:6', 'E4:4 F#4:2', 'G4:6', 'D4:4 E4:2', 'F4:6', 'C4:4 D4:2', 'F4:6', 'E4:6',
        'A4 A4 B4:4', 'C5:6', 'C5 C5 B4:4', 'A4:6', 'A4 A4 B4:4', 'C5:2 C5:4', 'C5:2 B4:4', 'A4:6',
        'A4 B4 C5:4', 'E5:4 D5:2', 'C5:2 D5:4', 'B4:6', 'B4 B4 A4:4', 'G4:2 G4:4', 'C5:2 B4:4', 'A4:6',
        ...intro);
    })(),
    accomp: (() => {
      const q = (x, y, z) => `${x}:2 ${y}:2 ${z}:2`;
      const arp = (x, y, z, w, v) => `${x}:2 ${y} ${z} ${w} ${v}`;
      const am = q('A2', 'E3', 'A3'), amA = arp('A2', 'E3', 'A3', 'C4', 'E4'), fq = q('F2', 'C3', 'F3');
      const gq = q('G2', 'D3', 'G3'), gA = arp('G2', 'D3', 'G3', 'B3', 'D4'), fA = arp('F2', 'C3', 'F3', 'A3', 'C4');
      const dq = q('D2', 'D3', 'A3'), dA = arp('D2', 'A2', 'D3', 'F3', 'A3'), cA = arp('C3', 'E3', 'G3', 'C4', 'E4');
      const intro = ['A2+E3+A3:6', 'A2:6', 'E3:6', 'A2:6', 'r:6', 'F3+A3+C4:6', 'F2:6', 'C3:6', 'F2:6', 'r:6',
        'A2+E3+A3:6', 'A2:6', 'E3:6', 'A2:6', 'r:4 E3+G#3+B3:2', 'E2:6', 'B2:6', 'A2+E3+A3:6'];
      const a = [am, am, am, amA, fq, fq, fq, gA, gq, gq, gq, fA, dq, dq, gq, amA];
      return bars(...intro, am, am, am, am, am, ...a,
        am, am, am, amA, fq, fq, fq, gA, gq, gq, gq, fA, dq, dq, gq, cA,
        dA, dA, gq, cA, cA, cA, dA, dA, dA, dA, dA, cA, cA, dA, fA,
        amA, arp('D2', 'A2', 'D3', 'F#3', 'A3'), gq, q('D2', 'A2', 'D3'), fq, q('D2', 'A2', 'D3'), dA, am,
        am, amA, q('C3', 'G3', 'C4'), amA, am, fq, gq, amA, am, q('C3', 'G3', 'C4'), dq, gA, am, gq, fq, amA,
        ...intro);
    })(),
  },
  {
    id: 'shur', cat: 'iranian', inst: 'santur', level: 1, speed: 3,
    title: 'شبانه‌ی شور', by: 'دستگاه شور · ساخته‌ی نوا',
    notes: `
      A4+D3 A4 Bb4 A4:2 G4 | F4 G4 A4 G4:2 F4 | Ek4+D3 F4 G4 F4 Ek4 D4 | Ek4+A2:3 D4+D3:3 |
      D5+D3 C5 Bb4 A4:2 G4 | A4 Bb4 C5 Bb4:2 A4 | G4+C3 A4 G4 F4 Ek4 F4 | G4+A2:3 A4+D3:3 |
      A4+D3 Bb4 C5 D5:2 C5 | Bb4 A4 G4 A4:2 G4 | F4+D3 G4 F4 Ek4:2 F4 | Ek4 D4 Ek4 D4+D3:3`,
  },
  {
    id: 'chahargah', cat: 'iranian', inst: 'santur', level: 2, speed: 3.6,
    title: 'رِنگ چهارگاه', by: 'دستگاه چهارگاه · ساخته‌ی نوا',
    notes: `
      G4+C3 Ak4 B4 C5:2 B4 | Ak4+G2 G4 F4 G4:2 G4 | F4+C3 E4 Dk4 E4 F4 G4 | E4+G2 Dk4 C4 Dk4:3 |
      C4+C3 Dk4 E4 F4:2 G4 | Ak4+G2 G4 F4 E4:2 F4 | G4+C3 F4 E4 Dk4 E4 Dk4 | C4+C3:3 C4+G2:3 |
      C5+C3 B4 Ak4 B4 C5 B4 | Ak4+G2 G4 Ak4 G4 F4 E4 | F4+C3 G4 Ak4 G4 F4 E4 | Dk4+G2 E4 Dk4 C4+C3:3`,
  },
  {
    id: 'mahur', cat: 'iranian', inst: 'santur', level: 2, speed: 3.8,
    title: 'بهارِ ماهور', by: 'دستگاه ماهور · ساخته‌ی نوا',
    notes: `
      G4+C3 G4 A4 G4 F4 E4 | F4+F2 G4 A4 G4:3 | C5+A2 B4 A4 G4 A4 B4 | C5+C3:3 G4+E3:3 |
      E4+C3 F4 G4 A4 G4 F4 | E4+C3 D4 E4 C4:3 | D4+G2 E4 F4 E4 D4 B3 | C4+C3:3 C4+G2:3 |
      E5+C3 D5 C5 D5 C5 B4 | A4+F2 B4 C5 A4:3 | G4+G2 A4 B4 C5 D5 B4 | C5+C3:3 C4+C3:3`,
  },
];
