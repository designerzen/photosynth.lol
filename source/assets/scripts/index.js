
// accessibility
import { addTextScalingFacilities } from "./accessibility.js"
import { addThemeSelectionOptions, setTheme, THEMES } from "./theme.js"
import { setFont } from "./fonts.js"

// gallery lightbox
import { setGalleryImage, createGallery } from "./gallery.js"

// NB. This polyfill will break AudioWorklets which we use for timing
import { AudioContext as PonyAudioContext, OfflineAudioContext } from 'standardized-audio-context'
import MIDIManager from "./midi.js"
import { createChord, createDiminishedChord, createFifthsChord, createMajorChord, createMinorChord, getModeAsIntegerOffset, getModeFromIntegerOffset, MAJOR_CHORD_INTERVALS, MINOR_CHORD_INTERVALS, TUNING_MODE_NAMES } from "./chords"
import { registerMultiTouchSynth } from "./components/multi-touch-synth"
import CircleSynth from "./components/circle-synth"

import SynthOscillator, { OSCILLATORS } from "./instruments/synth-oscillator"
import { addNoises, getAllWaveTables, getRandomWaveTableName, getWaveTable, loadWaveTableFromArchive, loadWaveTableFromManifest, preloadAllWaveTables } from "./instruments/wave-tables"

import Note from "./note"
import Song from "./song"

// DOM
import Hero from "./components/hero"
import NoteVisualiser from "./components/note-visualiser"
import AudioVisualiser from "./components/audio-visualiser"
import SVGKeyboard from "./components/keyboard-svg"
import { monitorIntersections } from "./intersection-observer"
import { addReadButtons, selectRadioButton, setCurrentYear, updateScaleUI, updateTimbreUI } from "./ui"

// data
import { getSettings, CICRLE_INTERVALS, DEFAULT_PASSWORD, PALETTE, VISUALISER_OPTIONS } from "./settings"
import { ASTLEY, getCompondSong, getRandomSong } from "./songs"
import { getRandomDrumPattern, getRandomKitSequence, kitSequence } from "./timing/patterns.js"
import { GamePadManager } from "./gamepad.js"
import { MouseVisualiser } from "./components/mouse-visualiser"
import { MelodyRecorder } from "./melody-recorder"
import { debounce } from "./utils.js"
import Timer, { convertBPMToPeriod, convertPeriodToBPM, tapTempo } from "./timing/timer.js"
// import TimingAudioWorkletNode, { createTimingProcessor } from "./timing/timing.audioworklet.js"

import AUDIOTIMER_PROCESSOR_URI from 'url:./timing/timing.audioworklet-processor.js'
import { SongCanvas } from "./components/song-canvas.js"
import { countdown } from "./countdown.js"
import { getRandomSpell } from "./sfx.js"

import {CANVAS_BLEND_MODE_DESCRIPTIONS, CANVAS_BLEND_MODES} from "./blendmodes.js"
// Data locations
import WAVE_ARCHIVE_GENERAL_MIDI from "url:/static/wave-tables/general-midi.zip"
import MANIFEST_URL from "url:/static/wave-tables/general-midi/manifest.json"
import { DEFAULT_MOUSE_ID } from "./components/abstract-interactive.js"

const SETTINGS = getSettings()


// audio requires a user gesture to start...
// so we hook into each musical event to check if the user has engaged
let hasUserEngaged = false
let drumsPlaying = false

// read any saved themes from the URL ONLY (not from cookies so no overlay required :)
const searchParams = new URLSearchParams(location.search)

// create a synth for every finger!
// lazily create a new one is requested
const fingerSynths = new Map()

// audio context requires a user gesture to start...
let audioContext = null
let limiter = null
let mixer = null
let timer = null
let stats

const midiManager = new MIDIManager()

// Shared DOM elements
let hero
let noteVisualiser
let shapeVisualiser
let mouseVisualiser
let miniNotation
let circles
let keyboard 
let recorder
let timeKeeper

let midiDeviceInput
let midiDeviceOutput

// a map of all active notes currently playing
const notesPlaying = new Map()

const keyboardKeys = ( new Array(128) ).fill("")
// Full keyboard with all notes including those we do not want the user to play
const ALL_KEYBOARD_NOTES = keyboardKeys.map((keyboardKeys,index)=> new Note( index ))
// Grab a good sounding part (not too bassy, not to trebly)
const KEYBOARD_NOTES = ALL_KEYBOARD_NOTES.slice( 41, 94 )
// KEYBOARD_NOTES.forEach( (n,index) => console.info( n.toString(), index ) )

const SCALES = [
    "Major",
    "Minor"
]

let isHappy = true          // is Major or Minor?
let scale = SCALES[0]       // scale (eg. Major, Minor... etc)
let mode = 0                // scale mode (eg. Dorian, Mixolydian... etc)
let octave = 0              // octave (bass / mid / treble )
let shape = "sine"          // oscillator shape or periodic wave id (eg. sine, square, sawtooth, triangle)
let song = null
let playingNote = null
let playingChord = null

const isIOS =  navigator.platform.startsWith("iP") || navigator.platform.startsWith("Mac") && navigator.maxTouchPoints > 4

const CHORDS = [
    createMajorChord, 
    createMinorChord,
    createFifthsChord,
    createDiminishedChord
]

/**
 * Load all of the PeriodicWave Table Data from the local
 * file system via a zip that is created on build
 * @param {String} zipURL 
 * @returns 
 */
