// Pixel art tamagotchi rendered on canvas
// Matches the blueprint aesthetic — white pixel creature on dark blue

const PIXEL = 5; // each "pixel" is 5x5 actual pixels
const W = 24;    // grid width
const H = 24;    // grid height

// Sprite data: 24x24 grid, 1=body, 2=eye, 3=mouth, 4=cheek
// Cat-like tamagotchi inspired by the creative
const SPRITE_IDLE = [
  "........................",
  "........................",
  "....11..........11......",
  "...1111........1111.....",
  "..111111111111111111....",
  "..111111111111111111....",
  "..111111111111111111....",
  "..112111111111112111....",
  "..112111111111112111....",
  "..111111111111111111....",
  "..111111133311111111....",
  "..111114111114111111....",
  "..111111111111111111....",
  "..111111111111111111....",
  "...11111111111111111....",
  "....1111111111111111....",
  ".....111111111111........",
  "........................",
  "......1111..1111........",
  "......1111..1111........",
  "........................",
  "........................",
  "........................",
  "........................",
];

const SPRITE_BLINK = [
  "........................",
  "........................",
  "....11..........11......",
  "...1111........1111.....",
  "..111111111111111111....",
  "..111111111111111111....",
  "..111111111111111111....",
  "..111111111111111111....",
  "..112211111111122111....",
  "..111111111111111111....",
  "..111111133311111111....",
  "..111114111114111111....",
  "..111111111111111111....",
  "..111111111111111111....",
  "...11111111111111111....",
  "....1111111111111111....",
  ".....111111111111........",
  "........................",
  "......1111..1111........",
  "......1111..1111........",
  "........................",
  "........................",
  "........................",
  "........................",
];

// Dance frames — arms up + bounce
const SPRITE_DANCE_1 = [
  "........................",
  "..1.................1...",
  "..1.11..........11.1....",
  "..11111........11111....",
  "..111111111111111111....",
  "..111111111111111111....",
  "..111111111111111111....",
  "..112111111111112111....",
  "..112111111111112111....",
  "..111111111111111111....",
  "..111111133311111111....",
  "..111114111114111111....",
  "..111111111111111111....",
  "..111111111111111111....",
  "...11111111111111111....",
  "....1111111111111111....",
  ".....111111111111........",
  "........................",
  ".....1111....1111.......",
  ".....1111....1111.......",
  "........................",
  "........................",
  "........................",
  "........................",
];

const SPRITE_DANCE_2 = [
  "........................",
  "........................",
  "........................",
  "....11..........11......",
  "...1111........1111.....",
  "..111111111111111111....",
  "..111111111111111111....",
  "..111111111111111111....",
  "..112111111111112111....",
  "..112111111111112111....",
  "..111111111111111111....",
  "..111111133311111111....",
  "..111114111114111111....",
  "..111111111111111111....",
  "..111111111111111111....",
  "...11111111111111111....",
  "....1111111111111111....",
  ".....111111111111........",
  "........................",
  "......1111..1111........",
  "......1111..1111........",
  "........................",
  "........................",
  "........................",
];

// Sad sprite for errors
const SPRITE_SAD = [
  "........................",
  "........................",
  "....11..........11......",
  "...1111........1111.....",
  "..111111111111111111....",
  "..111111111111111111....",
  "..111111111111111111....",
  "..112111111111112111....",
  "..112111111111112111....",
  "..111111111111111111....",
  "..111111111111111111....",
  "..111111133311111111....",
  "..111111111111111111....",
  "..111111111111111111....",
  "...11111111111111111....",
  "....1111111111111111....",
  ".....111111111111........",
  "........................",
  "......1111..1111........",
  "......1111..1111........",
  "........................",
  "........................",
  "........................",
  "........................",
];

const COLORS = {
  '.': 'transparent',
  '1': '#ffffff',
  '2': '#0a1628',  // eyes — dark
  '3': '#f87171',  // mouth — red/pink
  '4': '#ffb3d0',  // cheeks — blush
};

class Tamagotchi {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.state = 'idle';   // idle | dance | sad | wave
    this.frame = 0;
    this.tick = 0;
    this.blinkTimer = 0;
    this.isBlinking = false;
    this._loop();
  }

  setState(state) {
    this.state = state;
    this.frame = 0;
    this.tick = 0;
  }

  _drawSprite(sprite, offsetY = 0) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (let y = 0; y < H; y++) {
      const row = sprite[y] || '';
      for (let x = 0; x < W; x++) {
        const ch = row[x] || '.';
        if (ch === '.') continue;
        this.ctx.fillStyle = COLORS[ch] || '#fff';
        this.ctx.fillRect(x * PIXEL, (y + offsetY) * PIXEL, PIXEL, PIXEL);
      }
    }
  }

  _loop() {
    this.tick++;

    if (this.state === 'idle') {
      // Gentle breathing + occasional blink
      this.blinkTimer++;
      if (this.blinkTimer > 120 && !this.isBlinking) {
        this.isBlinking = true;
        this.blinkTimer = 0;
      }
      if (this.isBlinking) {
        this._drawSprite(SPRITE_BLINK);
        if (this.blinkTimer++ > 6) {
          this.isBlinking = false;
          this.blinkTimer = Math.floor(Math.random() * -60); // randomize next blink
        }
      } else {
        // Subtle bounce
        const bounce = Math.sin(this.tick * 0.05) > 0.8 ? -0.2 : 0;
        this._drawSprite(SPRITE_IDLE, bounce);
      }
    }

    else if (this.state === 'dance') {
      // Alternate between dance frames quickly
      const speed = 8;
      const phase = Math.floor(this.tick / speed) % 4;
      if (phase === 0) this._drawSprite(SPRITE_DANCE_1, -0.4);
      else if (phase === 1) this._drawSprite(SPRITE_IDLE, 0);
      else if (phase === 2) this._drawSprite(SPRITE_DANCE_2, 0.4);
      else this._drawSprite(SPRITE_IDLE, 0);
    }

    else if (this.state === 'sad') {
      const droop = Math.sin(this.tick * 0.03) * 0.3;
      this._drawSprite(SPRITE_SAD, droop);
    }

    else if (this.state === 'wave') {
      // Similar to dance but calmer — for already-checked-in
      const speed = 12;
      const phase = Math.floor(this.tick / speed) % 2;
      if (phase === 0) this._drawSprite(SPRITE_DANCE_1, 0);
      else this._drawSprite(SPRITE_IDLE, 0);
    }

    requestAnimationFrame(() => this._loop());
  }
}

window.Tamagotchi = Tamagotchi;
