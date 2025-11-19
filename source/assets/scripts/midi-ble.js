// https://midi.org/midi-over-bluetooth-low-energy-ble-midi
/**
 * In transmitting MIDI data over Bluetooth, a series of MIDI messages of various sizes must be
 * encoded into packets no larger than the negotiated MTU minus 3 bytes (typically 20 bytes or
 * larger.)
 * 
 * The first byte of all BLE packets must be a header byte. This is followed by timestamp bytes and
 * MIDI messages.
 * Header Byte
 * bit 7 Set to 1.
 * bit 6 Set to 0. (Reserved for future use)
 * bits 5-0 timestampHigh:Most significant 6 bits of timestamp information.
 * The header byte contains the topmost 6 bits of timing information for MIDI events in the BLE
 * packet. The remaining 7 bits of timing information for individual MIDI messages encoded in a
 * packet is expressed by timestamp bytes. Timestamps are discussed in detail in a later section.
 * Timestamp Byte
 * bit 7 Set to 1.
 * bits 6-0 timestampLow: Least Significant 7 bits of timestamp information.
 * The 13-bit timestamp for the first MIDI message in a packet is calculated using 6 bits from the
 * header byte and 7 bits from the timestamp byte.
 */
import {
    MIDI_ACTIVE_SENSING, MIDI_CHANNEL_PRESSURE, MIDI_CONTROL_CHANGE, MIDI_TYPES, MIDI_NOTE_OFF, MIDI_NOTE_ON, MIDI_PITCH_BEND, MIDI_POLYPHONIC_KEY_PRESSURE, MIDI_PROGRAM_CHANGE,
    getMIDIChannelEncoded, getMIDIStatusBytesFromNibbleAndChannel, getMIDIStatusBytesFromByteAndChannel
} from './midi-constants.js'

const MIDI_LOG_PREFIX = '[MIDI-BLE]'

// TX MIDI Data Creator --------------------------------------------------------------------------------------

/**
 * Specification for MIDI over Bluetooth Low Energy (BLE-MIDI) 1.0
 * (Version 1.0 Page 7 November 1, 2015)
 * Generate MIDI timestamp bytes for BLE packet from a timestamp
 * otherwise create the timestamp bytes for the current time
 * BLE MIDI timestamp is 13 bits, split into 2 bytes: 
 * 
 *  header (MSB)
 *  messageTimestamp (LSB)
 * 
 * Timestamps are 13-bit values in milliseconds, and therefore the maximum value is 8,191 ms.
 * Timestamps must be issued by the sender in a monotonically increasing fashion.
 * 
 * The 13-bit timestamp for a MIDI message is composed of two parts, a timestampHigh containing
 * the most significant 6 bits and a timestampLow containing the least significant 7 bits. The
 * timestampHigh is initially set using the lower 6 bits from the header byte while the timestampLow is
 * formed of the lower 7 bits from the timestamp byte. Should the timestamp value of a subsequent
 * MIDI message in the same packet overflow/wrap (i.e., the timestampLow is smaller than a
 * preceding timestampLow), the receiver is responsible for tracking this by incrementing the
 * timestampHigh by one (the incremented value is not transmitted, only understood as a result of the
 * overflow condition).
 * 
 * In practice, the time difference between MIDI messages in the same BLE packet should not span
 * more than twice the connection interval. As a result, a maximum of one overflow/wrap may occur
 * per BLE packet.
 * 
 * Timestamps are in the sender's clock domain and are not allowed to be scheduled in the future.
 * Correlation between the receiver's clock and the received timestamps must be performed to
 * ensure accurate rendering of MIDI messages, and is not addressed in this document.
 * 
 * @param {number} time 
 * @returns {Object}
 */
