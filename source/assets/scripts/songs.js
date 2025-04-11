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

export const SONGS = [
    ASTLEY, AFRICA
]

export const getRandomSong = () => {
    const index = Math.floor(Math.random() * SONGS.length)
    return SONGS[index]
}