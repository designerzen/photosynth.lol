
const DEFAULT_OBSERVATION_OPTIONS = {
    // root: document.body,
    root: null,
    rootMargin: '0px',
    threshold: 0,
    pianoQuery: ".piano",
    triggerQuery:"[data-observe]"
}

export const monitorIntersections = ( intersectionOptions = DEFAULT_OBSERVATION_OPTIONS, onInteraction=null) => {

    // ensure options contains all possible values
    intersectionOptions = { ...DEFAULT_OBSERVATION_OPTIONS, ...intersectionOptions }

    const elementsToObserve = document.querySelectorAll( intersectionOptions.triggerQuery ) 
    const pianoElement = document.querySelector(intersectionOptions.pianoQuery)
    
    const intersectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
           
            const ratio = entry.intersectionRatio
            const boundingRect = entry.boundingClientRect
            const intersectionRect = entry.intersectionRect
          
            if (ratio === 0) {
                // OUTSIDE

            }else if (ratio >= 1) {
                // INSIDE
                // console.info("intersection INSIDE", entry)  
            } else if (boundingRect.top < intersectionRect.top) {
                // ABOVE
        
            } else {
                // BELOW
        
            }

            if (entry.isIntersecting) {
                // const inert = entry.target.hasAttribute("data-inert")
                const fullSizeKeyboard = entry.target.hasAttribute("data-full-keyboard")
                // const shortKeyboard = entry.target.hasAttribute("data-short-keyboard")
                // const hideKeyboard = entry.target.hasAttribute("data-hide-keyboard")
                // console.info("intersection", {entry, ratio, boundingRect, intersectionRect, fullSizeKeyboard})  

                const isSticky = entry.target.classList.contains("sticky")

                if (isSticky)
                {
                    
                }
                
                if (fullSizeKeyboard)
                {
                    
                }


                // trigger the associated menu if an id exists
                if (entry.target.id)
                {
                    const currentMenuItems = document.querySelectorAll(`[aria-current]`)
                    const menuEntries = document.querySelectorAll(`a[href="#${entry.target.id}"]`)
                    currentMenuItems.forEach(menuEntry => menuEntry.removeAttribute("aria-current", true))
                    menuEntries.forEach(menuEntry => menuEntry.setAttribute("aria-current", true))
                }

                onInteraction && onInteraction(entry, true)

                if (entry.target.classList)
                {
                    entry.target.classList.toggle("in-viewport", true)
                }

                // document.body.classList.toggle("inert", inert)
                pianoElement && pianoElement.classList.toggle("show-full-keyboard", fullSizeKeyboard)
              
            }else{
              
                onInteraction && onInteraction(entry, false)
                entry.target.classList.toggle("in-viewport", false)
                entry.target.removeAttribute("aria-current")
            }
        })
    }, intersectionOptions)
    // observe all elements that match that query
    elementsToObserve.forEach(element => intersectionObserver.observe(element))

    // console.info("elementsToObserve", {elementsToObserve }) 
    return elementsToObserve
}