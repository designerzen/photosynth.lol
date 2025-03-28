// accessibility
import { addTextScalingFacilities } from "./accessibility"
import { addThemeSelectionOptions, setTheme, THEMES } from "./theme"
import { setFont } from "./fonts"

// audio
import { enableMIDI, mapped, toChord, toNote } from "./audio"
import { createChord, createFifthsChord, createMajorChord, createMinorChord, getModeAsIntegerOffset, getModeFromIntegerOffset, MAJOR_CHORD_INTERVALS, TUNING_MODE_NAMES } from "./chords"
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
import { getRandomWaveTableName } from "./instruments/wave-tables"
import { monitorIntersections } from "./intersection-observer"

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

const SCALES = [
    "Major",
    "Minor"
]

// is Major or Minor?
let isHappy = true
let scale = SCALES[0]
// scale mode (eg. Dorian, Mixolydian, etc)
let mode = 0
// oscillator shape (eg. sine, square, sawtooth, triangle)
let shape = "sine"
// default volume
let volume = parseInt(searchParams.get("volume") ?? 1)

// console.info({ALL_KEYBOARD_NOTES, KEYBOARD_NOTES})

// UI ==============================================================
const toTitleCase = word => (word.charAt(0).toUpperCase() + word.slice(1))
const changeUIText = (query, value) => {
    document.querySelectorAll(query).forEach( element => element.textContent = value )
}

// update text field on UI
const updateTimbreUI = (timbre) => {
    changeUIText("[data-timbre]", toTitleCase(timbre) )
}

const updateScaleUI = (scale) => {
    // remove old scale and add new one...
    changeUIText("[data-scale]", scale )
    // ensure the input radio is selected
    document.querySelectorAll(`input[value="${scale}"]`).forEach( element => {
        if (!element.checked){ 
            element.checked = true 
        } 
    })
    // change data-attribute
    document.documentElement.setAttribute("data-scale", scale.toLowerCase() )
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

    if (!noteModel)
    {
        console.warn("No noteModel provided to noteOn", noteModel)
        return
    }

    const synth = getSynthForFinger(id)
    synth.noteOn( noteModel, velocity )     
    // Now highlight the keys on the keyboard!                                                                                                           
    keyboard.setKeyAsActive( noteModel.noteNumber )
    hero && hero.noteOn( noteModel )
    noteVisualiser && noteVisualiser.noteOn( noteModel, velocity )

    return
    /*
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
        */
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
        console.warn("No noteModel provided to noteOff", noteModel)
        return
    }

    const synth = getSynthForFinger(id)
    synth.noteOff( noteModel, velocity )
    // Now unhighlight the keys on the keyboard
    keyboard.setKeyAsInactive( noteModel.noteNumber )
    hero && hero.noteOff( noteModel )
    noteVisualiser && noteVisualiser.noteOff( noteModel, velocity )

    return

    /*
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
    */
    console.info("noteOff", {noteModel, chord, mode})
}

const chordOn = (noteModel, velocity=1, intervals=MAJOR_CHORD_INTERVALS, mode=0, idOffset=0) => {
    const chordGenerator = CHORDS[isHappy ?0:1]
    const chord = intervals ?? chordGenerator(ALL_KEYBOARD_NOTES, noteModel.noteNumber, mode)
    const velocityReduction = velocity / chord.length * 0.8
    const length = chord.length+idOffset
    for (let i=idOffset; i<length; i++){
       
        const note = chord[i]
        // synth.gain = 1 / chord.length
        velocity = velocityReduction
        noteOn( note, velocity, i )
    }
}

const chordOff = (noteModel, velocity=1, intervals=MAJOR_CHORD_INTERVALS, mode=0, idOffset=0) => {
    
    const chordGenerator = CHORDS[isHappy ?0:1]
    const chord = intervals ?? chordGenerator(ALL_KEYBOARD_NOTES, noteModel.noteNumber, mode)
   
    for (let i=0; i<chord.length; i++)
    {
        const note = chord[i]
        noteOff( note, velocity, i )
    }
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
            chordOff( playingNote, 1, MAJOR_CHORD_INTERVALS, mode )
        }

        chordOn( note, 1, MAJOR_CHORD_INTERVALS, mode )
        playingNote = note
        //setTimbre( OSCILLATORS[] )
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

/**
 * Set the scale to Major / Minor
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
 * 
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

    const radioButtons = document.querySelectorAll('input[value="'+modeName+'"]')
    if (radioButtons && radioButtons.length)
    {
        radioButtons.forEach(radioButton => {
            if (!radioButton.checked)
            {
                radioButton.checked = true
            }
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
    const timbreSanitised = " " + timbre.replaceAll("_","") 
    fingerSynths.forEach( synth => synth.shape = timbre )
    shape = timbre
    updateTimbreUI( timbreSanitised )
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
   
   const emotionPanel = document.getElementById("emotion")

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
    keyboardElement.addEventListener("dblclick", e => setScale( !isHappy ) )
   
    const wallpaperCanvas = document.getElementById("wallpaper")
    noteVisualiser = new NoteVisualiser( KEYBOARD_NOTES, wallpaperCanvas, false, 0 ) // ALL_KEYBOARD_NOTES
 
    // reinstate the state recalled from the previous session
    // fetchStateFromRadioButtons() 
    // FIXME:
    setScale( true )

    showCircularSynth()
    monitorIntersections()
    updateURL()

    // UI ------------------------------------------------

    const emotionRadioButtons = document.querySelectorAll( "input[name='emotion'], input[name='octave'], input[name='chord'], input[name='timbre']" ) 
    
    // const emotionRadioButtons = emotionPanel.querySelectorAll("input[type=radio name='emotion'], input[type=radio name='octave']") 
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
                    console.log("radioButton", radioButton, input)
                    break
            }

            switch( input.toLowerCase() )
            {
                case "happy":
                case "major":
                    // circles.happiness = 1
                    setScale( true )
                    break

                case "sad":
                case "minor":
                    // circles.happiness = 0
                    setScale( false )
                    break
            }
            console.info("ARGH", {name, input} )
            // emotionPanel.querySelector("output").textContent = input
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