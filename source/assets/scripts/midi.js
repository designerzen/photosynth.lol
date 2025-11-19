import { MIDIEventType, MIDI_SERVICE_UUID, MIDI_CHARACTERISTIC_UUID } from "web-ble-midi"
import { BLUETOOTH_STATE_CHARACTERISTIC_CHANGED, BLUETOOTH_STATE_GATT_DISCONNECTED } from "./midi-constants.js"

/**
 * Handles : 
 * 1. Loading in the library if available
 * 2. Checking if there are devices available
 * 3. Connecting to either a single, multiple or all midi inputs
 * 4. Connecting to either a single, multiple or all midi outputs
 */
export default class MIDIManager{

    webMIDIDriver
    bleMIDIDriver

    webMIDIEnabled = false
    bluetoothMIDIEnabled = false
    
    webMIDIAccessGranted = false
    bluetoothMIDICharacteristic = false
    bluetoothPacketQueue = []

    midiMap = new Map()

    activeInputDevices = []
    activeOutputDevices = []

    midiEventQueue = new Map()

    get isWebMIDISupported(){
        return navigator.requestMIDIAccess !== undefined
    }

    get isWebMIDIAvailable(){
        return this.isWebMIDISupported && this.webMIDIDriver && this.webMIDIDriver.supported
    }
 
    get isBluetoothMIDISupported(){
        return navigator.bluetooth !== undefined
    }

    get isBluetoothMIDIAvailable(){
        return this.isBluetoothMIDISupported
    }

    get isMIDIAvailable(){
        return this.isWebMIDIAvailable || this.isBluetoothMIDIAvailable
    }

    get isMIDISupported(){
        return this.isWebMIDISupported || this.isBluetoothMIDISupported
    }

    
    get enabled(){
        return this.webMIDIEnabled
    }

    get hasInputDevices(){
        return this.inputs.length > 0
    }
    get hasOutputDevices(){
        return this.outputs.length > 0
    }
    get inputs(){
        return this.webMIDIDriver ? this.webMIDIDriver.inputs : []
    }
    get outputs(){
        return this.webMIDIDriver ? this.webMIDIDriver.outputs : []
    }

    constructor(){

    }
    
    /**
     * 
     * @returns 
     */
    async loadWebMIDI() {
        try{
            const midi = await import("webmidi")
            return midi.WebMidi
        }catch(error){
            console.error("Couldn't load Web MIDI driver", error)
        }
    }

    /**
     * 
     * @returns 
     */
    async loadBluetoothMIDI(){
        try{
            // const { BLEMIDI } = await import("web-ble-midi")
            // return BLEMIDI.isSupported() ? BLEMIDI : null

            const { DeviceConnector, MidiPacketParser } = await import( 'midible' )
            const bluetoothMIDIDataParser = new MidiPacketParser()
            
            return { bluetoothMIDIDataParser, DeviceConnector, MidiPacketParser }

        }catch(error){
            console.error("Couldn't load MIDI BLE driver", error)
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

            switch(e.message.type){
                case "clock":
                case "activesensing":
                case "start":
                case "stop":
                case "continue":
                    callback && callback(e)
                    break
            }

            // create a note object that matches
            // new Note(0)
            // console.log("MIDI Message", e,  input )
        })

        input.addListener("noteon", e => {
            // { port: {…}, target: {…}, message: {…}, timestamp: 629940, type: "midimessage", data: (1) […], rawData: (1) […], statusByte: 248, dataBytes: [] }


            // create a note object that matches
            // new Note(0)
            // console.log("MIDI Message", e,  input )
            callback && callback(e)
        })

        input.addListener("noteoff", e => {
            // { port: {…}, target: {…}, message: {…}, timestamp: 629940, type: "midimessage", data: (1) […], rawData: (1) […], statusByte: 248, dataBytes: [] }


            // create a note object that matches
            // new Note(0)
            // console.log("MIDI Message", e,  input )
            callback && callback(e)
        })
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

        if ( this.bluetoothMIDICharacteristic)
        {
            sendBLENoteOn( this.bluetoothMIDICharacteristic, selectedMIDIChannel, noteModel.noteNumber, 127, this.bluetoothPacketQueue )
        }
        
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
    async enableWebMIDI () {
        
        if (this.webMIDIEnabled)
        {
            return false
        }
        
        if (!this.webMIDIDriver)
        {
            this.webMIDIDriver = await this.loadWebMIDI()
            this.webMIDIDriver.addListener("error", this.onMIDIMessage)
            this.webMIDIDriver.addListener("connected", this.onMIDIMessage)
            this.webMIDIDriver.addListener("disconnected", this.onMIDIMessage)
            this.webMIDIDriver.addListener("portschanged", this.onMIDIMessage)
            this.webMIDIDriver.addListener("midiaccessgranted", this.onMIDIMessage)
        }
        try {    
           await this.webMIDIDriver.enable()
           this.webMIDIEnabled = true
        } catch (error) {
            console.error(error)
        }
        return true
    }
    
