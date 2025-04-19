
const COUNTDOWN_TYPES = ["days", "hours", "minutes", "seconds"]
export const countdown = (element) => {   

    // grab all the time elements
    const timeElements = element.querySelectorAll("time")
    
    const counter = document.createElement("div")
    counter.classList.add("countdown")

    let date
    let times

    const getTime = date => {
       
        const now = new Date()

        const remainingMs = Math.max(0, date.getTime() - now.getTime() )
       
        const totalSeconds = Math.floor(remainingMs / 1000)
        const totalMinutes = Math.floor(totalSeconds / 60)
        const totalHours = Math.floor(totalMinutes / 60)
        const totalDays = Math.floor(totalHours / 24)
    
        const displaySeconds = totalSeconds % 60
        const displayMinutes = totalMinutes % 60
        const displayHours = totalHours % 24

        const times = [ totalDays, displayHours, displayMinutes, displaySeconds ]
        return times
    }

    const countElements = []
    timeElements.forEach( timeElement => {
        const time = timeElement.getAttribute("datetime")
        date = new Date(time)
        times = getTime(date) // [ totalDays, displayHours, displayMinutes, displaySeconds ]
        times.forEach( ( value, i ) => {

            const isLast = i === times.length - 1
            const type = COUNTDOWN_TYPES[i]
            const span = document.createElement("span")
            span.classList.add("countdown-"+type)
            span.textContent = "" + value + " " + type + ( isLast ? "." : ", " )

            counter.appendChild(span)
            countElements.push(span)
        })  
    })

    element.appendChild(counter)

    const update = () => {
        const newTimes = getTime(date) 
        countElements.forEach( (countElement, i) => {
            const newValue = newTimes[i]
            const oldValue = times[i]
            if (oldValue !== newValue)
            {
                const isLast = i === newTimes.length - 1
                const type = COUNTDOWN_TYPES[i]
                countElement.textContent = "" + newValue + " " + type + ( isLast ? "." : ", " )
            }
        })
    }

    setInterval(update, 1000)
}