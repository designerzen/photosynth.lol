/**
 * Simple song sequence of Note models
 */
import Note, { keyAndOctaveAsNoteNumber } from "./note"

export default class Song {

    notes
    index = 0

    constructor(noteString){
        // this.noteString = noteString
        // remove line breaks & ensure that there are no empty holes
        const data = noteString.replaceAll("\n", "").split(" ").filter( note => note.length )
        // now convert that into a series of Note object
        this.notes = this.createNotes(data)
        this.notes.forEach( (note, index)  => {
            console.info(index, note.noteKey === data[index], "NOTE", note, data[index] )
        })
    }

    // convert the note name to the midi number
    // 69 is middle G4
    // convert a letter and an octave to a noteNumber
    // A4, G4 -> 69
    convertNoteLetterToNoteNumber(noteLetter, octave=4){
        const key = noteLetter.charAt(0).toUpperCase()
        const isAccidental = noteLetter.charCodeAt(1) === 35 // #
        const noteName = noteLetter.toUpperCase() + octave
        const noteNumber = keyAndOctaveAsNoteNumber( key, octave, isAccidental )
        console.info("note", noteNumber, {isAccidental, key, noteLetter, octave, noteName })
        return noteNumber
    }

    // turn the string into a noteNumber...
    createNotes(notes){
        return notes.map(note => new Note( this.convertNoteLetterToNoteNumber(note) ) )
    }

    getNextNote(){
        this.index = (this.index + 1) % this.notes.length
        console.info( this.index, this.notes[this.index], this.notes )
        return this.notes[this.index]
    }
}