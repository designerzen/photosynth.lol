/**
 * @license The MIT License (MIT)
 * @copyright Isaac Sukin 2016
 * @see https://github.com/IceCreamYou/MainLoop.js
 */

const NOOP = function() {}
const windowOrRoot = typeof window === 'object' ? window : root

/**
 * The main loop is a core part of any application in which state changes
 * even if no events are handled. In games, it is typically responsible for
 * computing physics and AI as well as drawing the result on the screen.
 *
 * The body of this particular loop is run every time the browser is ready to
 * paint another frame. The frequency with which this happens depends primarily
 * on the monitor's refresh rate, which is typically 60 frames per second. Most
 * applications aim to run at 60 FPS for this reason, meaning that the main
 * loop runs about once every 16.7 milliseconds. With this target, everything
 * that happens in the main loop (e.g. all updates and drawing) needs to occur
 * within the "budget" of 16.7 milliseconds. See
 * `MainLoop.setSimulationTimestep()` for more information about typical
 * monitor refresh rates and frame rate targets.
 *
 * The main loop can be started and stopped. There are four main
 * parts of the loop: begin(), update(), draw(), and end(), in that order.
 * See the methods that set each of them for descriptions of what they are used for.
 * Note that update() can run zero or more times per loop.
 *
 * @class TimeLoop
 */
export default class TimeLoop {
    /**
     * @param {object} [options={}] - Configuration options for the loop.
     * @param {number} [options.simulationTimestep=1000/60] - The target time step for updates.
     * @param {number} [options.fpsAlpha=0.9] - Smoothing factor for FPS calculation.
     * @param {number} [options.fpsUpdateInterval=1000] - Interval for updating FPS estimate.
     */
    constructor(options = {}) {
        // How many milliseconds should be simulated by every run of update().
        this.simulationTimestep = options.simulationTimestep || (1000 / 60)

        // The cumulative amount of in-app time that hasn't been simulated yet.
        // See the comments inside #animate() for details.
        this.frameDelta = 0

        // The timestamp in milliseconds of the last time the main loop was run.
        // Used to compute the time elapsed between frames.
        this.lastFrameTimeMs = 0

        // An exponential moving average of the frames per second.
        this.fps = 60

        // A factor that affects how heavily to weight more recent seconds'
        // performance when calculating the average frames per second. Valid values
        // range from zero to one inclusive. Higher values result in weighting more
        // recent seconds more heavily.
        this.fpsAlpha = options.fpsAlpha || 0.9

        // The minimum duration between updates to the frames-per-second estimate.
        // Higher values increase accuracy, but result in slower updates.
        this.fpsUpdateInterval = options.fpsUpdateInterval || 1000

        // The timestamp (in milliseconds) of the last time the `fps` moving
        // average was updated.
        this.lastFpsUpdate = 0

        // The number of frames delivered since the last time the `fps` moving
        // average was updated (i.e. since `lastFpsUpdate`).
        this.framesSinceLastFpsUpdate = 0

        // The number of times update() is called in a given frame. This is only
        // relevant inside of #animate(), but a reference is held externally so that
        // this variable is not marked for garbage collection every time the main
        // loop runs.
        this.numUpdateSteps = 0

        // The minimum amount of time in milliseconds that must pass since the last
        // frame was executed before another frame can be executed. The
        // multiplicative inverse caps the FPS (the default of zero means there is
        // no cap).
        this.minFrameDelay = 0

        // Whether the main loop is running.
        this.running = false

        // `true` if `MainLoop.start()` has been called and the most recent time it
        // was called has not been followed by a call to `MainLoop.stop()`. This is
        // different than `running` because there is a delay of a few milliseconds
        // after `MainLoop.start()` is called before the application is considered
        // "running." This delay is due to waiting for the next frame.
        this.started = false

        // Whether the simulation has fallen too far behind real time.
        // Specifically, `panic` will be set to `true` if too many updates occur in
        // one frame. This is only relevant inside of #animate(), but a reference is
        // held externally so that this variable is not marked for garbage
        // collection every time the main loop runs.
        this.panic = false

        // The function that runs the main loop. The unprefixed version of
        // `window.requestAnimationFrame()` is available in all modern browsers
        // now, but node.js doesn't have it, so fall back to timers. The polyfill
        // is adapted from the MIT-licensed
        // https://github.com/underscorediscovery/realtime-multiplayer-in-html5
        this.requestAnimationFrame = windowOrRoot.requestAnimationFrame

        // The function that stops the main loop. The unprefixed version of
        // `window.cancelAnimationFrame()` is available in all modern browsers now,
        // but node.js doesn't have it, so fall back to timers.
        this.cancelAnimationFrame = windowOrRoot.cancelAnimationFrame
        // A function that runs at the beginning of the main loop.
        // See `MainLoop.setBegin()` for details.
        this.begin = NOOP

        // A function that runs updates (i.e. AI and physics).
        // See `MainLoop.setUpdate()` for details.
        this.update = NOOP

        // A function that draws things on the screen.
        // See `MainLoop.setDraw()` for details.
        this.draw = NOOP

        // A function that runs at the end of the main loop.
        // See `MainLoop.setEnd()` for details.
        this.end = NOOP

        // The ID of the currently executing frame. Used to cancel frames when
        // stopping the loop.
        this.rafHandle = null

        // Bind the animate method to this instance
        this.animate = this.animate.bind(this)
    }

