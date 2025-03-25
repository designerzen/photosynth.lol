// accessibility
import { addTextScalingFacilities } from "./accessibility"
import { addThemeSelectionOptions, setTheme, THEMES } from "./theme"
import { setFont } from "./fonts"

// audio
import { enableMIDI, mapped, toChord, toNote } from "./audio"
import { createChord, createFifthsChord, createMajorChord, createMinorChord, getModeAsIntegerOffset, getModeFromIntegerOffset, TUNING_MODE_NAMES } from "./chords"
import { registerMultiTouchSynth } from "./components/multi-touch-synth"

import SynthOscillator from "./instruments/synth-oscillator"
import CircleSynth from "./components/circle-synth"

// DOM
import Hero from "./components/hero"

import NoteVisualiser from "./components/note-visualiser"
import AudioVisualiser from "./components/audio-visualiser"

import SVGKeyboard from "./components/keyboard-svg"

// data
import Note from "./note"
import { PALETTE } from "./settings"
import { ASTLEY } from "./songs"
import Song from "./song"

// read any saved themes from the URL ONLY (not from cookies so no overlay required :)
const searchParams = new URLSearchParams(location.search)
let theme = searchParams.get("theme") ?? THEMES[0]

// create a synth for every finger!
// lazily create a new one is requested
const fingerSynths = new Map()

// audio context requires a user gesture to start...
let audioContext = null
let limiter = null
let mixer = null
let keyboard 

// Shared DOM elements
let hero
let noteVisualiser
let shapeVisualiser
let circles

const keyboardKeys = ( new Array(128) ).fill("")
const ALL_KEYBOARD_NOTES = keyboardKeys.map((keyboardKeys,index)=> new Note( index ))
// KEYBOARD_NOTES.forEach( (n,index) => console.info( n.toString(), index ) )

// Grab a good sounding part (not too bassy, not to trebly)
const KEYBOARD_NOTES = ALL_KEYBOARD_NOTES.slice( 41, 94 )

const CHORDS = [
    createMajorChord, 
    createMinorChord,
    createFifthsChord
]

// is Major or Minor?
let isHappy = true
// scale mode (eg. Dorian, Mixolydian, etc)
let mode = 0
// oscillator shape (eg. sine, square, sawtooth, triangle)
let shape = 0
// default volume
let volume = parseInt(searchParams.get("volume") ?? 1)

// console.info({ALL_KEYBOARD_NOTES, KEYBOARD_NOTES})

const getSynthForFinger = (finger=0)=>{
    if (!fingerSynths.has(finger)){
    const fingerSynth = new SynthOscillator(audioContext, {shape})
        fingerSynth.loadWaveTable("TB303")
        fingerSynth.loadWaveTable("tb303.json")
        fingerSynth.loadWaveTable("Piano")
        fingerSynth.output.connect(limiter)
        fingerSynths.set( finger, fingerSynth )
    }
    return fingerSynths.get(finger)
}

/**
 * Replace the existing URL with a specific one without refreshing the page
 * This query string can then be used to restore the state of the page
 * on reload
 */
const updateURL = ()=>{
    const newURL = `${window.location.pathname}?${searchParams.toString()}`
    window.history.pushState({ path: newURL }, '', newURL)
}

/**
 * Adds a menu specifically for accessibility
 * that includes text sizing / font selection
 * audio controls and theme selection
 */
