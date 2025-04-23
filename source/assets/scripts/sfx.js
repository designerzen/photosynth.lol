
import SPELL_ from "url:/source/assets/audio/fx/spells/magic-mallet-6262.mp3"

const SPELLS = [
    SPELL_
]

export const getRandomSpell = () => {
    return SPELLS[ Math.floor( Math.random() * SPELLS.length ) ]
}