    /**
     * Gets how many milliseconds should be simulated by every run of update().
     *
     * See `MainLoop.setSimulationTimestep()` for details on this value.
     *
     * @return {Number}
     *   The number of milliseconds that should be simulated by every run of
     *   {@link #setUpdate update}().
     */
    getSimulationTimestep() {
        return this.simulationTimestep
    }

    /**
     * Sets how many milliseconds should be simulated by every run of update().
     *
     * See the class documentation for details on the simulation timestep.
     *
     * @param {Number} timestep
     *   The number of milliseconds that should be simulated by every run of
     *   {@link #setUpdate update}().
     * @chainable
     */
    setSimulationTimestep(timestep) {
        this.simulationTimestep = timestep
        return this
    }

    /**
     * Returns the exponential moving average of the frames per second.
     *
     * @return {Number}
     *   The exponential moving average of the frames per second.
     */
    getFPS() {
        return this.fps
    }

    /**
     * Gets the maximum frame rate.
     *
     * Other factors also limit the FPS; see `MainLoop.setSimulationTimestep`
     * for details.
     *
     * See also `MainLoop.setMaxAllowedFPS()`.
     *
     * @return {Number}
     *   The maximum number of frames per second allowed.
     */
    getMaxAllowedFPS() {
        return 1000 / this.minFrameDelay
    }

    /**
     * Sets a maximum frame rate.
     *
     * See also `MainLoop.getMaxAllowedFPS()`.
     *
     * @param {Number} [fps=Infinity]
     *   The maximum number of frames per second to execute. If Infinity or not
     *   passed, there will be no FPS cap (although other factors do limit the
     *   FPS; see `MainLoop.setSimulationTimestep` for details). If zero, this
     *   will stop the loop, and when the loop is next started, it will return
     *   to the previous maximum frame rate. Passing negative values will stall
     *   the loop until this function is called again with a positive value.
     *
     * @chainable
     */
    setMaxAllowedFPS(fps) {
        if (typeof fps === 'undefined') {
            fps = Infinity
        }
        if (fps === 0) {
            this.stop()
        } else {
            // Dividing by Infinity returns zero.
            this.minFrameDelay = 1000 / fps
        }
        return this
    }

    /**
     * Reset the amount of time that has not yet been simulated to zero.
     *
     * This introduces non-deterministic behavior if called after the
     * application has started running (unless it is being reset, in which case
     * it doesn't matter). However, this can be useful in cases where the
     * amount of time that has not yet been simulated has grown very large
     * (for example, when the application's tab gets put in the background and
     * the browser throttles the timers as a result).
     *
     * @return {Number}
     *   The cumulative amount of elapsed time in milliseconds that has not yet
     *   been simulated, but is being discarded as a result of calling this
     *   function.
     */
    resetFrameDelta() {
        const oldFrameDelta = this.frameDelta
        this.frameDelta = 0
        return oldFrameDelta
    }

    /**
     * Sets the function that runs at the beginning of the main loop.
     *
     * The begin() function is typically used to process input before the
     * updates run.
     *
     * @param {Function} fun The begin() function.
     * @param {Number} [fun.timestamp] The current timestamp.
     * @param {Number} [fun.delta] The total elapsed time that has not yet been simulated.
     * @chainable
     */
    setBegin(fun) {
        this.begin = fun || NOOP
        return this
    }

    /**
     * Sets the function that runs updates (e.g. AI and physics).
     *
     * The update() function should simulate anything that is affected by time.
     * It can be called zero or more times per frame depending on the frame rate.
     *
     * @param {Function} fun The update() function.
     * @param {Number} [fun.delta] The amount of time in milliseconds to simulate.
     * @chainable
     */
    setUpdate(fun) {
        this.update = fun || NOOP
        return this
    }

    /**
     * Sets the function that draws things on the screen.
     *
     * The draw() function gets passed the percent of time that the next run of
     * update() will simulate that has actually elapsed, as a decimal.
     *
     * @param {Function} fun The draw() function.
     * @param {Number} [fun.interpolationPercentage] The interpolation percentage.
     * @chainable
     */
    setDraw(fun) {
        this.draw = fun || NOOP
        return this
    }

