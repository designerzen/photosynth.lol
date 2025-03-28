import { WAVE_FORM_NAMES_GENERAL_MIDI, WAVE_TABLE_LOCATIONS_GENERAL_MIDI } from "./tables/wave-table-general-midi"
import { WAVE_FORM_NAMES_GOOGLE, WAVE_TABLE_LOCATIONS_GOOGLE } from "./tables/wave-table-google"

const waveTables = new Map()
const waveTableNames = new Map()
const ALL_WAVE_FORM_NAMES = []

const assignWaveTables = ( locations, waves, waveMap ) => {
    // now try and create a relationship database...
    locations.forEach( (waveTableName, index) => {
        // waveTables.set(waveTableName, WAVE_FORM_NAMES[index])
        const name = waves[index]
        const nameExpanded = name.replaceAll("_"," ")
        waveMap.set(name, waveTableName)
        waveMap.set(name.toLowerCase(), waveTableName)
        waveMap.set(nameExpanded, waveTableName)
        waveMap.set(nameExpanded.toLowerCase(), waveTableName)
        ALL_WAVE_FORM_NAMES.push(name)
        // console.info("waveTableName", waveTableName, WAVE_FORM_NAMES[index] ) 
    }) 
}

// Google Wave tables from :
// https://github.com/GoogleChromeLabs/web-audio-samples/blob/main/src/demos/wavetable-synth/index.html
assignWaveTables(WAVE_TABLE_LOCATIONS_GOOGLE, WAVE_FORM_NAMES_GOOGLE, waveTableNames)
assignWaveTables(WAVE_TABLE_LOCATIONS_GENERAL_MIDI, WAVE_FORM_NAMES_GENERAL_MIDI, waveTableNames)
console.info("waveTableNames", {waveTableNames, ALL_WAVE_FORM_NAMES} ) 

/**
 * Pick from the options above
 * @param {String} waveTableName 
 * @returns 
 */
export const loadWaveTableFromFile = async (waveTableName=TB303) => { 
    const url = waveTableNames.get(waveTableName)
    // we use the names from above...
    const request = await fetch(url)
    // const request = await fetch(`/wave-tables/${waveTableName}`)
    const response = await request.text()
    // firstly remove all new lines and carriage returns
    const data = response.replaceAll( /\n|\r/g, '')
    // const data = response // .replaceAll( /\n|\r|\s+/g, '')
    // const data = response.replaceAll(/\s+/g, '')
    // delimiters use 2nd first then split first...
    const delimA = `{'real': [`
    const delimB = `,],'imag': [`
    const delimC = ",],}"

    const parts = data.split(delimB)

    // now both real and imag are arrays of string numbers :(
    const part1 = parts[0].split(delimA)[1].trim().split(",")
    const part2 = parts[1].replace(delimC, "").trim().split(",")

    const real = part1.map(Number)
    const imag = part2.map(Number)
    const waves = { real, imag }
    
    // console.error( "DATA", waves )
    // console.error( "DATA", data.indexOf(delimB) , {data, real, imag}, {parts, part1, part2, delimA, delimB, delimC } )
    // const response = await request.json()
    // this.setWaveTable(response)  
    waveTables.set(waveTableName, waves)
    return waves
}

/**
 * Load a wave table from the file system and cache
 * @param {String} waveTableName 
 * @returns 
 */
export const loadWaveTable = async (waveTableName=TB303) => { 
    // Cache in static Map and load if registered
    if (waveTables.has(waveTableName) ){
        return waveTables.get(waveTableName)
    }else{
        return loadWaveTableFromFile(waveTableName)
    }
}

/**
 * 
 * @returns 
 */
export const getRandomWaveTableName = () => { 
    return ALL_WAVE_FORM_NAMES[Math.floor(Math.random() * ALL_WAVE_FORM_NAMES.length)]
}

/**
 * 
 * @returns 
 */
export const loadRandomWaveTable = async () => { 
    return loadWaveTable(getRandomWaveTableName())
}