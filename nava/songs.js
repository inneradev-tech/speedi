// Built-in songs. Notation (see README):
//   note = letter + accidental? + octave     e.g.  C4  F#4  Bb3  Ek4 (koron)  Fs4 (sori)
//   :dur = length in beats (default 1)       e.g.  A4:2  E4:0.5  G4:1/2
//   chord = notes joined with +              e.g.  A4+A2
//   rest  = r:dur      bar lines | are ignored
// Classical pieces are public domain; the Iranian pieces are original compositions written for this game.
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