const getTimestampBytes = (time = undefined) => {
    // BLE MIDI timestamp is 13 bits, split into 2 bytes: header (MSB) + messageTimestamp (LSB)
    // NB. Use a small relative timestamp instead of Date.now() to avoid truncation issues
    const timestamp = (time ?? performance.now()) & 8191
    return {
        // timestampHigh
        header: ((timestamp >> 7) | 0x80) & 0xBF,
        // timestampLow
        messageTimestamp: (timestamp & 0x7F) | 0x80
    }
}

const toHex = (n, prependOx = false) => `${prependOx ? '0x' : ''}${n.toString(16).padStart(2, '0')}`

// MIDI Transactions --------------------------------------------------------------------------------------

/**
 * Take a packet and inspect it for what it is meant to achieve
 * and debug any issues that may be present
 * TODO: add extra functionality
 * 
 * @param {BluetoothRemoteGATTCharacteristic} characteristic 
 * @param {number} header 
 * @param {number} messageTimestamp 
 * @param {number} midiStatus 
 * @param {number} midiFirstCommand 
 * @param {number} midiSecondCommand 
 * @param {Array<number>} packet 
 * @param {Array<number>} _runningTotal 
 */
export const describePacket = (
    characteristic, 
    header, messageTimestamp, 
    midiStatus, midiFirstCommand, midiSecondCommand, 
    packet, _runningTotal
) => {
    console.log(MIDI_LOG_PREFIX, 'Packet:', {
        header: toHex(header, true),
        messageTimestamp: toHex(messageTimestamp, true),
        midiStatus: toHex(midiStatus, true),
        midiAction: MIDI_TYPES[midiStatus],
        midiFirstCommand,
        midiSecondCommand,
        packetBytes: Array.from(packet).map(b => toHex(b, true)),
        packet,
        characteristic,
        queue: _runningTotal ? _runningTotal : []
    })
}

/**
 * TODO: Create MIDI 2.0 compliant packets
 * https://midi.org/midi-over-bluetooth-low-energy-ble-midi
 * Create a BLE MIDI Packet from components
 * 
 * @param {number} messageTimestamp 
 * @param {number} midiStatus 
 * @param {number} midiFirstCommand 
 * @param {number} midiSecondCommand 
 * @param {number} header 
 * @returns {Array<number>}
 */
export const createBLEPacket = (messageTimestamp, midiStatus, midiFirstCommand, midiSecondCommand, header = undefined) => {
    const packet = [
        messageTimestamp,
        midiStatus,
        midiFirstCommand & 0x7f,
        midiSecondCommand & 0x7f
    ]
    if (header !== undefined) {
        packet.unshift(header)
    }
    return packet
}

/**
 * Send Bluetooth Light Packet to Bluetooth Characteristic
 * @param {BluetoothRemoteGATTCharacteristic} characteristic 
 * @param {Uint8Array} packet 
 * @returns {Promise<boolean>}
 */
export const sendBLEPacket = async (characteristic, packet) => {
    try {
        await characteristic.writeValue(packet)
        console.log(MIDI_LOG_PREFIX, 'Packet sent successfully', packet)
        return true
    } catch (err) {

        console.error(MIDI_LOG_PREFIX, 'Failed to send packet:', {
            error: err && err.message ? err.message : String(err),
            packet,
            characteristic: characteristic ? characteristic.uuid : 'no uuid'
        })
    }
    return false
}

/**
 * Add data to the runningTotal which allows for many
 * commands to be sent within the specified resolution
 * 
 * @param {Array<number>} runningTotal 
 * @param {BluetoothRemoteGATTCharacteristic} characteristic 
 * @param {number} midiStatus 
 * @param {number} midiFirstCommand
 * @param {number} midiSecondCommand 
 * @param {number} timestamp
 * @returns {Promise<boolean>}
 */