    /**
     * Sets the function that runs at the end of the main loop.
     *
     * The end() function is useful for cleanup, status reporting, etc.
     *
     * @param {Function} fun The end() function.
     * @param {Number} [fun.fps] The exponential moving average of the frames per second.
     * @param {Boolean} [fun.panic] Whether the simulation has fallen too far behind.
     * @chainable
     */
    setEnd(fun) {
        this.end = fun || NOOP
        return this
    }

    /**
     * Starts the main loop.
     *
     * @chainable
     */
    start() {
        if (!this.started) {
            this.started = true
            this.rafHandle = this.requestAnimationFrame((timestamp) => {
                // Render the initial state before any updates occur.
                this.draw(1)

                // The application isn't considered "running" until the
                // application starts drawing.
                this.running = true

                // Reset variables that are used for tracking time so that we
                // don't simulate time passed while the application was paused.
                this.lastFrameTimeMs = timestamp
                this.lastFpsUpdate = timestamp
                this.framesSinceLastFpsUpdate = 0

                // Start the main loop.
                this.rafHandle = this.requestAnimationFrame(this.animate)
            })
        }
        return this
    }

    /**
     * Stops the main loop.
     *
     * @chainable
     */
    stop() {
        this.running = false
        this.started = false
        this.cancelAnimationFrame(this.rafHandle)
        this.rafHandle = null // Clear the handle
        return this
    }

    /**
     * Returns whether the main loop is currently running.
     *
     * @return {Boolean}
     */
    isRunning() {
        return this.running
    }

