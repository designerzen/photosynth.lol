export const prefersReducedMotion = () => !!window.matchMedia("(prefers-reduced-motion: reduce)").matches

export const activateViewTransitions = async () => {
    // View Transitions are available on this browser
    if ( document.startViewTransition && !prefersReducedMotion() ) {
        // add transforms!
        document
            .startViewTransition(() => {
                // currentStep = stepNumber
                // showStep(currentStep)
            })
            .finished.then(() => {
                // Clean up direction class
                document.documentElement.classList.remove("animate-view")
                return true
            })
    }else{
        return false
    }
}


export const setGalleryImage = (image, title, attribution) => {

    // find the nearest dialog...imgvalue 
    const wrapper = image.closest(".gallery")
    const dialog = wrapper.querySelector("dialog")
    const figcaption = dialog.querySelector("figcaption > strong")
    const citation = dialog.querySelector("figcaption > cite")
    const id = image.id
       
    if (!dialog) {
        console.warn("No dialog found for gallery image toggle", {wrapper, image, dialog} )
    }else{
        const abortSignal = new AbortController()
        // set the image source
        const img = dialog.querySelector("img")
        if (img) {

            //  activateViewTransitions()

            img.classList.toggle("loading", true)

            img.onload = () => {
                // set the focus on the image when it loads
                console.warn("image in dialog has loaded")
                img.classList.toggle("loading", false)
            }

            img.src = image.src
            img.alt = title ?? image.alt ?? ""

            figcaption.textContent = title ?? image.alt ?? ""
            citation.textContent = attribution ? `Copyright 2025, ${attribution}` : false // "Photograph by respective copyright holders""
            citation.hidden = !attribution || attribution.length === 0

            // find all other images
            const listItem = image.closest("li")

            const previous = listItem.previousElementSibling
            const next = listItem.nextElementSibling

            const previousImage = previous?.querySelector("img")
            const nextImage = next?.querySelector("img")

            const menu = dialog.querySelector("menu")
            const previousImageButton = menu.querySelector(".gallery-image-button-previous")
            const nextImageButton = menu.querySelector(".gallery-image-button-next")

            if (previousImage || nextImage) {
                // show the arrows  
                menu.hidden = false
            }

            if (previousImageButton)
            {
                // update the UI with arrows
                if (previousImage){
                    previousImageButton.hidden = false
                    previousImageButton.addEventListener("click", () => {
                        abortSignal.abort()
                        setGalleryImage(previousImage)
                    }, {signal:abortSignal.signal})
                }else{
                    previousImageButton.hidden = true
                }
            }
         
            if (nextImageButton)
            {
                if (nextImage){
                    nextImageButton.hidden = false
                    nextImageButton.addEventListener("click", () => {
                        abortSignal.abort()
                        setGalleryImage(nextImage)
                    }, {signal:abortSignal.signal})
                }else{
                    nextImageButton.hidden = true
                }
            }
          

            // allow keyboard events
            window.addEventListener("keydown", (e) => {
                if (e.key === "ArrowLeft" && previousImage) {   
                    abortSignal.abort()
                    setGalleryImage(previousImage)
                }
                if (e.key === "ArrowRight" && nextImage) {   
                    abortSignal.abort()
                    setGalleryImage(nextImage)
                }
            }, {signal:abortSignal.signal})

            //console.warn("dialog opened with image", {image, img,previous, next, previousImage, nextImage, figcaption})

        } else {
            console.warn("No image found in dialog to set source")
        }

        // open the dialog
        dialog.showModal()

        // wait for the dialog to close
        dialog.addEventListener("close", (e) =>{

            // prevent close affecting multiple times
            abortSignal.abort()
            // blank out the loaded image
            img.src = ""
            // set focus on the original image
            image.focus()
            console.warn("dialog closed, focus set on image", image)
        }, {signal:abortSignal.signal})
    }
}

export const createGallery = () => {

    const imageToggles = document.querySelectorAll(".gallery-image-toggle")
    //console.warn("createGallery", imageToggles)

    // hijack native toggle event
    imageToggles.forEach( imageToggle => {
        imageToggle.addEventListener("click", event => {
            event.preventDefault()
            
            // find the image associated with the toggle
          
            const id = imageToggle.value
            const image = document.getElementById(id)
            const title = image.alt || "Gallery Item"
            const attribution = image.dataset.attribution
            //console.warn("Gallery:request", image, id, event )
            setGalleryImage( image, title, attribution )
            
            // ensure that when we close the dialog we
            // also set the focus target onto the original element
        })
    })
}