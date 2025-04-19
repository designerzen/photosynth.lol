export class MelodyRecorder{

    melodyRecorder = new Map()

    constructor(){
        this.melodyRecorder = new Set()
    }

    /**
     * 
     * @param {Note} note 
     * @param {Number} velocity 
     */
    noteOn(note, velocity=1, time=0){
       this.melodyRecorder.add( {time, note, velocity, playing:true} )
    }

    /**
     * 
     * @param {Number} velocity 
     */
    noteOff(note, velocity=1,time=0){
        this.melodyRecorder.add({time,note, velocity, playing:false} )
    }

    getRecording(){
        return this.melodyRecorder
    }
}