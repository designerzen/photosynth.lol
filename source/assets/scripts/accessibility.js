
const toPrecision = (scale, minimum=2, precision=1) => parseFloat( Math.min(scale, minimum).toFixed(precision) )

/**
 * Add text scaling controls to the menu
 */
export const addTextScalingFacilities = (initialFontSize=1, onFontSizeChange) => {
    const buttonFontSizeIncrease = document.getElementById("button-text-size-increase")
    const buttonFontSizeDecrease = document.getElementById("button-text-size-decrease")
    const rootStyles = document.documentElement.style
    
    let fontScale = initialFontSize
    const fontScaleBy = 0.1
  
    const setFontScale = scale => {
        if (fontScale !== scale)
        {
            fontScale = scale
            rootStyles.setProperty("--font-scale",scale)
           
            // disable the buttons when their extents are reached?
            buttonFontSizeDecrease.disabled = scale <= 1
            buttonFontSizeIncrease.disabled = scale >= 2

            // console.log(rootStyles.getPropertyValue("--font-size-base"))
            onFontSizeChange(scale)
        }
    }
    
    buttonFontSizeIncrease.addEventListener("click", e =>{
        e.preventDefault()
        setFontScale( toPrecision(fontScale + fontScaleBy, 2) )
    }) 

    buttonFontSizeDecrease.addEventListener("click", e =>{
        e.preventDefault()
        setFontScale( toPrecision(fontScale - fontScaleBy, 2) )
    })
}