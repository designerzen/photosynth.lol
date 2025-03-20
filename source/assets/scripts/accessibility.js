
/**
 * Add text scaling controls to the menu
 */
export const addTextScalingFacilities = (initialFontSize=1, onFontSizeChange) => {
    const buttonFontSizeIncrease = document.getElementById("button-text-size-increase")
    const buttonFontSizeDecrease = document.getElementById("button-text-size-decrease")
    const rootStyles = document.documentElement.style
    
    let fontScale = initialFontSize
    const fontScaleBy = 0.1

    // TODO: disable the buttons when their extents are reached
    const setFontScale = scale => {
        if (fontScale !== scale){
            fontScale = scale
            rootStyles.setProperty("--font-scale",scale)
            console.log(rootStyles.getPropertyValue("--font-size-base"))
            onFontSizeChange(scale)
        }
    }
    
    buttonFontSizeIncrease.addEventListener("click", ()=>{
        setFontScale(  Math.min(fontScale + fontScaleBy, 2) )
    }) 

    buttonFontSizeDecrease.addEventListener("click", ()=>{
        setFontScale( Math.max(fontScale - fontScaleBy, 1) )
    })
}

