
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
export const updateTimbreUI = (timbre) => {
    changeUIText("[data-timbre]", toTitleCase(timbre) )
    const d = document.getElementById("song-timbre-select")
    d.value = timbre
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