const preloadWaveTablesFromZip = async (zipURL) => {
    const meter = document.getElementById("load-progress")
    const data = await loadWaveTableFromArchive(zipURL, (progress, fileName, file)=>{
        // console.info("zip", {progress, fileName, file })
        meter.value = progress
    })
    // console.info( data.length, "ZIPPED WAVE data",zipURL, {data}, getAllWaveTables() )
    return data
}


// UI ==============================================================

/**
 * Replace the existing URL with a specific one without refreshing the page
 * This query string can then be used to restore the state of the page
 * on reload
 */
const updateURL = debounce(()=>{
    const newURL = `${window.location.pathname}?${searchParams.toString()}`
    window.history.pushState({ path: newURL }, '', newURL)
})

const setURLParameter = debounce((name, value) => {
    searchParams.set(name, value)
})


// AUDIO ==============================================================

/**
 * Lazy load a SynthOscillator instrument for the specified index
 * @param {Number} finger 
 * @returns 
 */
const getSynthForFinger = (finger)=>{
    let fingerSynth = fingerSynths.get(finger)
    if (!fingerSynth){
        // const shape = getRandomWaveTableName()
        fingerSynth = new SynthOscillator(audioContext, {shape})
        // fingerSynth.loadWaveTable(shape)
        // fingerSynth.shape = "Piano"
        // console.info("shape loading",shape, "into", fingerSynth)
        fingerSynth.id = finger + "-synth"
        fingerSynth.output.connect(limiter)
        fingerSynths.set( finger, fingerSynth )
    }
    // console.error("getSynthForFinger", finger, fingerSynth)
    return fingerSynth
}

/**
 * Create a time keeper and call this method
 * callback on every tick
 * @param {Function} callback 
 * @returns {Timer}
 */
const createMetronome = (callback) => {
    let beats = 0
    const timingContext = new AudioContext()
    timer = new Timer({contexts:{audioContext:timingContext}, bpm:32 })
    // console.info("timer", timer)
    // await timer.loaded
    // console.info("timer loaded", timer)
    timer.swing = 0 //.5
    timer.startTimer(e =>{
        const oddBeat = beats++ % 2 !== 0
        callback && callback(oddBeat, e, timer)
    })

    // const timing = await import("./timing/timer.js")
    // const timer = new Timer()
    // console.error("DATA LOADED!", {timing} )

    return timer

    // timer.setCallback(event => {
    //     // console.log("timer event", event)
    // })
        
    // const timingContext = new AudioContext()
    // // const timing = createTimingProcessor( timingContext )

    // await timingContext.audioWorklet.addModule(AUDIOTIMER_PROCESSOR_URI)
    // const TimingAudioWorklet = await import("./timing/timing.audioworklet.js")
    // const timing = new TimingAudioWorklet.default(timingContext)
    // timing.onmessage = event => {
    //     console.log("time message:", event)
    // }
    // timing.    timer.startTimer()

    // const timing = createTimingProcessor(audioContext)
    // const timing = new TimingAudioWorkletNode(audioContext)
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
                // console.info("bgCol", bgCol)
        }else{
            
        }
    })

    // AUDIO ------------------------------------------------
    const volumeSlider = document.getElementById("volume")
    volumeSlider.addEventListener("input", e => {
        const input = e.target.value
        // console.info("volumeSlider", input)
        setVolume(input / 100 )
    })

    const muteCheckbox = document.getElementById("toggle-mute")
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
const noteOn = ( noteModel, velocity=1, id=DEFAULT_MOUSE_ID, isMidi=false ) => {

    // console.info(id, "NOTE ON for FINGER", {noteModel, velocity} )

    // as user click is required to start the audio contextin
    if (!hasUserEngaged)
    {
        createAudioContext()
    }

    if (!noteModel)
    {
        console.warn("No noteModel provided to noteOn", noteModel)
        return
    }
    
    if (notesPlaying.has( noteModel ))
    {
        // console.warn("NoteOn Already playing", noteModel)
        return
    }

    // if we had a pointer event fired from a mouse we need to ensure that
    // it increments ovtherwise the oscillators get overwritten before thhey are clear to be stopped
    const synth = getSynthForFinger(id)

    if (!synth){
        console.warn("No Synths available for "+id)
        return
    }

    const isAlreadyPlaying = synth.noteOn( noteModel, velocity )           
    notesPlaying.set( noteModel )                                                                                                 
    keyboard && keyboard.setKeyAsActive( noteModel )    // highlight the keys on the keyboard!    
    hero && hero.noteOn( noteModel )
    noteVisualiser && noteVisualiser.noteOn( noteModel, velocity )
    mouseVisualiser && mouseVisualiser.noteOn( noteModel, velocity )
    recorder && recorder.noteOn( noteModel, velocity )
    miniNotation && miniNotation.noteOn( noteModel, velocity, audioContext.currentTime )
    // this should change the visualiser line colour
    if (shapeVisualiser)
    {
        shapeVisualiser.colour = noteModel.colour
    } 
   
    // NB. To prevent endless looping...
    if (!isMidi && midiManager.enabled && midiDeviceOutput){
        midiDeviceOutput.playNote( noteModel.noteName, {attack:velocity }) 
    }
    return isAlreadyPlaying
}
   
/**
 * Stop playing a specific NOTE
 * @param {Object} noteModel 
 * @param {Number} velocity 
 * @param {Number} id 
 */
