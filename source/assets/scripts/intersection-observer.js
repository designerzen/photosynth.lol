
const DEFAULT_OBSERVATION_OPTIONS = {
    // root: document.body,
    root: null,
    rootMargin: '0px',
    threshold: 0,
    pianoQuery: ".piano"
}

export const monitorIntersections = ( query="[data-observe]", intersectionOptions = DEFAULT_OBSERVATION_OPTIONS) => {

    // ensure options contains all possible values
    intersectionOptions = { ...DEFAULT_OBSERVATION_OPTIONS, ...intersectionOptions }

    const elementsToObserve = document.querySelectorAll(query)
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

                if (fullSizeKeyboard)
                {
                    
                }

                if (entry.target.classList)
                {
                    entry.target.classList.toggle("in-viewport", true)
                }else{
                    console.error("IN intersection without entry", entry, entry.classList )
                }

                // document.body.classList.toggle("inert", inert)
                pianoElement.classList.toggle("show-full-keyboard", fullSizeKeyboard)
              
            }else{
                if (entry.target.classList)
                {
                    entry.target.classList.toggle("in-viewport", false)
                }else{
                    console.error("OUT intersection without entry", entry, entry.classList )
                }
            }
        })
    }, intersectionOptions)
    // observe all elements that match that query
    elementsToObserve.forEach(element => intersectionObserver.observe(element))

    // console.info("elementsToObserve", {elementsToObserve }) 
}