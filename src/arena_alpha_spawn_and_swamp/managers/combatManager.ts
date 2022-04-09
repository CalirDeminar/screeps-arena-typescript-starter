import { Squad } from 'arena_alpha_spawn_and_swamp/squads/squad';
import { CreepRecord, SquadRecord } from 'coreLib/memory';
import { Memory } from 'coreLib/memory';
import { ATTACK, HEAL, MOVE, RANGED_ATTACK } from 'game/constants';
import { searchPath } from 'game/path-finder';
import { Creep, Structure, StructureSpawn } from 'game/prototypes';
import { getObjectById, getObjectsByPrototype } from 'game/utils';

const trooperTemplate = [
  ...Array(4).fill(MOVE),
  ...Array(3).fill(RANGED_ATTACK),
  ...Array(1).fill(HEAL),
];
const squadSize = 4;
export class CombatManager {
  private static buildSquads(memory: Memory, mySpawn: StructureSpawn): Memory {
    let workingUpSquad = memory.mySquads.find((s) => !s.active);
    if (workingUpSquad) {
      // build out squad
      const spawning = mySpawn.spawnCreep(trooperTemplate).object;
      if (spawning) {
        const newTrooper: CreepRecord = {
          creep: spawning,
          memory: {
            role: 'trooper',
          },
        };
        const newSquadCreepList = [...workingUpSquad.creeps, newTrooper];
        workingUpSquad = {
          ...workingUpSquad,
          creeps: newSquadCreepList,
          active: newSquadCreepList.length >= squadSize,
          lead: workingUpSquad.lead || newTrooper.creep.id,
        };
        const newSquadList = memory.mySquads.map((s) =>
          s.id === workingUpSquad?.id ? workingUpSquad : s
        );
        return {
          ...memory,
          myCreeps: [...memory.myCreeps, newTrooper],
          mySquads: newSquadList,
        };
      } else {
        return memory;
      }
    } else {
      // new squad
      const newSquad: SquadRecord = {
        id: memory.mySquads.length.toString(),
        active: false,
        lead: undefined,
        creeps: [],
      };
      return {
        ...memory,
        mySquads: [...memory.mySquads, newSquad],
      };
    }
  }
  public static run(m: Memory): Memory {
    let memory = m;
    const mySpawn = getObjectsByPrototype(StructureSpawn).filter(
      (s) => s.my
    )[0];
    memory = memory.mySquads.reduce(
      (mem, squad): Memory => Squad.run(mem, squad, mySpawn),
      memory
    );
    // spawn

    // run

    const post = this.buildSquads(memory, mySpawn);
    return post;
  }
}
