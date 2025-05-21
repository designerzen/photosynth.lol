export const debounce = (callback, wait=100) => {
    let timeoutId = null
    return (...args) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => callback.apply(null, args), wait)
    }
}

export const shuffleArray = (array) => {
    const clone = array.slice(0)
    for (let i = clone.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)) // random index from 0 to i
    
        // swap elements array[i] and array[j]
        const t = clone[i]
        clone[i] = clone[j]
        clone[j] = t
        
        // same can be written as:
        // [clone[i], clone[j]] = [clone[j], clone[i]]
    }
    return clone
}