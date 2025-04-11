/**
 * Scrolling note on / off visualisation
 */

import NOTE_VISUALISER_CANVAS_WORKER from "url:./note-visualiser-worker.js"
import { AbstractResizeable } from "./abstract-resizeable-canvas.js"

export default class NoteVisualiser extends AbstractResizeable{

    notes
    canvas
    context

    height
    counter = 0
    notesOn = 0

    started = false
    mouseDown = false

    mouseX = 0
    mouseY = 0

    constructor( notes, canvas, vertical=false, wave=0 ){
        
        super(canvas, NOTE_VISUALISER_CANVAS_WORKER, {vertical, notes})

        this.notes = notes
        this.canvas = canvas

        // this.context = canvas.getContext('2d')
        // this.offscreenCanvas =  new OffscreenCanvas(256, 256)
       
        this.wave = wave
        this.vertical = vertical

        // start!
        // this.advance()
    }

    /**
     * Note On
     * @param {Note} note 
     * @param {number} velocity 
     */
    noteOn( note, velocity=1 ){
        const payload = { type:"noteOn", note, velocity }
        // console.info("NOTEVIZ noteOn", {note, velocity, payload} )
        this.notesOn++
        this.worker.postMessage(payload)
    }

    /**
     * Note Off
     * @param {Note} note 
     * @param {Number} velocity 
     */
    noteOff( note, velocity=1 ){
        this.notesOn--
        this.worker.postMessage({ type:"noteOff", note, velocity })
    }
}