/**
 * Instance based version of timing
 * To allow hybrid timing events and for multiple
 * clocks to run at different rates
 */

import {
	CMD_START,CMD_STOP,CMD_UPDATE,
	EVENT_READY, EVENT_STARTING, EVENT_STOPPING, EVENT_TICK
} from './timing.events.js'

import AUDIOTIMER_WORKLET_URI from 'url:./timing.audioworklet.js'
import AUDIOTIMER_PROCESSOR_URI from 'url:./timing.audioworklet-processor.js'
import { createTimingProcessor } from './timing.audioworklet.js'

export const WORKLETS = {
	AUDIOTIMER_WORKLET_URI
}

export const MAX_BARS_ALLOWED = 32

// keep this at 24 to match MIDI1.0 spec
// where there are 24 ticks per quarternote
const DIVISIONS = 24 // 4

/**
 * Convert a BPM to a period in ms
 * @param {Number} bpm beats per minute
 * @returns {Number} time in milliseconds
 */
export const convertBPMToPeriod = bpm => 60000 / parseFloat(bpm)

/**
 * TODO: Implement lienar regression like nayuki
 * https://www.nayuki.io/page/tap-to-measure-tempo-javascript
 * Converts a series of method calls into a tempo estimate.
 * @param {Boolean} autoReset Start a new estimation session if timeout reached
 * @param {Number} timeOut Time frame before ignoring the event and starting a fresh estimation session
 * @param {Number} minimumTaps Requires at least x taps before estimate set
 * @returns {Number} New Period
 */
let beatTimes = []
const TAP_TIMEOUT = 10000
const MINIMUM_TEMPOS = 2
export const tapTempo = (autoReset=true, timeOut=TAP_TIMEOUT, minimumTaps = MINIMUM_TEMPOS) => {
    
    const currentTime = now()

    if ( autoReset && beatTimes.length > 0 && currentTime - beatTimes[beatTimes.length-1] > timeOut )
    {
        beatTimes = []
    }

    beatTimes.push(currentTime)

    const quantity = beatTimes.length
    const x = quantity - 1
    const y = beatTimes[x] - beatTimes[0]
    // const time = (y / 1000).toFixed(3)
   
    if (quantity >= minimumTaps) 
    {
        // const tempo = 60000 * x / y
        const period = y / x
        return period
    }
    return -1
}

export default class Timer {

	startTime = -1
	period = 100

	// for time formatting...
	currentBar = 0

	bars = 16

	// There are 16 quarter notes in a note
	divisionsElapsed = 0
	// and 4 notes in each bar
	totalBarsElapsed = 0

	lastRecordedTime = 0
	divisions = DIVISIONS
	
	isRunning = false
	isCompatible = false
	isBypassed = false
	isActive = false

	timingWorker
	loaded = new Promise( this.onAvailable )
	callback

	/**
	 * Can we use this timing method on this device?
	 * @returns {Boolean} is the worker available and compatable
	 */
	get available() { 
		return this.isCompatible 
	}

	/**
	 * Can we use this timing method on this device?
	 * @returns {Boolean} is the worker available and compatable
	 */
	get running() { 
		return this.isRunning 
	}

	/**
	 * Accurate time in milliseconds
	 * @returns {Number} The current time as of now
	 */
	get now(){ 
		return Performance.now() 
	}

	/**
	 * Fetch current bar length in milliseconds
	 * @returns {Number} bar length in milliseconds
	 */
	get timeBetween(){ 
		return this.period
	} 

	/**
	 * Amount of time elapsed since startTimer() in seconds
	 * @returns {Number} in seconds
	 */
	get timeElapsed() { 
		// How long has elapsed according to audio context
		return (this.now - this.startTime)// * 0.001 
	}
		
	/**
	 * Fetch whole loop length in milliseconds
	 * @returns {Number} length in milliseconds
	 */
	get totalTime(){ 
		return this.timePerBar * this.bars 
	}