const addAccessibilityFunctionality = ()=> {

    // As the menu only works with JS, we hide it by default
    const accessibilityMenu = document.getElementById("menu-accessibility")
    accessibilityMenu.hidden = false

    // THEME ------------------------------------------------

    // set theme from query string if provided
    if (theme !== "default")
    {
        setTheme(theme)
    }
    
    addThemeSelectionOptions((themeName) =>{
        searchParams.set("theme", themeName)
        updateURL()
    })

    // AUDIO ------------------------------------------------
    const volumeSlider = document.getElementById("volume")
    volumeSlider.addEventListener("input", e => {
        const input = e.target.value
        console.info("volumeSlider", input)
        setVolume(input / 100 )
    })

    const muteCheckbox = document.getElementById("mute")
    muteCheckbox.addEventListener("change", e => {
        toggleMute(e.target.checked, volumeSlider)
    })

    // TEXT ------------------------------------------------
   
    // connect the menu to the theme selection options
    const initialFontSize = searchParams.get("font-size") ?? 1
    addTextScalingFacilities( initialFontSize, (scale) => {
        // due to floating points, this may be irrational
        // so we ensure that it is a good number
        searchParams.set("font-size", scale)
        updateURL()
    })

    // FONTS ------------------------------------------------
    const fontRadioButtons = document.querySelectorAll('input[name="font"]')
    fontRadioButtons.forEach(radioButton => {
        radioButton.addEventListener("change", e => {
            const font = setFont(e.target.value)
            searchParams.set("font", font)
            updateURL()
        })
    })

    // Set user font preference
    const font =  searchParams.get("font") ?? "default"
    setFont(font)
}

/**
 * Play a NOTE
 * @param {Object} noteModel 
 * @param {Number} velocity 
 * @param {Number} id 
 */
const noteOn = (noteModel, velocity=1, id=0 ) => {
    // const chord = isHappy ? 
    //     createMajorChord( ALL_KEYBOARD_NOTES, noteModel.noteNumber, mode ) :
    //     createMinorChord( ALL_KEYBOARD_NOTES, noteModel.noteNumber, mode )
    const chordGenerator = CHORDS[isHappy ?0:1]
    const chord = chordGenerator(ALL_KEYBOARD_NOTES, noteModel.noteNumber, mode)
    const velocityReduction = velocity / chord.length * 0.8
    
    // viz && viz.advance()
    
    for (let i=0; i<chord.length; i++){
        const synth = getSynthForFinger(i)
        const note = chord[i]
        // synth.gain = 1 / chord.length
        velocity = velocityReduction
        synth.noteOn( note, velocity )     
        // Now highlight the keys on the keyboard!                                                                                                           
        keyboard.setKeyAsActive( note.noteNumber )
        hero && hero.noteOn( note )
        noteVisualiser && noteVisualiser.noteOn( note, velocity )
    }
    // hero && hero.noteOn( chord[0] )
    console.info("noteOn", ALL_KEYBOARD_NOTES.length, {noteModel, mode, chord, ALL_KEYBOARD_NOTES})
}
   
/**
 * Stop playing a NOTE
 * @param {Object} noteModel 
 * @param {Number} velocity 
 * @param {Number} id 
 */
const noteOff = (noteModel, velocity=1, id=0 ) => {

    if (!noteModel)
    {
        console.warn("No noteModel provided to noteOff")
        return
    }

    // const chord = isHappy ? 
    //     createMajorChord( ALL_KEYBOARD_NOTES, noteModel.noteNumber, mode ) :
    //     createMinorChord( ALL_KEYBOARD_NOTES, noteModel.noteNumber, mode )
    const chordGenerator = CHORDS[isHappy ?0:1]
    const chord = chordGenerator(ALL_KEYBOARD_NOTES, noteModel.noteNumber, mode)
   
    for (let i=0; i<chord.length; i++)
    {
        const synth = getSynthForFinger(i)
        const note = chord[i]
        synth.noteOff( note, velocity )
        // Now unhighlight the keys on the keyboard
        keyboard.setKeyAsInactive( note.noteNumber )
        hero && hero.noteOff( note )
        noteVisualiser && noteVisualiser.noteOff( note, velocity )
    }

    console.info("noteOff", {noteModel, chord, mode})
}


const loadSong = (track=ASTLEY) => {
    // Load in our rick roll...
    const song = new Song(track)
    // const note = song.getNextNote()
    // console.info("note", note, {song} )
    return song
}

/**
 * 
 * @param {AudioContext} audioContext 
 * @param {AudioNode} source 
 */
