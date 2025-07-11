//const OSCILLATORS = [ "sine", "triangle"]
import { BiquadFilterNode } from "standardized-audio-context"
import {noteNumberToFrequency} from "../note.js"
import { loadWaveTable } from "./wave-tables.js"
export const OSCILLATORS = [ "sine", "square", "sawtooth", "triangle" ]

export default class SynthOscillator{

    options = {
        gain:0.2,
        attack:0.4,
        shape:OSCILLATORS[0],
        minDuration:0.45,
        arpeggioDuration:0.2,
        slideDuration: 0.06,
        fadeDuration:0.2,
        filterGain :0.7,
        filterCutOff :2200,
        filterOverdrive:2.5,
        filterResonance :1.8,
        filterAttack :0.2,
        filterDecay :0.08,
        filterSustain :0.0,
        filterRelease :0.1
    }
    
    // arpeggioIntervals = []
    customWave = null

    #id = "SynthOscillator"

    get id(){
        return this.#id
    }
    set id(value){
        this.#id = value
    }

    get now(){
        return this.audioContext.currentTime
    }

    get gain(){
        return this.options.gain
    }

    set gain(value){
        this.options.gain = value
    }

    get volume(){
        return this.gainNode.gain.value
    }

    set volume(value){
        this.gainNode.gain.cancelScheduledValues(this.now)
        // this.gainNode.gain.value = value
        this.gainNode.gain.linearRampToValueAtTime( value, this.now + this.options.fadeDuration )
    }

    get frequency(){
        return this.oscillator.frequency.value
    }

    set frequency(value){
        if (!this.oscillator){
            console.warn("No oscillator", this)
            return
        }
        this.oscillator.frequency.cancelScheduledValues(this.now)
        // this.oscillator.frequency.value = value
        this.oscillator.frequency.linearRampToValueAtTime( value, this.now + this.options.slideDuration)
    }

	set shape(value){
        // there are 3 different sources of shapes :
        switch (typeof value ){

            case 'string':   
                if (OSCILLATORS.includes(value))
                {
                    // 1. the oscillator type
                    // console.info("SynthOscillator::STANDARD"+ this.options, value)
                    if ( this.oscillator )
                    {
                        this.oscillator.type = value
                    }
                    this.customWave = null

                }else {

                    // 2. attempt to load in customWave JSON data from a URI
                    this.loadWaveTable(value).then( waves => {
                        this.setWaveTable( waves )
                        // console.info("SynthOscillator::CUSTOM URI"+this.options, value, {waves} )
                    } )     
                } 
                break
        
            case 'object':
                // 3. customWave data with real and imag arrays
                this.setWaveTable( value )
                // console.info("SynthOscillator::CUSTOM DATA"+this.options, value )
                break

            default: 
                console.warn("SynthOscillator::UNKNOWN TYPE", value)
        }
    
        this.options.shape = value
	}

	get shape(){
		return this.options.shape
	}

    set Q(value){
        // this.filter.Q.value = value
        this.filterNode.Q.cancelScheduledValues(this.now)
        this.filterNode.Q.linearRampToValueAtTime( value, this.now + this.options.slideDuration)
    }

    get Q(){
        return this.filterNode.Q.value
    }

    set detune(value){
        this.filterNode.detune.value = value
    }

    get detune(){
        return this.filterNode.detune.value
    }

    set filterCutOff(value){
        this.filterNode.frequency.cancelScheduledValues(this.now)
        this.filterNode.frequency.linearRampToValueAtTime( value, this.now + this.options.slideDuration)
    }
    get filterCutOff(){
        return this.filterNode.frequency.value
    }

    set filterType(value){
        this.filterNode.type = value
    }

    // set arpeggio( intervals ){
    //     this.arpeggioIntervals = intervals
    // }

    // get arpeggio(){
    //     return this.arpeggioIntervals
    // }

    get output(){
        return this.gainNode
        // return this.filterNode
    }

    constructor(audioContext, options={}){
        this.audioContext = audioContext
        this.options = Object.assign({}, this.options, options)
     
        this.filterNode = new BiquadFilterNode( audioContext, {
			type : 'lowpass',
			Q:this.options.filterResonance,
			frequency:this.options.filterCutOff,
			detune:0,
			gain:1
		})
     
        this.gainNode = audioContext.createGain()
        this.gainNode.gain.value = 0  // start silently

        // this.gainNode.connect(this.filterNode)
        this.filterNode.connect(this.gainNode)
        // this.gainNode.connect(audioContext.destination)
        
        if (options.shape)
        {
            // console.info("SynthOscillator::",{options})
            this.shape = options.shape
        }
        
        // check to see if a wavetable name is specified...
        this.isNoteDown = false
    }

    destroyOscillator(oscillator){
        oscillator.stop()
        oscillator.disconnect()
        oscillator = null
        this.active = false
    }

