import { TUNING_MODE_NAMES } from "../chords"
import { EMOJI_SEQUENCE, TUNING_MODE_EMOJIS } from "../emoji"
import { addThemeSelectionOptions } from "../theme"
import AbstractInteractive from "./abstract-interactive"

export default class CircleSynth extends AbstractInteractive{

    noteLibrary = new Map()	

    octave = 4

    modeIndex = 0

    set happiness(value){
        const emoji = EMOJI_SEQUENCE[ Math.round(value * EMOJI_SEQUENCE.length )]
        // const emoji = EMOJI_SEQUENCE[ Math.round(value * EMOJI_SEQUENCE.length )]
        this.emoji.textContent = emoji
    }

    set mode( value){
        this.modeIndex = value
        this.emoji.textContent = TUNING_MODE_EMOJIS[value%TUNING_MODE_EMOJIS.length]
        console.log("EMOJI", value, TUNING_MODE_EMOJIS[value%TUNING_MODE_EMOJIS.length])
    }

    get mode(){
        return this.modeIndex
    }

    get modeName(){
        return TUNING_MODE_NAMES[this.modeIndex]
    }

    constructor( notes, noteOn, noteOff, setMode ){
		super()

        const chordOn = (noteModel, velocity=1, id=0, idOffset=0) => {
            noteOn( noteModel, velocity, id, null, this.mode, idOffset )
        }
        const chordOff = (noteModel, velocity=1, id=0, idOffset=0) => {
            noteOff( noteModel, velocity, id, null, this.mode, idOffset )
        }
        this.notes = notes
        this.element = document.querySelector(".circle-of-fifths")
        this.title = this.element.querySelector("title")
        this.emoji = this.element.querySelector(".fifths-emotion-text")
        this.keyElements = this.createKeys(notes, ".circle-of-fifths-tonics path", 3)
        this.keyElements.push(...this.createKeys(notes, ".circle-of-fifths-harmonies path" ))
        this.addInteractivity( this.keyElements, chordOn, chordOff )  
        this.addControls( setMode )
	}

    addControls( setMode ){
        this.octaveSelector = this.element.querySelectorAll("input[name=octave]")
        this.octaveSelector.forEach(radioButton => {
            radioButton.addEventListener("change", e => {
                const input = e.target.value
                switch(input)
                {
                   default:
                       this.octave = parseInt(input)
                       
                }
            })
        })
        
        // Allow the user to select a random emotion just
        // by clicking the text element
        // this.emoji.addEventListener("click", e =>{
        //     this.happiness = Math.random()
        //     setMode( this.modeIndex )
        // })

        const emojiHitArea = this.element.querySelector(".fifths-emotion")
        emojiHitArea.addEventListener("click", e => {
            const newMode = (this.mode + 1) % TUNING_MODE_NAMES.length
            this.mode = setMode( TUNING_MODE_NAMES[newMode] )
            console.info("emoji pressed to mode", this.mode)
            e.preventDefault()
        })
        emojiHitArea.addEventListener("dblclick", e => {
            console.info("emoji double clicked to mode", this.mode)
            e.preventDefault()
        })
    }

    getNoteFromKey( button){
        const noteNumber = parseInt( button.getAttribute("data-attribute-number") )
        const octaveOffset = this.octave * 12
        const note = this.notes[noteNumber + octaveOffset]
        // console.info("noteNumber", noteNumber, note, this.notes )
        return note
    }

    createKeys(notes, query=".circle-of-fifths-tonics path", offset=0){
        const htmlElementKeys = Array.from(  this.element.querySelectorAll(query) )
        const keys = htmlElementKeys.map((path, i)=>{
            i = (i+offset)%notes.length
            const note = notes[i]
            path.setAttribute("data-attribute-key", note.noteKey)
            path.setAttribute("data-attribute-number", i) // note.noteNumber
            path.setAttribute("data-attribute-note", note.noteNumber )
            path.setAttribute("data-attribute-name", note.noteName)
            this.noteLibrary.set( path, notes[i] )
            return path
        })
        return htmlElementKeys
    }
}
