import { TUNING_MODE_NAMES } from "../chords"
import { EMOJI_SEQUENCE, getEmojiForScaleAndMode, TUNING_MODE_EMOJIS_MAJOR } from "../emoji"
import { addThemeSelectionOptions } from "../theme"
import AbstractInteractive from "./abstract-interactive"

export default class CircleSynth extends AbstractInteractive{

    noteLibrary = new Map()	

    octave = 4

    modeIndex = 0
    scaleType = null

    set happiness(value){
        const emoji = EMOJI_SEQUENCE[ Math.round(value * EMOJI_SEQUENCE.length )]
        // const emoji = EMOJI_SEQUENCE[ Math.round(value * EMOJI_SEQUENCE.length )]
        this.emoji.textContent = emoji
    }

    set mode( value){
        this.modeIndex = value
        this.setEmoji()
    }

    get mode(){
        return this.modeIndex
    }

    get modeName(){
        return TUNING_MODE_NAMES[this.modeIndex]
    }

    /**
     * Musical Scale such as Major or Minor
     */
    set scale( musicalScale) {
        this.scaleType = musicalScale
        console.info("Scale", musicalScale )
        this.setEmoji()
    }

    get scale() {
        return this.scaleType
    }

    constructor( notes, noteOn, noteOff, setMode, mode=0, octave=4 ){
		super()

        const chordOn = (noteModel, velocity=1, id=0, idOffset=0) => {
            noteOn( noteModel, velocity, id, null, this.mode, idOffset )
        }
        const chordOff = (noteModel, velocity=1, id=0, idOffset=0) => {
            noteOff( noteModel, velocity, id, null, this.mode, idOffset )
        }

        this.notes = notes
        this.octave = octave ?? 4
        this.modeIndex = mode ?? 0
        // this.scaleType = sc ?? 0
        
        this.element = document.querySelector(".circle-of-fifths")
        this.title = this.element.querySelector("title")
        this.emoji = this.element.querySelector(".fifths-emotion-text")
        this.keyElements = this.createKeys(notes, ".circle-of-fifths-tonics path", 3)
        this.keyElements.push(...this.createKeys(notes, ".circle-of-fifths-harmonies path" ))
        this.addInteractivity( this.keyElements, chordOn, chordOff )  
        this.addControls( setMode )

        this.setEmoji()
	}

    setEmoji(){
        const emoji = getEmojiForScaleAndMode( this.scaleType, this.modeIndex )
        this.emoji.textContent = emoji
        console.log("Emoji", emoji)
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
        const noteNumber = parseInt( button.getAttribute("data-number") )
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
            path.setAttribute("data-key", note.noteKey)
            path.setAttribute("data-number", i) // note.noteNumber
            path.setAttribute("data-note", note.noteNumber )
            path.setAttribute("data-name", note.noteName)
            path.setAttribute("data-frequency", note.frequency)
            path.setAttribute("data-octave", note.octave)
            
            // make this into an accessible button
            path.setAttribute("role", "button")
            path.setAttribute("tabindex", "0")
            path.setAttribute("aria-label", note.noteName )

            this.noteLibrary.set( path, notes[i] )
            return path
        })
        return htmlElementKeys
    }
}
