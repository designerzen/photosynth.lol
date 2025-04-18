
// accessibility
import { addTextScalingFacilities } from "./accessibility"
import { addThemeSelectionOptions, setTheme, THEMES } from "./theme"
import { setFont } from "./fonts"

// audio
import { AudioContext, OfflineAudioContext } from 'standardized-audio-context'
import { enableMIDI, mapped, toChord, toNote } from "./audio"
import { createChord, createFifthsChord, createMajorChord, createMinorChord, getModeAsIntegerOffset, getModeFromIntegerOffset, MAJOR_CHORD_INTERVALS, MINOR_CHORD_INTERVALS, TUNING_MODE_NAMES } from "./chords"
import { registerMultiTouchSynth } from "./components/multi-touch-synth"
import CircleSynth from "./components/circle-synth"

import SynthOscillator from "./instruments/synth-oscillator"
import { getAllWaveTables, getRandomWaveTableName, loadWaveTableFromArchive, preloadAllWaveTables } from "./instruments/wave-tables"

import Note from "./note"
import Song from "./song"

// DOM
import Hero from "./components/hero"
import NoteVisualiser from "./components/note-visualiser"
import AudioVisualiser from "./components/audio-visualiser"
import SVGKeyboard from "./components/keyboard-svg"
import { monitorIntersections } from "./intersection-observer"
import { handlePasswordProtection, selectRadioButton, setCurrentYear, updateScaleUI, updateTimbreUI } from "./ui"

// data
import { CICRLE_INTERVALS, DEFAULT_PASSWORD, PALETTE, VISUALISER_OPTIONS } from "./settings"
import { ASTLEY, getRandomSong } from "./songs"
import WAVE_ARCHIVE_GENERAL_MIDI from "url:/static/wave-tables/general-midi.zip"
import WAVE_ARCHIVE_GOOGLE from "url:/static/wave-tables/google.zip"
import { MouseVisualiser } from "./components/mouse-visualiser"
import { MelodyRecorder } from "./melody-recorder"

// audio reqiures a user gesture to start...
// so we hook into each musical event to check if the user has engaged
let hasUserEngaged = false

// read any saved themes from the URL ONLY (not from cookies so no overlay required :)
const searchParams = new URLSearchParams(location.search)

// create a synth for every finger!
// lazily create a new one is requested
const fingerSynths = new Map()

// audio context requires a user gesture to start...
let audioContext = null
let limiter = null
let mixer = null

let song = null
let playingNote = null
let playingChord = null

// Shared DOM elements
let hero
let noteVisualiser
let shapeVisualiser
let mouseVisualiser
let circles
let keyboard 
let recorder


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

const preloadWaveTablesFromZip = async (zipURL) => {
    const meter = document.getElementById("load-progress")
    const data = await loadWaveTableFromArchive(zipURL, (progress, fileName, file)=>{
        // console.info("zip", {progress, fileName, file })
        meter.value = progress
    })
    console.info( data.length, "ZIPPED WAVE data",zipURL, {data}, getAllWaveTables() )
}