	/**
	 * Fetch current bar
	 * @returns {Number} current bar
	 */
	get bar(){ 
		return this.currentBar 
	}

	/**
	 * Fetch total bars completed
	 * @returns {Number} total bars
	 */
	get barsElapsed(){
		return this.totalBarsElapsed
	}
	
	/**
	 * Fetch total bar quantity
	 * @returns {Number} total bars
	 */
	get totalBars(){ 
		return this.bars 
	} 

	get totalDivisions(){
		return this.divisions
	}

	/**
	 * Percentage duration of bar progress 0->1
	 * @returns {Number} percentage elapsed
	 */
	get barProgress(){
		return this.currentBar / this.bars
	}

	// Bar times

	/**
	 * Fetch current bar length in milliseconds
	 * @returns {Number} bar length in milliseconds
	 */
	get timePerBar(){
		return this.period * this.divisions 
	}

	/**
	 * Get the current timing as Beats per minute
	 * BPM = 60,000,000 / MicroTempo
	 * @returns {Number} BPM
	 */
	get BPM (){
		return 60000 / this.timePerBar
	}
	get bpm (){
		return this.BPM
	}

	/**
	 * Get the current timing as a Microtempo 
	 * @returns {Number} Microtempo
	 */
	get microTempo (){ 
		return this.timePerBar * 0.001
	}

	/**
	 * Get the current timing in Micros per MIDI clock
	 * MicrosPerMIDIClock = MicroTempo / 24 
	 * @returns {Number} Microtempo
	 */
	get microsPerMIDIClock(){
		return this.microTempo / 24
	}

	get isAtMiddleOfBar(){
		return this.barProgress === 0.5
	}

	get isAtStart(){
		return this.divisionsElapsed === 0
	}
	get isQuarterNote(){
		return this.divisionsElapsed / this.totalDivisions % 0.25 === 0 
	}
	get isHalfNote(){
		return this.divisionsElapsed / this.totalDivisions % 0.5 === 0 
	}

	// Setters

	/**
	 * Fetch current bar
	 * @returns {Number} current bar
	 */
	set bar(value){
		this.currentBar = parseInt(value)
	}

	/**
	 * Allows a user to set the total number of bars
	 * @param {Number} value How many bars to have in a measure
	 * @returns {Number} total bars
	 */
	set totalBars(value) {
		this.bars = value < 1 ? 1 : value > MAX_BARS_ALLOWED ? MAX_BARS_ALLOWED : value
	}

	/**
	 *  Set the current timing using a BPM where 
	 *  one beat in milliseconds =  60,000 / BPM
	 * @param {Number} bpm Beats per minute
	 * @returns {Number} period
	 */
	set BPM( value ){
		this.timeBetween = 60000 / parseFloat(value)
	}
	set bpm( value ){
		this.BPM = value
	} 
 
	/**
	 * Using a time in milliseconds, set the amount of time between tick and tock
	 * @param {Number} time Amount of millieconds between ticks
	 * @returns {Number} period
	 */
	set timeBetween(time) {

		const interval =  time / this.divisions
		// we want 16 notes
		this.period = interval

		// TODO
		// FIXME
		// if it is running, stop and restart it?
		//interval = newInterval
		this.timingWorker && this.timingWorker.postMessage({
			command:CMD_UPDATE, 
			interval,
			time:this.now 
		})

		return interval
	}

	constructor( divisions=DIVISIONS, type=SETTIMEOUT_WORKER_URI, contexts=null ){
		this.divisions = divisions
		if (contexts)
		{
			for (let context in contexts)
				{this[context] = contexts[context]
			}
			console.info("Setting up timer with context", contexts, this )
		}
				
		// We need to find a way to load this dynamically
		this.setTimingWorker( type ).then(()=>{
			Promise.resolve( this.loaded )
		})
	}

