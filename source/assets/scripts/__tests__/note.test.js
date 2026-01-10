import Note, {
  noteNumberToFrequency,
  noteNumberToKeyName,
  noteNumberToOctave,
  isSharp,
  isFlat,
  keyAndOctaveAsNoteNumber,
  QUANTITY_NOTES
} from '../note.js'
import { PALETTE } from '../settings.js'

// TESTS
// C D E F G A B (C) - Major (Ionian)
// D E F G A B C (D) - Dorian
// E F G A B C D (E) - Phrygian
// F G A B C D E (F) - Lydian
// G A B C D E F (G) - Mixolydian
// A B C D E F G (A) - Aeolian
// B C D E F G A (B) - Locrian

describe('Note module', () => {
  test('constants - twelve semitones', () => {
    expect(QUANTITY_NOTES).toBe(12)
  })

  test('A4 (MIDI 69) maps to 440Hz', () => {
    expect(noteNumberToFrequency(69)).toBeCloseTo(440, 5)
  })

  const samples = [60, 61, 69] // C4, C#4, A4

  test.each(samples)('Note #%i has consistent properties and theory alignment', (n) => {
    const note = new Note(n)

    // basic identity
    expect(note.noteNumber).toBe(n)
    expect(note.noteKey).toBe(noteNumberToKeyName(n))
    expect(note.octave).toBe(noteNumberToOctave(n))
    expect(note.noteName).toBe(`${note.noteKey}${note.octave}`)

    // frequency consistency
    expect(note.frequency).toBeCloseTo(noteNumberToFrequency(n), 5)

    // accidental / alternate naming
    if (isSharp(n)) {
      expect(note.accidental).toBeTruthy()
      expect(note.alternate).toBe(`${noteNumberToKeyName(n + 1)} Flat`)
    } else {
      expect(note.accidental).toBeFalsy()
      expect(note.alternate).toBe(note.noteName)
    }

    // isFlat mirrors isSharp per implementation
    expect(isFlat(n)).toBe(isSharp(n))

    // round-trip: key+octave -> noteNumber (this asserts intended conventional inverse)
    // NOTE: if this fails it points to an inversion bug in keyAndOctaveAsNoteNumber
    expect(keyAndOctaveAsNoteNumber(note.noteKey, note.octave, note.accidental)).toBe(n)

    // styling values: asCSSVar should look like a CSS variable and colour should be in the palette
    expect(typeof note.asCSSVar).toBe('string')
    expect(note.asCSSVar.startsWith('--')).toBeTruthy()
    const paletteValues = Object.values(PALETTE)
    expect(paletteValues).toContain(note.colour)
  })
})
```// filepath: s:\Synch\Work\Code\photosynth.lol\source\assets\scripts\__tests__\note.test.js
import