export const queueBLEPacket = async (runningTotal, characteristic, midiStatus, midiFirstCommand, midiSecondCommand = 0, timestamp = undefined) => {
    const { header, messageTimestamp } = getTimestampBytes(timestamp)
    const packet = createBLEPacket(messageTimestamp, midiStatus, midiFirstCommand, midiSecondCommand, runningTotal.length === 0 ? header : undefined)

    describePacket(characteristic, header, messageTimestamp, midiStatus, midiFirstCommand, midiSecondCommand, packet, runningTotal)
    // add to running sequence
    runningTotal.push(...packet)
    return true
}

/**
 * Take all the commands in the queue and send them at once
 * then clear out the queue ready for next expressions
 * @param {BluetoothRemoteGATTCharacteristic} characteristic 
 * @param {Array<number>} runningTotal 
 * @returns {Promise<void>}
 */
export const dispatchBLEQueue = async (characteristic, runningTotal) => {
    sendBLEPacket(characteristic, new Uint8Array(runningTotal))
    runningTotal.length = 0
}

/**
 * Send data to the BTLE characteristic
 * BLE-MIDI packets are a repetition of 
 * [header][timestamp][data...][timestamp][data...] ...
 * so we can either send many one after another but any simultaneous
 * messages need to be packed into a single packet so we create a 
 * single running thread
 * 
 * @param {BluetoothRemoteGATTCharacteristic} characteristic 
 * @param {number} midiStatus 
 * @param {number} midiFirstCommand 
 * @param {number} midiSecondCommand 
 * @param {number} timestamp
 * @returns {Promise<boolean>}
 */
export const dispatchBLEPacket = async (
    characteristic, 
    midiStatus, 
    midiFirstCommand, 
    midiSecondCommand = 0, 
    timestamp = undefined
) => {

    const { header, messageTimestamp } = getTimestampBytes(timestamp)
    const packet = createBLEPacket(messageTimestamp, midiStatus, midiFirstCommand, midiSecondCommand, header)

    describePacket(characteristic, header, messageTimestamp, midiStatus, midiFirstCommand, midiSecondCommand, packet)

    return sendBLEPacket(characteristic, new Uint8Array(packet))
}

/**
 * Note, for sending single commands you do not need to use 
 * the runningTotal but if you want to stream data as recommended 
 * by the Bluetooth Spec, which recommends sending data at regular 
 * intervals so that the data does not congest the airwaves,
 * a method for that is below. Call this method *before* calling 
 * the sendBLE methods and use the output from this method as the 
 * final argument parameter "_runningTotal" in the subsequent calls
 * 
 * @param {BluetoothRemoteGATTCharacteristic} characteristic 
 * @param {number} interval - anything above 1 is allowed (4-10 is a good compromise)
 * @returns {Array<number>}
 */
export const startBLECharacteristicStream = (characteristic, interval = 10) => {
    let runningTotal = []
    setInterval(() => {
        // this happens after every "interval"
        if (runningTotal.length > 0) {
            console.info("SENDING MIDI stack", runningTotal)
            dispatchBLEQueue(characteristic, runningTotal)
        }

    }, Math.max(interval, 1))
    return runningTotal
}

/**
 * Send MIDI Note On message via BLE
 * 
 * @param {BluetoothRemoteGATTCharacteristic} characteristic 
 * @param {number|null} channel (1-16)
 * @param {number} note 
 * @param {number} velocity (0-127)
 * @param {Array<number>} _runningTotal if you want to send lots of data in one packet
 * @returns {Promise<boolean|null>}
 */
export const sendBLENoteOn = async (
    characteristic,
    channel,
    note,
    velocity = 127,
    _runningTotal = undefined
) => {
    // no channel to send to, so exit early
    if (channel === null) { return null }
    return _runningTotal ?
        await queueBLEPacket(_runningTotal, characteristic, getMIDIStatusBytesFromNibbleAndChannel(MIDI_NOTE_ON, channel), note, velocity) :
        await dispatchBLEPacket(characteristic, getMIDIStatusBytesFromNibbleAndChannel(MIDI_NOTE_ON, channel), note, velocity)
}

