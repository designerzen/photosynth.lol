// import { WebMidi } from "webmidi"

// let midiDriver
// export let midiEnabled = false
// // 
// const midiMap = new Map()

// export const loadMIDIDriver = async () => {
//     const midi = await import("webmidi")
//     return midi.WebMidi
// }

// export const toggleMIDI = async () => {
//     if (!midiEnabled)
//     {
//         try {    
//             return await enableMIDI()
//         } catch (error) {
//              console.error(error)
//         }
//     }else{
//         try {    
//             return await disableMIDI()
//         } catch (error) {
//              console.error(error)
//         }
//     }
// }


// const onMIDIMessage = event => {
//     console.info("MIDI Event", event)
//     switch( event )
//     {
//         case "connected":
            
//             break
//         case "disconnected":
//             break
//         case "portschanged":
//             break
//         case "midiaccessgranted":
//             break
//         case "error":
//             console.error("MIDI FAIL", event)
//             break
//     }
// }

// export const enableMIDI = async () => {
//     if (!midiDriver)
//     {
//         midiDriver = await loadMIDIDriver()
//         midiDriver.addListener("error", onMIDIMessage)
//         midiDriver.addListener("connected", onMIDIMessage)
//         midiDriver.addListener("disconnected", onMIDIMessage)
//         midiDriver.addListener("portschanged", onMIDIMessage)
//         midiDriver.addListener("midiaccessgranted", onMIDIMessage)
//     }
//     try {    
//        await midiDriver.enable()
//        midiEnabled = true
//     } catch (error) {
//         console.error(error)
//     }
//     return midiDriver
// }

// export const disableMIDI = async () => {
//     try {    
//         await midiDriver.disable()
//         midiDriver.removeListener("error", onMIDIMessage)
//         midiDriver.removeListener("connected", onMIDIMessage)
//         midiDriver.removeListener("disconnected", onMIDIMessage)
//         midiDriver.removeListener("portschanged", onMIDIMessage)
//         midiDriver.removeListener("midiaccessgranted", onMIDIMessage)
//         midiEnabled = false

//      } catch (error) {
//          console.error(error)
//      }
//      return midiDriver
// }

/**
 * Handles : 
 * 1. Loading in the library if available
 * 2. Checking if there are devices available
 * 3. Connecting to either a single, multiple or all midi inputs
 * 4. Connecting to either a single, multiple or all midi outputs
 */
export default class MIDIManager{

    midiDriver
    midiEnabled = false
    accessGranted = false
    midiMap = new Map()

    activeInputDevices = []
    activeOutputDevices = []

    midiEventQueue = new Map()

    get available(){
        return this.midiDriver.supported
    }
    
    get enabled(){
        return this.midiEnabled
    }

    get hasInputDevices(){
        return this.inputs.length > 0
    }
    get hasOutputDevices(){
        return this.outputs.length > 0
    }
    get inputs(){
        return this.midiDriver ? this.midiDriver.inputs : []
    }
    get outputs(){
        return this.midiDriver ? this.midiDriver.outputs : []
    }

    constructor(){

    }
    
    /**
     * 
     * @returns 
     */
    async load() {
        try{
            const midi = await import("webmidi")
            return midi.WebMidi
        }catch(error){
            console.error("Couldn't load MIDI driver")
        }
    }
    
    /**
     * 
     * @returns 
     */
    async toggle() {
        if (!this.midiEnabled)
        {
            try {    
                return await this.enable()
            } catch (error) {
                 console.error(error)
            }
        }else{
            try {    
                return await this.disable()
            } catch (error) {
                 console.error(error)
            }
        }
    }

