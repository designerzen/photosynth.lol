import { WAVE_FORM_NAMES_GENERAL_MIDI, WAVE_TABLE_LOCATIONS_GENERAL_MIDI } from "./tables/wave-table-general-midi"
import { WAVE_FORM_NAMES_GOOGLE, WAVE_TABLE_LOCATIONS_GOOGLE } from "./tables/wave-table-google"
import { generateImageFromWaveTable, loadWaveTableFromImage } from "./wave-table-utils"

// external dependencies
import { unzip, strFromU8 } from 'fflate'

import manifest from "/static/wave-tables/general-midi/manifest.json"

const waveTables = new Map()
const waveTableNames = new Map()
const ALL_WAVE_FORM_NAMES = []

const assignWaveTables = (locations, waves, waveMap) => {
    // now try and create a relationship database...
    locations.forEach((waveTableName, index) => {
        // waveTables.set(waveTableName, WAVE_FORM_NAMES[index])
        const noteName = waves[index]
        const nameExpanded = noteName.replaceAll("_", " ")
        waveMap.set(noteName, waveTableName)
        waveMap.set(noteName.toLowerCase(), waveTableName)
        waveMap.set(nameExpanded, waveTableName)
        waveMap.set(nameExpanded.toLowerCase(), waveTableName)
        ALL_WAVE_FORM_NAMES.push(noteName)
        // console.info("waveTableName", waveTableName, WAVE_FORM_NAMES[index] ) 
    })
}

/**
 * Pick from the options above
 * @param {String} waveTableName 
 * @returns 
 */
