// accessibility
import { addTextScalingFacilities } from "./accessibility"
import { addThemeSelectionOptions, setTheme, THEMES } from "./theme"
import { setFont } from "./fonts"

// audio
import { AudioContext, OfflineAudioContext } from 'standardized-audio-context'
import { enableMIDI, mapped, toChord, toNote } from "./audio"
import { createChord, createFifthsChord, createMajorChord, createMinorChord, getModeAsIntegerOffset, getModeFromIntegerOffset, MAJOR_CHORD_INTERVALS, TUNING_MODE_NAMES } from "./chords"
import { registerMultiTouchSynth } from "./components/multi-touch-synth"
import CircleSynth from "./components/circle-synth"

import SynthOscillator from "./instruments/synth-oscillator"
import { getRandomWaveTableName, preloadAllWaveTables } from "./instruments/wave-tables"

import Note from "./note"
import Song from "./song"

import { ASTLEY } from "./songs"

// DOM
import Hero from "./components/hero"
import NoteVisualiser from "./components/note-visualiser"
import AudioVisualiser from "./components/audio-visualiser"
import SVGKeyboard from "./components/keyboard-svg"

// data
import { CICRLE_INTERVALS, DEFAULT_PASSWORD, PALETTE, VISUALISER_OPTIONS } from "./settings"
import { monitorIntersections } from "./intersection-observer"
import { changeUIText, handlePasswordProtection, selectRadioButton, setCurrentYear, updateScaleUI, updateTimbreUI } from "./ui"

// read any saved themes from the URL ONLY (not from cookies so no overlay required :)
const searchParams = new URLSearchParams(location.search)

// create a synth for every finger!
// lazily create a new one is requested
const fingerSynths = new Map()

// audio context requires a user gesture to start...
let audioContext = null
let limiter = null
let mixer = null

// Shared DOM elements
let hero
let noteVisualiser
let shapeVisualiser
let circles
let keyboard 

const keyboardKeys = ( new Array(128) ).fill("")
// Full keyboard with all notes including those we do not want the user to play
const ALL_KEYBOARD_NOTES = keyboardKeys.map((keyboardKeys,index)=> new Note( index ))
// Grab a good sounding part (not too bassy, not to trebly)
const KEYBOARD_NOTES = ALL_KEYBOARD_NOTES.slice( 41, 94 )
// KEYBOARD_NOTES.forEach( (n,index) => console.info( n.toString(), index ) )

const CHORDS = [
    createMajorChord, 
    createMinorChord,
    createFifthsChord
]

const SCALES = [
    "Major",
    "Minor"
]

let isHappy = true          // is Major or Minor?
let scale = SCALES[0]       // scale (eg. Major, Minor... etc)
let mode = 0                // scale mode (eg. Dorian, Mixolydian... etc)
let shape = "sine"          // oscillator shape (eg. sine, square, sawtooth, triangle)

// console.info({ALL_KEYBOARD_NOTES, KEYBOARD_NOTES})

// UI ==============================================================


/**
 * Replace the existing URL with a specific one without refreshing the page
 * This query string can then be used to restore the state of the page
 * on reload
 */
const updateURL = ()=>{
    const newURL = `${window.location.pathname}?${searchParams.toString()}`
    window.history.pushState({ path: newURL }, '', newURL)
}

// AUDIO ==============================================================

/**
 * Lazy load a SynthOscillator instrument for the specified index
 * @param {Number} finger 
 * @returns 
 */