	/**
	 * 
	 * @param {Function} callback Method to call when the timer ticks
	 */
	setCallback( callback ){
		this.callback = callback
	}

	
	// allows us to disable the existing route to send our own
	// or to inject them into here 
	bypass( useExternalClock=true ){

		if (useExternalClock){
			// we want to bypass the worker's work
			this.isBypassed = true
			if (this.isRunning)
			{
				// disconnect but don't destroy
				this.disconnectWorker( this.timingWorker, false )
				console.info("timer runinng, bypassing... ")
			}else{
				console.info("bypassing... ignored")
			}
			
		}else{

			this.isBypassed = false
			if (this.isRunning)
			{
				this.startTimer()
				console.info("restarting timer... ")
			}else{
				console.info("undoing bypass... ignored")
			}
		}

		const trigger = ( timePassed, expected, drift, level, intervals, lag ) =>{

			// call callback
			this.onTick(timePassed, expected, drift, level, intervals, lag)
		}

		return trigger
	}

	/**
	 * 
	 * @param {String} type 
	 * @returns 
	 */
	async unsetTimingWorker(type){
		// timer.onmessage = this.timingWorker.onmessage 
		// timer.onerror = this.timingWorker.onerror 

		// // TODO: clone the methods into new worker
		// this.timingWorker.onmessage = (e) => {}
		// this.timingWorker.onerror = (e) => {}
		this.stopTimer()
		this.timingWorker.terminate()
		this.timingWorker = null
		return true
	}

	/**
	 * Load in the Worker URI
	 * @param {String} type or URi 
	 * @returns 
	 */
	async loadTimingWorker(type){
		return new Worker( new URL( type ), {type: 'module'} )
	}

	// in the future, we may be able to pass offlineAudioContext to a worker
	// and at that point, we can finally tie in the actual timing by using the 
	// context as the global clock!
	async setTimingWorker(type){
		try{

			let wasRunning = this.isRunning

			// destroy any existing worker
			if (this.timingWorker)
			{
				await this.unsetTimingWorker()
			}

			this.timingWorker = await this.loadTimingWorker(type)		
			
			if (!this.timingWorker)
			{
				throw Error ("Timing Worker failed to load url:"+url+ " type:" + type)
			}
		
			console.info("Setting timer worker", type, this.timingWorker )

			if (wasRunning)
			{
				this.startTimer()
			}

			return this.timingWorker

		}catch(error){

			this.isCompatible = false
			console.error("Timing WORKER FAILED TO LOAD", type, error)
		}	
		return null
	}

	/**
	 * 
	 * @param {Worker} worker 
	 */
	connectWorker( worker ){

		if (!worker){
			throw new Error("Timing Worker was not defined - please check paths "+worker)
		}

		// now hook into our worker bee and watch for timing changes
		worker.onmessage = (e) => {

			const time = this.now
			const data = e.data

			switch(data.event)
			{
				case EVENT_STARTING:
					// save start time
					this.startTime = time
					this.isRunning = true
					this.resetTimer()
					//console.log("EVENT_STARTING", {time:data.time, startTime})
					break

				case EVENT_TICK:
					
					const timeBetweenPeriod = this.timeBetween * 0.001
					// How many ticks have occured yet
					const intervals = data.intervals
					// Expected time stamp
					const expected = intervals * timeBetweenPeriod
					
					// How long has elapsed according to our worker
					const timePassed = data.time
					// how much spill over the expected timestamp is there
					const lag = timePassed % timeBetweenPeriod
					// should be 0 if the timer is working...
					const drift = timePassed - this.timeElapsed
					// deterministic intervals not neccessary
					const level = Math.floor(timePassed / this.timeBetween)
					// elapsed should === time
				
					this.onTick(timePassed,expected, drift, level, intervals, lag)
					// timingWorker.postMessage({command:CMD_UPDATE, time:currentTime, interval})
					break

				default:
					console.log("message: " , e, time)
			}
		}

		// Error!
		worker.onerror = error =>{
			console.error("error...", {error} )
			worker.postMessage({error, time:this.audioContext.currentTime })
		}
	}