export const loadWaveTableFromFile = async (waveTableName = TB303) => {
    const url = waveTableNames.get(waveTableName)
    // we use the names from above...
    const request = await fetch(url)
    // const request = await fetch(`/wave-tables/${waveTableName}`)
    const response = await request.text()
    // firstly remove all new lines and carriage returns
    // and swap out the double quotes with single quotes
    const data = response
        .replaceAll(/(\s|\n|\r)/g, '')
        .replaceAll(/"/g, "'")

    // const data = response
    //                 .replaceAll( /\s/g, '')
    //                 .replaceAll( /\n|\r/g, '')
    //                 .replaceAll( /"/g, "'")

    // const data = response // .replaceAll( /\n|\r|\s+/g, '')
    // const data = response.replaceAll(/\s+/g, '')
    // delimiters use 2nd first then split first...
    const delimA = /\{('|")real('|"):\[/
    const delimB = /(,)?\],('|")imag('|"):\[/
    // const delimB = /(,)\],('|")imag('|"):\[/
    const delimC = /(,)?\](,)?\}/ // ]}
    // const delimA = /\{'real':(\s+)\[/
    // const delimB = /,\],'imag'(:\s+)\[/
    // const delimC = /,\],\}/

    const parts = data.split(delimB)

    // now both real and imag are arrays of string numbers :(
    const part1 = parts[0].replace(delimA, "").split(",")
    // const part1 = parts[0].split(delimA)[1].trim().split(",")
    const part2 = parts[parts.length - 1].replace(delimC, "").split(",")

    // Ensure real/imag arrays are Float32Array for createPeriodicWave
    // convert all these strings into numbers
    const real = new Float32Array(part1.map(Number))
    const imag = new Float32Array(part2.map(Number))

    // create the object
    const waves = { real, imag }

    // GAH, ensure that both arrays have the same length...
    if (real.length !== imag.length) {
        console.error(waveTableName + " Length mismatch real:" + real.length + " imaginary:" + imag.length, { waves, parts, part1, part2, data, real, imag })
        // throw Error(waveTableName + " Length mismatch real:" + real.length + " imaginary:" + imag.length)
        // HACK: just make the arrays the same length
        real.length = imag.length
    }

    console.info("Wave table available", waves)

    waveTables.set(waveTableName, waves)
    return waves
}

export const loadWaveTableFromJSON = (waveTableURI, waveTableString) => {

    // Ensure real/imag arrays are Float32Array for createPeriodicWave
    const real = new Float32Array(waveTableString.real)
    const imag = new Float32Array(waveTableString.imag)

    // --- Important Constraints ---
    // real[0] must be 0 (DC offset). We ensured this in generation.
    // imag[0] must be 0. We ensured this in generation.
    // The lengths of real and imag must be the same and >= 2.
    if (real.length !== imag.length || real.length < 2) {
        console.error(`Invalid wave data for GM ${gmNumber}: ${waveTableString.name}`)
        return null
    }

    // Optional: Explicitly set DC offset and imag[0] to zero just in case
    real[0] = 0
    imag[0] = 0

    const waveTable = {
        "name": waveTableString.name,
        "midi_number": waveTableString.gm_number ?? -1,
        "description": waveTableString.description,
        real, imag
    }

    waveTables.set(waveTableURI, waveTable)
    return waveTable
}

export const loadWaveTableFromJSONFile = async (waveTableURI) => {
    try {
        const response = await fetch(waveTableURI)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        return loadWaveTableFromJSON(waveTableURI, data)
    } catch (e) {
        console.error("Error loading wave table from", waveTableURI, e)
        return null
    }
}

/**
 * Load a wave table from the file system and cache
 * @param {String} waveTableName eg. 001_acoustic_grand_piano.json
 * @returns 
 */
export const loadWaveTable = async (waveTableName = TB303) => {
    // Cache in static Map and load if registered
    if (waveTables.has(waveTableName)) {
        return waveTables.get(waveTableName)
    } else {
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

export const getAllWaveTables = () => ALL_WAVE_FORM_NAMES

/**
 * 
 * @returns 
 */
export const loadRandomWaveTable = async () => {
    return loadWaveTable(getRandomWaveTableName())
}


export const preloadAllWaveTables = async (simultaneous = 3) => {

    for (let i = 0, l = ALL_WAVE_FORM_NAMES.length; i < l; i++) {
        const group = []
        for (let p = 0; p < simultaneous; p++) {
            const name = ALL_WAVE_FORM_NAMES[i]
            if (!name) { break }
            group.push(loadWaveTable(name))
            i++
            console.info("prelaodwave", name, p, i,)
        }
        await Promise.allSettled(group)
    }
}



// Google Wave tables from :
// https://github.com/GoogleChromeLabs/web-audio-samples/blob/main/src/demos/wavetable-synth/index.html
// assignWaveTables(WAVE_TABLE_LOCATIONS_GOOGLE, WAVE_FORM_NAMES_GOOGLE, waveTableNames)
// assignWaveTables(WAVE_TABLE_LOCATIONS_GENERAL_MIDI, WAVE_FORM_NAMES_GENERAL_MIDI, waveTableNames)
// console.info("waveTableNames", {waveTableNames, ALL_WAVE_FORM_NAMES} ) 

/**
 * loadWaveTableFromManifest(GM_MANIFEST)
 * @param {String} manifest GM_MANIFEST
 */
export const loadWaveTableFromManifest = (manifest) => {
    // console.error("GM_MANIFEST", GM_MANIFEST)
    const WAVE_TABLES_FOLDER = "/wave-tables/gm_periodic_waves_v5/"
    const keys = Object.keys(manifest)
    const waveDataToLoad = keys.map(async (noteName, index) => {

        const noteURI = manifest[noteName]

        // first create the file name to load
        const waveTableFileName = noteName.replaceAll(" ", "")
        const path = WAVE_TABLES_FOLDER + noteURI
        const waveTableData = loadWaveTableFromJSONFile(path)

        ALL_WAVE_FORM_NAMES.push(noteName)

        // console.info(noteNumber, "GM",path, {waveTableData, real, imag, noteName, noteName, noteURI, waveTableFileName} ) 
        if (index === 127) {
            console.error("waveTables", waveTables)
        }
        return waveTableData
    })

    Promise
        .allSettled(waveDataToLoad)
        .then(results => {

            waveDataToLoad.forEach((waveTableData, index) => {
                const { real, imag } = waveTableData
                const noteNumber = index + 1
                const noteName = keys[index]
                const nameExpanded = noteName.replaceAll("_", " ")

                waveTables.set(noteNumber, waveTableData)
                // waveMap.set(waveTableData.name, waveTableData)
                // waveMap.set(waveTableData.name.toLowerCase(), waveTableData)
                waveTables.set(nameExpanded, waveTableData)
                waveTables.set(nameExpanded.toLowerCase(), waveTableData)
            })

            console.info("results", { results, waveTables })
        })
}

// const attemptToConvertWaveTableIntoImage = async( waveTableName, mimeType="image/png" ) => {
//     const waveTable = await loadWaveTable( waveTableName )
//     const canvas = await generateImageFromWaveTable( waveTable )
//     return canvas.toDataURL(mimeType)
// }

// attemptToConvertWaveTableIntoImage(ALL_WAVE_FORM_NAMES[20] ).then( png => {
//     console.info("png", png)
// })
// // attemptToConvertWaveTableIntoImage(ALL_WAVE_FORM_NAMES[0] )

export const loadWaveTableFromArchive = (waveTableArchiveURI, onProgress) => new Promise( async (resolve, reject) => {
    const fileBuffer = await fetch(waveTableArchiveURI)
    const arrayBuffer = await fileBuffer.arrayBuffer()
    const arrayBufferAsUint8Array = new Uint8Array(arrayBuffer)
    unzip(arrayBufferAsUint8Array, (err, unzipped) => {
        
        if (err)
        {
            reject(err)
            return
        }
        
        const fileNames = Object.keys(unzipped)
        const waveTables = fileNames.map( (fileName, index) => {
            // Conversion to string and then JSON
            const progress = index / fileNames.length
            const file = unzipped[fileName]
            const waveTable = JSON.parse( strFromU8( file ) )
            const waveTableData = loadWaveTableFromJSON(fileName, waveTable)
            onProgress && onProgress(progress, fileName, waveTable )
            return waveTableData
        })
        resolve( waveTables )
    })
})