const createAudioVisualiser = (audioContext, source, song) => {

    const visualiserOptions = {
        backgroundColour:PALETTE.stoneLight,
        lineColour:PALETTE.plum,
        lineWidth:3
    }
    const visualiserCanvas = document.getElementById("visualiser")
    const visualiserContext = visualiserCanvas.getContext('2d')
    shapeVisualiser = new AudioVisualiser( visualiserContext, audioContext, source, visualiserOptions )
   
    const updateVis = () => {
        shapeVisualiser.drawWaveform()
        requestAnimationFrame(updateVis)
    }
    updateVis()

    let playingNote = null
    // allow the user to click the visualiser to play a song...
    visualiserCanvas.addEventListener("click", e => {

        const note = song.getNextNote()
        console.info("note", note, {song, playingNote} )
        if (playingNote)
        {
            noteOff( playingNote )
        }

        noteOn( note )
        playingNote = note
        //setTimbre( OSCILLATORS[] )
    })
}

/**
 * Requires a user-gesture before initiation...
 */
const createAudioContext = (event) => {

    if (audioContext)
    {
        return audioContext
    }
    
    audioContext = new AudioContext()

    limiter = audioContext.createDynamicsCompressor();
    limiter.threshold.value = 0
    limiter.ratio.value = 2 // 20
    
    mixer = audioContext.createGain()
    mixer.gain.value = 1

    limiter.connect(mixer)
    mixer.connect( audioContext.destination )
    
    const song = loadSong()

    createAudioVisualiser( audioContext, mixer, song )
    // createAudioVisualiser( audioContext, limiter)


    // now register any instruments that depend on the audiocontext
    registerMultiTouchSynth(audioContext, ALL_KEYBOARD_NOTES, noteOn, noteOff)
}

// for (let i = 0; i < 640; i++){
//     console.info(i,"NOTE", toNote(i))
//     console.info(i,"CHORD", toChord(i))
//     console.info(i,"CHORD", mapped( toNote(i), toChord(i), 0 ))
// }

const emotionPanel = document.getElementById("emotion")

const setMode = (musicalMode) => {

    // TUNING_MODE_NAMES
    mode = isNaN(musicalMode) ? 
        getModeAsIntegerOffset(musicalMode) : 
        musicalMode%TUNING_MODE_NAMES.length

    const modeName = getModeFromIntegerOffset(mode)

    switch(mode){
        case -1:
            break
        default:

    }

    if (!modeName)
    {
        throw new Error("No modeName found for mode "+musicalMode)
    }

    const radioButtons = document.querySelectorAll('input[value="'+modeName+'"]')
    if (radioButtons && radioButtons.length)
    {
        radioButtons.forEach(radioButton => {
            radioButton.checked = true
            console.info("setMode", {mode, musicalMode})
        }) 
        
        // emotionPanel.querySelector("output").textContent = modeName
           
    }else{
        throw new Error("No radio buttons found to select! input[value="+modeName+"]")
    }

    return mode
}

/**
 * Set the shape of this sound
 * @param {String|Number} timbre 
 */
const setTimbre = (timbre) => {
    fingerSynths.forEach( synth => synth.shape = timbre )
    shape = timbre
}

/**
 * Set the Master Volume
 * @param {Number} value 0->1
 */
const setVolume = (value) => {
    mixer.gain.value = value
    volume = value
    searchParams.set("volume", value)
    updateURL()
}

/**
 * Mute / Unmute the Master Volume
 * @param {Number} value 
 * @param {HTMLElement} volumeSlider 
 */
const toggleMute = (value, volumeSlider=null) => {
   if (value){
        mixer.disconnect()
        volumeSlider.setAttribute( "disabled", true )
    }else{
        mixer.connect(audioContext.destination)
        volumeSlider.removeAttribute( "disabled" )
    }
}


const DEFAULT_OBSERVATION_OPTIONS = {
    // root: document.body,
    root: null,
    rootMargin: '0px',
    threshold: 0
}

