import { easeOutSine } from "../easing"

const TAU = Math.PI * 2
const FRICTION = 0.3

const STROKE = 4
const MIN_RADIUS = 12
const MAX_RADIUS = 88
const RADIUS_RANGE = MAX_RADIUS - MIN_RADIUS

const MAX_SIZE = (MAX_RADIUS + STROKE) * 2
const HALF_MAX_RADIUS = MAX_SIZE / 2

const SHRINK_DURATION = 202 // 101 is good   // this should be similar to the decay on the instrument

let mouseDown = false 
let mouseX = 0
let mouseY = 0
let currentX = 0
let currentY = 0

let radius = MAX_RADIUS
let lastNoteColour

let canvas
let context
const notes = new Set()

let countDown = 0

/**
 * Draw mouse circle onto canvas and lerp towards
 * @param {Number} radius 
 * @returns 
 */
function renderMouse(x, y, radius=MAX_RADIUS){
  
    /*
    // draw a circle at the mouse position
    const path = new Path2D()
    path.moveTo(x, y)
    // arc(x, y, radius, startAngle, endAngle, counterclockwise)
    path.arc(x, y, radius, 0, TAU, true)
    path.closePath()

    context.fillStyle = lastNoteColour
    context.fill(path)

    // now draw the outlines...
    context.strokeStyle = mouseDown ? lastNoteColour : 0x000000
    context.lineWidth = mouseDown ? STROKE : 8
    context.stroke(path)
*/

    if (notes.size > 0)
    {
        // now fill the other segments
        const radians = TAU / notes.size
        let last = -Math.PI * 0.5
       
        let i = 0
        // draw parts of the PI!
        notes.forEach((data, colour, map) => {
            const segment = new Path2D()
            segment.moveTo(x, y)
            // arc(x, y, radius, startAngle, endAngle, counterclockwise)
            segment.arc(x, y, radius, last, radians, true)
            segment.closePath()
            
            context.fillStyle = colour
            context.fill(segment)
            
            last += radians
            console.error(i++, "->", radians * (180/Math.PI),  {countDown, x, y, radius, colour, last, radians, notes} )
        })
    }
    
 
    // only fill if mouse is pressed or the circle is shrinking out 
    // if (mouseDown || countDown > 0)
    // {
    //     context.fillStyle = lastNoteColour ?? 'rgba(0,0,0,0.8)'
    //     // console.info(countDown, "RENDER MOUSEMOVE", lastNoteColour, {mouseDown, x, y, canvas},  canvas.width, canvas.height )
    // }else{
    //     // console.info("skipping fill")
    //     context.fillStyle = lastNoteColour ?? 'rgba(0,0,0,0.8)'
    // }
}

/**
 * Loop starts when mouse event and continues until cursor is in position
 */
function render() {

    // clear previous shape
    context.clearRect( currentX - HALF_MAX_RADIUS, currentY - HALF_MAX_RADIUS, MAX_SIZE, MAX_SIZE )

    // clear full screen (greedy)
    // context.clearRect( 0, 0, canvas.width, canvas.height )

    // shrink radius if mouse is not held down
    if (!mouseDown && countDown > 0)
    {
        // 0 -> 1
        countDown--
        radius = MIN_RADIUS + RADIUS_RANGE * easeOutSine( countDown / SHRINK_DURATION )
    }

    // LERP TOWARDS MOUSE!
    currentX += (mouseX - currentX) * FRICTION
    currentY += (mouseY - currentY) * FRICTION

    // redraw the mouse position
    // if (radius > 0 )
    // {
        renderMouse( currentX, currentY, radius  )
    // }
    
    // console.info("mouse visualiser", countDown, {mouseX, mouseY, currentX, currentY, radius}, easeOutSine( countDown / SHRINK_DURATION ) )

    // continue to loop until we have reached the mouse position
    // if (currentX !== mouseX || currentY !== mouseY || countDown > 0)
    // {
    //     requestAnimationFrame(render)
    // }

    requestAnimationFrame(render)
}


onmessage = (evt) => {

    if (evt.data.canvas)
    {
        canvas = evt.data.canvas
        context = canvas.getContext('2d')
        requestAnimationFrame(render)
        return
    }
   
    switch (evt.data.type)
    {
        case "noteOn":
            lastNoteColour = evt.data.colour
            notes.add( evt.data.colour )
          
            countDown = SHRINK_DURATION
            radius = MAX_RADIUS
            console.error("VIZ:noteOn", notes ) 
            break

        case "noteOff":
            lastNoteColour = "transparent"
            // FIXME:
            notes.delete(evt.data.colour)
            console.error("VIZ:noteOff", notes ) 
         
            // console.info("VIZ:noteOff", evt.data, {lastNoteColour} )
            break

        case "mouse":
            mouseX = evt.data.x
            mouseY = evt.data.y
            mouseDown = evt.data.pressed
            break

        case "resize":
            // console.info("Resize", evt.data)
            // FIXME: If we are on a 4k screen this may be a huge width
            // so we should have a divison factor to scale the canvas for
            // higher than 2048 then divide the size by 2 and use CSS to scale it
            canvas.width = evt.data.displayWidth
            canvas.height = evt.data.displayHeight
            break
    }
}