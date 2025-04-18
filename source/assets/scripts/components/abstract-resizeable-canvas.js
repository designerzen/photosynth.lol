export class AbstractResizeable{

    element
    worker

    /**
     * 
     * @param {HTMLElement} canvas 
     * @param {String} workerURI 
     * @param {Object} optional 
     */
    constructor( canvas, workerURI, optional={} ){
        this.element = canvas        
        this.optional = optional        
        this.onResize = this.onResize.bind(this) 
     
        const canvasWorker = canvas.transferControlToOffscreen()
        const payload = { canvas:canvasWorker, ...this.optional }
        this.worker = new Worker(workerURI)
        this.worker.postMessage(payload, [canvasWorker])
        
        const resizeObserver = new ResizeObserver(this.onResize)
        resizeObserver.observe(canvas, {box: 'content-box'})
    }
    
    /**
     * 
     * @param {Number} displayWidth 
     * @param {Number} displayHeight 
     * @returns 
     */
    resizeCanvasToDisplaySize(width, height, dpr ){

        const displayWidth = Math.round(width * dpr)
        const displayHeight = Math.round(height * dpr)
        
        console.error( "size",{ displayWidth, displayHeight, dpr, width, height })
        // Get the size the browser is displaying the canvas in device pixels.
        // Check if the canvas is not the same size.
        const needResize = this.element.width !== displayWidth || this.element.height !== displayHeight

        if (needResize) 
        {
            this.started = true

            this.width = displayWidth
            this.height = displayHeight

            // NB. Make the canvas the same size via OffscreenCanvas
            //      this.canvas.width  = displayWidth
            //      this.canvas.height = displayHeight
            const payload = { type:"resize", displayWidth, displayHeight, ...this.optional }
            this.worker.postMessage(payload)
        }

        return needResize
    }
    
    /**
     * EVENT
     * @param {Array} entries 
     */
    onResize(entries) {
       
        for (const entry of entries) 
        {
            let width
            let height
            let dpr = window.devicePixelRatio
            // let dprSupport = false

            if (entry.devicePixelContentBoxSize) {
                // NOTE: Only this path gives the correct answer
                // The other paths are an imperfect fallback
                // for browsers that don't provide anyway to do this
                width = entry.devicePixelContentBoxSize[0].inlineSize
                height = entry.devicePixelContentBoxSize[0].blockSize
                dpr = 1 // it's already in width and height
                // dprSupport = true

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


            this.resizeCanvasToDisplaySize(width, height, dpr)
        }
    }
}