    //  this.inputs.forEach((device, index) => this.monitorInput(device) )
    monitorInput(input, callback){
        // `${index}: ${device.name}`
        // input.addListener("noteon", e => {
        //     // create a note object that matches
        //     // new Note(0)

        //     console.log("MIDI noteon", index, e,  e.note.identifier)
        //     callback && callback(e)
        // })
        
        // input.addListener("noteoff", e => {
        //     // create a note object that matches
        //     // new Note(0)
        //     console.log("MIDI noteoff", index, e,  e.note.identifier)
        //     callback && callback(e)
        // })
        input.addListener("midimessage", e => {
            // { port: {…}, target: {…}, message: {…}, timestamp: 629940, type: "midimessage", data: (1) […], rawData: (1) […], statusByte: 248, dataBytes: [] }


            // create a note object that matches
            // new Note(0)
            // console.log("MIDI Message", e,  input )
            callback && callback(e)
        })
         console.log("Monitoring MIDI Device", input, {midiDeviceInput} )
    }

    // public method
    // take all devices connected to the computer and pipe their midi here
    monitorAllInputs( callback){
        this.inputs.forEach( (device, index) => {
            this.monitorInput(device, callback)
        })
    }

    monitorActiveInputs( callback){
        this.activeInputDevices.forEach( (device, index) => {
            this.monitorInput(device, callback)
        })
    }

    /**
     * 
     * @param {*} inputs 
     */
    selectInputs(inputs)
    {
        this.activeInputDevices.push(...inputs)
    }

    /**
     * 
     * @param {*} outputs 
     */
    selectOutputs(outputs)
    {
        this.activeOutputDevices.push(...outputs)
    }
    
    /**
     * Note ON for all connected MIDI devices
     */
    async noteOn( note, velocity ){
        const options = {release:velocity} 
        this.activeOutputDevices.forEach( output => {
            output.playNote(note, options)
        })
        // also check the queue to see if there are any events waiting to be played
        this.midiEventQueue.forEach( (midiEventQueue, index) => {
            const latentEvent = midiEventQueue.shift()
            if (latentEvent){

            }
        })
    }

    /**
     * Note OFF for all connected MIDI devices
     */
    async noteOff( note, veolcity ){
        this.activeOutputDevices.forEach( output => {
            // output.playNote("C4", "acoustic_grand_piano", {duration: "4n"})
        })
    }

    /**
     * Enable all MIDI inputs
     * @returns 
     */
    async enable () {
        if (!this.midiDriver)
        {
            this.midiDriver = await this.load()
            this.midiDriver.addListener("error", this.onMIDIMessage)
            this.midiDriver.addListener("connected", this.onMIDIMessage)
            this.midiDriver.addListener("disconnected", this.onMIDIMessage)
            this.midiDriver.addListener("portschanged", this.onMIDIMessage)
            this.midiDriver.addListener("midiaccessgranted", this.onMIDIMessage)
        }
        try {    
           await this.midiDriver.enable()
           this.midiEnabled = true
        } catch (error) {
            console.error(error)
        }
        return this.midiDriver
    }
    
    /**
     * Disable all MIDI output & input
     * @returns 
     */
    async disable() {
        try {    
            await this.midiDriver.disable()
            this.midiDriver.removeListener("error", this.onMIDIMessage)
            this.midiDriver.removeListener("connected", this.onMIDIMessage)
            this.midiDriver.removeListener("disconnected", this.onMIDIMessage)
            this.midiDriver.removeListener("portschanged", this.onMIDIMessage)
            this.midiDriver.removeListener("midiaccessgranted", this.onMIDIMessage)
            this.midiEnabled = false
    
         } catch (error) {
             console.error(error)
         }
         return this.midiDriver
    }
    
    /**
     * 
     * @param {Event} event 
     */
    onMIDIMessage( event) {
        console.info("MIDI Event", event)
        switch( event )
        {
            // per device!
            case "connected":
                console.info("MIDI Connected ", event, event.port )
                // this.midiMap[] = 
                this.midiEventQueue.set(event.port, [])
                break

            case "disconnected":
                console.info("MIDI Disconnected ", event, event.port)
                // this.midiMap[] = 
                this.midiEventQueue.delete(event.port)
                break

            case "portschanged":
                // this.availabilityMap[] = 
                console.info("New MIDI Device detected", event, event.port)
                break

            case "midiaccessgranted":
                console.info("MIDI permission granted", event)
                this.accessGranted = true
                break

            case "error":
                console.error("MIDI FAIL", event)
                break
        }
    }
}