/**
 * Send MIDI Note Off message via BLE
 * 
 * @param {BluetoothRemoteGATTCharacteristic} characteristic 
 * @param {number|null} channel (1-16)
 * @param {number} note 
 * @param {number} velocity 
 * @param {Array<number>} _runningTotal
 * @returns {Promise<boolean|null>}
 */
export const sendBLENoteOff = async (
    characteristic,
    channel,
    note,
    velocity = 0,
    _runningTotal = undefined
) => {
    if (channel === null) { return null }
    return _runningTotal ?
        await queueBLEPacket(_runningTotal, characteristic, getMIDIStatusBytesFromNibbleAndChannel(MIDI_NOTE_OFF, channel), note, velocity) :
        await dispatchBLEPacket(characteristic, getMIDIStatusBytesFromNibbleAndChannel(MIDI_NOTE_OFF, channel), note, velocity)
}

/**
 * Send MIDI Control Change message via BLE
 * 
 * @param {BluetoothRemoteGATTCharacteristic} characteristic 
 * @param {number|null} channel (1-16)
 * @param {number} controlNumber 
 * @param {number} value 
 * @param {Array<number>} _runningTotal
 * @returns {Promise<boolean|null>}
 */
export const sendBLEControlChange = async (
    characteristic,
    channel,
    controlNumber,
    value,
    _runningTotal = undefined
) => {
    // no channel to send to, so exit early
    if (channel === null) { return null }
    return _runningTotal ?
        await queueBLEPacket(_runningTotal, characteristic, getMIDIStatusBytesFromByteAndChannel(MIDI_CONTROL_CHANGE, channel), controlNumber, value) :
        await dispatchBLEPacket(characteristic, getMIDIStatusBytesFromByteAndChannel(MIDI_CONTROL_CHANGE, channel), controlNumber, value)
}

/**
 * Send MIDI Program Change message via BLE
 * 
 * @param {BluetoothRemoteGATTCharacteristic} characteristic 
 * @param {number|null} channel (1-16)
 * @param {number} program 
 * @param {Array<number>} _runningTotal
 * @returns {Promise<boolean|null>}
 */
export const sendBLEProgramChange = async (
    characteristic,
    channel,
    program,
    _runningTotal = undefined
) => {
    // no channel to send to, so exit early
    if (channel === null) { return null }
    return _runningTotal ?
        await queueBLEPacket(_runningTotal, characteristic, getMIDIStatusBytesFromByteAndChannel(MIDI_PROGRAM_CHANGE, channel), program) :
        await dispatchBLEPacket(characteristic, getMIDIStatusBytesFromByteAndChannel(MIDI_PROGRAM_CHANGE, channel), program)
}

/**
 * Send MIDI Polyphonic Aftertouch message via BLE
 * 
 * @param {BluetoothRemoteGATTCharacteristic} characteristic 
 * @param {number|null} channel (1-16)
 * @param {number} note 
 * @param {number} pressure 
 * @param {Array<number>} _runningTotal
 * @returns {Promise<boolean|null>}
 */
export const sendBLEPolyphonicAftertouch = async (
    characteristic,
    channel,
    note,
    pressure,
    _runningTotal = undefined
) => {
    // no channel to send to, so exit early
    if (channel === null) { return null }
    return _runningTotal ?
        await queueBLEPacket(_runningTotal, characteristic, getMIDIStatusBytesFromByteAndChannel(MIDI_POLYPHONIC_KEY_PRESSURE, channel), note, pressure) :
        await dispatchBLEPacket(characteristic, getMIDIStatusBytesFromByteAndChannel(MIDI_POLYPHONIC_KEY_PRESSURE, channel), note, pressure)
}

/**
 * Send MIDI Channel Aftertouch message via BLE
 * 
 * @param {BluetoothRemoteGATTCharacteristic} characteristic 
 * @param {number|null} channel (1-16)
 * @param {number} pressure 
 * @param {Array<number>} _runningTotal
 * @returns {Promise<boolean|null>}
 */
