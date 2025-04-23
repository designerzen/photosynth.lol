import { WebMidi } from "webmidi"

/**
 * For simplicity, let's stick to the 12 notes of the chromatic scale
 * (no sharps or flats) this is a quick way to make melodies without
 * experiencing disharmonies and horrible sounding chords
 */
export const createNotes = ()=> {
    const notes = new Array(12)
    for (let i = 0; i < notes.length; i++){
        notes[i] = new Note(i)
    }
}


/**
 * Convert a MIDI Note Number into a frequency in hertz
 * @param {Number} note 
 * @returns {Number}
 */
const CLASSICAL_ROOT_FREQUENCY = 426.6666666 // according to Eric Dollard
const ROOT_FREQUENCY = 440 // frequency of A (common value is 440Hz)
const ROOT_F_BY_32 = ROOT_FREQUENCY / 32
export const noteNumberToFrequency = (note) => {
	return ROOT_F_BY_32 * (2 ** ((note - 9) / 12))
}

/**
 * Calculates the frequency of a given note.
 */
export const noteToFrequency = (noteNumber, precision=3)=>{
    // how many keys above A4 (key #57)
    const floatFreq = parseFloat((440 * Math.pow(2, (noteNumber - 57) / 12)), 10)
    // round to the nearest x decimal places and return a Number, not a string
    return parseFloat(floatFreq.toFixed(precision), 10)
}


// https://youtu.be/8sUxYCYtapU
export const convert7ScaleTo12Scale = (note) => note * 12 / 7

const MAJOR = [0,4,7,12]
const MINOR = [0,3,7,12]

/**
 * 
 * @param {Number} time in 60 ticks
 * @param {Number} channel 0->3
 * @returns {Number} 1->16
 */
// export const toNote = (time, channel) => (time>>4)%12
export const toNote = (time, channel=1, pattern=MAJOR, rate=5) => pattern[(time*channel>>rate)%pattern.length]

const PROGRAM_SAD = [0,0,1,1]
const PROGRAM_FLAT = [0,3,5,0]
const PROGRAM_B_MAJOR = [4,0,2,4]   // super mario!
const PROGRAM_A = [0,0,5,7]
const PROGRAM_B = [0,5,2,7]   // C Major, F Major, D Major, G Major
export const toChord = (time, program=PROGRAM_A, rate=7) => program[(time>>rate)%program.length]

/**
 * 
 * @param {Number} note from toNote
 * @param {Number} chord from toChord
 * @param {Number} channel 
 * @returns 
 */
export const mapped = (note, chord, channel) =>{
   // (note-1)*12/7+2+note%7/6
    // note = (note-chord/2 * 2)*7/6
    // return (note + chord + 1) * 12/7 + 12 * channel - 1
    return note + chord + channel
}

let midiDriver
export const enableMIDI = async () => {
    if (!midiDriver)
    {
        midiDriver = await loadMIDIDriver()
    }
    try {    
       await WebMidi.enable()
    } catch (error) {
        console.error(error)
    }
    return WebMidi
}

export const disableMIDI = async () => {

}

export const loadMIDIDriver = async () => {
    const midi = await import("webmidi")
    return WebMidi
}