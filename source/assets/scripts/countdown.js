const COUNTDOWN_TYPES = ["day", "hour", "minute", "second"]
export const countdown = (element, completedText="July 1st - 6th 2025", period=1000) => {   

    // grab all the time elements
    const timeElements = element.querySelectorAll("time")
    
    const counter = document.createElement("p")
    counter.classList.add("countdown")

    let date
    let times
    let interval

    const getRemaining = date => {
        const now = new Date()
        return Math.max(0, date.getTime() - now.getTime() )
    }

    const getTime = remainingMs => {
       
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
            const type = COUNTDOWN_TYPES[i] + (value > 1 ? "s" : "")
            const span = document.createElement("span")
            span.classList.add("countdown-"+type)
            span.textContent = "" + value + " " + type + ( isLast ? "." : ", " )

            counter.appendChild(span)
            countElements.push(span)
        })  
        timeElement.hidden = true
    })

    element.appendChild(counter)

    const update = () => {
        const remainingMS = getRemaining(date)

        if (remainingMS > 0)
        {
            const newTimes = getTime(remainingMS) 
            countElements.forEach( (countElement, i) => {
                const newValue = newTimes[i]
                const oldValue = times[i]
                if (oldValue !== newValue)
                {
                    const isLast = i === newTimes.length - 1
                    const type = COUNTDOWN_TYPES[i] + (newValue > 1 ? "s" : "")
                    countElement.textContent = "" + newValue + " " + type + ( isLast ? "." : ", " )
                }
            })
        }else{
            clearInterval(interval)
            counter.textContent = completedText
        }
    }

    interval = setInterval(update, period)
}