    createOscillator( frequency=440, startTime = this.audioContext.currentTime  ){
        if( this.oscillator ){
            this.destroyOscillator(this.oscillator)
        }
        this.oscillator = this.audioContext.createOscillator()

        if (this.customWave)
        {
            // this.oscillator.setPeriodicWave(this.customWave)
            // console.info("Setting periodic wave", this.customWave )
        }else{
              // console.info("Setting oscilliator type", this.shape )
        }

        this.shape = this.options.shape // OSCILLATORS[Math.floor(Math.random() * OSCILLATORS.length)]
        
        this.oscillator.frequency.value = frequency
        this.oscillator.connect(this.gainNode)
        this.oscillator.start(startTime)
        this.active = true
    }

    addArpeggioAtIntervals( tonic, intervals=[], repetitions=24 ){
        const now = this.now
        let startTime = now
        let frequency = tonic.noteNumber
        const frequencies = intervals.map( note => noteNumberToFrequency(frequency + note) ) 
        
        for (let i=0; i < repetitions; ++i)
        {
            intervals.forEach((interval, index) => {
            
                this.oscillator.frequency.setValueAtTime( frequencies[index], startTime )
                startTime += this.options.arpeggioDuration

                // console.info("start time", startTime )
                // this.oscillator.frequency.linearRampToValueAtTime( frequency + interval, startTime )
            })            
        }
    }

    /**
     * 
     * @param {Note} note - Model data
     * @param {Number} velocity - strength of the note
     * @param {Array<Number>} arp - intervals
     * @param {Number} delay - number to pause before playing
     */
    noteOn( note, velocity=1, arp=null, delay=0 ){
       
        const frequency = note.frequency
        const startTime = this.now + delay
		const filterPeak = this.options.filterCutOff * this.options.filterOverdrive
        const filterSustain = this.options.filterCutOff + (filterPeak - this.options.filterCutOff) * this.options.filterSustain
       
        // reset the oscillator...
        // this.frequency = frequency
        // console.log("noteOn", frequency)
        
        // fade in envelope
        const amplitude = velocity * this.options.gain
        this.gainNode.gain.cancelScheduledValues(startTime)
        this.gainNode.gain.setValueAtTime( 0, startTime )
		this.gainNode.gain.linearRampToValueAtTime( amplitude, startTime + this.options.attack )

		// Shape the note
		this.filterNode.frequency.cancelScheduledValues(startTime)
		this.filterNode.frequency.setValueAtTime(this.options.filterCutOff, startTime)
        this.filterNode.frequency.linearRampToValueAtTime(filterPeak, startTime + this.options.filterAttack)
        this.filterNode.frequency.linearRampToValueAtTime(filterSustain, startTime + this.options.filterAttack + this.options.filterDecay )

        if (!this.isNoteDown)
        {
            this.createOscillator( frequency, startTime )	
        }else{
            // reuse
            this.frequency = frequency
        }

        if (arp)
        {
             this.addArpeggioAtIntervals( note, arp )
        }
       
        this.isNoteDown = true
        this.startedAt = startTime
    }
    
    /**
     * 
     * @returns 
     */
    noteOff( note ){
        if (!this.isNoteDown ){
            console.warn("noteOff IGNORED - note NOT playing", note, this )
            return
        }
        const now = this.now
        const elapsed = now - this.startedAt
        const extendNow = elapsed < this.options.minDuration ? now + this.options.minDuration : now

        // Calculate the release end time
        const releaseTime = Math.max(this.options.fadeDuration, this.options.filterRelease)
        const stopTime = extendNow + releaseTime
        
        // Apply a very gentle fade out to avoid clicks
        this.gainNode.gain.cancelScheduledValues(extendNow)
        
        // Use a longer, more gradual linear ramp instead of exponential
        // Linear ramps can reach zero and are often less prone to clicks
        this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, extendNow)
        this.gainNode.gain.linearRampToValueAtTime(0, stopTime)
        
        // Apply filter fade out
        this.filterNode.frequency.cancelScheduledValues(extendNow)
        this.filterNode.frequency.linearRampToValueAtTime(this.options.filterCutOff, stopTime)
        
        // Schedule the oscillator to stop after the envelope has completed
        if (this.oscillator) {
            // Add a small buffer after the gain reaches zero before stopping
            const bufferTime = 0.01
            this.oscillator.stop(stopTime + bufferTime)
        }
        
        this.isNoteDown = false        
        this.startedAt = -1
    }

    async loadWaveTable(waveTableName=TB303_Square){
        return await loadWaveTable(waveTableName)
    }

    setWaveTable(waveTable){
        const {real, imag} = waveTable
        const waveData = this.audioContext.createPeriodicWave(real, imag, { disableNormalization: true })
        // reshape any playing oscillators
        if ( this.oscillator)
        {
            this.oscillator.setPeriodicWave(waveData)
        }
        this.customWave = waveData
        return waveData
    }
}
