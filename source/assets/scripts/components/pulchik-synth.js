/**
 * This simply connects the buttons to the Audio Subsystem
 */
export default class CircleSynth extends AbstractInteractive{

    #element

    constructor( notes, noteOn, noteOff, setMode, setTimbre, mode=0, octave=4 ){
		super()

        const chordOn = (noteModel, velocity=1, id=0, idOffset=0) => {
            noteOn( noteModel, velocity, id, null, this.mode, idOffset )
        }
        const chordOff = (noteModel, velocity=1, id=0, idOffset=0) => {
            noteOff( noteModel, velocity, id, null, this.mode, idOffset )
        }

        this.addInteractivity( this.keyElements, chordOn, chordOff )  
    }

    addMusicToButtons(){
        const htmlElementKeys = Array.from( this.#element.querySelectorAll(query) )
      
    }
}