	/**
	 * Disconnect the worker from the timer
	 * @param {Worker} worker 
	 */
	disconnectWorker(worker, setStopped=true){
		worker.onmessage = (e) => {
			switch(e.event)
			{
				// Clean up
				case EVENT_STOPPING:
					// destroy contexts and unsubscribe from events
					if (setStopped)
					{
						this.isRunning = false
					}
					break
			}
		}

		worker.postMessage({
			command:CMD_STOP, 
			time:this.now
		})
	}

	/**
	 * Reset
	 */
	resetTimer(){
		this.totalBarsElapsed = 0
		this.divisionsElapsed = 0
	}

	/**
	 * Starts the timer and begins events being dispatched
	 * 
	 * @returns {Object} current time and timingWorker
	 */
	startTimer( callback, options={} ){

		const currentTime = this.now

		if (!this.isRunning)
		{
			// FIXME: Alter this behaviour for rolling count
			this.totalBarsElapsed = 0
		}
				
		// if we are using an external clock
		// we try and determine the tempo ourselves
		if (this.isBypassed)
		{
			this.isRunning = true
			return {
				time:currentTime, 
				interval:-1,
				worker:null
			}
		}

		this.connectWorker( this.timingWorker )
	
		// send command to worker... options
		this.timingWorker.postMessage({
			command:CMD_START, 
			time:currentTime, 
			interval:this.period,
			// FIXME:
			accurateTiming:false
		})
		//console.log("Starting...", {audioContext, interval:timeBetween, timingWorker} )

		return {
			time:currentTime, 
			interval:this.period,
			worker:this.timingWorker
		}
	}

	/**
	 * Stops the timer and prevents events being dispatched
	 * @returns {Object} current time and timingWorker
	 */
	stopTimer() {
		const currentTime = this.now
		// cancel the thing thrugh the workers first
		// cancel any scheduled quie noises
		this.disconnectWorker( this.timingWorker )

		return {
			currentTime,
			worker:this.timingWorker
		}
	}

	toggleTimer(){
		if (this.isBypassed)
		{
			// we are using an external timer!
			return
		}
		if (!this.isRunning)
		{
			this.startTimer()
		}else{
			this.stopTimer()
		}
	}

	/**
	 * Use an external device to send clock signals to and through this timer
	 * @param {Number} timePassed 
	 * @param {Number} expected 
	 * @param {Number} drift 
	 * @param {Number} level 
	 * @param {Number} intervals 
	 * @param {Number} lag 
	 */
	externalTrigger(timePassed, expected, drift=0, level=0, intervals=0, lag=0){
		if (this.isRunning && this.isBypassed)
		{
			this.onTick(timePassed, expected, drift, level, intervals, lag)
		}
	}

	onAvailable(){
		console.info("Timer is available")
	}

	/**
	 * Call the callback with internal flags
	 * @param {Number} timePassed 
	 * @param {Number} expected 
	 * @param {Number} drift 
	 * @param {Number} level 
	 * @param {Number} intervals 
	 * @param {Number} lag 
	 */
	onTick(timePassed, expected, drift=0, level=0, intervals=0, lag=0){
		
		this.lastRecordedTime = timePassed

		if (++this.divisionsElapsed >= this.divisions)
		{
			++this.totalBarsElapsed
			this.currentBar = (this.currentBar+1) % this.bars
			this.divisionsElapsed = 0
		}

		this.callback && this.callback({
			bar:this.currentBar, bars:this.totalBars, 
			divisionsElapsed:this.divisionsElapsed, 
			barsElapsed:this.barsElapsed, 
			elapsed: this.timeElapsed,
			//performance
			timePassed, expected, drift, level, intervals, lag
		})
	}
}