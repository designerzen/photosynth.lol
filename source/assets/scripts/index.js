
// accessibility
import { addTextScalingFacilities } from "./accessibility"
import { addThemeSelectionOptions, setTheme, THEMES } from "./theme"
import { setFont } from "./fonts"

// NB. This polyfill will break AudioWorklets which we use for timing
import { AudioContext as PonyAudioContext, OfflineAudioContext } from 'standardized-audio-context'
import { enableMIDI, mapped, toChord, toNote } from "./audio"
import { createChord, createFifthsChord, createMajorChord, createMinorChord, getModeAsIntegerOffset, getModeFromIntegerOffset, MAJOR_CHORD_INTERVALS, MINOR_CHORD_INTERVALS, TUNING_MODE_NAMES } from "./chords"
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
import { addReadButtons, handlePasswordProtection, selectRadioButton, setCurrentYear, updateScaleUI, updateTimbreUI } from "./ui"

// data
import { CICRLE_INTERVALS, DEFAULT_PASSWORD, PALETTE, VISUALISER_OPTIONS } from "./settings"
import { ASTLEY, getCompondSong, getRandomSong } from "./songs"
import WAVE_ARCHIVE_GENERAL_MIDI from "url:/static/wave-tables/general-midi.zip"
import WAVE_ARCHIVE_GOOGLE from "url:/static/wave-tables/google.zip"
import { MouseVisualiser } from "./components/mouse-visualiser"
import { MelodyRecorder } from "./melody-recorder"
import { debounce } from "./utils.js"
import Timer from "./timing/timer.js"
// import TimingAudioWorkletNode, { createTimingProcessor } from "./timing/timing.audioworklet.js"

import AUDIOTIMER_PROCESSOR_URI from 'url:./timing/timing.audioworklet-processor.js'
import { SongCanvas } from "./components/song-canvas.js"
import { countdown } from "./countdown.js"
import { getRandomSpell } from "./sfx.js"

// Data locations
import manifest from "/static/wave-tables/general-midi/manifest.json"

// audio reqiures a user gesture to start...
// so we hook into each musical event to check if the user has engaged
let hasUserEngaged = false

// flag for showing the whole keyboard on screen rather than a trimmed size
let showAllKeys = true

// options
const loadFromZips = false
const debug = true

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
let miniNotation
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
    return data
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