const monitorIntersections = ( query="[data-observe]", intersectionOptions = DEFAULT_OBSERVATION_OPTIONS) => {

    const elementsToObserve = document.querySelectorAll(query)
    const intersectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
           
            const ratio = entry.intersectionRatio
            const boundingRect = entry.boundingClientRect
            const intersectionRect = entry.intersectionRect
          
            if (ratio === 0) {
                // OUTSIDE

            }else if (ratio >= 1) {
                // INSIDE
                console.info("intersection INSIDE", entry)  
            } else if (boundingRect.top < intersectionRect.top) {
                // ABOVE
        
            } else {
                // BELOW
        
            }

            if (entry.isIntersecting) {
                // const inert = entry.target.hasAttribute("data-inert")
                const fullSizeKeyboard = entry.target.hasAttribute("data-full-keyboard")
                // const shortKeyboard = entry.target.hasAttribute("data-short-keyboard")
                // const hideKeyboard = entry.target.hasAttribute("data-hide-keyboard")
                console.info("intersection", {entry, ratio, boundingRect, intersectionRect, fullSizeKeyboard})  

                if (fullSizeKeyboard)
                {
                    
                }

                // document.body.classList.toggle("inert", inert)
                document.body.classList.toggle("show-full-keyboard", fullSizeKeyboard)
            }
        })
    }, intersectionOptions)
    // observe all elements that match that query
    elementsToObserve.forEach(element => intersectionObserver.observe(element))

    // console.info("elementsToObserve", {elementsToObserve }) 
}

const fetchStateFromRadioButtons = () => {

    const queries = [
        '.emotion-selector input[type="radio"]:checked',
        '#emotion input[type="radio"]:checked'
    ]

    const o = queries.map(query => {
        const radioButtons = document.querySelectorAll(query)
        console.info("radioButtons", radioButtons)
        return radioButtons
    })

    const flat = Array.from(  new Set(...o) )
  

    flat.forEach(radioButton => {
        console.info("checked", radioButton)
        switch (radioButton.name)
        {
            case "emotion":
                setMode( radioButton.value )
                break
            case "octave":
                setOctave( radioButton.value )
                break
            case "timbre":
                setTimbre( radioButton.value )
                break
            case "chord":
                console.warn("No case for", radioButton.name)
                break
            default:
                console.warn("No case for", radioButton.name)
        }
    })
    
    // now set each state by calling the relevant selection function
    
}

/**
 * Show the MIDI toggle button (ensure that MIDI is enabled first!)
 */
const showMIDIToggle = () => {
    const buttonMIDIToggle = document.getElementById("toggle-midi")
    buttonMIDIToggle.addEventListener("click", async(e) => {
        const midi = await enableMIDI()
        if (!midi.supported)
        {
            buttonMIDIToggle.hidden = false
        } 
        console.info("MIDI!", midi, midi.supported)
        console.info(midi.inputs)
        console.info(midi.outputs)
    })
    buttonMIDIToggle.parentNode.hidden = false
}

/**
 * replace the current year with the current year
 * @returns {Boolean} if the year was updated
 */
const setCurrentYear = () => {
   const currentYear = new Date().getFullYear()
   const yearElement = document.querySelector(".current-year")
   if (yearElement)
   {
        yearElement.textContent = currentYear
        return true
   }
   return false
}

/**
 * Circle of Fifths Synthesizer
 */
