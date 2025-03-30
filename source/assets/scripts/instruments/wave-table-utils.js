/**
 * Convert an HTMLImageElement to a Float32Array
 * @param {HTMLImageElement} imageElement 
 * @returns {Float32Array}
 */
export const extrapolateDataFromImage = (imageElement) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = imageElement.width
    canvas.height = imageElement.height
    ctx.drawImage(imageElement, 0, 0)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return new Float32Array((new Uint8Array(data.data)).buffer)
}

/**
 * Load FloatArray from a local image file
 * @param {String} uri
 * @returns {Promise<Float32Array>}
 */
export const loadImageFromFile = (uri, process=extrapolateDataFromPNG) => {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            resolve(process(img))
        }
        img.onerror = () => {
            reject("Could not load " + uri)
        }
        img.src = uri
    })
}

/**
 * 
 * @param {HTMLImageElement} image 
 * @returns 
 */
export const loadWaveTableFromImage = async (image) => {
    return loadImageFromFile(image, extrapolateDataFromPNG)
}

/**
 * Create an image from the wavetable
 * @param {Float32Array} waveTable 
 * @returns {HTMLImageElement}
 */
export const createImageFromWaveTable = waveTable => {
    const wavetable = new Float32Array(2 * 524288)
}

export const convertWaveTableToUint8Array = (waveTable) => {
    const streamLength = waveTable.real.length
    const data = new Uint8Array(streamLength * 2)
    waveTable.real.forEach((value, index) => {
        data[index] = value
        data[index + streamLength] = waveTable.imag[index]
    })
    // new Float32Array((new Uint8Array(data.data)).buffer)
    return data
}

export const generateImageFromWaveTable = (waveTable ) => {
    const data = convertWaveTableToUint8Array(waveTable)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const quantityOfSamples = waveTable.real.length
  
    // work these out from the size of the wave table
    const width=quantityOfSamples
    const height=2  // real + imaginary

    canvas.width = width
    canvas.height = height

    // create imageData object
    const imageData = ctx.createImageData(width, height)

    // set our buffer as source
    imageData.data.set(data)

    // update canvas with new data
    ctx.putImageData(imageData, 0, 0)

    return canvas
}