const createMetronome = () => {
    const timer = new Timer()
    
    return timer
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
    synth && synth.noteOn( noteModel, velocity )                                                                                                            
    keyboard && keyboard.setKeyAsActive( noteModel )    // highlight the keys on the keyboard!    
    hero && hero.noteOn( noteModel )
    noteVisualiser && noteVisualiser.noteOn( noteModel, velocity )
    mouseVisualiser && mouseVisualiser.noteOn( noteModel, velocity )
    recorder && recorder.noteOn( noteModel, velocity )
    miniNotation && miniNotation.noteOn( noteModel, velocity, audioContext.currentTime )
    
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
    synth && synth.noteOff( noteModel, velocity )
    keyboard && keyboard.setKeyAsInactive( noteModel )   // unhighlight the keys on the keyboard
    hero && hero.noteOff( noteModel )
    noteVisualiser && noteVisualiser.noteOff( noteModel, velocity )
    mouseVisualiser && mouseVisualiser.noteOff( noteModel, velocity )
    recorder && recorder.noteOff( noteModel, velocity )
    miniNotation && miniNotation.noteOff( noteModel, velocity, audioContext.currentTime )
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
    const isChord = chordIntervals && chordIntervals.length > 1
    if (playingNote)
    {
        console.info("Killing note", note, {songSequence, playingNote} )
        isChord ? chordOff( playingNote, 1, playingChord ?? chordIntervals, scaleMode ) : noteOff( playingNote, 1 )
    }else{
        console.info("Starting note", note, {songSequence, playingNote} )
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
    const playButtons = document.querySelectorAll('[data-control-play]')
    playButtons.forEach( playButton => {
       addMusicalMouseEventsToElement(playButton) // visualiserCanvas
    })
        
    // const randomWaveButton = document.querySelector('#timbre-random')
    const randomWaveButtons = document.querySelectorAll('input[value="random"]')
    randomWaveButtons.forEach( randomWaveButton => {
            
        randomWaveButton.addEventListener("click", e => {
            const randomWave = getRandomWaveTableName() 
            //console.info("randomWaveButton", randomWave)
            shape = setTimbre( randomWave )
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
            console.info("RadioButton", {name, input} )
            // emotionPanel.querySelector("output").textContent = input
        })
    })
}

/**
 * Timbre selector and shape creator
 * @param {Array<String>} instrumentNames 
 */
const setupShapeVisualiser = (instrumentNames) => {

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
        //  <hr>
        timbreSelect.add(new Option(name, name))
    })
    timbreSelect.addEventListener("change", e => {
        const timbre = e.target.value
        console.info("timbre", timbre)
        shape = setTimbre( timbre )
    })
    timbrePrevious.addEventListener("click", e => {
        console.info("timbre previous", timbreSelect.value, timbreSelect.options.length )
        shape = setTimbre( getTimbre(instrumentNames, shape, -1 ) )
    })
    timbreNext.addEventListener("click", e => {
        console.info("timbre next", timbreSelect.value, timbreSelect.options.length )
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

    miniNotation = new SongCanvas(document.getElementById("song-in-pixels"), recorder)

    const audioSpellSources = document.querySelectorAll("audio")
    audioSpellSources.forEach( audioSpellSource => {
        const audioSpell = audioContext.createMediaElementSource(audioSpellSource)
        audioSpell.connect(limiter)
    })

    const playMetronomeBeat = (odd) => {
        console.info("playMetronomeBeat", !odd ? "even" : "odd")
        audioSpellSource.pause()
        audioSpellSources.forEach( audioSpellSource => audioSpellSource.src = getRandomSpell() )
        audioSpellSource.currentTime = 0
        audioSpellSource.play()
    }

    let beats = 0
    const timingContext = new AudioContext()
    const timer = new Timer({contexts:{audioContext:timingContext}, bpm:32 })
    // console.info("timer", timer)
    // await timer.loaded
    // console.info("timer loaded", timer)
    timer.swing = 0.5
    timer.startTimer(e =>{
        // 
        const oddBeat = beats % 2 !== 0
        switch(oddBeat)
        {
            // Even Beats
            case false:
                if (timer.isStartBar && timer.isAtStart)
                {
                    this.playMetronomeBeat(false)
                    beats++
                }
                break

            // Odd Beats
            case true:
                if (timer.isStartBar && timer.isSwungBeat)
                {
                    this.playMetronomeBeat(true)
                    beats++
                }
                break
        }
    })

  
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
 * Preload all of the wave tables 
 */
const backgroundLoad = async () => {
    // await preloadAllWaveTables()

    countdown(document.querySelector("[data-countdown]"))
    
    addNoises()

    if (loadFromZips)
    {
        await preloadWaveTablesFromZip(WAVE_ARCHIVE_GENERAL_MIDI)
        await preloadWaveTablesFromZip(WAVE_ARCHIVE_GOOGLE)
    }else{
        loadWaveTableFromManifest(manifest)
    }
   
    // update the UI with these new data sets...
    
    const instrumentNames = getAllWaveTables()
    
    // load saved instrument if not the default
    setTimbre(shape)

    // NB. This is the full list that may not be loaded yet?
    // all possible data files for instrument sounds
   
    // waveform visualiser
    setupShapeVisualiser(instrumentNames)

    console.error("DATA LOADED!", {instrumentNames} )
    
    // now add the share button and share overlay
    await loadShareMenu()

    // const timing = await import("./timing/timer.js")
	// const timer = new Timer()
    // console.error("DATA LOADED!", {timing} )
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
    song = loadSong( getCompondSong() )

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
    keyboard = new SVGKeyboard( showAllKeys ? ALL_KEYBOARD_NOTES : KEYBOARD_NOTES, noteOn, noteOff )
    
    // const headerElement = document.getElementById("headline")  
    // headerElement.appendChild(keyboard.asElement)
    // const keyboard2 = new SVGKeyboard(KEYBOARD_NOTES, noteOn, noteOff )

    const keyboardElement = document.body.appendChild( keyboard.asElement )
    keyboardElement.addEventListener("dblclick", e => setTimbre( getRandomWaveTableName() ) )
   
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
    monitorIntersections({}, (entry, inViewport )=>{

        console.info(entry,inViewport ? "in viewport" : "exit" )

    })
    
    addReadButtons()
   
    // finally update the URL with the state
    updateURL()

    // try and load in some instrument data sets in the background...
    requestAnimationFrame(backgroundLoad)

    if (debug){
        console.log("PhotoSYNTH.LOL loaded")
        console.log("keyboard", {keyboard, keyboardElement} )
        console.log("mouseVisualiser", {mouseVisualiser, mouseCanvas} )
        console.log("noteVisualiser", {noteVisualiser, wallpaperCanvas} )
        console.log("hero", {hero} )
        console.log("song", {song} )
        console.log("recorder", {recorder} )
    }
}

/**
 * DOM reporting for action!
 */
document.addEventListener("DOMContentLoaded", start, {once:true})
// window.addEventListener("load", start, {once:true})
document.addEventListener("touchstart", createAudioContext, {once:true})
document.addEventListener("mousedown", createAudioContext, {once:true})