export const sendBLEChannelAftertouch = async (
    characteristic,
    channel,
    pressure,
    _runningTotal = undefined
) => {
    // no channel to send to, so exit early
    if (channel === null) { return null }
    return _runningTotal ?
        await queueBLEPacket(_runningTotal, characteristic, getMIDIStatusBytesFromByteAndChannel(MIDI_CHANNEL_PRESSURE, channel), pressure) :
        await dispatchBLEPacket(characteristic, getMIDIStatusBytesFromByteAndChannel(MIDI_CHANNEL_PRESSURE, channel), pressure)
}

/**
 * Send MIDI Pitch Bend message via BLE
 * 
 * @param {BluetoothRemoteGATTCharacteristic} characteristic 
 * @param {number|null} channel (1-16)
 * @param {number} lsb Least Significant Byte (0-127)
 * @param {number} msb Most Significant Byte (0-127)
 * @param {Array<number>} _runningTotal
 * @returns {Promise<boolean|null>}
 */
export const sendBLEPitchBend = async (
    characteristic,
    channel,
    lsb,
    msb,
    _runningTotal = undefined
) => {
    // no channel to send to, so exit early
    if (channel === null) { return null }
    return _runningTotal ?
        await queueBLEPacket(_runningTotal, characteristic, getMIDIStatusBytesFromByteAndChannel(MIDI_PITCH_BEND, channel), lsb, msb) :
        await dispatchBLEPacket(characteristic, getMIDIStatusBytesFromByteAndChannel(MIDI_PITCH_BEND, channel), lsb, msb)
}

// RX MIDI Incoming Data Handler --------------------------------------------------------------------------------------

/**
 * Parse MIDI data from BLE characteristic
 * 
 * @param {Array<number>} data array of numbers from BLE characteristic
 * @returns {Object|boolean}
 */
const parseBluetoothLightDataPacket = (data) => {
    const status = data[2]

    if (status === MIDI_ACTIVE_SENSING) {
        return false
    }

    const channel = (status & 0xf) + 1
    const type = status >> 4

    const data1 = data[3]
    const data2 = data[4]

    return { type, channel, data1, data2 }
}

/**
 * Handle incoming MIDI data from BLE characteristic
 * via this delicious curry
 * 
 * @param {string} uuid 
 * @param {Object} callback 
 * @returns {Function}
 */
const createBlueToothLightDataReceivedCallback = (uuid, callback) => (data) => {
    const array = Array.from(data)
    const result = parseBluetoothLightDataPacket(array)

    if (!result) {
        return
    }

    const { type, channel, data1, data2 } = result

    console.log(`type: ${MIDI_TYPES[type]} channel: ${channel} data1: ${data1} data2: ${data2}`)

    if (channel !== null) {
        callback.setCharacteristicChannel(uuid, channel)
    }

    if (type === MIDI_NOTE_ON) {

        if (data2 === 0) {
            callback.noteOff({ note: data1, channel })
        } else {
            callback.noteOn({ note: data1, velocity: data2, channel })
        }

    } else if (type === MIDI_NOTE_OFF) {
        callback.noteOff({ note: data1, channel })
    } else if (type === MIDI_CONTROL_CHANGE) {
        callback.controlChange({ controlNumber: data1, value: data2, channel })
    } else if (type === MIDI_POLYPHONIC_KEY_PRESSURE) {
        // TODO: Polyphonic aftertouch not implemented
    } else if (type === MIDI_PROGRAM_CHANGE) {
        callback.programChange({ controlNumber: data1, value: data2, channel })
    } else if (type === MIDI_CHANNEL_PRESSURE) {
        // TODO: Channel aftertouch not implemented
    } else if (type === MIDI_PITCH_BEND) {
        // TODO: Pitch bend not implemented
    }
}

export { createBlueToothLightDataReceivedCallback }