const showCircularSynth = () => {

    // const FIFTHS_LYDIAN = [0,1,1,1,1,1]
    // const FIFTHS_IONIAN = [0,1,1,1,1,5]

    const circleIntervals = {
        major:[0,1,3],
        minor:[0,1,8],
        major7:[0,1,3,4],
        minor7:[0,1,8,9],
        dominant7:[0,1,3,6],
        minor7flat5:[1,1,2,6],
        tritoneSubstitution:[4,2,1,3],
        diminishedTriad:[0,6,3],
        diminishedSeventh:[0,3,3,3],
        augmented:[0,4,4]
    }

    // Charles Goes Dancing At Every Big Fun Celebration.
    // From G D A E B...
    const circle = createFifthsChord(ALL_KEYBOARD_NOTES, 41, mode).reverse()
    const fifthIndexes = circle.map((note, index)=> note.sequenceIndex )
    const fifthData = ALL_KEYBOARD_NOTES.map( (key,i)=>{
        const octave = Math.floor(i/12) 
        return ALL_KEYBOARD_NOTES[(octave*12)+fifthIndexes[i%fifthIndexes.length]]
    })

    // const svgCircle = Array.from(document.querySelectorAll(".circle-of-fifths-tonics > path"))
    // const keys = svgCircle.map((path, i)=>{
    //     path.setAttribute("data-attribute-key", fifthData[i].noteKey)
    //     path.setAttribute("data-attribute-number", fifthData[i].noteNumber)
    //     path.setAttribute("data-attribute-name", fifthData[i].noteName)
    //     return path
    // })

    circles = new CircleSynth(fifthData, noteOn, noteOff, setMode )
    const f5 = createChord( fifthData, circleIntervals.major, 0, mode, false, true )

    console.info("COF", {f5, fifthData, fifthIndexes }) 
    // now chords foor the fifths
}

/**
 * DOM is ready...
 */
const start =  () => {
   
    // for (const p of searchParams) {
    //     console.info("searchParams",p, searchParams)
    // }

    // Passowrd Protection ------------------------------------------------
    const showingPasswordScreen = pass && !pass.hidden

    // NB. if this is password protected we ignore visits until the user has logged in
    const timesVisited = parseInt(searchParams.get("visited") ?? 0)
    searchParams.set("visited", showingPasswordScreen ? -1 : timesVisited + 1 )
    pass.hidden = timesVisited > 0
    // console.error({pass:pass, hidden:pass.hidden, showingPasswordScreen, timesVisited})

    addAccessibilityFunctionality()
    setCurrentYear()

    if (navigator.requestMIDIAccess)
    {
        showMIDIToggle()
    }
   
    // top interactive graphic
    hero = new Hero(ALL_KEYBOARD_NOTES, noteOn, noteOff)
  
    // bottom interactive piano
    keyboard = new SVGKeyboard(KEYBOARD_NOTES, noteOn, noteOff )
    
    // const headerElement = document.getElementById("headline")  
    // headerElement.appendChild(keyboard.asElement)
    // const keyboard2 = new SVGKeyboard(KEYBOARD_NOTES, noteOn, noteOff )

    const keyboardElement = document.body.appendChild( keyboard.asElement )
    keyboardElement.addEventListener("dblclick", e => isHappy = !isHappy)
   

    const wallpaperCanvas = document.getElementById("wallpaper")
    noteVisualiser = new NoteVisualiser( KEYBOARD_NOTES, wallpaperCanvas, false, 0 ) // ALL_KEYBOARD_NOTES
 
    // reinstate the state recalled from the previous session
    // fetchStateFromRadioButtons() 
   
    showCircularSynth()
    monitorIntersections()
    updateURL()

    // UI ------------------------------------------------

    const emotionRadioButtons = emotionPanel.querySelectorAll("input[type=radio]") 
    emotionRadioButtons.forEach(radioButton => {
        radioButton.addEventListener("change", e => {
            
            const input = e.target.value
            switch(input)
            {
                case "Major":
                    // circles.happiness = 1
                    isHappy = true
                    break

                case "Minor":
                    // circles.happiness = 0
                    isHappy = false
                    break

                default: 
                    setMode( input )
                    // circles.happiness = mode / 7
                    circles.mode = mode
                    console.log("radioButton", radioButton, input)
            }
            emotionPanel.querySelector("output").textContent = input
        })
    })

    const shapeButtons = Array.from( document.body.querySelectorAll('input[name="timbre"]') ) 
    shapeButtons.forEach( (radioButton, index) => {
        radioButton.addEventListener("change", e => {
            const input = e.target.value
            setTimbre( input )
        })
    })
}

/**
 * DOM reporting for action!
 */
document.addEventListener("DOMContentLoaded", start, {once:true})
// window.addEventListener("load", start, {once:true})
document.addEventListener("touchstart", createAudioContext, {once:true})
document.addEventListener("mousedown", createAudioContext, {once:true})