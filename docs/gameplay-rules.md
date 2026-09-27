# Gameplay rules

*Card Wars: Land of Ooo* takes its structure from the Card Wars tabletop game (Cryptozoic's *Finn vs. Jake* set): four lanes, landscapes, 2 actions per turn, FLOOP, and 25 hit points. Where a tabletop rule would be fiddly on screen, it is simplified. Every simplification is listed at the end.

## Setup

- Each player picks a hero deck: **Finn** (Blue Plains) or **Jake** (Corn Fields). The AI takes the other.
- Each hero starts with **25 HP**.
- Each side lays **four landscapes** left to right. Each landscape is one lane.
  - Finn: Blue Plains, Blue Plains, Useless Swamp, Blue Plains
  - Jake: Corn Fields, Nice Lands, Corn Fields, Corn Fields
- Decks are **40 cards**, shuffled with the match seed. Both players draw **5**.
- A coin flip picks the first player. That player gets **1 action** (not 2) on turn 1 and skips their first draw.

## Turn structure

1. **Start of turn**
   - Your FLOOPed creatures and buildings straighten up.
   - Creatures that arrived last turn stop being drowsy.
   - Your hero power recharges by 1.
   - Start-of-turn effects fire in order: landscapes, then buildings, then creatures, left to right.
   - You draw 1 card.
2. **Main phase.** You have **2 actions** (Action Points). In any order you may:
   - Play a creature, building or spell by paying its cost.
   - Spend 1 action to draw a card.
   - Use your hero power (cost and cooldown on the hero).
   - FLOOP any ready card with a FLOOP ability, paying its cost (usually 0).
3. **Fight phase.** Press **FIGHT!** Each ready creature attacks, lane 1 to lane 4.
4. **End of turn.** "This turn" buffs expire. Your frozen creatures thaw. Your opponent's turn begins.

Unused actions are lost. Your hand holds at most **8** cards; any card drawn beyond that is burned (discarded). Drawing from an empty deck deals **2 fatigue damage** to your hero instead.

## Card types

| Type | How it works |
| --- | --- |
| **Creature** | Goes into one of your lanes. It has ATK and DEF, and damage stays on it until healed. It dies when damage ≥ DEF. Playing a creature into an occupied lane replaces (discards) the old one. |
| **Building** | Sits beside the creature slot in a lane, one per lane. Gives passive auras to the creature in its lane, turn-start effects, or a FLOOP. It stays until replaced or demolished. |
| **Spell** | A one-shot effect, then discarded. Some need a target. |
| **Landscape** | Four per side, set by the deck. It decides which creatures and buildings may stand in that lane. Some grant a small passive. |
| **Hero** | 25 HP and one hero power with a cost and a cooldown. |

## Landscapes and factions

- A creature or building can only be placed on a landscape of **its own faction**. **Rainbow** cards fit on any landscape.
- Some cards also need you to control **N landscapes of their faction**. For example, Blue Colossus needs 3 Blue Plains. The number of small faction icons under the art shows this requirement.
- Landscape passives:
  - **Useless Swamp:** +1 ATK to your creature standing on it.
  - **Nice Lands:** heals your creature standing on it by 1 at the start of your turn.

## FLOOP

- FLOOPing uses a card's FLOOP ability and turns the card sideways.
- A FLOOPed **creature does not fight** this turn.
- A card can FLOOP **once per turn**. It straightens at the start of its owner's next turn.
- Creatures can FLOOP the turn they arrive (drowsiness only stops fighting).
- Frozen creatures cannot FLOOP.

## Combat

A creature is **ready** to fight if it is:

- not FLOOPed and not frozen;
- not a **Wall** (walls never attack);
- not drowsy, unless it is **Hasty**;
- above 0 ATK.

When a ready creature fights:

1. If an enemy creature stands across the lane, the attacker deals its ATK as damage to it. Damage is **one-way**; the defender strikes back on its own turn.
2. With **Pierce**, damage beyond the defender's remaining health spills onto the enemy hero.
3. If the lane is empty, the enemy **hero** takes the ATK. Exception: **Creatures-only** fighters (Bluebell Medic, Nice Nurse) never hit heroes.
4. Destroyed creatures go to the discard pile, then their death triggers fire.

## Keywords

| Keyword | Meaning |
| --- | --- |
| Hasty | Can fight the turn it is played. |
| Pierce | Excess combat damage hits the enemy hero. |
| Wall | Never attacks; blocks its lane. |
| Creatures-only | Never attacks heroes directly. |
| Frozen | Skips its owner's next fight and cannot FLOOP. Thaws at the end of that turn. |
| Token | Summoned by another card. It vanishes instead of going to the discard pile. |

## Winning

A hero reduced to **0 HP** loses immediately, even mid-combat or from a death trigger. If both would drop in the same action, the first to hit 0 loses. As a safety valve, a game reaching turn 120 is decided on HP; this has never happened in simulation.

## Simplifications from the tabletop game

| Tabletop | Here | Why |
| --- | --- | --- |
| Landscape cost icons are part of a card's cost | Separate **landscape requirement** (count of matching landscapes) plus a lane-faction rule | Easier to read on a card and to explain as "Wrong Landscape" |
| Creatures can fight the turn they are played (varies by set) | New creatures are **drowsy** unless Hasty | Stops turn-1 face damage and makes Hasty meaningful |
| Flipping or destroying landscapes, "frozen" tokens on landscapes | Freezing works on creatures only | Keeps lanes stable and legible |
| Many one-off timing windows | A strict turn order with effects resolved one at a time | Deterministic and easy to animate |
| First player skips drawing | First player skips drawing **and** has 1 action on turn 1 | AI-vs-AI simulation showed a 62% first-player win rate without the action cut, and about 45% with it |

## Balance notes

`npm run sim` plays 80 AI-vs-AI games with seats swapped. Current numbers: Jake 43 : Finn 37, first player wins 45%, average game about 15 turns.