    /**
     * The main loop function (private).
     *
     * This function is invoked by `requestAnimationFrame()`.
     *
     * @param {DOMHighResTimeStamp} timestamp
     *   The timestamp in milliseconds provided by `requestAnimationFrame()`
     *   or `setTimeout()`.
     * @private
     */
    animate(timestamp) {
        // Run the loop again the next time the browser is ready to render.
        // We set rafHandle immediately so that the next frame can be canceled
        // during the current frame.
        this.rafHandle = this.requestAnimationFrame(this.animate)

        // Throttle the frame rate (if minFrameDelay is set to a non-zero value by
        // `MainLoop.setMaxAllowedFPS()`).
        if (timestamp < this.lastFrameTimeMs + this.minFrameDelay) {
            return
        }

        // frameDelta is the cumulative amount of in-app time that hasn't been
        // simulated yet. Add the time since the last frame. We need to track total
        // not-yet-simulated time (as opposed to just the time elapsed since the
        // last frame) because not all actually elapsed time is guaranteed to be
        // simulated each frame. See the comments below for details.
        this.frameDelta += timestamp - this.lastFrameTimeMs
        this.lastFrameTimeMs = timestamp

        // Run any updates that are not dependent on time in the simulation. See
        // `MainLoop.setBegin()` for additional details on how to use this.
        this.begin(timestamp, this.frameDelta)

        // Update the estimate of the frame rate, `fps`. Approximately every
        // second, the number of frames that occurred in that second are included
        // in an exponential moving average of all frames per second. This means
        // that more recent seconds affect the estimated frame rate more than older
        // seconds.
        if (timestamp > this.lastFpsUpdate + this.fpsUpdateInterval) {
            // Compute the new exponential moving average.
            this.fps =
                // Divide the number of frames since the last FPS update by the
                // amount of time that has passed to get the mean frames per second
                // over that period. This is necessary because slightly more than a
                // second has likely passed since the last update.
                this.fpsAlpha * this.framesSinceLastFpsUpdate * 1000 / (timestamp - this.lastFpsUpdate) +
                (1 - this.fpsAlpha) * this.fps

            // Reset the frame counter and last-updated timestamp since their
            // latest values have now been incorporated into the FPS estimate.
            this.lastFpsUpdate = timestamp
            this.framesSinceLastFpsUpdate = 0
        }
        // Count the current frame in the next frames-per-second update. This
        // happens after the previous section because the previous section
        // calculates the frames that occur up until `timestamp`, and `timestamp`
        // refers to a time just before the current frame was delivered.
        this.framesSinceLastFpsUpdate++

        /*
            * A naive way to move an object along its X-axis might be to write a main
            * loop containing the statement `obj.x += 10;` which would move the object
            * 10 units per frame. This approach suffers from the issue that it is
            * dependent on the frame rate. In other words, if your application is
            * running slowly (that is, fewer frames per second), your object will also
            * appear to move slowly, whereas if your application is running quickly
            * (that is, more frames per second), your object will appear to move
            * quickly. This is undesirable, especially in multiplayer/multi-user
            * applications.
            *
            * One solution is to multiply the speed by the amount of time that has
            * passed between rendering frames. For example, if you want your object to
            * move 600 units per second, you might write `obj.x += 600 * delta`, where
            * `delta` is the time passed since the last frame. (For convenience, let's
            * move this statement to an update() function that takes `delta` as a
            * parameter.) This way, your object will move a constant distance over
            * time. However, at low frame rates and high speeds, your object will move
            * large distances every frame, which can cause it to do strange things
            * such as move through walls. Additionally, we would like our program to
            * be deterministic. That is, every time we run the application with the
            * same input, we would like exactly the same output. If the time between
            * frames (the `delta`) varies, our output will diverge the longer the
            * program runs due to accumulated rounding errors, even at normal frame
            * rates.
            *
            * A better solution is to separate the amount of time simulated in each
            * update() from the amount of time between frames. Our update() function
            * doesn't need to change; we just need to change the delta we pass to it
            * so that each update() simulates a fixed amount of time (that is, `delta`
            * should have the same value each time update() is called). The update()
            * function can be run multiple times per frame if needed to simulate the
            * total amount of time passed since the last frame. (If the time that has
            * passed since the last frame is less than the fixed simulation time, we
            * just won't run an update() until the the next frame. If there is
            * unsimulated time left over that is less than our timestep, we'll just
            * leave it to be simulated during the next frame.) This approach avoids
            * inconsistent rounding errors and ensures that there are no giant leaps
            * through walls between frames.
            *
            * That is what is done below. It introduces a new problem, but it is a
            * manageable one: if the amount of time spent simulating is consistently
            * longer than the amount of time between frames, the application could
            * freeze and crash in a spiral of death. This won't happen as long as the
            * fixed simulation time is set to a value that is high enough that
            * update() calls usually take less time than the amount of time they're
            * simulating. If it does start to happen anyway, see `MainLoop.setEnd()`
            * for a discussion of ways to stop it.
            *
            * Additionally, see `MainLoop.setUpdate()` for a discussion of performance
            * considerations.
            *
            * Further reading for those interested:
            *
            * - http://gameprogrammingpatterns.com/game-loop.html
            * - http://gafferongames.com/game-physics/fix-your-timestep/
            * - https://gamealchemist.wordpress.com/2013/03/16/thoughts-on-the-javascript-game-loop/
            * - https://developer.mozilla.org/en-US/docs/Games/Anatomy
            */
        this.numUpdateSteps = 0
        while (this.frameDelta >= this.simulationTimestep) {
            this.update(this.simulationTimestep)
            this.frameDelta -= this.simulationTimestep

            /*
                * Sanity check: bail if we run the loop too many times.
                *
                * One way this could happen is if update() takes longer to run than
                * the time it simulates, thereby causing a spiral of death. For ways
                * to avoid this, see `MainLoop.setEnd()`. Another way this could
                * happen is if the browser throttles serving frames, which typically
                * occurs when the tab is in the background or the device battery is
                * low. An event outside of the main loop such as audio processing or
                * synchronous resource reads could also cause the application to hang
                * temporarily and accumulate not-yet-simulated time as a result.
                *
                * 240 is chosen because, for any sane value of simulationTimestep, 240
                * updates will simulate at least one second, and it will simulate four
                * seconds with the default value of simulationTimestep. (Safari
                * notifies users that the script is taking too long to run if it takes
                * more than five seconds.)
                *
                * If there are more updates to run in a frame than this, the
                * application will appear to slow down to the user until it catches
                * back up. In networked applications this will usually cause the user
                * to get out of sync with their peers, but if the updates are taking
                * this long already, they're probably already out of sync.
                */
            if (++this.numUpdateSteps >= 240) {
                this.panic = true
                break
            }
        }

        /*
            * Render the screen. We do this regardless of whether update() has run
            * during this frame because it is possible to interpolate between updates
            * to make the frame rate appear faster than updates are actually
            * happening. See `MainLoop.setDraw()` for an explanation of how to do
            * that.
            *
            * We draw after updating because we want the screen to reflect a state of
            * the application that is as up-to-date as possible. (`MainLoop.start()`
            * draws the very first frame in the application's initial state, before
            * any updates have occurred.) Some sources speculate that rendering
            * earlier in the requestAnimationFrame callback can get the screen painted
            * faster; this is mostly not true, and even when it is, it's usually just
            * a trade-off between rendering the current frame sooner and rendering the
            * next frame later.
            *
            * See `MainLoop.setDraw()` for details about draw() itself.
            */
        this.draw(this.frameDelta / this.simulationTimestep)

        // Run any updates that are not dependent on time in the simulation. See
        // `MainLoop.setEnd()` for additional details on how to use this.
        this.end(this.fps, this.panic)

        this.panic = false
    }
}
