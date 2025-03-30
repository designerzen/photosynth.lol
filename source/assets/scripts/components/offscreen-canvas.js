let notes
let firstNoteNumber

let canvas
let context

let mirror
let mirrorContext

let loop = false
let vertical = false
let wave = 0

// size of the inital note that is smeared
let noteSize

// size of the cloner
const size = 10

// size to overlap
const gap = 50 //6

let counter = 0

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

function renderHorizontal(time) {
    const lurch = 0

    // copy the canvas to the mirror
    mirrorContext.drawImage( canvas, 0, 0, mirror.width, mirror.height, 0, 0, mirror.width, mirror.height ) 
    context.drawImage( mirror, 0, 0, mirror.width, mirror.height, gap, lurch, mirror.width, mirror.height )
    
    // clear the mirror completely beyond the drawn notes
    // context.clearRect( gap, 0, canvas.width, canvas.height )
    // redraw the context from the mirror

    // context.drawImage( canvas, 0, gap, canvas.width, canvas.height-gap, lurch, 0, canvas.width, canvas.height-gap )
    console.info("renderHorizontal",0, 0, mirror.width, mirror.height, 0, 0, mirror.width, mirror.height )
    // console.info("renderHorizontal", mirror.width, mirror.height, canvas.width, canvas.height )
}

function render() {
    vertical ? renderVertical(counter) : renderHorizontal(counter)
 
    counter = counter+1 % 999
    // console.info("render", counter)

    // context.fillStyle = "#ff0000"
    // context.fillRect( 
    //     Math.random() * 400, 
    //     Math.random() * 400, 
    //     Math.random() * 400, 
    //     Math.random() * 400
    // )

    if (loop) {
        requestAnimationFrame(render)
    }
}

const determineNoteSize = () => {
    noteSize = vertical ? 
        Math.floor(canvas.width / notes.length) : 
        Math.floor(canvas.height / notes.length)
}

onmessage = (evt) => {

    console.error("NOTEVIZ worker message", evt)

    if (evt.data.canvas)
    {
        canvas = evt.data.canvas
        context = canvas.getContext('2d')

        notes = evt.data?.notes ?? []
        firstNoteNumber = notes[0].number
        // console.info("firstNoteNumber", firstNoteNumber, notes[0], {notes})

        // clone the canvas
        mirror = vertical ? 
            new OffscreenCanvas(canvas.width, canvas.height - gap) :
            new OffscreenCanvas(canvas.width - gap, canvas.height)

        mirrorContext = mirror.getContext('2d')
    
        determineNoteSize()

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
            if (vertical)
            {
                context.fillRect( transposedNoteNumber * noteSize, canvas.height - size, noteSize, size )
            }else{
                context.fillRect( 0, transposedNoteNumber * noteSize, size, noteSize ) 
            }
            console.info("VIZ:noteOn", evt.data.note, {firstNoteNumber, transposedNoteNumber}, notes[0], {notes} ) 
            // console.info("VIZ:noteOn", evt.data, evt.data.colour, {transposedNoteNumber, noteSize, size, vertical},  transposedNoteNumber * noteSize, canvas.height - size, noteSize, size, ':',  0, transposedNoteNumber * noteSize, size, noteSize )
            break

        case "noteOff":
            if (vertical)
            {
                context.clearRect( transposedNoteNumber * noteSize, canvas.height - gap, noteSize, gap )
            }else{
                context.clearRect( 0, transposedNoteNumber * noteSize, gap, noteSize ) 
            }
            console.info("VIZ:noteOff", evt.data, transposedNoteNumber )
            break

        case "resize":
            canvas.width = evt.data.displayWidth
            canvas.height = evt.data.displayHeight
            mirror.width = evt.data.displayWidth
            mirror.height = evt.data.displayHeight
            determineNoteSize()
            console.error("mirror", noteSize, evt.data.displayWidth, evt.data.displayHeight, canvas.width, canvas.height )
            break
    }
}