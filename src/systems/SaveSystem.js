import { WORD_LIST } from '../config/constants.js';

// Encodes game progress as a 4-word password.
// State packs into 20 bits: levelIndex(5) + cardsBanked(5) + flags(10)
// Each word = 5 bits → 4 words = 20 bits.

function encode(state) {
  const { level = 0, cards = 0, flags = 0 } = state;
  const bits = ((level & 0x1f) << 15) | ((cards & 0x1f) << 10) | (flags & 0x3ff);
  const words = [];
  for (let i = 3; i >= 0; i--) {
    words[i] = WORD_LIST[(bits >> (i * 5)) & 0x1f];
  }
  return words.join('-');
}

function decode(password) {
  const parts = password.toUpperCase().split('-');
  if (parts.length !== 4) return null;
  let bits = 0;
  for (let i = 0; i < 4; i++) {
    const idx = WORD_LIST.indexOf(parts[i]);
    if (idx === -1) return null;
    bits = (bits << 5) | idx;
  }
  return {
    level: (bits >> 15) & 0x1f,
    cards: (bits >> 10) & 0x1f,
    flags:  bits        & 0x3ff,
  };
}

export const SaveSystem = {
  save(state) {
    const pw = encode(state);
    try { localStorage.setItem('yusky_save', JSON.stringify({ pw, state })); } catch {}
    return pw;
  },

  load() {
    try {
      const raw = localStorage.getItem('yusky_save');
      if (!raw) return null;
      return JSON.parse(raw).state;
    } catch { return null; }
  },

  generatePassword(state) {
    return encode(state);
  },

  fromPassword(pw) {
    return decode(pw);
  },

  clear() {
    try { localStorage.removeItem('yusky_save'); } catch {}
  },
};
