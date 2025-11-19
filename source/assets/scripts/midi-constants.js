
export const BLUETOOTH_STATE_POWERED_ON = 'poweredOn'
export const BLUETOOTH_STATE_CHANGED = 'stateChange'
export const BLUETOOTH_STATE_CHARACTERISTIC_CHANGED = 'characteristicvaluechanged'
export const BLUETOOTH_STATE_DISCOVER_DEVICES = 'discover'
export const BLUETOOTH_STATE_GATT_DISCONNECTED = 'gattserverdisconnected'

// Channel Voice Messages
export const MIDI_NOTE_OFF = 0x80
export const MIDI_NOTE_ON = 0x90
export const MIDI_POLYPHONIC_KEY_PRESSURE = 0xA0
export const MIDI_CONTROL_CHANGE = 0xB0
export const MIDI_PROGRAM_CHANGE = 0xC0
export const MIDI_CHANNEL_PRESSURE = 0xD0
export const MIDI_PITCH_BEND = 0xE0

// System Common Messages
export const MIDI_SYSTEM_EXCLUSIVE = 0xF0   // SYSEX!
export const MIDI_TIME_CODE_QUARTER_FRAME = 0xF1
export const MIDI_SONG_POSITION = 0xF2
export const MIDI_SONG_SELECT = 0xF3
export const MIDI_TUNE_REQUEST = 0xF6
export const MIDI_END_OF_EXCLUSIVE = 0xF7

// System Real-Time Messages
export const MIDI_TIMING_CLOCK = 0xF8
export const MIDI_START = 0xFA
export const MIDI_CONTINUE = 0xFB
export const MIDI_STOP = 0xFC

export const MIDI_ACTIVE_SENSING = 0xFE
export const MIDI_RESET = 0xFF

/**
 * MIDI uses channels 0-15, but users specify 1-16, so subtract 1
 * and return as a 4 bit value
 * @param channel 
 * @returns {number}
 */
export const getMIDIChannelEncoded = (channel=1) => Math.max(1, channel - 1) & 0x0f
export const getMIDIStatusBytesFromByteAndChannel = (byte, channel) => getMIDIChannelEncoded(channel) | byte