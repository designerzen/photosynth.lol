// AKA "Sequences"
import {
	kickSequences,
	snareSequences,
	hatSequences,
	clapSequences,
	drumRollSequence
} from './drum-patterns'

// Just a simple factory for creating random repetitive beats
const subdivisions = 4

// export const createPattern = (preset, bars=16) => {

// 	// keep adding the preset until we get to the required size...
// 	const gaps = bars * subdivisions
// 	const pattern = new Array()

// }

// 
export const factory = (bars=16) => {

	// each bar has 4 sub divisions
	const gaps = bars * subdivisions
	const sequence = new Array(gaps).fill(0)
	// const sequence = []
	// for (let i=0; i<gaps; ++i)
	// {
	// 	const playNote = false
	// 	sequence.push(playNote)
	// }
	return sequence
}

/**
 * Create a pattern or sequence of velocities
 * that can be used as triggers for percussion
 * @param {Array} sequence 
 * @param {Number} offset 
 * @returns 
 */
export const pattern = ( sequence, offset=0 )=>{

	let index = offset
	
	if (!sequence)
	{
		throw Error("No sequence provided to pattern")
	}

	let length = sequence.length
	
	if (length === 0)
	{
		throw Error("No sequences provided in the array")
	}
	
	// accessors
	return {
		reset:()=> {
			index = 0
			return sequence[index]
		},
		current:()=> sequence[index],
		previous:()=>{
			const newIndex = index - 1
			index = newIndex < 0 ? length - 1: newIndex
			return sequence[index]
		},
		next:()=>{
			const newIndex = index + 1
			index = newIndex >= length ? 0 : newIndex
			return sequence[index]
		},
		setVelocityAtStep: (step, velocity) => sequence[step] = velocity,
		getVelocityAtStep: step => sequence[step],
		setStep: step => index = step,
		getStep: () => index,
		getLength: () => length,
		setLength: l => length = Math.min(l,sequence.length),
		setSequence:s => sequence = s
	}
}

export const kickSequence = pattern( kickSequences[0] )
export const snareSequence = pattern(snareSequences[0])
export const hatSequence = pattern(hatSequences[0])
export const clapSequence = pattern(clapSequences[0])

// should we add ways to randomise this???
export const kitSequence = (kitIndex=0) => {
	return {
		kick:pattern( kickSequences[kitIndex%(kickSequences.length)] ),
		hat:pattern( hatSequences[kitIndex%(hatSequences.length)] ),
		snare:pattern( snareSequences[kitIndex%(snareSequences.length)] ),
		clap:pattern( clapSequences[kitIndex%(clapSequences.length)] ),
		roll:pattern( drumRollSequence )
	}
}

export const combinePatternWithInstrument = (pattern, instrument )=> {

}

export const playNextPart = (pattern, instrument, options )=> {
	const velocity = pattern.next()
	if (velocity > 0)
	{
		instrument( {...options, velocity: velocity / 255 } )	// velocity
		return true
	}else{
		// no note but noteOff?
		return false
	}
}

// const kickVelocity = patterns.kick.next()
// if (kickVelocity > 0)
// {
// 	kit.kick()	// kickVelocity
// }
// const snareVelocity = patterns.snare.next()
// if (snareVelocity > 0)
// {
// 	kit.snare() // snareVelocity
// }

// const hatVelocity = patterns.hats.next()
// if (hatVelocity > 0)
// {
// 	kit.hat() // snareVelocity
// }

export const getRandomKitSequence = () => {
	return kitSequence( Math.floor( 17 + Math.random() * 23 ))
} 