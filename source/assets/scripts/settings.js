import { monitorIntersections } from "./intersection-observer"

export const PALETTE = {

    // Primary colours ------------------------------------------

    // The Royal Society red
    // Pantone® 200
    // c0 m100 y70 k14
    // r211 g18 b69
    // Used throughout the site to indicate important areas of interest 
    // and interactive elements such as navigation, active/hover states, 
    // links and calls to action.
    red: "#d31245",
    plum:"#6F263D", // #860038,

    // The Royal Society stone
    // Pantone® 7527
    // c4 m4 y12 k8
    // r237 g231 b221
    // Interactive elements such as filter groups and inactive tabs. 
    // Also used for descriptive information on journal cards.
    stone: "#ede7dd",

    // Page background
    stoneLight:"#e8e6df",

    // The Royal Society charcoal
    // 95% black
    // r51 g49 b50
    // #333132
    // Headings, body text and the background colour for selected 
    // additional information areas such as grant opening dates 
    // and event series. Also used as the background for 
    // mobile-specific user interface elements such as "related events" 
    // and "event organisers".#
    // Charcoal has been reserved for use on typography 
    // – it should never be used as a block colour.
    // * Used for journals covering all sciences.
    charcoal:"#333132", // #12100f,   // NB. Only for use on typography


    // Secondary colour palette ------------------------------------
    
    // Orange
    // Pantone® 144
    // c0 m55 y95 k0
    // r237 g139 b0
    orange:"#ED8B00",

    // Pink
    // Pantone® 219
    // c0 m95 y0 k0
    // r218 g24 b132
    pink:"#DA1884",

    // Purple
    // Pantone® 248
    // c40 m100 y0 k0
    // r165 g24 b144
    // * Used for cross-disciplinary journals.
    purple:"#A51890",

    // Blue
    // Pantone® Process Blue
    // c100 m10 y0 k10
    // r0 g133 b202
    // Used for journals covering physical sciences.
    blue:"#0085CA",

    // Green
    // Pantone® 369
    // c68 m0 y100 k0
    // r100 g167 b11
    // * Used for journals covering biological sciences.
    green:"#64A70B",

    // Warm grey
    // Pantone® 408
    // c0 m10 y10 k50
    // r151 g140 b135
    // Used primarily for the heading area of grant cards. 
    // Also used for icons such as blog date and the footer
    // "back to top" icon.
    // * Used for journals covering the history of science.
    warmGrey:"#978C87",

    // Event schedule headers, content page features 
    // (such as grant application information on grant 
    // content detail pages) and table cells.
    warmGreyLight:"#e0dcdb",

    // secondary colours    
    // blue:#5284c5,
}


// If we use a blendmode to hide clean paths,
// we can swap out the background colour for one
// that will be converted into transparency such as black
export const VISUALISER_OPTIONS = {
    backgroundColour:"#fff", //PALETTE.stoneLight,
    lineColour:PALETTE.red,
    lineWidth:3
}

// to disable the password simply set it to false or null
export const DEFAULT_PASSWORD = "dm"

// Charles Goes Dancing At Every Big Fun Celebration.
// From G D A E B...
   
// const FIFTHS_LYDIAN = [0,1,1,1,1,1]
// const FIFTHS_IONIAN = [0,1,1,1,1,5]

export const CICRLE_INTERVALS = {
    major:[0,1,3],
    minor:[0,1,8],
    major7:[0,1,3,4],
    minor7:[0,1,8,9],
    dominant7:[0,1,3,6],
    minor7flat5:[1,1,2,6],
    tritoneSubstitution:[4,2,1,3],
    diminishedTriad:[0,6,3],
    diminishedSeventh:[0,3,3,3],
    augmented:[0,4,4]
}

// flag for showing the whole keyboard on screen rather than a trimmed size
export const DEFAULT_SETTINGS = {
    showAllKeys : true,
    showAudioVisualiser : true,
    showNoteVisualiser : true,
    showMouseNotes : true,
    showVoiceOver: true,
    showCountdown : false,
    showKeyboard : true,
    showStats : false,
    showNotes: true, 
    notes: 10,
    monitorIntersections:true,
    recordNotes : true,
    saveNotesInMiniNotation : true,
    useTimer : false,
    useGamepads : true,
    loadFromZips : true,
    debug : true
}

export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS)
export const getSettings = () => {
    const searchParams = new URLSearchParams(window.location)
    const SETTINGS = {...DEFAULT_SETTINGS}
    for (const [key, value] of searchParams) {
        if (SETTING_KEYS.includes(key))
        {
            SETTINGS[key] = value
        }
    }
    
    return SETTINGS
}