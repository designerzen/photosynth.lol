export const debounce = (callback, wait=100) => {
    let timeoutId = null
    return (...args) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => callback.apply(null, args), wait)
    }
}