const noteOff = (noteModel, velocity=1, id=0, isMidi=false ) => {
   
    // console.info( id, "NOTE OFF",{ noteModel, velocity } )

    // as user click is required to start the audio context
    if (!hasUserEngaged)
    {
        createAudioContext()
    }

    if (!noteModel)
    {
        // console.warn("No noteModel provided to noteOff", noteModel)
        return
    }

   
    const synth = getSynthForFinger(id)
    
    if (!synth){
        console.warn("No Synths available for "+id)
        return
    }
    notesPlaying.delete( noteModel )

    const isPlaying = synth.noteOff( noteModel, velocity )
    keyboard && keyboard.setKeyAsInactive( noteModel )   // unhighlight the keys on the keyboard
    hero && hero.noteOff( noteModel )
    noteVisualiser && noteVisualiser.noteOff( noteModel, velocity )
    mouseVisualiser && mouseVisualiser.noteOff( noteModel, velocity )
    recorder && recorder.noteOff( noteModel, velocity )
    miniNotation && miniNotation.noteOff( noteModel, velocity, audioContext.currentTime ) 
  
    if (shapeVisualiser)
    {
        shapeVisualiser.colour = false
    } 

    if (!isMidi && midiManager.enabled && midiDeviceOutput){
        midiDeviceOutput.stopNote( noteModel.noteName )
        // console.info("MIDI NOTE OFF", noteModel )
    }
    return isPlaying
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
    // console.info("Creating chord ON", intervals ?? MAJOR_CHORD_INTERVALS, noteModel, mode, "cutoff", "acculumate" )
    const chord = createChord(ALL_KEYBOARD_NOTES, intervals ?? MAJOR_CHORD_INTERVALS, noteModel.noteNumber, mode, true, true )
    const velocityReduction = velocity / chord.length * 0.8
    const length = chord.length+idOffset
    //console.info(idOffset, "chordOn", chord, velocityReduction  )
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
    // console.info("Creating chord OFF", noteModel, mode, "cutoff", "acculumate" )
    
    if (!noteModel ){
        // console.warn("No noteModel provided to chordOff", noteModel)
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
    const isChord = chordIntervals && chordIntervals.length > 1
    // stop any currently playing notes
    if (playingNote)
    {
        // console.info("Killing note", note, {songSequence, playingNote} )
        isChord ? chordOff( playingNote, 1, playingChord ?? chordIntervals, scaleMode ) : noteOff( playingNote, 1 )
    }else{
        // console.info("Starting note", note, {songSequence, playingNote} )
    }

    isChord ? chordOn( note, 1, 0, chordIntervals, scaleMode ) : noteOn( note, 1 )
    playingNote = note
    playingChord = chordIntervals
    return note
}

/**
 * 
 * @param {HTMLElement} button 
 * @param {Array<Number>} chord 
 * @param {Number} musicalMode 
 */
const addMusicalMouseEventsToElement = (button, chord=null, musicalMode=null, onActive=null ) => {
    let notePlaying = null
    button.addEventListener("mousedown", e => {
        const scaleMode = musicalMode ?? mode
        onActive && onActive()
        notePlaying = playNextNoteInSong(song, chord, scaleMode)
        document.addEventListener("mouseup", e => {
            if (notePlaying)
            {
                chordOff( notePlaying, 1, 0, chord, scaleMode )
                playingNote = null
            }
            
        }, {once:true})
    })
}

/**
 * Waveform visualiser
 * @param {AudioContext} audioContext 
 * @param {AudioNode} source 
 */
const createAudioVisualiser = (visualiserCanvas, audioContext, source, song, visualiserOptions=VISUALISER_OPTIONS ) => {

    const visualiserContext = visualiserCanvas.getContext('2d')

    shapeVisualiser = new AudioVisualiser( visualiserContext, audioContext, source, visualiserOptions )
   
    const updateVis = () => {
        shapeVisualiser.drawWaveform()
        requestAnimationFrame(updateVis)
    }
    updateVis()

    const pickSongButtons = document.querySelectorAll("[data-control-next-song]")
    pickSongButtons.forEach( pickSongButton => {
        // random song!
        getRandomSong()
    })

    // allow the user to click the visualiser to play a song...
    const playButtons = document.querySelectorAll('[data-control-play]')
    playButtons.forEach( playButton => {
       addMusicalMouseEventsToElement(playButton) // visualiserCanvas
    })
        
    // const randomWaveButton = document.querySelector('#timbre-random')
    const randomWaveButtons = document.querySelectorAll('input[value="random"]')
  
    randomWaveButtons.forEach( randomWaveButton => {
            
        const radioButtons = randomWaveButton.closest("fieldset").querySelectorAll('input[type="radio"]')
        const initialRandomTableName = getRandomWaveTableName()
        randomWaveButton.value = initialRandomTableName
        // randomWaveButton.textContent = initialRandomTableName 

        randomWaveButton.addEventListener("click", e => {
            //console.info("randomWaveButton", randomWave)
            shape = setTimbre( randomWaveButton.value )
            randomWaveButton.value = getRandomWaveTableName() 
           
            // clear all the nearby radio buttons
            radioButtons.forEach( radioButton => radioButton.checked = false )
        })
    })

    const buttonSelectRandomTimbre = document.getElementById("song-timbre-random")
    buttonSelectRandomTimbre.addEventListener("click", e => {
        shape = setTimbre( getRandomWaveTableName() )
        // clear all the nearby radio buttons
        // buttonSelectRandomTimbre.innerText = shape
    })
   
    // drum sequencer

    // percussion
    const detailsPercussion = document.querySelector("#percussion")
    detailsPercussion.addEventListener("toggle", event => {
        if (detailsPercussion.open)
        {
            
        }else{

        }
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
    if (!OSCILLATORS.includes(timbre))
    {
        // const timbreSanitised = " " + timbre.replaceAll("_","") 
        // const lowerCaseTimbre = timbre.toLowerCase()
        getWaveTable(timbre).then( waveTable =>{
            fingerSynths.forEach( synth => synth.shape = waveTable )
        })
    }else{
        fingerSynths.forEach( synth => synth.shape = timbre )
    }

    updateTimbreUI( timbre )
    circles && (circles.timbre = timbre)
    return timbre
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
    // if ( index < 0)
    // {
    //     console.error( index, "NO TIMBRE", timbres, timbre, offset)
    // }else{
    //     console.log( index, "getTimbre", timbres, timbre, offset)
    // }
   
    return timbres[ (index + offset) % timbres.length ]
}

/**
 * Set the Master Volume
 * @param {Number} value 0->1
 */
const setVolume = (value) => {
    mixer.gain.value = value
    volume = value
    setURLParameter("volume", value)
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

/**
 * Fetch the state from the radio buttons   
 */
const fetchStateFromRadioButtons = () => {

    const CHECKED_RADIO_BUTTON = 'input[type="radio"]:checked'
    const queries = [
        '.emotion-selector '+CHECKED_RADIO_BUTTON,
        '#emotion '+CHECKED_RADIO_BUTTON
    ]

    const checkedInputRadioButtons = []
    
    queries.forEach(query => {
        const radioButtons = document.querySelectorAll(query)
        radioButtons.forEach(radioButton => checkedInputRadioButtons.push(radioButton))
    })

    // console.info("checked", { checkedInputRadioButtons} )
    
    // now set each state by calling the relevant selection function   
    checkedInputRadioButtons.forEach(radioButton => {
        console.info("checked radio button", radioButton)
        switch (radioButton.name)
        {
            case "emotion":
                console.warn("fetchStateFromRadioButtons:emotion", radioButton.value)
                setMode( radioButton.value )
                break
            case "octave":
                console.warn("fetchStateFromRadioButtons:octave", radioButton.value)
                octave = parseInt( radioButton.value )
                // circle && (circle.octave = octave)
                break
            case "timbre":
                console.warn("fetchStateFromRadioButtons:timbre", radioButton.value)
                shape = radioButton.value
                break
            case "chord":
                console.warn("fetchStateFromRadioButtons:chord", radioButton.value)
                setScale( radioButton.value )
                break
            default:
                console.warn("No case for", radioButton.value)
        }
    })

    // ensure MIDI is always set to checked OFF
    const midiToggle = document.getElementById("toggle-midi")
    midiToggle.checked = false
}

// USER INTERFACE ==============================================================

/**
 * Load the share menu and make the button visible
 */
const loadShareMenu = () => {
    const shareMenu = document.getElementById("share-menu")
    if (shareMenu){
       import('share-menu').then( lib => {
            shareMenu.hidden = false
            // console.info("Menu for sharing is available", shareMenu, lib )
        })
    }
}

/**
 * Show the MIDI toggle button (ensure that MIDI is enabled first!)
 */
const showMIDIToggle = () => {
    
    const MIDIStatus = document.getElementById("midi-status")
    const sectionMIDIToggle = document.getElementById("midi-equipment")
    const buttonMIDIToggle = document.getElementById("toggle-midi")
   
    let isMIDIAvailable = true
    buttonMIDIToggle.addEventListener("click", async(e) => {
        
        if (!isMIDIAvailable)
        {
            return false
        } 
            
        await midiManager.toggle()

        if (!midiManager.available)
        {
            buttonMIDIToggle.hidden = true
            isMIDIAvailable = false
            console.error("No midi support")
            return
        }

        // TODO: play a connection theme to show MIDI is controlled
        // INSPECTOR_GADGET

        // let midiDriver = await toggleMIDI()
        if (midiManager.enabled)
        {
            MIDIStatus.textContent = "MIDI Enabled. "
        }else{
            MIDIStatus.textContent = "MIDI Available! "
        }
        // await midiManager.load()
     
    
        // just use the first instument?
        if (midiManager.hasInputDevices)
        {
            // previous clock time
            let lastClockTimestamp = -1

            // How many ticks have occured yet
            let intervals = 0
            let midiNoteIndex = 0
            let midiNoteIndeces = new Map()
            
            midiManager.monitorAllInputs(event => {

                switch(event.message.type){
                    case "clock":
                        if (timer)
                        {
                            const trigger = timer.bypass(true)

                            // How long has elapsed according to our clock
                            const timestamp = event.timestamp
                            const elapsedSinceLastClock = timestamp - lastClockTimestamp
                            lastClockTimestamp = timestamp
                            
                            // work out the BPOM from the clock...
                        
                            // const BPM = convertPeriodToBPM( period * 24 )
                            // console.log("MIDI CLOCK", BPM, period, elapsedSinceLastClock, timestamp )
                        
                            // calculated
                            const period = tapTempo(true, 10000, 3)
                            const timeBetweenPeriod = elapsedSinceLastClock
                            // Expected time stamp
                            const expected = intervals++ * timeBetweenPeriod
                            // how much spill over the expected timestamp is there
                            const lag = timestamp % timeBetweenPeriod
                            // should be 0 if the timer is working...
                            const drift = timestamp - expected
                            // deterministic intervals not neccessary
                            const level = Math.floor(timestamp / timeBetweenPeriod )

                            trigger( 
                                timestamp, 
                                expected, 
                                drift, 
                                level, 
                                intervals, 
                                lag 
                            ) 

                        }else{



                        }
                     
                    break       

                    case "noteon":
                        midiNoteIndex = (midiNoteIndex + 1 ) % 10
                        midiNoteIndeces.set( event.note.number, midiNoteIndex )
                        // console.log("MIDI noteon", event )
                        noteOn( new Note(event.note.number), event.value, midiNoteIndex, true )
                        break       

                    case "noteoff":                     
                        // console.log("MIDI noteoff", event )  
                        midiNoteIndex = midiNoteIndeces.get( event.note.number )
                        noteOff( new Note(event.note.number), event.value, midiNoteIndex, true )
                        break     

                    default:
                        console.info("MIDI Message " + event.message.type, event )

                }

                switch(event.type){

              
                    default:
                        //console.log("MIDI Message", event)
                }

            })
            
            const midiDevice = midiManager.inputs[0]
            MIDIStatus.textContent += "Connected to input device " + midiDevice.name +" - play some notes to hear them. "
            // console.info("MIDI Input found " + midiDevice.name, midiDevice )
            midiDeviceInput = midiDevice
            // midiDriver.inputs.forEach((device, index) => {
            //     // `${index}: ${device.name}`
            //     device.addListener("noteon", e => {
            //         // create a note object that matches
            //         new Note(0)
            //         console.log("MIDI Message", index, e,  e.note.identifier)
            //     })
            //     console.log("MIDI Device", device, {midiDeviceInput} )
            // })

        }else{

            MIDIStatus.textContent = "No MIDI devices detected. Connect one and try again."
            isMIDIAvailable = false
            buttonMIDIToggle.hidden = true
        }
        
        if (midiManager.hasOutputDevices)
        {
            const midiDevice = midiManager.outputs[0]
            MIDIStatus.textContent += "Connected to output device " + midiDevice.name
            midiDeviceOutput = midiDevice
            // console.info("MIDI Output found " + midiDevice.name, midiDevice )
        }
        
       buttonMIDIToggle.checked = isMIDIAvailable
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
    const circleIntervals = createFifthsChord(ALL_KEYBOARD_NOTES, 41, musicalMode).reverse()
    const fifthIndexes = circleIntervals.map((note, index)=> note.sequenceIndex )
    const fifthData = ALL_KEYBOARD_NOTES.map( (key,i)=>{
        const oneOctave = Math.floor(i/12) 
        return ALL_KEYBOARD_NOTES[(oneOctave*12)+fifthIndexes[i%fifthIndexes.length]]
    })
    
    // console.error("Creating Circular Synth", { circleIntervals, fifthIndexes, fifthData } )
    

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
                    shape = setTimbre( input )
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
            // console.info("RadioButton", {name, input} )
            // emotionPanel.querySelector("output").textContent = input
        })
    })
}

/**
 * Timbre selector and shape creator
 * @param {Array<String>} instrumentNames 
 */
const setupTimbreSelector = (instrumentNames) => {

    const timbreSongButtons = document.querySelectorAll("[data-play-timbre]")
    timbreSongButtons.forEach(button => {
        const timbre = button.dataset.playTimbre
        // we can specify the chord and mode or infer them... MAJOR_CHORD_INTERVALS
        addMusicalMouseEventsToElement(button, null, null, ()=>{
            setTimbre(timbre)
        })
    })

    const timbreSelect = document.getElementById("song-timbre-select")
    const timbrePrevious = document.getElementById("song-timbre-previous")
    const timbreNext = document.getElementById("song-timbre-next")
    
    const chordHappy = document.getElementById("button-happy")
    const chordSad = document.getElementById("button-sad")
    
    instrumentNames.forEach( name => {
        timbreSelect.add(new Option(name, name))
    })
    timbreSelect.addEventListener("change", e => {
        shape = setTimbre( e.target.value ) 
    })
    timbrePrevious.addEventListener("click", e => {
        shape = setTimbre( getTimbre(instrumentNames, shape, -1 ) )
    })
    timbreNext.addEventListener("click", e => {
        shape = setTimbre( getTimbre(instrumentNames, shape, 1 ) )
    })

    addMusicalMouseEventsToElement(chordHappy, MAJOR_CHORD_INTERVALS)
    addMusicalMouseEventsToElement(chordSad, MINOR_CHORD_INTERVALS)
}

/**
 * Read entire article!
 */
const readOutLoud = () => {
    let e = "Hello there, welcome to the Summer Science Exhibition 2025"
    const speakSources = document.querySelectorAll("[data-speak]")
    speakSources.forEach( speakSource => {
        e += speakSource.textContent
    })
    say(e)
}

// Connect to any gamepads that might be available
const addGamePads = (drumSamples) => {
    
    const kickDrum = drumSamples[ 0 ]
    const snareDrum = drumSamples[ 1 ]
    const hihat = drumSamples[ 2 ]
    const shaker = drumSamples[ 3 ]

	const gamepadHeld = new Map()
	const gamePadManager = new GamePadManager()

	gamePadManager.addEventListener( (button, value, gamePad, heldFor ) => {
		
		switch(button)
		{
			// ignore caching these
			case GAME_PAD_CONNECTED:
			case GAME_PAD_DISCONNECTED:
			case COMMANDS.LEFT_STICK_Y: 
			case COMMANDS.LEFT_STICK_X: 
			case COMMANDS.RIGHT_STICK_Y: 
			case COMMANDS.RIGHT_STICK_X:
			// case COMMANDS.UP: 
			// case COMMANDS.DOWN: 
			// case COMMANDS.LEFT: 
			// case COMMANDS.RIGHT: 
				break
		
			default: 
				if (value)
				{
					
				}
		}
		
		switch(button)
		{
			case GAME_PAD_CONNECTED:
				console.info("Gamepad connected", button, value, gamePad )
				break

			case GAME_PAD_DISCONNECTED:
				console.info("Gamepad disconnected", button, value, gamePad )
				break

			// open sidebar
			case COMMANDS.START: 
			// if select is also being held....
				if (gamePad.select){

				}
				console.info("Gamepad start", value, { gamePad, gamepadHeld } )
				break
			
			case COMMANDS.SELECT: 
				// check to see if another key is held down...
				if (gamePad.start){
					
				}
				
				console.info("Gamepad select", value, { gamePad, gamepadHeld, heldFor } )
				break
			
			case COMMANDS.A: 
				console.info("Gamepad A", value, { gamePad, gamepadHeld, heldFor } )
                kickDrum.click()
				break
			
			case COMMANDS.B: 
				console.info("Gamepad B", value, { gamePad, gamepadHeld, heldFor } )
				snareDrum.click()
                break
			
			case COMMANDS.X: 
				console.info("Gamepad X", value, { gamePad, gamepadHeld, heldFor } )
                hihat.click()
				break
			
			case COMMANDS.Y: 
				console.info("Gamepad Y", value, { gamePad, gamepadHeld, heldFor } )
				shaker.click()
                break
			
			// If we are in a certain mode...
			// adapt 
			case COMMANDS.LB: 
				console.info("Gamepad LB", value, { gamePad, gamepadHeld, heldFor } )
				
                break
			
			case COMMANDS.LB: 
				console.info("Gamepad LB", value, { gamePad, gamepadHeld, heldFor } )
				break

			case COMMANDS.RB: 
				console.info("Gamepad RB", value, { gamePad, gamepadHeld, heldFor } )
				break

			case COMMANDS.LT: 
				console.info("Gamepad LT", value, { gamePad, gamepadHeld, heldFor } )
				break

			case COMMANDS.RT: 
				console.info("Gamepad RT", value, { gamePad, gamepadHeld, heldFor } )
				break

			default:
				console.info("Gamepad", { gamePadManager, button, value, gamePad, heldFor } )
		}
	})
}


// LOGIC ==============================================================

/**
 * Requires a user-gesture before initiation...
 */
const createAudioContext = async(event) => {

    // only ever perform this once!
    if (hasUserEngaged || audioContext)
    {
        return audioContext
    }
    
    hasUserEngaged = true
    
    // polyfilled see : https://github.com/chrisguttandin/standardized-audio-context
    audioContext = new PonyAudioContext()

    limiter = audioContext.createDynamicsCompressor();
    limiter.threshold.value = 0
    limiter.ratio.value = 2 // 20
    
    mixer = audioContext.createGain()
    mixer.gain.value = parseInt(searchParams.get("volume") ?? 1)

    limiter.connect(mixer)
    mixer.connect( audioContext.destination )
    
    const visualiserCanvas = document.getElementById("visualiser")
    if (SETTINGS.showAudioVisualiser && visualiserCanvas)
    {
        createAudioVisualiser( visualiserCanvas, audioContext, mixer, song, {...VISUALISER_OPTIONS, backgroundColour:false } )
    }
   
    registerMultiTouchSynth( ALL_KEYBOARD_NOTES, chordOn, chordOff, (noteModel,previousNoteModel, p) => {
        // show the mouse visualiser primed to play note
        if (mouseVisualiser)
        {
            if (previousNoteModel)
            {
                const previousChord = createChord(ALL_KEYBOARD_NOTES, MAJOR_CHORD_INTERVALS, previousNoteModel.noteNumber, mode, true, true )
                previousChord.forEach( note => mouseVisualiser.noteOff( note, 1 ) )
                mouseVisualiser.noteOff( previousNoteModel, 1 )
            }
            
            // mouseVisualiser.chordOn( noteModel, 1, 0 )
            const chord = createChord(ALL_KEYBOARD_NOTES, MAJOR_CHORD_INTERVALS, noteModel.noteNumber, mode, true, true )
            chord.forEach( note => mouseVisualiser.noteOn( note, 1 ) )   

            // console.info("NOTE OPTIONS", {noteModel, chord, previousNoteModel, mouseVisualiser})
        }
    })

    if (SETTINGS.saveNotesInMiniNotation)
    {
        miniNotation = new SongCanvas(document.getElementById("song-in-pixels"), recorder)
    }
  
    const mixerRouting = new Map()
    const audioSources = document.querySelectorAll("audio")
    audioSources.forEach( audioElement => {
        const audioSource = audioContext.createMediaElementSource(audioElement)
        const gainNode = audioContext.createGain()
        gainNode.gain.value = 1
        audioSource.connect(gainNode)
        gainNode.connect(limiter)
        mixerRouting.set(audioSource, gainNode)
    })

    const audioSpellSources = document.querySelectorAll("[data-audio-spell]")
    const audioSpell = document.getElementById("audio-spell")
    audioSpellSources.forEach( audioElement => {
        audioElement.addEventListener("click", e => audioSpell.click())
    })
       
    const drumSequencer = document.querySelector("#drum-sequencer > li > ol")
    const drumSamples = document.querySelectorAll("#drums button audio")
    const kickDrum = drumSamples[ 0 ]
    const snareDrum = drumSamples[ 1 ]
    const hihat = drumSamples[ 2 ]
    const shaker = drumSamples[ 3 ]

    // add control devices
    if (SETTINGS.useGamepads)
    {
         addGamePads( drumSamples )
    }

    // let patterns = kitSequence()
    let patterns = getRandomKitSequence()
    const setRandomDrumPattern = () => {
		patterns = getRandomKitSequence()
	} 

    // display the pattern using the checkboxes
    const drumSequnceBaseElements = [
        "kick",
        "snare",
        "hat",
        // "shaker"
        "clap"
    ]
    
    drumSequnceBaseElements.forEach( drumType => {
        const sourceCheckbox = document.getElementById("drum-sequence-"+drumType)
        const fragment = document.createDocumentFragment()
        const active = patterns[drumType]
        
        for (let i=0; i<16; i++){
            const velocity = active.getVelocityAtStep(i)
            // console.warn("Step", i, velocity)
            const checkbox = document.createElement("input")
            checkbox.type = "checkbox"
            checkbox.name = "kick-sequence-"+i
            checkbox.value = i
            checkbox.checked = velocity === 0 ? false : true
            checkbox.addEventListener("change", e => {
                const pattern = parseInt(e.target.value)
                active.setVelocityAtStep( pattern, e.target.checked ? 255 : 0 )
                // console.info(velocity, "drum-sequence", {pattern, drumType, velocity, active}) 
                // setRandomDrumPattern()
            })
            const label = document.createElement("label")
            label.textContent = drumType
            const li = document.createElement("li")
            label.appendChild(checkbox)
            li.appendChild(label)
            fragment.appendChild(li)
        }
         
        // swap them out
        sourceCheckbox.closest("ol").replaceChild(fragment, sourceCheckbox.parentNode.parentNode )
    })


    let count = 0
    const playMetronomeBeat = (oddBeat, timerEvent, timer ) => {
        if ( !drumsPlaying || !timer.isStartBar )
        {
            return
        }
        // const index = oddBeat ? Math.floor(Math.random() * drumSamples.length) : 0
        // const newBeat = drumSamples[ index ]

        drumSequencer.style.setProperty('--i', 9)
    
        const kickVelocity = patterns.kick.next() / 255
        const snareVelocity = patterns.snare.next() / 255
        const hatVelocity = patterns.hat.next() / 255

        // console.info("Velocities", timerEvent, {kickVelocity, snareVelocity, hatVelocity})

        const kickVolume = mixerRouting.get(kickDrum)
        kickVolume.gain.value = kickVelocity
            
        if (kickVelocity > 0)
        {
            kickDrum.pause()
            kickDrum.play(0)
        }

        const snareVolume = mixerRouting.get(kickDrum)
        snareVolume.gain.value = snareVelocity 
        
        if (snareVelocity > 0)
        {
            snareDrum.pause()
            snareDrum.play(0)
        }

        const hatVolume = mixerRouting.get(kickDrum)
        hatVolume.gain.value = hatVelocity 
        
        if (hatVelocity > 0)
        {
            hihat.pause()
            hihat.play(0)
        }

        // console.info("playMetronomeBeat", !oddBeat ? "even" : "odd",  {patterns} )
        count++
        if (count > 10)
        {
            count = 0
            setRandomDrumPattern()
        }

         return
        switch(oddBeat)
        {
            // Even Beats
            case false:
                // if (timer.isStartBar )
                // {
                //     kickDrum.pause()
                //     kickDrum.play(0)
                // }

                // if (timer.isStartBar && timer.isSwungBeat)
                // {
                //     snareDrum.pause()
                //     snareDrum.play(0)
                // }
                break

            // Odd Beats
            case true:
                if (timer.isStartBar )
                {
                    kickDrum.pause()
                    kickDrum.play(0)
                }

                if (timer.isStartBar && timer.isSwungBeat)
                {
                    snareDrum.pause()
                    snareDrum.play(0)
                }
                break
        }

        // hihat.pause()
        // hihat.play(0)
    }

    if (SETTINGS.useTimer)
    {
       timeKeeper = createMetronome(playMetronomeBeat)
    }

    const toggleDrums = document.getElementById("toggle-drums")
    toggleDrums.addEventListener("change", e => {
        drumsPlaying = toggleDrums.checked
    })
}

const monitorViewportEntries = () => {

    // watch for when an element arrives in the window
    let observations = new Map()
    const monitoredElements = monitorIntersections({}, (entry, inViewport )=>{
        observations.set(entry.target, inViewport)
        // console.info(entry,inViewport ? "in viewport" : "exit", {observations} )
    })
    monitoredElements.forEach((element, index) => {
       if (!observations.has(element))
       {
            observations.set(element, false)
       }
    })
    
}


/**
 * Preload all of the wave tables and things that can be
 * loaded in the background without choking anything
 */
const backgroundLoad = async () => {

    if (SETTINGS.showCountdown)
    {
        countdown(document.querySelector("[data-countdown]"))
    }
    
    // add white pink brown noise to the timbres
    // await preloadAllWaveTables()
    addNoises()

    // Load periodic wavetable data
    try{
        if (SETTINGS.loadFromZips)
        {
            await preloadWaveTablesFromZip(WAVE_ARCHIVE_GENERAL_MIDI)
            // await preloadWaveTablesFromZip(WAVE_ARCHIVE_GOOGLE)
        }else{
            const request = await fetch(MANIFEST_URL)
            const manifest = await request.json()
            loadWaveTableFromManifest(manifest)
        }

    }catch(error){
        throw Error("Couldn't load custom periodic wave data")
    }

    // update the UI with these new data sets...
    // NB. This is the full list that may not be loaded yet?
    // all possible data files for instrument sounds
    const instrumentNames = getAllWaveTables()
    
    // load saved instrument if not the default
    setTimbre(shape)

    // waveform visualiser
    setupTimbreSelector(instrumentNames)

    // now add the share button and share overlay
    await loadShareMenu()

    if (SETTINGS.showStats)
    {
        try{
            const Stats = (await import('stats.js'))
            // const Stats = (await import('stats-gl')).default
            
            const statsOptions = {
                trackGPU: false,
                trackHz: true,
                trackCPT: false,
                logsPerSecond: 2,
                graphsPerSecond: 3,	// (30)
                samplesLog: 4, 
                samplesGraph: 10, 
                precision: 2, 
                horizontal: true,
                minimal: true, 
                mode: 0
            }

            stats = new Stats(statsOptions)
           
        }catch(error){
            console.error(error)
        }

        document.body.appendChild( stats.dom )

        const updateStats = () => {
            stats.begin()
            stats.end()
            // stats.update()
            requestAnimationFrame(updateStats)
        }
        
        updateStats()
    }
   
    if (SETTINGS.debug){
        console.log("PhotoSYNTH.LOL ALL loaded : ", {stats, instrumentNames})
    }
}

/**
 * DOM is ready...
 */
const start =  async () => {

    // record each user note!
    if (SETTINGS.recordNotes)
    {
          recorder = new MelodyRecorder()
    }
  
    // load in our note sequences
    song = loadSong( getCompondSong() )

    // show password protection
    // if (DEFAULT_PASSWORD)
    // {
    //     handlePasswordProtection( searchParams, DEFAULT_PASSWORD, updateURL )
    // }

    document.body.classList.toggle("platform-ios", isIOS)
    
    // change the copyright year to this year
    setCurrentYear()

    // add accessibility functionality menu to header
    addAccessibilityFunctionality()

    // reinstate the state recalled from the previous session
    // and use as the basis for initialising the synths
    fetchStateFromRadioButtons() 
    
    // top interactive smiling graphic
    hero = new Hero(ALL_KEYBOARD_NOTES, noteOn, noteOff, SETTINGS.showNotes ? SETTINGS.notes : 0)
    
    // add gallery interactions to dialog
    createGallery()
    
    if (SETTINGS.showNoteVisualiser){
        // sequencer style note visualiser (2 varieties)
        const wallpaperCanvas = document.getElementById("wallpaper")
        noteVisualiser = new NoteVisualiser( ALL_KEYBOARD_NOTES, wallpaperCanvas, false, 0 ) // ALL_KEYBOARD_NOTES
        // noteVisualiser = new NoteVisualiser( KEYBOARD_NOTES, wallpaperCanvas, false, 0 ) // ALL_KEYBOARD_NOTES
        wallpaperCanvas.addEventListener( "dblclick", e => scale === SCALES[ (SCALES.indexOf(scale) + 1) % SCALES.length] )
        
        let b = 23
        const setNoteVisualiserBlendMode = value =>{
            noteVisualiser.blendMode = CANVAS_BLEND_MODES[b%CANVAS_BLEND_MODES.length]  
            // console.info(b, "BLENDMODE",  noteVisualiser.blendMode, CANVAS_BLEND_MODE_DESCRIPTIONS[b] )
        }
        // setNoteVisualiserBlendMode(b++)
        // setInterval( setNoteVisualiserBlendMode, 30000 )
    }

    // bottom interactive piano
    if (SETTINGS.showKeyboard){
        keyboard = new SVGKeyboard( SETTINGS.showAllKeys ? ALL_KEYBOARD_NOTES : KEYBOARD_NOTES, noteOn, noteOff )
        const keyboardElement = document.body.appendChild( keyboard.asElement )
        keyboardElement.addEventListener("dblclick", e => setTimbre( getRandomWaveTableName() ) )
    }

    // we can turn the mouse cursor into a note indicator   
    if (SETTINGS.showMouseNotes && !isIOS){
        const mouseCanvas = document.getElementById("mouse-visualiser")
        mouseVisualiser = new MouseVisualiser(mouseCanvas)
    }

    // circular fifths synth
    circles = createCircularSynth( mode, octave )

    // wire up the radio buttons
    setupRadioButtons()

    // setGalleryImage()
    
    if (navigator.requestMIDIAccess)
    {
        showMIDIToggle()
    }

    if (SETTINGS.monitorIntersections)
    {
    	monitorViewportEntries()
    }else{
        document.body.classList.add("no-intersections")
    }
    
    if (SETTINGS.showVoiceOver)
    {
        addReadButtons()
    }
   
    const audioSamplesInButtons = document.querySelectorAll('button > audio')
    audioSamplesInButtons.forEach(audioSample => {
        const button = audioSample.parentNode
        button.addEventListener("click", e => {
            audioSample.play()
        })
    })
    // console.error('audioSamplesInButtons', audioSamplesInButtons)
    
    // finally update the URL with the state
    updateURL()

    // try and load in some instrument data sets in the background...
    requestAnimationFrame(backgroundLoad)

    if (SETTINGS.debug){
        console.log("PhotoSYNTH.LOL PART loaded : ")
        hero && console.log("hero", {hero} )
        keyboard && console.log("keyboard", {keyboard} )
        mouseVisualiser && console.log("mouseVisualiser", {mouseVisualiser} )
        noteVisualiser && console.log("noteVisualiser", {noteVisualiser} )
        recorder && console.log("recorder", {recorder} )
        song && console.log("song", {song} )
    }
}

/**
 * DOM reporting for action!
 */
document.addEventListener("DOMContentLoaded", start, {once:true})
// window.addEventListener("load", start, {once:true})
document.addEventListener("touchstart", createAudioContext, {once:true})
document.addEventListener("mousedown", createAudioContext, {once:true})