    /**
     * Disable all MIDI output & input
     * @returns 
     */
    async disableWebMIDI() {
        if (!this.webMIDIEnabled)
        {
            return false
        }

        try {    
            await this.webMIDIDriver.disable()
            this.webMIDIDriver.removeListener("error", this.onMIDIMessage)
            this.webMIDIDriver.removeListener("connected", this.onMIDIMessage)
            this.webMIDIDriver.removeListener("disconnected", this.onMIDIMessage)
            this.webMIDIDriver.removeListener("portschanged", this.onMIDIMessage)
            this.webMIDIDriver.removeListener("midiaccessgranted", this.onMIDIMessage)
            this.webMIDIEnabled = false

        } catch (error) {
            console.error(error)
        }
        return true
    }
        
    /**
     * Enable the WebMIDI if it is disabled,
     * disable it if it is enabled
     * @returns isEnabled
     */
    async toggleWebMIDI() {
        if (!this.webMIDIEnabled)
        {
            try {    
                await this.enableWebMIDI()
                return true
            } catch (error) {
                 console.error(error)
            }
        }else{
            try {    
                await this.disableWebMIDI()
                return false
            } catch (error) {
                 console.error(error)
            }
        }
        return this.webMIDIEnabled
    }

    /**
     * A WebMIDI Message was received
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
                this.webMIDIAccessGranted = true
                break

            case "error":
                console.error("MIDI FAIL", event)
                break
        }
    }


    // --- BLE ------------------------------------------
    
    /**
     * Toggle Bluetooth MIDI (BLE)
     * @returns 
     */
    async toggleBluetoothMIDI() {
        if ( !this.bluetoothMIDIEnabled )
        {
            try {    
                await this.enableBLEMIDI()
                return true
            } catch (error) {
                 console.error(error)
            }

        }else{
            
            try {    
                await this.disableBLEMIDI()
                return false
            } catch (error) {
                console.error(error)
            }
        }
        return this.bluetoothMIDIEnabled
    }
       
    /**
     * Enable Bluetooth MIDI (BLE)
     * @returns boolean
     */
    async enableBLEMIDI() {

        if (this.bluetoothMIDIEnabled)
        {
            return false
        }

        if (!this.bleMIDIDriver)
        {
            this.bleMIDIDriver = await this.loadBluetoothMIDI()
        }

        const { bluetoothMIDIDataParser, DeviceConnector, MidiPacketParser } = this.bleMIDIDriver
        const device = await DeviceConnector.connect()

        device.addEventListener( BLUETOOTH_STATE_GATT_DISCONNECTED, event => {
            console.log("BLE Device disconnected")
        })

        const server = await device.gatt.connect()
        const service = await server.getPrimaryService(MIDI_SERVICE_UUID)
        const characteristic = await service.getCharacteristic(MIDI_CHARACTERISTIC_UUID)

        await characteristic.startNotifications()
        characteristic.addEventListener( BLUETOOTH_STATE_CHARACTERISTIC_CHANGED, event => {
            const value = event.target.value
            const midiPackets = bluetoothMIDIDataParser.parse(value)
            console.log('MIDI Packets:', midiPackets, value )
        })

        this.bluetoothMIDICharacteristic = characteristic
        this.bluetoothMIDIEnabled = true

        startBLECharacteristicStream(characteristic)

        console.log('MIDI BLE:', {server, service, characteristic}, this )
        return true

        /*
        try {
            // Will prompt the user to select a device with a browser dialog
            // Optional: filter by name prefix
            const device = await BLEMIDI.scan()
            // const device = await BLEMIDI.scan({ namePrefix: "BLE-MIDI" })

            console.log("Selected device:", device.name)


            // Set up event listeners


            device.addEventListener(MIDIEventType.Disconnect, () => {
                console.log("BLE Device disconnected")
            })

            // Register event listeners
            device.addEventListener( MIDIEventType.MIDIMessage, (event) => {
                // MIDIMessageEvent has a message property with the MIDI data
                const message = event.message
                console.log("Received MIDI message:", message)

                // Access the raw MIDI data
                const statusByte = message.message[0]
                const channel = statusByte & 0x0f
                const midiCommand = statusByte & 0xf0

                switch (midiCommand) {

                    default:

                }


                // Handle note-on messages
                if ( midiCommand === MIDI_NOTE_ON && message.message[2] > 0) {
                    const noteNumber = message.message[1]
                    const velocity = message.message[2]
                    console.log(
                    `Note On - Channel: ${
                        channel + 1
                    }, Note: ${noteNumber}, Velocity: ${velocity}`
                    )
                }
            })

            

            // Connect to the device
            await device.connect()
            console.log("Connected to device:", device.name)

            // Later, when you want to disconnect:
            // device.disconnect();
        } catch (error) {
            if (error.name === "NotFoundError") {
               console.log("User cancelled the device selection")
            } else {
                console.error("Connection error:", error)
            }
        }
        */
    }

    /**
     * Disable Bluetooth MIDI (BLE)
     * @returns boolean
     */
    async disableBLEMIDI() {
      
        // this.bluetoothMIDICharacteristic
       
        // const { bluetoothMIDIDataParser, DeviceConnector, MidiPacketParser } = this.bleMIDIDriver
        // const device = await DeviceConnector.connect()

        if (!this.bluetoothMIDIEnabled)
        {   
            // already disabled
            return false
        }
        return true
    }

}