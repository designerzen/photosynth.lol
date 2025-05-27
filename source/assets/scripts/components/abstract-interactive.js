const DEFAULT_MOUSE_ID = 1

export default class AbstractInteractive{

    activeNotes = new Map()

    constructor(){}

	/**
	 * Add interactivity to the keyboard and wire these
	 * to the noteOn and noteOff functions provided
	 * @param {Function} noteOn - method to call to play a note
	 * @param {Function} noteOff - method to call to stop the playing note
	 * @param {Boolean} passive - use passive listeners 
	 */
	addInteractivity( keys, noteOn, noteOff, passive=true ){
		
		if(!keys)
		{
			throw Error("No keys provided to add interactivity to")
		}

		const controller = new AbortController()
		
		keys.forEach( (button, i) => {
		
			let previousNote 
		
            // can come from a touch a mouse click or a keyboard enter press
			const onInteractionStarting = (event) => {

                const id = 1    // always one for mouse
                const touches = evt.changedTouches

                console.log("on interaction", {event, id, touches})
                
				// Keypresses other than Enter and Space should not trigger a command
				if (
					event instanceof KeyboardEvent &&
					event.key !== "Enter" &&
					event.key !== " "
				) {
					return
				}

				if (!passive && event.preventDefault)
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
		
				// noteName = button.getAttribute("data-note")
				// convert name into MIDI note number
				// const note = convertNoteNameToMIDINoteNumber(noteName)
				
				// console.info("REQUEST START", {note, noteName, GENERAL_MIDI_INSTRUMENTS})
				
				const starting = noteOn(note, pressure, id)
				previousNote = note
                this.activeNotes.set( id, note )
                
                this.isTouching = true
				
				// starting & document.querySelector(`.indicator[data-note="${noteName}"]`)?.classList?.toggle("active", true)
			
				document.addEventListener("mouseleave", onInterationComplete, {signal: controller.signal, passive: true})
				document.addEventListener("mouseup", onInterationComplete, {signal: controller.signal, passive: true})
				
				document.addEventListener("touchend", onInterationComplete, {signal: controller.signal, passive: true})
				document.addEventListener("touchcancel", onInterationComplete, {signal: controller.signal, passive: true})
			}
		
			const onInterationComplete = (event) => {
				// Keypresses other than Enter and Space should not trigger a command
				if (
					event instanceof KeyboardEvent &&
					event.key !== "Enter" &&
					event.key !== " "
				) {
					return
				}

				if (!passive && event.preventDefault)
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
				
				// document.querySelector(`.indicator[data-note="${noteName}"]`)?.classList?.toggle("active", false)
			}
            
            // button.addEventListener("mousemove", handleMove)
            // button.addEventListener("touchmove", handleMove)
			button.addEventListener("touchstart", e => onInteractionStarting(e, e.id), {signal: controller.signal,passive}) 
          
            // MOUSE =================================================================

            // MOUSE DOWN - turn on note and cache event
            button.addEventListener("mousedown", e => onInteractionStarting(e, DEFAULT_MOUSE_ID), {signal: controller.signal,passive})
			
			// if the user has finger down but they change keys...
			button.addEventListener("mouseenter", event => {
              
				if (!passive && event.preventDefault)
				{
					event.preventDefault()
				}

				if (this.isTouching)
				{	
					const note = this.getNoteFromKey(button)
					// document.querySelector(`.indicator[data-note="${previousNote}"]`)?.classList?.toggle("active", false)
					// document.querySelector(`.indicator[data-note="${noteName}"]`)?.classList?.toggle("active", true)
										
					// console.info("REQUEST CHANGE", {note, noteName,GENERAL_MIDI_INSTRUMENTS})
					// pitch bend!
					noteOn(note, 1, DEFAULT_MOUSE_ID)
					previousNote = note
				}else{
					// console.warn("REQUEST CHANGE IGNORED")
				}
			}, {signal: controller.signal, passive})
		    
            // Mouse OUT - turn off note
			button.addEventListener("mouseleave", event => {
				if (!passive && event.preventDefault)
				{
					event.preventDefault()
				}
                
				if (previousNote)
                {
                    noteOff(previousNote,1,this)
					previousNote = null
                }

                this.activeNotes.delete( DEFAULT_MOUSE_ID )

				// this.isTouching = false
				// document.querySelector(`.indicator[data-note="${noteName}"]`)?.classList?.toggle("active", false)
			}, {signal: controller.signal, passive })
		
            // handled by document mouse up
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