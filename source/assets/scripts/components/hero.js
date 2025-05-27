import AbstractInteractive from "./abstract-interactive"

// Figure at the top of the page
export default class Hero extends AbstractInteractive{

    notesPlaying = []
    noteIndex = 0

    constructor( notes, noteOn, noteOff, noteQuantity=20 ){
        super()
        
        this.hero = document.getElementById("hero")
        this.figure = document.getElementById("hero-figure")
        // this.mask = document.getElementById("introduction")
        this.mask = document.getElementById("main-content")

        this.notes = notes
        this.keyElements = this.addNotesToDOM(this.mask, noteQuantity)
		
        this.addInteractivity( this.keyElements, noteOn, noteOff )  
    }

    // Add X notes to the DOM in the specific element
    // NB. THESE RUIN GPU PERFORMANCE
    addNotesToDOM( parent, quantity ){
        const elements = []
        const fragment = document.createDocumentFragment()
        const group = document.createElement("div")

        for (let index=0; index<quantity; ++index){
            const i = document.createElement("i")
            i.className = "note-animated"
            i.setAttribute("aria-hidden", "true")
            group.appendChild(i)
            elements.push(i)
        }

        group.className = "overlaid-notes"
        group.setAttribute("aria-hidden", true)
        group.setAttribute("inert", true)
        fragment.appendChild(group)
        parent.appendChild(fragment)

        return elements
    }

    /**
     * Note ON
     * @param {Note} note 
     * @param {Number} velocity 
     * @param {String} id 
     */
    noteOn( note, velocity=1, id=0 ){

        const noteElement = this.keyElements[this.noteIndex]
      
        if (noteElement)
        {
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
    }

    /**
     * 
     * @param {Note} note 
     * @param {Number} velocity 
     * @param {String} id 
     */
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