const getSynthForFinger = (finger=0)=>{
    if (!fingerSynths.has(finger)){
        // const shape = getRandomWaveTableName()
        const fingerSynth = new SynthOscillator(audioContext, {shape})
        // fingerSynth.loadWaveTable(shape)
        // fingerSynth.shape = "Piano"
        // console.info("shape loading",shape, "into", fingerSynth)
        fingerSynth.output.connect(limiter)
        fingerSynths.set( finger, fingerSynth )
    }
    return fingerSynths.get(finger)
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
    if (searchParams.has("theme"))
    {
        setTheme(searchParams.get("theme"))
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

    // Set user font preference from previous session
    if (searchParams.has("font")) 
    {
        setFont(searchParams.get("font"))
    }
}

/**
 * Play a NOTE
 * @param {Object} noteModel 
 * @param {Number} velocity 
 * @param {Number} id 
 */
const noteOn = (noteModel, velocity=1, id=0 ) => {

    if (!noteModel)
    {
        console.warn("No noteModel provided to noteOn", noteModel)
        return
    }

    const synth = getSynthForFinger(id)
    synth.noteOn( noteModel, velocity )                                                                                                            
    keyboard.setKeyAsActive( noteModel.noteNumber )    // highlight the keys on the keyboard!    
    hero && hero.noteOn( noteModel )
    noteVisualiser && noteVisualiser.noteOn( noteModel, velocity )
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
        console.warn("No noteModel provided to noteOff", noteModel)
        return
    }

    const synth = getSynthForFinger(id)
    synth.noteOff( noteModel, velocity )
    keyboard.setKeyAsInactive( noteModel.noteNumber )   // unhighlight the keys on the keyboard
    hero && hero.noteOff( noteModel )
    noteVisualiser && noteVisualiser.noteOff( noteModel, velocity )
}

/**
 * Play a chord with the specified intervals
 * @param {Note} noteModel 
 * @param {Number} velocity 
 * @param {Array<Number>} intervals 
 * @param {Number} mode 
 * @param {Number|String} idOffset 
 */
const chordOn = (noteModel, velocity=1, id=0, intervals=null, mode=0, idOffset=0) => {
    const chord = createChord(ALL_KEYBOARD_NOTES, intervals ?? MAJOR_CHORD_INTERVALS, noteModel.noteNumber, mode, true, true )
    const velocityReduction = velocity / chord.length * 0.8
    const length = chord.length+idOffset
    console.info("chordOn", chord, velocityReduction  )
    for (let i=idOffset; i<length; i++){
        noteOn( chord[i], velocityReduction, id+i )
    }
}

/**
 * Turn off a series of chords
 * @param {Note} noteModel 
 * @param {Number} velocity 
 * @param {Array<Number>} intervals 
 * @param {Number} mode 
 */
const chordOff = (noteModel, velocity=1, id=0, intervals=null, mode=0 ) => {
    if (!noteModel ){
        console.warn("No noteModel provided to chordOff", noteModel)
        return
    }
    const chord = createChord(ALL_KEYBOARD_NOTES, intervals ?? MAJOR_CHORD_INTERVALS, noteModel.noteNumber, mode, true, true )
    for (let i=0; i<chord.length; i++){
        noteOff( chord[i], velocity, id+i )
    }
}

/**
 * Load in our rick roll...
 * @param {String} track as text
 * @returns 
 */
const loadSong = (track=ASTLEY) => {
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
const createAudioVisualiser = (audioContext, source, song, visualiserOptions=VISUALISER_OPTIONS ) => {

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
    visualiserCanvas.addEventListener("mousedown", e => {

        const note = song.getNextNote()
        console.info("Playing note", note, {song, playingNote} )
        if (playingNote)
        {
            chordOff( playingNote, 1, MAJOR_CHORD_INTERVALS, mode )
        }

        chordOn( note, 1, 0, MAJOR_CHORD_INTERVALS, mode )
        playingNote = note
        //setTimbre( OSCILLATORS[] )
    })

    visualiserCanvas.addEventListener("mouseup", e => {
        if (playingNote)
        {
            chordOff( playingNote, 1, 0, MAJOR_CHORD_INTERVALS, mode )
        }
    })
    
    // const randomWaveButton = document.querySelector('#timbre-random')
    const randomWaveButtons = document.querySelectorAll('input[value="random"]')
    randomWaveButtons.forEach( randomWaveButton => {
        randomWaveButton.addEventListener("click", e => {
            const randomWave = getRandomWaveTableName() 
            //console.info("randomWaveButton", randomWave)
            setTimbre( randomWave )
        })
    })
}

// AUDIO ==============================================================

/**
 * Requires a user-gesture before initiation...
 */
const createAudioContext = (event) => {

    if (audioContext)
    {
        return audioContext
    }
    
    // polyfilled see : https://github.com/chrisguttandin/standardized-audio-context
    audioContext = new AudioContext()

    limiter = audioContext.createDynamicsCompressor();
    limiter.threshold.value = 0
    limiter.ratio.value = 2 // 20
    
    mixer = audioContext.createGain()
    mixer.gain.value = parseInt(searchParams.get("volume") ?? 1)

    limiter.connect(mixer)
    mixer.connect( audioContext.destination )
    
    const song = loadSong()

    createAudioVisualiser( audioContext, mixer, song )

    registerMultiTouchSynth( ALL_KEYBOARD_NOTES, chordOn, chordOff)

    // try and load in some instrument data sets in the background...
    preloadAllWaveTables()
}

/**
 * Set the musical scale to Major / Minor
 * @param {Boolean|String|Number} scaleType 
 */
const setScale = (scaleType) => {
    // if it is a boolean or a number we act accordingly
    switch( typeof(scaleType) )
    {
        case "boolean":
            scaleType = SCALES[scaleType ? 0 : 1]
            isHappy = scaleType
            break

        case "number":
            scaleType = SCALES[scaleType%SCALES.length]
            break
    }

    if( typeof(scaleType) === "string" )
    {
        isHappy = scaleType === SCALES[0]
    }

    updateScaleUI( scaleType )
    scale = scaleType
    console.info("Scale set to", scaleType )
}

/**
 * Set the musical mode for the scale (eg. Dorian, Mixolydian, etc)
 * @param {Number|String} musicalMode 
 * @returns {Number}
 */
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

    selectRadioButton(modeName)
  
    return mode
}

