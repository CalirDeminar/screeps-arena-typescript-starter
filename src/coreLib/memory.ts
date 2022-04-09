import { Creep, Id, Structure } from 'game/prototypes';
import { getObjectsByPrototype } from 'game/utils';
export interface CreepRecord {
  creep: Creep;
  memory: {
    role: 'hauler' | 'boxer' | 'harvester' | 'trooper';
    working?: boolean;
  };
}
export interface SquadRecord {
  creeps: CreepRecord[];
  lead: Id<Creep> | undefined;
  active: boolean;
  id: string;
}
export interface Memory {
  myCreeps: CreepRecord[];
  mySquads: SquadRecord[];
}
export const DefaultMemory = {
  myCreeps: [],
  mySquads: [],
};
export class MemoryKeeper {
  public static houseKeeping(staleMemory: Memory): Memory {
    const staleCreeps = staleMemory.myCreeps;
    const myCurrentCreeps = getObjectsByPrototype(Creep).filter(
      (creep) => creep.my
    );
    const updatedCreeps = staleCreeps
      .filter((staleCreep) =>
        myCurrentCreeps.some((c) => staleCreep.creep.id === c.id)
      );
    const updatedSquads = staleMemory.mySquads.map((s) => ({
      ...s,
      creeps: s.creeps.filter((c) =>
        myCurrentCreeps.some((cc) => c.creep.id === cc.id)
      ),
    })).filter((s) => s.creeps.length > 0 || !s.active);
    return {
      ...staleMemory,
      myCreeps: updatedCreeps,
      mySquads: updatedSquads
    };
  }
}
