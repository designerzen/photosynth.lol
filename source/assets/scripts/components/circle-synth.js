import { TUNING_MODE_NAMES } from "../chords"
import { EMOJI_SEQUENCE, getEmojiForScaleAndMode, TUNING_MODE_EMOJIS_MAJOR } from "../emoji"
import { addThemeSelectionOptions } from "../theme"
import AbstractInteractive from "./abstract-interactive"

const OCTAVE_NAMES = [
    "Bass", "Lead", "Treble"
]

export default class CircleSynth extends AbstractInteractive{

    noteLibrary = new Map()	

    octave = 4

    modeIndex = 0
    scaleType = null

    // text elements
    timbreElement
    frequencyElement
    toneElement

    set happiness(value){
        const emoji = EMOJI_SEQUENCE[ Math.round(value * EMOJI_SEQUENCE.length )]
        this.emoji.textContent = emoji
    }

    /**
     * Musical Scale Mode (eg. dorian) as Number
     */
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
        this.toneElement.textContent = musicalScale
        this.toneElement.setAttribute("startOffset", (35.5 - (musicalScale.length * 0.5)) + "%")
        // console.info("Scale", musicalScale )
        this.setEmoji()
    }

    get scale() {
        return this.scaleType
    }

    /**
     * Timbre is a string value that is displayed in curved text
     */
    set timbre(value){
        this.timbreElement.textContent = value // String(value).toUpperCase()
        this.timbreElement.setAttribute("startOffset", (12.5 - (value.length * 0.5)) + "%")
    }

    set frequency( value ){
        this.octave = typeof value === "number" ? value : OCTAVE_NAMES.indexOf(value)
        let octaveName = "All"
        if (this.octave <= 3)
        {
            // BASS
            octaveName = OCTAVE_NAMES[ 0 ]
        }else if (this.octave <= 4){
            // MID
            octaveName = OCTAVE_NAMES[ 1 ]
        }else if (this.octave >= 5){
            // TREBLE
            octaveName = OCTAVE_NAMES[ 2 ]
        }
        this.frequencyElement.textContent = octaveName
        this.frequencyElement.setAttribute("startOffset", (75 - (octaveName.length * 0.5)) + "%")
        // this.frequencyElement.textContent = OCTAVE_NAMES[ this.octave ] 
        // console.info("FREQ", value, this.frequencyElement.textContent )
    }

    constructor( notes, noteOn, noteOff, setMode, mode=0, octave=4 ){
		super()

        const chordOn = (noteModel, velocity=1, id=0, idOffset=0) => {
            noteOn( noteModel, velocity, id, null, this.mode, idOffset )
        }
        const chordOff = (noteModel, velocity=1, id=0, idOffset=0) => {
            noteOff( noteModel, velocity, id, null, this.mode, idOffset )
        }

     
        // this.scaleType = sc ?? 0
        
        this.element = document.querySelector(".circle-of-fifths")
        this.title = this.element.querySelector("title")
        this.emoji = this.element.querySelector(".fifths-emotion-text")
        this.timbreElement = this.element.querySelector(".curved-text-timbre")
        this.frequencyElement = this.element.querySelector(".curved-text-frequency")
        this.toneElement = this.element.querySelector(".curved-text-tone")
       
        // console.error( "COF elements", this.timbreElement, this.frequencyElement, this.toneElement  )

        this.notes = notes
        this.octave = octave ?? 4
        this.modeIndex = mode ?? 0

        this.keyElements = this.createKeys(notes, ".circle-of-fifths-tonics path", 3)
        this.keyElements.push(...this.createKeys(notes, ".circle-of-fifths-harmonies path" ))
        this.addInteractivity( this.keyElements, chordOn, chordOff )  
        this.addControls( setMode )

        this.frequency = octave

        // now update the face
        this.setEmoji()
	}

    /**
     * set the emoji in the centre
     */
    setEmoji(){
        const emoji = getEmojiForScaleAndMode( this.scaleType, this.modeIndex )
        this.emoji.textContent = emoji
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
            // console.info("emoji pressed to mode", this.mode)
            e.preventDefault()
        })
        emojiHitArea.addEventListener("dblclick", e => {
            // console.info("emoji double clicked to mode", this.mode)
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