/**
 * Set the shape of this sound
 * @param {String|Number} timbre 
 */
const setTimbre = (timbre) => {
    const timbreSanitised = " " + timbre.replaceAll("_","") 
    fingerSynths.forEach( synth => synth.shape = timbre )
    updateTimbreUI( timbreSanitised )
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

// STATE ==============================================================

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
                circles.octave = parseInt( radioButton.value )
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

// USER INTERFACE ==============================================================
 
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
 * Circle of Fifths Synthesizer
 */
const showCircularSynth = () => {

    const circleIntervals = CICRLE_INTERVALS

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

    circles = new CircleSynth(fifthData, chordOn, chordOff, setMode )
    const f5 = createChord( fifthData, circleIntervals.major, 0, mode, false, true )

    //console.info("COF", {f5, fifthData, fifthIndexes }) 
}

const setupRadioButtons = () => {
    const emotionRadioButtons = document.querySelectorAll( "input[name='emotion'], input[name='octave'], input[name='chord'], input[name='timbre']" ) 
    emotionRadioButtons.forEach(radioButton => {
        radioButton.addEventListener("change", e => {
            
            const input = e.target.value
            const name = e.target.name

            switch(name){
                case "timbre":
                    setTimbre( input.toLowerCase() )
                    break

                case "octave":
                    circles.octave = parseInt(input) 
                    break

                case "emotion":
                    setMode( input )
                    // circles.happiness = mode / 7
                    circles.mode = mode
                    break
            }

            switch( input.toLowerCase() )
            {
                case "happy":
                case "major":
                    setScale( true )
                    break

                case "sad":
                case "minor":
                    setScale( false )
                    break
            }
            console.info("RadioButton", {name, input} )
            // emotionPanel.querySelector("output").textContent = input
        })
    })
}

// LOGIC ==============================================================

/**
 * DOM is ready...
 */
const start =  () => {

    // for (const p of searchParams) {
    //     console.info("searchParams",p, searchParams)
    // }

    handlePasswordProtection( searchParams, DEFAULT_PASSWORD, updateURL )
    
    setCurrentYear()
    addAccessibilityFunctionality()

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
    keyboardElement.addEventListener("dblclick", e => setScale( !isHappy ) )
   
    const wallpaperCanvas = document.getElementById("wallpaper")
    
    noteVisualiser = new NoteVisualiser( ALL_KEYBOARD_NOTES, wallpaperCanvas, false, 0 ) // ALL_KEYBOARD_NOTES
 
    // reinstate the state recalled from the previous session
    // fetchStateFromRadioButtons() 
    // FIXME:
    setScale( true )

    // UI ------------------------------------------------
    showCircularSynth()

    setupRadioButtons()
  
    // watch for when an element arrives in the window
    monitorIntersections()
  
    // finally update the URL with the state
    updateURL()
}

/**
 * DOM reporting for action!
 */
document.addEventListener("DOMContentLoaded", start, {once:true})
// window.addEventListener("load", start, {once:true})
document.addEventListener("touchstart", createAudioContext, {once:true})
document.addEventListener("mousedown", createAudioContext, {once:true})