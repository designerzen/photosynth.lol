export default class Visualiser{

    ctx
    canvas
    width
    height

    analyser

    bufferLength
    dataArray 

    constructor( canvasContext, audioContext, inputAudioNode ){

        const fftSize = 512 // 2048

        this.ctx = canvasContext
        this.canvas = canvasContext.canvas
        this.width = canvasContext.canvas.width
        this.height = canvasContext.canvas.height

        this.analyser = audioContext.createAnalyser()

        this.analyser.fftSize = fftSize
        // frequencyBinCount = fftSize / 2
        this.bufferLength = this.analyser.frequencyBinCount

        // startIndex = startFrequency / frequencyPerBin
        // endIndex = endFrequency / frequencyPerBin

        // frequencyPerBin = 44100 / 2 * 1024 = 44100 / 2048 ≈ 21.53 Hz per bin
        this.dataArray = new Uint8Array(this.bufferLength)

        // data for drawing to screen
        this.path = new Path2D()
    }

    fetchFrequencyData(){
        analyser.getByteFrequencyData( this.dataArray )
        return this.dataArray
    }

    fetchByteTimeDomainData(){
        analyser.getByteTimeDomainData( this.dataArray )
        return this.dataArray
    }

    clear( colour="rgb(200 200 200)" ){
        this.ctx.fillStyle = colour
        this.ctx.fillRect(0, 0, this.width, this.height)
        this.ctx.lineWidth = 2
        this.ctx.strokeStyle = "rgb(0 0 0)"
        this.ctx.beginPath()
    }

    draw(){

    }
}