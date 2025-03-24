export default class AbstractInteractive{

    constructor(){

    }

	/**
	 * Add interactivity to the keyboard and wire these
	 * to the noteOn and noteOff functions provided
	 * @param {Function} noteOn 
	 * @param {Function} noteOff 
	 */
	addInteractivity( keys, noteOn, noteOff ){
		
		if(!keys)
		{
			throw Error("No keys provided to add interactivity to")
		}

		const controller = new AbortController()
		
		keys.forEach( (button, i) => {
		
			let previousNote 
		
			const onPianoInteractionStarting = (event) => {

				if (event.preventDefault)
				{
					event.preventDefault()
				}
		
				let pressure = 1
				if ((typeof(event.targetTouches) != 'undefined') && (event.targetTouches.length > 0) && (typeof(event.targetTouches[0].force) != 'undefined')) {
					pressure = event.targetTouches[0].force
				} else if (typeof(event.webkitForce) != 'undefined') {
					pressure = event.webkitForce
				} else if (typeof(event.pressure) != 'undefined') {
					pressure = event.pressure
				}

        		const note = this.getNoteFromKey(button)
		
				// noteName = button.getAttribute("data-attribute-note")
				// convert name into MIDI note number
				// const note = convertNoteNameToMIDINoteNumber(noteName)
				
				// console.info("REQUEST START", {note, noteName, GENERAL_MIDI_INSTRUMENTS})
				
				const starting = noteOn(note, pressure, this)
				previousNote = note
                
                this.isTouching = true
				
				// starting & document.querySelector(`.indicator[data-attribute-note="${noteName}"]`)?.classList?.toggle("active", true)
			
				document.addEventListener("mouseleave", onInterationComplete, {signal: controller.signal, passive: true})
				document.addEventListener("mouseup", onInterationComplete, {signal: controller.signal, passive: true})
				
				document.addEventListener("touchend", onInterationComplete, {signal: controller.signal, passive: true})
				document.addEventListener("touchcancel", onInterationComplete, {signal: controller.signal, passive: true})
			}
		
			const onInterationComplete = (event) => {
				if (event.preventDefault)
				{
					event.preventDefault()
				}
				
				document.removeEventListener("mouseleave", onInterationComplete)
				document.removeEventListener("mouseup", onInterationComplete)
				
				document.removeEventListener("touchend", onInterationComplete)
				document.removeEventListener("touchcancel", onInterationComplete)
				
				noteOff(previousNote,1,this)
				this.isTouching = false
				previousNote = null
				
				// document.querySelector(`.indicator[data-attribute-note="${noteName}"]`)?.classList?.toggle("active", false)
			}
		
			button.addEventListener("touchstart", onPianoInteractionStarting, {signal: controller.signal,passive: true}) 
			button.addEventListener("mousedown", onPianoInteractionStarting, {signal: controller.signal,passive: true})
			
			// if the user has finger down but they change keys...
			button.addEventListener("mouseenter", event => {
				if (event.preventDefault)
				{
					event.preventDefault()
				}
		
				if (this.isTouching)
				{	
					const note = this.getNoteFromKey(button)
					// document.querySelector(`.indicator[data-attribute-note="${previousNote}"]`)?.classList?.toggle("active", false)
					// document.querySelector(`.indicator[data-attribute-note="${noteName}"]`)?.classList?.toggle("active", true)
										
					// console.info("REQUEST CHANGE", {note, noteName,GENERAL_MIDI_INSTRUMENTS})
					// pitch bend!
					noteOn(note, 1, this)
					previousNote = note
				}else{
					// console.warn("REQUEST CHANGE IGNORED")
				}
			}, {signal: controller.signal,passive: true})
		
			button.addEventListener("mouseleave", event => {
				if (event.preventDefault)
				{
					event.preventDefault()
				}
                if (previousNote)
                {
                    noteOff(previousNote,1,this)
					previousNote = null
                }

				// this.isTouching = false
				// document.querySelector(`.indicator[data-attribute-note="${noteName}"]`)?.classList?.toggle("active", false)
			}, {signal: controller.signal, passive: true})
		
			// button.addEventListener("mouseup", event => {
			// 	console.error(button, event)
			// 	this.isTouching = false
			// })
		})
		return ()=>{
			controller.abort()
		}
	}
}