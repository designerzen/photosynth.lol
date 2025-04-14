import {
	CMD_START,CMD_STOP,CMD_UPDATE,
	EVENT_READY, EVENT_STARTING, EVENT_STOPPING, EVENT_TICK
} from './timing.events.js'

import AUDIOTIMER_PROCESSOR_URI from 'url:./timing.audioworklet-processor.js'

/**
 * Gateway to the metronome AudioWorkletProcessor
 * If you add this node to your audio pipeline it 
 * should disptch events at the correct times
 */
class TimingAudioWorkletNode extends AudioWorkletNode {

	static get parameterDescriptors() {
		return [
			{
				name: "rate",
				defaultValue: 440.0,
				minValue: 27.5,
				maxValue: 4186.009
			}
		]
	}

	constructor(audioContext) 
	{
		super(audioContext, "timing-processor")
		this.port.onmessage = this.onmessage.bind(this)
	}

	/**
	 * 
	 * @param {Object} data 
	 * @returns 
	 */
	post( data){
		return this.port.postMessage(data)
	}

	/**
	 * Pass in the event data to the AudioWorkletNode
	 * @param {Event} event 
	 */
	onmessage(event) {
		// Handling data from the node.
		console.log("AudioWorkletNode:", {event})
		// loadSample(event.data)
		switch (event.data.type) {
			case CMD_START:
				console.log('[AudioWorkletNode:CMD_START]', event )
				break

			case CMD_STOP:
				console.error("AudioWorkletNode: CMD_STOP", event)
				
				break

			case CMD_UPDATE:
				console.error("AudioWorkletNode: CMD_UPDATE", event)
				
				break

			default:
				console.error("AudioWorkletNode: Unknown message type", event)
		}
	}
}

/**
 * Wrap the above in a single call
 * @param {AudioContext} context 
 * @returns 
 */
export const createTimingProcessor = async (context) =>{
	try{
		await context.audioWorklet.addModule(AUDIOTIMER_PROCESSOR_URI)
	}catch(error){
		console.error("AudioWorklet processor cannot be added", error)
	}
	const worker = new TimingAudioWorkletNode(context)

	return worker
}