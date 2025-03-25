//const OSCILLATORS = [ "sine", "triangle"]
import {MAJOR_CHORD_INTERVALS} from "../chords.js"
import {noteNumberToFrequency} from "../note.js"
const OSCILLATORS = [ "sine", "square", "sawtooth", "triangle" ]

export default class SynthOscillator{

    static waveTables = new Map()

    options = {
        gain:0.5,
        attack:0.3,
        shape:OSCILLATORS[0],
        minDuration:1,
        arpeggioDuration:0.2,
        slideDuration: 0.1,
        fadeDuration:0.2,
        filterGain :0.7,
        filterCutOff :2200,
        filterOverdrive:2.5,
        filterResonance :1.8,
        filterAttack :0.002,
        filterDecay :0.08,
        filterSustain :0.0,
        filterRelease :0.1
    }
    
    // arpeggioIntervals = []

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
		this.oscillator.type = value
        this.options.shape = value
	}

	get shape(){
		return this.oscillator.type
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

        this.filterNode.connect(this.gainNode)
        // this.gainNode.connect(audioContext.destination)

        // check to see if a wavetable name is specified...


        this.isNoteDown = false
    }

    destroyOscillator(oscillator){
        oscillator.stop()
        oscillator.disconnect()
        oscillator = null
        this.active = false
    }

    createOscillator( frequency=440 ){
        if( this.oscillator ){
            this.destroyOscillator(this.oscillator)
        }
        this.oscillator = this.audioContext.createOscillator()
        this.oscillator.type = this.options.shape // OSCILLATORS[Math.floor(Math.random() * OSCILLATORS.length)]
        this.oscillator.frequency.value = frequency
        this.oscillator.connect(this.filterNode)
        this.oscillator.start()
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

                console.info("start time", startTime )
                // this.oscillator.frequency.linearRampToValueAtTime( frequency + interval, startTime )
            })            
        }
    }

    noteOn( note, velocity=1, arp=null ){
        const frequency = note.frequency
        const now = this.now
		const filterPeak = this.options.filterCutOff * this.options.filterOverdrive
        const filterSustain = this.options.filterCutOff + (filterPeak - this.options.filterCutOff) * this.options.filterSustain
       
        // reset the oscillator...
        // this.frequency = frequency
        // console.log("noteOn", frequency)
        
        // fade in envelope
        this.gainNode.gain.cancelScheduledValues(now)
        this.gainNode.gain.setValueAtTime( 0, now )
		this.gainNode.gain.linearRampToValueAtTime( velocity * this.options.gain + this.options.attack, now + this.options.fadeDuration )

		// Shape the note
		this.filterNode.frequency.cancelScheduledValues(now)
		this.filterNode.frequency.setValueAtTime(this.options.filterCutOff, now)
        this.filterNode.frequency.linearRampToValueAtTime(filterPeak, now + this.options.filterAttack)
        this.filterNode.frequency.linearRampToValueAtTime(filterSustain, now + this.options.filterAttack + this.options.filterDecay )

        if (!this.isNoteDown)
        {
            this.createOscillator( frequency )	
        }else{
            // reuse
            this.frequency = frequency
        }

        if (arp)
        {
             this.addArpeggioAtIntervals( note, arp )
        }
       
        this.isNoteDown = true
        this.startedAt = now
    }
    
    noteOff(){
        if (!this.isNoteDown ){
            console.warn("noteOff IGNORED")
            return
        }
        const now = this.now
        const elapsed = now - this.startedAt
        const extendNow = elapsed < this.options.minDuration ? now + this.options.minDuration : now

        console.info("noteOff", {elapsed, now, extendNow, tooLong:elapsed < this.options.minDuration})
      
		this.filterNode.frequency.cancelScheduledValues(extendNow)
		this.filterNode.frequency.linearRampToValueAtTime(this.options.filterCutOff, extendNow + this.options.filterRelease)
        
        // fade out volume
        this.gainNode.gain.cancelScheduledValues(extendNow)
		this.gainNode.gain.linearRampToValueAtTime( 0, extendNow + Math.max( this.options.fadeDuration, this.options.filterRelease ) )	
       
        this.isNoteDown = false        
        this.startedAt = -1
    }

    async loadWaveTable(waveTableName=TB303_Square){
        // TODO Cache in static Map

        if (SynthOscillator.waveTables.has(waveTableName) ){

            const table = SynthOscillator.waveTables.get(waveTableName)
            this.setWaveTable(table)  

        }else{

            const request = await fetch(`/wave-tables/${waveTableName}`)
            const response = await request.json()
            this.setWaveTable(response)  
            SynthOscillator.waveTables.set(waveTableName, response)
        }
    }

    setWaveTable(waveTable){
        this.waveTable = waveTable
        const real = waveTable.real
        const imag = waveTable.imag
        const wave = this.audioContext.createPeriodicWave(real, imag, { disableNormalization: true })
        this.oscillator.setPeriodicWave(wave)
    }
}