
export const THEMES = ["default", "contrast", "monochrome", "colourful"]

/**
 * Set the theme to one of the THEMES above
 * @param {String} themeName 
 * @param {Function} onThemeChange 
 * @returns 
 */
export const setTheme = (themeName, onThemeChange)=>{
    // ensure that themeName is a valid theme name
    if (!THEMES.includes(themeName)){
        return false
    }
    document.documentElement.setAttribute("data-theme", themeName)
    onThemeChange && onThemeChange(themeName)
    return true
}

/**
 * 
 * @param {Function} onThemeChange 
 */
export const addThemeSelectionOptions = (onThemeChange)=>{
    const radioButtons = document.querySelectorAll("input[name='palette']")
    for (const radioButton of radioButtons) 
    {
        radioButton.addEventListener('change', (e)=>{
            if (radioButton.checked){
                setTheme(e.target.value, onThemeChange)
            }
        })
    }
}
