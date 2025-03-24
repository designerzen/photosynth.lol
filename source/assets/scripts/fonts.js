export const setFont = (fontName, onFontChange)=>{
    // ensure that fontName is a valid font name
    if (!fontName){
        return false
    }
    document.body.setAttribute("data-font", fontName)
    onFontChange && onFontChange(fontName)
    
    return fontName
}

