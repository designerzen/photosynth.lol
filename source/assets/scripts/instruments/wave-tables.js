import { WAVE_FORM_NAMES_GENERAL_MIDI, WAVE_TABLE_LOCATIONS_GENERAL_MIDI } from "./tables/wave-table-general-midi"
import { WAVE_FORM_NAMES_GOOGLE, WAVE_TABLE_LOCATIONS_GOOGLE } from "./tables/wave-table-google"
import { generateImageFromWaveTable, loadWaveTableFromImage } from "./wave-table-utils"

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
    // and swap out the double quotes with single quotes
    const data = response
                    .replaceAll( /(\s|\n|\r)/g, '')
                    .replaceAll( /"/g, "'")
  
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
    const part2 = parts[parts.length-1].replace(delimC, "").split(",")

    // convert all these strings into numbers
    const real = part1.map(Number)
    const imag = part2.map(Number)

    // create the object
    const waves = { real, imag }
    
    // GAH, ensure that both arrays have the same length...
    if (real.length !== imag.length)
    {
        console.error(waveTableName + " Length mismatch real:" + real.length + " imaginary:" + imag.length, {waves, parts, part1, part2, data, real, imag} ) 
        // throw Error(waveTableName + " Length mismatch real:" + real.length + " imaginary:" + imag.length)
        // HACK: just make the arrays the same length
        real.length = imag.length
    }



    console.info("Wave table available", waves)

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


export const preloadAllWaveTables = async ( simultaneous=3 ) => { 
    
    for (let i = 0, l=ALL_WAVE_FORM_NAMES.length; i < l; i++) {
        const group = []
        for (let p = 0; p < simultaneous; p++) {
            const name = ALL_WAVE_FORM_NAMES[i]
            if (!name) {break}
            group.push( loadWaveTable( name ) )
            i++
            console.info("prelaodwave", name, p, i, )
        }
        await Promise.allSettled(group)
    }
}



// Google Wave tables from :
// https://github.com/GoogleChromeLabs/web-audio-samples/blob/main/src/demos/wavetable-synth/index.html
assignWaveTables(WAVE_TABLE_LOCATIONS_GOOGLE, WAVE_FORM_NAMES_GOOGLE, waveTableNames)
assignWaveTables(WAVE_TABLE_LOCATIONS_GENERAL_MIDI, WAVE_FORM_NAMES_GENERAL_MIDI, waveTableNames)
console.info("waveTableNames", {waveTableNames, ALL_WAVE_FORM_NAMES} ) 

const attemptToConvertWaveTableIntoImage = async( waveTableName, mimeType="image/png" ) => {
    const waveTable = await loadWaveTable( waveTableName )
    const canvas = await generateImageFromWaveTable( waveTable )
    return canvas.toDataURL(mimeType)
}

attemptToConvertWaveTableIntoImage(ALL_WAVE_FORM_NAMES[20] ).then( png => {
    console.info("png", png)
})
// attemptToConvertWaveTableIntoImage(ALL_WAVE_FORM_NAMES[0] )