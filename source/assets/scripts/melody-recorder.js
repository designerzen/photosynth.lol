export class MelodyRecorder{

    #melodyRecorder = new Map()

    constructor(){
        this.#melodyRecorder = new Set()
    }

    /**
     * 
     * @param {Note} note 
     * @param {Number} velocity 
     */
    noteOn(note, velocity=1, time=0){
       this.#melodyRecorder.add( {time, note, velocity, playing:true} )
    }

    /**
     * 
     * @param {Number} velocity 
     */
    noteOff(note, velocity=1,time=0){
        this.#melodyRecorder.add({time,note, velocity, playing:false} )
    }

    getRecording(){
        return Array.from(this.#melodyRecorder) 
    }

    loadFromLocalStorage( key ){
        const arrayDataString = localStorage.getItem( key )
        if (arrayDataString)
        {
            const arrayData = JSON.parse(arrayDataString)
            console.error({arrayData, arrayDataString}, this.getRecording())

            arrayData.forEach(item =>{
                 console.error({item})
                 this.#melodyRecorder.add(item)
            })
            return this.#melodyRecorder
        }
        return false
    }

    sveToLocalStorage( key ){
        localStorage.setItem( key, JSON.stringify(this.getRecording() ) )
        return this.#melodyRecorder
    }
}