const DEFAULT_OPTIONS = {
    backgroundColour:"rgba(0,0,0,0.5)",
    lineColour:"rgb(255 0 0)",
    lineWidth:3,
    fftSize: 512    // 2048
}

export default class AudioVisualiser{

    ctx
    canvas
    width
    height

    analyser

    bufferLength
    dataArray 

    constructor( canvasContext, audioContext, inputAudioNode, options=DEFAULT_OPTIONS ){

        this.options = { ...DEFAULT_OPTIONS,...options }
        this.ctx = canvasContext
        this.canvas = canvasContext.canvas
        this.width = canvasContext.canvas.width
        this.height = canvasContext.canvas.height

        this.analyser = audioContext.createAnalyser()

        this.analyser.fftSize = this.options.fftSize
        // frequencyBinCount = fftSize / 2
        this.bufferLength = this.analyser.frequencyBinCount

        // startIndex = startFrequency / frequencyPerBin
        // endIndex = endFrequency / frequencyPerBin

        // frequencyPerBin = 44100 / 2 * 1024 = 44100 / 2048 ≈ 21.53 Hz per bin
        this.dataArray = new Uint8Array(this.bufferLength)

        // data for drawing to screen
        this.path = new Path2D()

        // connect input to analyser
        inputAudioNode.connect( this.analyser )
        this.analyser.connect( audioContext.destination )
    }

    // For bar charts
    fetchFrequencyData(){
        this.analyser.getByteFrequencyData( this.dataArray )
        return this.dataArray
    }

    // For waveforms
    fetchByteTimeDomainData(){
        this.analyser.getByteTimeDomainData( this.dataArray )
        return this.dataArray
    }

    // clear the canvas of all data
    clear( backgroundColour="rgb(0,0,0)" ){
        this.ctx.fillStyle = backgroundColour
        this.ctx.fillRect(0, 0, this.width, this.height)
    }

    /**
     * Call every frame to show an animated waveform!
     */
    drawWaveform(){
        const sliceWidth = this.width / this.bufferLength
        const h = (this.height / 2)

        // this.fetchFrequencyData()
        this.fetchByteTimeDomainData()

        // reset position
        this.path = new Path2D()
        // this.path.moveTo(0,0)
        let x = 0

        // console.info("updating visualiser", this.dataArray)
        for (let i=0; i<this.bufferLength; ++i)
        {
            const band = this.dataArray[i]

            // Remap 0 -> 128 to 0 -> 1
            const v = band / 128
            const y = v * h * 0.5   // this is just a factor to reduce for clipping
          
            if (i === 0) {
                this.path.moveTo(x, y)
            } else {
                this.path.lineTo(x, y)
            }
            x += sliceWidth
        }

        // close
        // this.path.lineTo(this.width, this.height)

        // paint
        this.clear( this.options.backgroundColour)
        
        // choose colour and size
        this.ctx.lineWidth = this.options.lineWidth
        this.ctx.strokeStyle = this.options.lineColour
        this.ctx.stroke(this.path)
    }

    // TODO:
    drawBarChart(){

    }
}