let isHappy = true          // is Major or Minor?
let scale = SCALES[0]       // scale (eg. Major, Minor... etc)
let mode = 0                // scale mode (eg. Dorian, Mixolydian... etc)
let octave = 0                // octave (bass / mid / treble )
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
        // now also ensure that the note visualiser has the correct
        // background colour by checking the canvas's 
        const bgCol = noteVisualiser.backgroundColour
        
        if (bgCol)
        {
                console.info("bgCol", bgCol)
        }else{
            
        }
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
    addTextScalingFacilities( initialFontSize, (scaleMode) => {
        // due to floating points, this may be irrational
        // so we ensure that it is a good number
        searchParams.set("font-size", scaleMode)
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
const noteOn = ( noteModel, velocity=1, id=0 ) => {

    // as user click is required to start the audio context
    if (!hasUserEngaged)
    {
        createAudioContext()
    }

    if (!noteModel)
    {
        console.warn("No noteModel provided to noteOn", noteModel)
        return
    }

    const synth = getSynthForFinger(id)
    synth.noteOn( noteModel, velocity )                                                                                                            
    keyboard.setKeyAsActive( noteModel )    // highlight the keys on the keyboard!    
    hero && hero.noteOn( noteModel )
    noteVisualiser && noteVisualiser.noteOn( noteModel, velocity )
    mouseVisualiser && mouseVisualiser.noteOn( noteModel, velocity )
    recorder && recorder.noteOn( noteModel, velocity )
    
    // this should change the visualiser line colour
    shapeVisualiser.colour = noteModel.colour
}
   
/**
 * Stop playing a specific NOTE
 * @param {Object} noteModel 
 * @param {Number} velocity 
 * @param {Number} id 
 */
const noteOff = (noteModel, velocity=1, id=0 ) => {
   
    // as user click is required to start the audio context
    if (!hasUserEngaged)
    {
        createAudioContext()
    }

    if (!noteModel)
    {
        console.warn("No noteModel provided to noteOff", noteModel)
        return
    }

    const synth = getSynthForFinger(id)
    synth.noteOff( noteModel, velocity )
    keyboard.setKeyAsInactive( noteModel )   // unhighlight the keys on the keyboard
    hero && hero.noteOff( noteModel )
    noteVisualiser && noteVisualiser.noteOff( noteModel, velocity )
    mouseVisualiser && mouseVisualiser.noteOff( noteModel, velocity )
    recorder && recorder.noteOff( noteModel, velocity )
    shapeVisualiser.colour = false
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
 * As we already loaded in a song, we can
 * use this method to fetch the next note
 * in the sequence
 * 
 * @param {Array<Note>} songSequence 
 * @param {Array<Number>} chordIntervals 
 * @param {Number} scaleMode 
 */
const playNextNoteInSong = (songSequence, chordIntervals=MAJOR_CHORD_INTERVALS, scaleMode=0) => {
    const note = songSequence.getNextNote()
   
    if (playingNote)
    {
        console.info("Killing note", note, {songSequence, playingNote} )
        chordOff( playingNote, 1, playingChord ?? chordIntervals, scaleMode )
    }else{
        console.info("Starting note", note, {songSequence, playingNote} )
    }

    chordOn( note, 1, 0, chordIntervals, scaleMode )
    playingNote = note
    playingChord = chordIntervals
}

/**
 * 
 * @param {HTMLElement} button 
 * @param {Array<Number>} chord 
 * @param {Number} musicalMode 
 */
const addMusicalMouseEventsToElement = (button, chord=MAJOR_CHORD_INTERVALS, musicalMode=0 ) => {
    button.addEventListener("mousedown", e => {
        playNextNoteInSong(song, chord, musicalMode)
        document.addEventListener("mouseup", e => {
            if (playingNote)
            {
                chordOff( playingNote, 1, 0, playingChord, musicalMode )
            }
        }, {once:true})
    })
}

/**
 * Waveform visualiser
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

    // allow the user to click the visualiser to play a song...
    addMusicalMouseEventsToElement(visualiserCanvas)
    
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
    circles && (circles.scale = scaleType)
    // console.info("Scale set to", scaleType )
}

/**
 * Set the musical mode for the scale (eg. Dorian, Mixolydian, etc)
 * @param {Number|String} musicalMode 
 * @returns {Number}
 */
const setMode = (musicalMode) => {

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
    const lowerCaseTimbre = timbre.toLowerCase()
    fingerSynths.forEach( synth => synth.shape = lowerCaseTimbre )
    // updateTimbreUI( timbreSanitised )
    updateTimbreUI( timbre )
    shape = timbre
    circles && (circles.timbre = timbre)
}

/**
 * 
 * @param {Array} timbres - array of all timbres
 * @param {String} timbre - the timbre to fetch
 * @param {Number} offset 
 * @returns {String} timbre name
 */
const getTimbre = (timbres, timbre, offset=0) => {
    const index = timbres.indexOf(timbre)
    if ( index < 0)
    {
        console.error( index, "NO TIMBRE", timbres, timbre, offset)
    }else{
        console.log( index, "getTimbre", timbres, timbre, offset)
    }
   
    return timbres[ (index + offset) % timbres.length ]
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

    const CHECKED_RADIO_BUTTON = 'input[type="radio"]:checked'
    const queries = [
        '.emotion-selector '+CHECKED_RADIO_BUTTON,
        '#emotion '+CHECKED_RADIO_BUTTON
    ]

    const checkedInputRadioButtons = []
    
    queries.forEach(query => {
        const radioButtons = document.querySelectorAll(query)
        console.info("radioButtons", radioButtons)
        radioButtons.forEach(radioButton => checkedInputRadioButtons.push(radioButton))
    })

    console.info("checked", { checkedInputRadioButtons} )
    
    checkedInputRadioButtons.forEach(radioButton => {
        console.info("checked radio button", radioButton)
        switch (radioButton.name)
        {
            case "emotion":
                console.warn("emotion", radioButton.value)
                setMode( radioButton.value )
                break
            case "octave":
                console.warn("octave", radioButton.value)
                octave = parseInt( radioButton.value )
                // circle && (circle.octave = octave)
                break
            case "timbre":
                console.warn("timbre", radioButton.value)
                setTimbre( radioButton.value )
                break
            case "chord":
                console.warn("chord", radioButton.value)
                setScale( radioButton.value )
                break
            default:
                console.warn("No case for", radioButton.value)
        }
    })
    
    // now set each state by calling the relevant selection function   
}

// USER INTERFACE ==============================================================
 

const loadShareMenu = () => {
    // import("./share.js")
    import('share-menu').then( lib => {
        const shareMenu = document.getElementById("share-menu")
        shareMenu.hidden = false
        // console.info("Menu for sharing is available", shareMenu, lib )
    })
}

/**
 * Show the MIDI toggle button (ensure that MIDI is enabled first!)
 */
const showMIDIToggle = () => {
    const sectionMIDIToggle = document.getElementById("midi-equipment")
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
    sectionMIDIToggle.hidden = false
    buttonMIDIToggle.parentNode.hidden = false
}

/**
 * Add to DOM the Circle of Fifths Synthesizer and populate with
 * historic input data (octave and musical mode)
 */
const createCircularSynth = (musicalMode, musicalOctave) => {

    // const circleIntervals = CICRLE_INTERVALS
    const circle = createFifthsChord(ALL_KEYBOARD_NOTES, 41, musicalMode).reverse()
    const fifthIndexes = circle.map((note, index)=> note.sequenceIndex )
    const fifthData = ALL_KEYBOARD_NOTES.map( (key,i)=>{
        const oneOctave = Math.floor(i/12) 
        return ALL_KEYBOARD_NOTES[(oneOctave*12)+fifthIndexes[i%fifthIndexes.length]]
    })

    // const svgCircle = Array.from(document.querySelectorAll(".circle-of-fifths-tonics > path"))
    // const keys = svgCircle.map((path, i)=>{
    //     path.setAttribute("data-key", fifthData[i].noteKey)
    //     path.setAttribute("data-number", fifthData[i].noteNumber)
    //     path.setAttribute("data-name", fifthData[i].noteName)
    //     return path
    // })

    const circularSynth = new CircleSynth( fifthData, chordOn, chordOff, setMode, musicalMode, musicalOctave )
    // const f5 = createChord( fifthData, circleIntervals.major, 0, mode, false, true )
    //console.info("COF", {f5, fifthData, fifthIndexes }) 
    return circularSynth
}

/**
 * Setup the radio toggle buttons and give their actions commands
 */
const setupRadioButtons = () => {
    const emotionRadioButtons = document.querySelectorAll( "input[name='emotion'], input[name='octave'], input[name='chord'], input[name='timbre']" ) 
    emotionRadioButtons.forEach(radioButton => {
        radioButton.addEventListener("change", e => {
            
            const input = e.target.value
            const name = e.target.name

            switch(name){
                case "timbre":
                    setTimbre( input )
                    break

                // 
                case "octave":
                    circles.frequency = parseInt(input) 
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

/**
 * 
 * @param {Array<String>} instrumentNames 
 */
const setupShapeVisualiser = (instrumentNames) => {
    const timbreSelect = document.getElementById("song-timbre-select")
    const timbrePrevious = document.getElementById("song-timbre-previous")
    const timbreNext = document.getElementById("song-timbre-next")
    
    const chordHappy = document.getElementById("button-happy")
    const chordSad = document.getElementById("button-sad")
    
    instrumentNames.forEach( name => {
        timbreSelect.add(new Option(name, name))
    })
    timbreSelect.addEventListener("change", e => {
        const timbre = e.target.value
        console.info("timbre", timbre)
        setTimbre( timbre )
    })
    timbrePrevious.addEventListener("click", e => {
        console.info("timbre previous", timbreSelect.value, timbreSelect.options.length )
        setTimbre( getTimbre(instrumentNames, shape, -1 ) )
    })
    timbreNext.addEventListener("click", e => {
        console.info("timbre next", timbreSelect.value, timbreSelect.options.length )
        setTimbre( getTimbre(instrumentNames, shape, 1 ) )
    })

    addMusicalMouseEventsToElement(chordHappy, MAJOR_CHORD_INTERVALS, mode)
    addMusicalMouseEventsToElement(chordSad, MINOR_CHORD_INTERVALS, mode)
}

// LOGIC ==============================================================

/**
 * Requires a user-gesture before initiation...
 */
const createAudioContext = (event) => {

    // only ever perform this once!
    if (hasUserEngaged || audioContext)
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
    
    createAudioVisualiser( audioContext, mixer, song, { ...VISUALISER_OPTIONS, backgroundColour:false } )

    registerMultiTouchSynth( ALL_KEYBOARD_NOTES, chordOn, chordOff, (noteModel,previousNoteModel, p) => {
        // show the mouse visualiser primed to play note
        if (mouseVisualiser)
        {
            previousNoteModel && mouseVisualiser.noteOff( previousNoteModel, 1 )
            // mouseVisualiser.chordOn( noteModel, 1, 0 )
            mouseVisualiser.noteOn( noteModel, 1 )
        }
    })
    hasUserEngaged = true
}

/**
 * Preload all of the wave tables 
 */
const backgroundLoad = async () => {
    // await preloadAllWaveTables()
    await preloadWaveTablesFromZip(WAVE_ARCHIVE_GENERAL_MIDI)
    await preloadWaveTablesFromZip(WAVE_ARCHIVE_GOOGLE)
    
    // update the UI with these new data sets...
    
    const instrumentNames = getAllWaveTables()
    
    // NB. This is the full list that may not be loaded yet?
    // all possible data files for instrument sounds
   
    // waveform visualiser
    setupShapeVisualiser(instrumentNames)

    console.error("DATA LOADED!", {instrumentNames} )

    // now add the share button and share overlay
    await loadShareMenu()

    const timing = await import("./timing/timer.js")
	// const timer = new Timer()
    console.error("DATA LOADED!", {timing} )

}

/**
 * DOM is ready...
 */
const start =  async () => {

    // for (const p of searchParams) {
    //     console.info("searchParams",p, searchParams)
    // }

    // record each user note!
    recorder = new MelodyRecorder()

    // load in our note sequences
    song = loadSong( getRandomSong() )

    // show password protection
    if (DEFAULT_PASSWORD)
    {
        handlePasswordProtection( searchParams, DEFAULT_PASSWORD, updateURL )
    }
    
    // change the copyright year to this year
    setCurrentYear()

    // add accessibility functionality menu to header
    addAccessibilityFunctionality()

    // reinstate the state recalled from the previous session
    // and use as the basis for initialising the synths
    fetchStateFromRadioButtons() 
    
    // top interactive smiling graphic
    hero = new Hero(ALL_KEYBOARD_NOTES, noteOn, noteOff)
     
    // sequencer style note visualiser (2 varieties)
    const wallpaperCanvas = document.getElementById("wallpaper")
    noteVisualiser = new NoteVisualiser( ALL_KEYBOARD_NOTES, wallpaperCanvas, false, 0 ) // ALL_KEYBOARD_NOTES
    // noteVisualiser = new NoteVisualiser( KEYBOARD_NOTES, wallpaperCanvas, false, 0 ) // ALL_KEYBOARD_NOTES

    // bottom interactive piano
    keyboard = new SVGKeyboard(KEYBOARD_NOTES, noteOn, noteOff )
    
    // const headerElement = document.getElementById("headline")  
    // headerElement.appendChild(keyboard.asElement)
    // const keyboard2 = new SVGKeyboard(KEYBOARD_NOTES, noteOn, noteOff )

    const keyboardElement = document.body.appendChild( keyboard.asElement )
    keyboardElement.addEventListener("dblclick", e => setScale( !isHappy ) )
   
    // we can turn the mouse cursor into a note indicator
    const mouseCanvas = document.getElementById("mouse-visualiser")
    mouseVisualiser = new MouseVisualiser(mouseCanvas)
 
    // circular fifths synth
    circles = createCircularSynth( mode, octave )

    // wire up the radio buttons
    setupRadioButtons()
    
    if (navigator.requestMIDIAccess)
    {
        showMIDIToggle()
    }
    
    // watch for when an element arrives in the window
    monitorIntersections()
  
    // finally update the URL with the state
    updateURL()

    // try and load in some instrument data sets in the background...
    requestAnimationFrame(backgroundLoad)
}

/**
 * DOM reporting for action!
 */
document.addEventListener("DOMContentLoaded", start, {once:true})
// window.addEventListener("load", start, {once:true})
document.addEventListener("touchstart", createAudioContext, {once:true})
document.addEventListener("mousedown", createAudioContext, {once:true})