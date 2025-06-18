import { shuffleArray } from "./utils"

/**
 * a a C a g (The White Stripes - "Seven Nation Army" riff, transposed)
c g g# g f (Eurythmics - "Sweet Dreams (Are Made of This)" synth riff)
g a# C (Deep Purple - "Smoke on the Water" opening riff notes)
c c c d c a# g# g (Adele - "Rolling in the Deep" - "There's a fire...")
f# f# f# e d# c# b (Michael Jackson - "Billie Jean" - "Billie Jean is not my lover..." start, b is natural)
e d c a (Journey - "Don't Stop Believin'" synth intro main notes, often heard under "Just a small town girl")
g g a g E c (Pharrell Williams - "Happy" - "Because I'm happy", E is a higher octave)
c c c a# c c g# c c a# c c c (Survivor - "Eye of the Tiger" main riff, simplified rhythm)
f f f f f f d# (Nirvana - "Smells Like Teen Spirit" - "Hello, hello, hello, how low")
c# e f# c# e f# c# e f# g# a (Ed Sheeran - "Shape of You" main marimba riff)
a b C# C# C# b a (Bee Gees - "Stayin' Alive" - "Ah, ha, ha, ha, stayin' alive...")
d# d# d# d# g f d# (Beyoncé ft. Jay-Z - "Crazy in Love" main horn sample riff)
e e e b A G E (Queen - "Another One Bites the Dust" bassline, capital letters denote lower octave relative to first 'e')
F# F# D E F# B A G# F# (a-ha - "Take On Me" iconic high synth riff opening, all caps for high register)
g g a b C (Carly Rae Jepsen - "Call Me Maybe" - "Hey, I just met you...")
E E E D# E F# G# E (Lady Gaga - "Bad Romance" - "Ra-ra-ah-ah-ah")
c d e c e d G (ABBA - "Dancing Queen" piano intro lead melody, G is lower)
g f e d c (The Beatles - "Let It Be" - "Let it be" vocal line)
e f# g e a g f# e (Britney Spears - "...Baby One More Time" - "My loneliness...")
 */
// https://melodicnotes.com/song/rick-astley-never-gonna-give-you-up-7522/
export const ASTLEY = `
    g a a# a# C a g f
    g g a a# g f F F C
    g g a a# g a# C a g f
    g g a a# g f C C C D C

    a# C D a# C C C D C f
    f g a# g C D C

    f g a# g D D C
    f g a f C C a# a g
    f g a f a# C a g f f C a#
    f g a# g D D C
    f g a f F a a# a g
    f g a f a# C a g f f C a#
    `

export const AFRICA = `C# B A E C# G# A E G# A E B G# A E B F# C# E B F# C# E B C# G# A E C# G# A E G# A E B G# A E B F# C# E B F# C# E B F# C# E B F# C# E B G# A E B F# C# E B F# C# E B F# C# E B`

export const BABY_SHARK = `
    D E G G G G G G G 
    D E G G G G G G G 
    D E G G G G G G G
    G G F#`

export const SEVEN_NATION_ARMY = `e e G e d`
export const SWEET_DREAMS = `c g g# g f`
export const SMOKE_ON_THE_WATER = `g a# C g a# d# C`
export const TAKE_ON_ME = `F# F# D E F# B A G# F#`
export const ANOTHER_ONE_BITES_THE_DUST = `e e e b A G E`
export const BILLIE_JEAN = `f# f# f# e d# c# b`
export const NIRVANA = `f f f f f f d#`
export const STAYIN_ALIVE = `a b C# C# C# b a`
export const EYE_OF_THE_TIGER = `c c c a# c c g# c c a# c c c`

export const MEDLEY = `a a C a g c g g# g f g a# C`

export const INSPECTOR_GADGET = `c d D f g D F d f`
export const LET_IT_BE = `g f e d c `


const repeatSong = (song, repetitions=1) => {
    const output = new Array(repetitions)
    return output.map( p => song ).join(" ")
}
    

export const SONGS = [
    ASTLEY, 
    AFRICA, 
    BABY_SHARK,
    repeatSong(LET_IT_BE, 3),
    repeatSong(INSPECTOR_GADGET, 3),
    repeatSong(TAKE_ON_ME, 3), 
    repeatSong(BILLIE_JEAN, 3), 
    repeatSong(NIRVANA, 4),
    repeatSong(ANOTHER_ONE_BITES_THE_DUST, 2), 
    repeatSong(EYE_OF_THE_TIGER,2),
    repeatSong(SEVEN_NATION_ARMY, 5),
    repeatSong(MEDLEY, 3),
    repeatSong(SWEET_DREAMS, 4),
    repeatSong(STAYIN_ALIVE, 4),
    repeatSong(SMOKE_ON_THE_WATER, 4)
]

export const getRandomSong = () => {
    const index = Math.floor(Math.random() * SONGS.length)
    return SONGS[index]
}

// Make a jive bunny style melody
export const getCompondSong = () => 
    shuffleArray(SONGS).join(" ") + " " +  
    shuffleArray(SONGS).join(" ") + " " +  
    shuffleArray(SONGS).join(" ") + " " +  
    shuffleArray(SONGS).join(" ") + " " +  
    shuffleArray(SONGS).join(" ") + " " +  
    shuffleArray(SONGS).join(" ") + " " +  
    shuffleArray(SONGS).join(" ") 