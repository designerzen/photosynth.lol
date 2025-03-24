const backing = [
    new SynthOscillator(audioContext),
    new SynthOscillator(audioContext),
    new SynthOscillator(audioContext),
    new SynthOscillator(audioContext)
]
 

    // playBackingMelody(  )



const playBackingMelody = ()=>{
    setInterval(()=>{
        const time = audioContext.currentTime
        backing.forEach((synth, index)=>{
            const note = toNote(time)
            const chord = toChord(time)
            const f = mapped( note, chord, index )
            // 57 is A4
            const frequency = noteNumberToFrequency( f + 57 )
            // synth.noteOff()
            // synth.noteOn(frequency)
            // noteOn( 42 + note, synth ) 
            synth.frequency = frequency
        
            console.info( "Song", time, "note", note, chord, f, index ) 
        })
    },1000)
   backing.forEach((synth, index)=>synth.noteOn(449) )
}