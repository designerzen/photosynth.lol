export const DEFAULT_MOUSE_ID = 1

export default class AbstractInteractive{

    activeId = new Map()
    activeNotes = new Map()
    glide = false

    constructor( pitchBend=true ){
        this.glide = pitchBend
    }

	/**
	 * Add interactivity to the keyboard and wire these
	 * to the noteOn and noteOff functions provided
	 * @param {Function} noteOn - method to call to play a note
	 * @param {Function} noteOff - method to call to stop the playing note
	 * @param {Boolean} passive - use passive listeners 
	 */
	addInteractivity( buttonElements, noteOn, noteOff, passive=true ){
		
		if(!buttonElements)
		{
			throw Error("No keys provided to add interactivity to")
		}

		const controller = new AbortController()
	
		buttonElements.forEach( (button, i) => {
		
            // can come from a touch a mouse click or a keyboard enter press
			const onInteractionStarting = (event ) => {

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

				const pressure = event.pressure ?? event.webkitForce ?? 1
                const id = event.pointerId ?? DEFAULT_MOUSE_ID
        		const note = this.getNoteFromKey(button)

                switch (event.pointerType) {
                    case "mouse":
                      break;
                    case "pen":
                      break;
                    case "touch":
                      break;
                    default:
                     // console.log(`pointerType ${ev.pointerType} is not supported`);
                  }
		
                 
				// noteName = button.getAttribute("data-note")
				// convert name into MIDI note number
				// const note = convertNoteNameToMIDINoteNumber(noteName)
				
				// console.info("REQUEST START", {note, noteName, GENERAL_MIDI_INSTRUMENTS})
				
				const starting = noteOn(note, pressure, id) 
                this.activeNotes.set( id, note )
                console.warn( id, "BEGIN:pointer", event.pointerType, {event, pressure, note}, this.activeNotes)
                
                // console.log(id, type, "START on interaction", {starting, note,previousNote,  event, pressure, touches}) 
                this.isTouching = true
                this.activeId.set( id, true )
				
				document.addEventListener("pointerleave", onInterationComplete, {signal: controller.signal, passive })
				document.addEventListener("pointerup", onInterationComplete, {signal: controller.signal, passive })
				document.addEventListener("pointerend", onInterationComplete, {signal: controller.signal, passive })
				document.addEventListener("pointercancel", onInterationComplete, {signal: controller.signal, passive })
                document.addEventListener("visibilitychange", onInterationComplete,  {signal: controller.signal, passive })
			}
		
            /**
             * 
             * @param {Event} event 
             * @returns 
             */
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

             
				document.removeEventListener("pointerleave", onInterationComplete)
				document.removeEventListener("pointerup", onInterationComplete)
				
				document.removeEventListener("pointerend", onInterationComplete)
				document.removeEventListener("pointercancel", onInterationComplete)
				
                document.removeEventListener("visibilitychange", onInterationComplete )

                const id = event.pointerId ?? DEFAULT_MOUSE_ID
                const currentlyPlayingNote = this.activeNotes.get( id )
               
                if (currentlyPlayingNote)
                {
                    noteOff(currentlyPlayingNote, 1, id)
                    console.warn(id, "END:pointer", event.pointerType, {event, currentlyPlayingNote}, this.activeNotes)

                }else{
                    console.warn(id, "END:pointer BUT NOTHING TO END???", event.pointerType, {event, currentlyPlayingNote}, this.activeNotes)

                }
				
                
                this.activeNotes.delete( id )
                this.activeId.delete( id )
                
                // console.log(id, type, "END on interaction", {previousNote, event, id })

                // check for amount of touches...
                 // const touches = event.changedTouches
				// this.isTouching = this.activeNotes.size > 0
				// document.querySelector(`.indicator[data-note="${noteName}"]`)?.classList?.toggle("active", false)
			}
           
            button.addEventListener("pointerdown", onInteractionStarting, {signal: controller.signal,passive})
			
			// if the user has finger down but they change keys...
			button.addEventListener("pointerenter", event => {
              
                // console.info("pointerenter", previousNote)
				if (!passive && event.preventDefault)
				{
					event.preventDefault()
				}

                const id = event.pointerId ?? DEFAULT_MOUSE_ID
                const isActive = this.activeId.get( id )
                console.warn(id, "pointerenter", event.pointerType, {event, currentlyPlayingNote: isActive})

				if (isActive)
				{	
					const requestedNote = this.getNoteFromKey(button)
					// document.querySelector(`.indicator[data-note="${previousNote}"]`)?.classList?.toggle("active", false)
					// document.querySelector(`.indicator[data-note="${noteName}"]`)?.classList?.toggle("active", true)
                    if (!this.glide)
                    {
                    	// TODO: pitch bend!
                      
                    }

					// console.info("REQUEST CHANGE", {note, noteName,GENERAL_MIDI_INSTRUMENTS})
                    const currentlyPlayingNote = this.activeNotes.get( id )
                    if (currentlyPlayingNote)
                    {
                        noteOff(currentlyPlayingNote, 1, id)
                    } 
					noteOn(requestedNote, 1, id)

                    // overwrite the pointer
                    this.activeNotes.set( id, requestedNote )

                    console.log(id, "ALTER interaction", {requestedNote, event, id })
               
				}else{
					console.warn("REQUEST CHANGE IGNORED")
				}
                
			}, {signal: controller.signal, passive})
		    
            // Mouse OUT - turn off note
			button.addEventListener("pointerleave", event => {
              
				if (!passive && event.preventDefault)
				{
					event.preventDefault()
				}
        
                const id = event.pointerId ?? DEFAULT_MOUSE_ID
                const currentlyPlayingNote = this.activeNotes.get( id )
				if (currentlyPlayingNote)
                {
                    noteOff(currentlyPlayingNote,1,id)
                    this.activeNotes.delete( id )
                    console.warn(id, "pointerleave NOTE OFF", event, this.activeNotes)
                }else{
                    console.warn(id, "pointerleave IGNORED", event, this.activeNotes)
                }

				this.isTouching = this.activeNotes.size > 0
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