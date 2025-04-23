
import SPELL_MAGIC_MALLET from "url:/source/assets/audio/fx/spells/magic-mallet-6262.mp3"
import SPELL_MAGIC_CAST from "url:/source/assets/audio/fx/spells/magic-spell-cast-sound-effect-224173.mp3"
import SPELL_MAGIC_SHINE from "url:/source/assets/audio/fx/spells/shine-magic-sound-4-sounds-190258.mp3"


const SPELLS = [
    SPELL_MAGIC_MALLET,
    SPELL_MAGIC_CAST,
    SPELL_MAGIC_SHINE
]

export const getRandomSpell = () => {
    return SPELLS[ Math.floor( Math.random() * SPELLS.length ) ]
}