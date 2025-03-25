import HTML_CANVAS_WORKER from "url:./offscreen-canvas.js"

export default class NoteVisualiser{

    notes
    canvas
    context
    width
    height
    counter = 0
    started = false

    constructor( notes, canvas, vertical=false, wave=0 ){
        this.notes = notes
        this.canvas = canvas

        // this.context = canvas.getContext('2d')
        // this.offscreenCanvas =  new OffscreenCanvas(256, 256)
       
        this.wave = wave
        this.vertical = vertical

        this.noteSize = vertical ? canvas.width / notes.length : canvas.height / notes.length
       
        this.worker = new Worker(HTML_CANVAS_WORKER)
        const canvasWorker = this.canvas.transferControlToOffscreen()
        this.worker.postMessage({ canvas: canvasWorker, notes }, [canvasWorker])
        
        // this.onResize = this.onResize.bind(this) 
        // const resizeObserver = new ResizeObserver(this.onResize)
        // resizeObserver.observe(canvas, {box: 'content-box'})

        this.advance = this.advance.bind(this) 
    }

    /**
     * 
     * @param {Note} note 
     * @param {number} velocity 
     */
    noteOn( note, velocity=1 ){
       const size = 3
        const truncatedNoteNumber = note.noteNumber - this.notes[0].noteNumber
        // this.context.fillStyle = note.colour
        // if (this.vertical)
        // {
        //     this.context.fillRect( truncatedNoteNumber * this.noteSize, this.height - size, this.noteSize, size )
        // }else{
        //     this.context.fillRect( 0, truncatedNoteNumber * this.noteSize, size, this.noteSize ) 
        // }
        // console.info("noteOn", note, velocity )
        this.worker.postMessage({ type:"noteOn", note:truncatedNoteNumber, colour:note.colour, velocity, vertical:this.vertical })  
    }

    /**
     * 
     * @param {*} note 
     * @param {*} velocity 
     */
    noteOff( note, velocity=1 ){
        const gap = 3
        const truncatedNoteNumber = note.noteNumber - this.notes[0].noteNumber
        console.info("noteOff", truncatedNoteNumber )
        // if (this.vertical)
        // {
        //     this.context.clearRect( truncatedNoteNumber * this.noteSize, this.height - gap, this.noteSize, gap )
        // }else{
        //     this.context.clearRect( 0, truncatedNoteNumber * this.noteSize, gap, this.noteSize ) 
        // }
        this.worker.postMessage({ type:"noteOff", note:truncatedNoteNumber, velocity, vertical:this.vertical })
    }

    advance(){

        const gap = 3
        const zone = 1

        const lurch = this.wave === 0 ? 
            0 : 
            this.wave * (Math.sin(this.counter++ * 0.05))

        console.info(this.wave, "advance", {canvas:this.canvas}, 0, 0, this.width-gap, this.height, gap,lurch, this.width-gap, this.height ) 

        if (this.vertical)
        {
            // (image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
            this.context.drawImage( offscreen, 0, gap, this.width, this.height-gap, lurch, 0, this.width, this.height-gap )
            //this.context.clearRect( 0, this.height-zone, this.width, zone )
        }else{
            // (image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
            this.context.clearRect( gap, 0, this.width, this.height )

            this.context.drawImage( offscreen, 0, 0, this.width-gap, this.height, gap, lurch, this.width-gap, this.height  )
            //this.context.clearRect( 0, 0, zone, this.height )
        }
        requestAnimationFrame( this.advance )
    }
    
    resizeCanvasToDisplaySize(displayWidth, displayHeight ){

        // Get the size the browser is displaying the canvas in device pixels.
        // Check if the canvas is not the same size.
        const needResize = this.canvas.width !== displayWidth || this.canvas.height !== displayHeight

        if (needResize) {
            
            if (this.started)
            {
                this.started = false
            }

            this.started = true

            // Make the canvas the same size
            // this.canvas.width  = displayWidth
            // this.canvas.height = displayHeight

            this.worker.postMessage({ type:"resize", displayWidth, displayHeight, vertical:this.vertical })

            this.noteSize = this.vertical ? 
                this.canvas.width / this.notes.length : 
                this.canvas.height / this.notes.length
      
            this.width = this.canvas.width
            this.height = this.canvas.height

        }

        return needResize
    }
    
    onResize(entries) {
        for (const entry of entries) 
        {
            let width
            let height
            let dpr = window.devicePixelRatio
            let dprSupport = false

            if (entry.devicePixelContentBoxSize) {
                // NOTE: Only this path gives the correct answer
                // The other paths are an imperfect fallback
                // for browsers that don't provide anyway to do this
                width = entry.devicePixelContentBoxSize[0].inlineSize
                height = entry.devicePixelContentBoxSize[0].blockSize
                dpr = 1 // it's already in width and height
                dprSupport = true

            } else if (entry.contentBoxSize) {

                if (entry.contentBoxSize[0]) {

                    width = entry.contentBoxSize[0].inlineSize
                    height = entry.contentBoxSize[0].blockSize

                } else {

                    // legacy
                    width = entry.contentBoxSize.inlineSize
                    height = entry.contentBoxSize.blockSize
                }

            } else {
                // legacy
                width = entry.contentRect.width
                height = entry.contentRect.height
            }

            const displayWidth = Math.round(width * dpr)
            const displayHeight = Math.round(height * dpr)
            
            this.resizeCanvasToDisplaySize(displayWidth, displayHeight)
        }
    }
    
}