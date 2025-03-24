let notes
let firstNoteNumber

let canvas
let context

let mirror
let mirrorContext

let loop = false
let vertical = false

const size = 5
let noteSize

const gap = 6

function renderVertical(time) {
    const lurch = 0
    // copy the canvas to the mirror
    mirrorContext.drawImage( canvas, 0, 0, mirror.width, mirror.height, 0, 0, mirror.width, mirror.height ) 
    // clear the mirror completely except for the drawn notes
    context.clearRect( 0, gap, canvas.width, canvas.height )
    // redraw the context from the mirror
    // context.drawImage( mirror, 0, 0, mirror.width, mirror.height, lurch, gap, mirror.width, mirror.height )
}

function renderHorizontal(time) {
    const lurch = 0
    // copy the canvas to the mirror
    mirrorContext.drawImage( canvas, 0, 0, mirror.width, mirror.height, 0, 0, mirror.width, mirror.height ) 
    // clear the mirror completely beyond the drawn notes
    context.clearRect( gap, 0, canvas.width, canvas.height )
    // redraw the context from the mirror
    // context.drawImage( mirror, 0, 0, mirror.width, mirror.height, gap, lurch, mirror.width, mirror.height )
    // context.drawImage( canvas, 0, gap, canvas.width, canvas.height-gap, lurch, 0, canvas.width, canvas.height-gap )
}

function render(time) {
    vertical ? renderVertical(time) : renderHorizontal(time)
    // console.info("render", time)
    if (loop) {
        requestAnimationFrame(render)
    }
}

onmessage = (evt) => {

    if (evt.data.canvas)
    {
        canvas = evt.data.canvas
        // const gl = canvas.getContext("webgl")
        context = canvas.getContext('2d')

        notes = evt.data?.notes ?? []
        firstNoteNumber = notes[0].noteNumber

        mirror = vertical ? 
            new OffscreenCanvas(canvas.width, canvas.height - gap) :
            new OffscreenCanvas(canvas.width - gap, canvas.height)

        mirrorContext = mirror.getContext('2d')
    
        noteSize = vertical ? 
            Math.floor(canvas.width / notes.length) : 
            Math.floor(canvas.height / notes.length)
    
        console.info("mirror created", {firstNoteNumber, mirror, canvas, context, mirrorContext, noteSize, notes })

        loop = true
        render()
        return
    }
     
    vertical = evt.data.vertical
 
    const transposedNoteNumber = evt.data.note - firstNoteNumber
            
    switch (evt.data.type)
    {
        case "noteOn":
           console.info("noteOn", evt.data, transposedNoteNumber )
            context.fillStyle = evt.data.colour
            if (vertical)
            {
                context.fillRect( transposedNoteNumber * noteSize, canvas.height - size, noteSize, size )
            }else{
                context.fillRect( 0, transposedNoteNumber * noteSize, size, noteSize ) 
            }
            break

        case "noteOff":
            if (vertical)
            {
                context.clearRect( transposedNoteNumber * noteSize, canvas.height - gap, noteSize, gap )
            }else{
                context.clearRect( 0, transposedNoteNumber  * noteSize, gap, noteSize ) 
            }
            break

        case "resize":
            canvas.width = evt.data.displayWidth
            canvas.height = evt.data.displayHeight
            break
    }
}
  