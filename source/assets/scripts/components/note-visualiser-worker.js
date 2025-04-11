import { VISUALISER_OPTIONS } from "../settings"

let notes
let firstNoteNumber

let loop = false
let vertical = false
let noteOnCount = 0
let wave = 0

let lastNoteColour

// Canvases
let canvas
let context
let mirror
let mirrorContext

// size of the inital note that is smeared
let noteSize
const noteDepth = 10

const overlap = 1

// size to overlap smear
const gap = noteDepth - overlap

// timer
let counter = 0


/**
 * SCROLL / Smear horizontally
 * @param {Number} time 
 */
function renderVertical(time) {
    const lurch = wave === 0 ? 
        0 : 
        this.wave * (Math.sin(this.counter++ * 0.05))

    // copy the canvas to the mirror
    mirrorContext.drawImage( canvas, 0, 0, mirror.width, mirror.height, 0, 0, mirror.width, mirror.height ) 
    // clear the mirror completely except for the drawn notes
    // context.clearRect( 0, gap, canvas.width, canvas.height )
    // redraw the context from the mirror
    // context.drawImage( mirror, 0, 0, mirror.width, mirror.height, lurch, gap, mirror.width, mirror.height )
}

/**
 * SCROLL / Smear horizontally
 * @param {Number} time 
 */
function renderHorizontal(time) {
    const lurch = 0

    // copy the canvas to the mirror
    mirrorContext.drawImage( canvas, 0, 0, mirror.width, mirror.height, 0, 0, mirror.width, mirror.height ) 
    context.drawImage( mirror, 0, 0, mirror.width, mirror.height, gap, lurch, mirror.width, mirror.height )
    
    // clear the mirror completely beyond the drawn notes
    // context.clearRect( gap, 0, canvas.width, canvas.height )
    // redraw the context from the mirror

    // context.drawImage( canvas, 0, gap, canvas.width, canvas.height-gap, lurch, 0, canvas.width, canvas.height-gap )
    // console.info("renderHorizontal",0, 0, mirror.width, mirror.height, 0, 0, mirror.width, mirror.height )
    // console.info("renderHorizontal", mirror.width, mirror.height, canvas.width, canvas.height )
}


function render() {
    vertical ? 
        renderVertical(counter) : 
        renderHorizontal(counter)
 
    counter = counter+1 % 999
  
    // context.fillStyle = "#ff0000"
    // context.fillRect( 
    //     Math.random() * 400, 
    //     Math.random() * 400, 
    //     Math.random() * 400, 
    //     Math.random() * 400
    
    if (loop) {
        requestAnimationFrame(render)
    }
}

const determineNoteSize = (isVertical) => {
    return isVertical ? 
        Math.floor(canvas.width / notes.length) : 
        Math.floor(canvas.height / notes.length)
}

const determineMirrorSize = (isVertical) => {
    return isVertical ?
        { width:canvas.width, height:canvas.height - gap} :
        { width:canvas.width - gap, height:canvas.height} 
}

onmessage = (evt) => {

    // console.error("NOTEVIZ worker message", evt)

    if (evt.data.canvas)
    {
        canvas = evt.data.canvas
        context = canvas.getContext('2d')
        notes = evt.data?.notes ?? []
        firstNoteNumber = notes[0].number
        // console.info("firstNoteNumber", firstNoteNumber, notes[0], {notes})

        const mirrorDimensions = determineMirrorSize(vertical)
      
        // clone the canvas
        mirror = new OffscreenCanvas( mirrorDimensions.width, mirrorDimensions.height )

        mirrorContext = mirror.getContext('2d')
    
        noteSize = determineNoteSize(vertical)

        loop = true
        render()
        
        console.info("mirror created", canvas.width, canvas.height , notes.length, {firstNoteNumber, mirror, canvas, context, mirrorContext, noteSize, notes })
        
        return
    }
     
    vertical = evt.data.vertical
 
    const transposedNoteNumber = Math.max( firstNoteNumber, evt.data.note - firstNoteNumber )
            
    switch (evt.data.type)
    {
        case "noteOn":
            context.fillStyle = evt.data.colour
            lastNoteColour = evt.data.colour
            if (vertical)
            {
                context.fillRect( transposedNoteNumber * noteSize, canvas.height - noteDepth, noteSize, noteDepth )
            }else{
                context.fillRect( 0, transposedNoteNumber * noteSize, noteDepth, noteSize ) 
            }
            noteOnCount++
            // console.info("VIZ:noteOn", evt.data.note, {firstNoteNumber, transposedNoteNumber}, notes[0], {notes} ) 
            break

        case "noteOff":
            context.fillStyle = VISUALISER_OPTIONS.backgroundColour
            lastNoteColour = VISUALISER_OPTIONS.backgroundColour
            if (vertical)
            {
                // context.clearRect( transposedNoteNumber * noteSize, canvas.height - gap, noteSize, gap )
                context.fillRect( transposedNoteNumber * noteSize, canvas.height - gap, noteSize, gap )
            }else{
                // context.clearRect( 0, transposedNoteNumber * noteSize, gap, noteSize ) 
                context.fillRect( 0, transposedNoteNumber * noteSize, gap, noteSize ) 
             }
             noteOnCount--
            //console.info("VIZ:noteOff", evt.data, transposedNoteNumber )
            break

        case "coord":
            mouseX = evt.data.x
            mouseY = evt.data.y
            mouseDown = evt.data.pressed
            break

        case "resize":
            // FIXME: If we are on a 4k screen this may be a huge width
            // so we should have a divison factor to scale the canvas for
            // higher than 2048 then divide the size by 2 and use CSS to scale it
            canvas.width = evt.data.displayWidth
            canvas.height = evt.data.displayHeight
            
            const mirrorDimensions = determineMirrorSize(vertical)
            mirror.width = mirrorDimensions.width
            mirror.height = mirrorDimensions.height
            
            noteSize = determineNoteSize(vertical)
            //console.error("mirror", noteSize, evt.data.displayWidth, evt.data.displayHeight, canvas.width, canvas.height )
            break
    }
}