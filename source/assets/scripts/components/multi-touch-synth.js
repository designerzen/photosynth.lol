export const registerMultiTouchSynth = ( notes=[], noteOnCallback=null, noteOffCallback=null, onNoteChange=null) => {

    const controller = new AbortController()
    const canvas = document.getElementById("wallpaper")
    // const ctx = canvas.getContext('2d')
    const activeNotes = new Map()

    /**
     * 
     * @param {MouseEvent|TouchEvent} e 
     * @returns {Number}
     */
    const convertPositionToNote = (e) =>{
        const x = e.clientX - canvas.offsetLeft
        const y = e.clientY - canvas.offsetTop
        const canvasWidth = e.target.clientWidth
        const canvasHeight =  e.target.clientHeight
        const percentageX = x / canvasWidth
        const percentageY = y / canvasHeight
        // set frequency based on the mouse position
        // from Octave 3->7
        const octave = 3 + Math.round( percentageX * 4) 
        const note = Math.round(percentageY * 12 + octave * 12 )
        return notes[note%notes.length]
    }

    /**
     * Mouse Down or Touch Started
     * @param {MouseEvent|TouchEvent} e 
     */
    const onInteractionBegin = e => {

        // If the user makes simultaneous touches, the browser will fire a
        // separate touchstart event for each touch point. Thus if there are
        // three simultaneous touches, the first touchstart event will have
        // targetTouches length of one, the second event will have a length
        // of two, and so on.
        e.preventDefault()

        const id = e.pointerId ?? 0
        
        // check for multi-touch!
        const note = convertPositionToNote(e)
        noteOnCallback( note, 1, id )
        activeNotes.set(id, note)
        
        console.info(id, "mouse down", {e})
    }

    /**
     * user has moused out whilst the note was playing, so we turned 
     * it off, but now we want to continue playing it!
     * 
     * @param {MouseEvent|TouchEvent} e 
     * @returns 
     */
    const onInteractionContinue = e => {

        if (activeNotes.size === 0){
            return
        }
  
        e.preventDefault()
       
        activeNotes.forEach(id =>{
            const note = activeNotes.get(id)
            noteOnCallback( note, 1,id )
            
          console.info(id, "mouse continue", {e})
        })
    }
    
    /**
     * 
     * @param {MouseEvent|TouchEvent} e 
     * @returns 
     */
    const onInteractionMoving = e => {

        const id = e.pointerId ?? 0
        
        if (activeNotes.size === 0){
            const note = convertPositionToNote(e)
            onNoteChange && onNoteChange(note, id)
            return
            console.info("ignoring mouse move", { e,  synth })
        }

        // Note: if the user makes more than one "simultaneous" touches, most browsers
        // fire at least one touchmove event and some will fire several touch moves.
        // Consequently, an application might want to "ignore" some touch moves.
        e.preventDefault()

        // check to see if we are already playing
        const activeNote = activeNotes.get(id)

        const note = convertPositionToNote(e)
        if (activeNote && activeNote.noteNumber === note.noteNumber)
        {
            return
        }

        noteOffCallback && noteOffCallback(activeNote, 1, id)
        activeNotes.set(id, note)
        noteOnCallback && noteOnCallback(note, 1, id)

        console.info( id, "mouse move", { e, activeNotes })
    }
  
    /**
     * 
     * @param {MouseEvent|TouchEvent} e 
     */
    const onInteractionEnd = e => {
        e.preventDefault()
        
        const id = e.pointerId ?? 0
        const note = convertPositionToNote(e)
        noteOffCallback( note, 1, id )
        activeNotes.delete(id)
        console.info( id, "mouse up", {e, note, activeNotes})
    }

    canvas.addEventListener("mousedown", onInteractionBegin, { signal: controller.signal, passive: true })
    canvas.addEventListener("mousemove", onInteractionMoving, { signal: controller.signal, passive: true })
    canvas.addEventListener("mouseup", onInteractionEnd, { signal: controller.signal, passive: true })
    window.addEventListener("mouseenter", onInteractionContinue, { signal: controller.signal, passive: true })
    window.addEventListener("mouseout", onInteractionEnd, { signal: controller.signal, passive: true })

    canvas.addEventListener("touchdown", onInteractionBegin, { signal: controller.signal, passive: true})
    canvas.addEventListener("touchup", onInteractionEnd, { signal: controller.signal, passive: true })
    canvas.addEventListener("touchcancel", onInteractionEnd, { signal: controller.signal, passive: true })
    canvas.addEventListener("touchmove", onInteractionMoving, { signal: controller.signal, passive: true })
 
    // Clean up and kill all objects
    return ()=>{
        controller.abort()
    }
}