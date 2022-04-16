import { Memory, SquadRecord } from "coreLib/memory";
import { Creep, StructureSpawn } from "game/prototypes";
import { getObjectsByPrototype } from "game/utils";
import { SquadFiring } from "./squadFiring";
import { SquadHealing } from "./squadHealing";
import { SquadMoving } from "./squadMoving";

export class Squad {
  public static run(memory: Memory): Memory {
    const spawn = getObjectsByPrototype(StructureSpawn).filter((s) => s.my)[0];
    return memory.mySquads.reduce((mem, s) => this.runSquad(mem, s, spawn), memory)
  }
  public static runSquad(memory: Memory, squad: SquadRecord, mySpawn: StructureSpawn): Memory {
    const { creeps, lead } = squad;
    if (!squad.active || creeps.some(c => c.creep.getRangeTo(mySpawn) === 0)) {
      return memory;
    }
    const leadCreep = creeps.find(c => c.creep.id === lead) || creeps[0];

    // target lock
    const hostileCreeps = getObjectsByPrototype(Creep).filter(c => !c.my);
    const hostileSpawn = getObjectsByPrototype(StructureSpawn).filter(s => !s.my)[0];
    const targetList = [...hostileCreeps, hostileSpawn];
    targetList.sort(o => leadCreep.creep.getRangeTo(o));
    const target = leadCreep.creep.findClosestByPath(targetList);
    if (!target) {
      return memory;
    }
    console.log(`Squad: ${squad.id} - Target: `, { x: target.x, y: target.y });
    // movement
    SquadMoving.run(squad, hostileCreeps, target, memory.costMatrix, memory.hostileDamageMatrix);
    // firing
    SquadFiring.run(squad, hostileCreeps, target);
    // healing
    SquadHealing.run(squad);

    const endSquadState = {
      ...squad,
      lead: leadCreep.creep.id
    };
    console.log(`----------`);
    return {
      ...memory,
      mySquads: memory.mySquads.map(s => (s.id === endSquadState.id ? endSquadState : s))
    };
  }
}
