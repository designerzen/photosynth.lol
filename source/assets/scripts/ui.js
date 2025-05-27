import { hasSpeech, say, stopSpeaking } from "./speech"

export const toTitleCase = word => (word.charAt(0).toUpperCase() + word.slice(1))

// change data- on the HTML element
export const setGlobalAttribute = ( attribute, value ) => document.documentElement.setAttribute(attribute, value)

export const changeUIText = (query, value) => {
    document.querySelectorAll(query).forEach( element => element.textContent = value )
}

export const selectRadioButton = (value) => {
    document.querySelectorAll(`input[value="${value}"]`).forEach( element => {
        if (!element.checked){ 
            element.checked = true 
        } 
    })
}

/**
 * update text field on UI
 * @param {String} timbre 
 */
let elementTimbreSelector
export const updateTimbreUI = (timbre) => {
    
    changeUIText("[data-timbre]", toTitleCase(timbre) )
    
    if (!elementTimbreSelector)
    {
        elementTimbreSelector = document.getElementById("song-timbre-select")
    }

    if (elementTimbreSelector.value !== timbre)
    {  
        elementTimbreSelector.value = timbre
    }
}

/**
 * 
 * @param {String} scaleType 
 */
export const updateScaleUI = (scaleType) => {
    // remove old scale and add new one...
    setGlobalAttribute("data-scale", scaleType.toLowerCase()  ) 
    // ensure the input radio is selected
    selectRadioButton(scaleType)

    changeUIText("[data-musical-scale]", scaleType)
}


/**
 * replace the current year with the current year
 * @returns {Boolean} if the year was updated
 */
export const setCurrentYear = () => {
    const currentYear = new Date().getFullYear()
    const yearElement = document.querySelector(".current-year")
    if (yearElement)
    {
        yearElement.textContent = currentYear
        return true
    }
    return false
 }

/**
 * Password Protection Overlay
 * @param {String} correctPassword 
 * @returns 
 */
export const handlePasswordProtection = ( searchParams, correctPassword="", onSubmitted=null ) => {

    // in future we will disable the password protection
    const hasPasswordScreen = pass || !pass.hidden
    if (!hasPasswordScreen)
    {
        return false
    }

    const timesVisited = parseInt(searchParams.get("visited") ?? 0)
    const hasPreviousUserSession = timesVisited > 0
    
    pass.addEventListener("submit", (event) => {
        event.preventDefault()
        const isPasswordCorrect = password.value === correctPassword
        if (isPasswordCorrect)
        {
            pass.hidden = true
            searchParams.set("visited", timesVisited + 1 )
            console.info('Password correct '+isPasswordCorrect, password, password.value)
            onSubmitted && onSubmitted()
        }
        return false
    })

    if (hasPreviousUserSession)
    {
        pass.hidden = true
    }

    // console.error({pass:pass, hidden:pass.hidden, showingPasswordScreen, timesVisited})
    return hasPreviousUserSession
}

/**
 * 
 * @returns 
 */
export const addReadButtons = () => {
    const hasVoice = hasSpeech()
    if (!hasVoice)
    {
        return false
    }

    const readableElements = document.querySelectorAll("[data-readable]")
    readableElements.forEach( element => {
        element.innerHTML = `
        <label class="label-button-read" >
        <div class="sticky-content-wrapper">   
        Voice-over :
            <button class="button-read" type="button" data-button-speak>
                Read out this section
            </button>
            </div>
        </label>` + element.innerHTML
    })

    const speakOutLoudButtons = document.querySelectorAll('[data-button-speak]')
    speakOutLoudButtons.forEach( button => {
        if (hasVoice)
        {
            button.addEventListener("click", async ( e )=> {
                
                stopSpeaking()
                
                if (button.hasAttribute("data-speaking"))
                {
                    button.removeAttribute( "data-speaking" )
                    return
                }
                const article = button.closest("[data-readable]")
                
                const text = article.textContent.replace( button.innerText, "" )
                // We do not want to read out the button text we just pressed...

                button.setAttribute("data-speaking", true )
                await say( text )
                button.removeAttribute( "data-speaking" )
            })
        }else{
            button.hidden = true
        }
    })
    return true
}