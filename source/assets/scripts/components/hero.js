import AbstractInteractive from "./abstract-interactive"

// Figure at the top of the page
export default class Hero extends AbstractInteractive{

    notesPlaying = []
    noteIndex = 0

    constructor( notes, noteOn, noteOff, noteQuantity=20 ){
        super()
        
        this.hero = document.getElementById("hero")
        this.figure = document.getElementById("hero-figure")

        this.notes = notes
        this.keyElements = this.addNotesToDOM(noteQuantity)
		
        this.addInteractivity( this.keyElements, noteOn, noteOff )  
    }

    addNotesToDOM( quantity ){
        const elements = []
        for (let index=0; index<quantity; ++index){
            const i = document.createElement("i")
            i.className = "note-animated"
            i.setAttribute("aria-hidden", "true")
            this.figure.appendChild(i)
            elements.push(i)
        }
        return elements
    }

    noteOn( note, velocity=1, id=0 ){

        const noteElement = this.keyElements[this.noteIndex]
      
        // change note to the correct colour
        noteElement.style.setProperty( "--col-accent", "var("+this.notes[note.noteNumber].asCSSVar+")" )
        // noteElement.style.setProperty( "--path", "var("+this.notes[note.noteNumber].asCSSVar+")" )
        // this.hero.style.setProperty( "--col-accent", "var("+this.notes[note.noteNumber].asCSSVar+")" )

        noteElement.classList.remove("active", "inactive")
        // this.hero.classList.remove("active")
        // this.figure.classList.remove("active")
 
        this.noteIndex = (this.noteIndex + 1) % this.keyElements.length

        // i.textContent = this.notes[note.noteNumber].noteName
        requestAnimationFrame(()=>{
            noteElement.classList.toggle("active", true)
            // this.hero.classList.add("active")
            // this.figure.classList.add("active")
        })
    }

    noteOff( note, velocity=1, id=0 ){
        // this.hero.classList.remove("active")
        // this.figure.classList.remove("active")
        const noteElement = this.keyElements[this.noteIndex - 1]
      
        if (noteElement)
        {
            const n = this.notes[note.noteNumber]
        
            // change note to the correct colour
            n && noteElement.style.setProperty( "--col-accent", "var("+n.asCSSVar+")" )
            // noteElement.style.setProperty( "--path", "var("+this.notes[note.noteNumber].asCSSVar+")" )
            // this.hero.style.setProperty( "--col-accent", "var("+this.notes[note.noteNumber].asCSSVar+")" )

            noteElement.classList.toggle( "inactive", true )
        }
    }
}