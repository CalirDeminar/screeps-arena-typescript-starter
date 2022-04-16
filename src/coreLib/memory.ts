import { getTerrainAt } from 'game';
import { ATTACK, TERRAIN_SWAMP, TERRAIN_WALL } from 'game/constants';
import { CostMatrix } from 'game/path-finder';
import { Creep, Id, Structure } from 'game/prototypes';
import { getObjectsByPrototype } from 'game/utils';
import { DamageMatrix } from './damageMatrix';
import { MovementMatrix } from './movementMatrix';
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
  costMatrix: CostMatrix;
  hostileDamageMatrix: CostMatrix;
}
export const DefaultMemory = {
  myCreeps: [],
  mySquads: [],
  costMatrix: new CostMatrix(),
  hostileDamageMatrix: new CostMatrix()
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
    const costMatrix = new CostMatrix();
    for(let x=0; x<100;x++){
        for(let y=0;y<100;y++){
            const terrain = getTerrainAt({x, y});
            const weight = terrain=== TERRAIN_WALL ? 255 : terrain === TERRAIN_SWAMP ? 10 : 1;
            costMatrix.set(x, y, weight);
        }
    }
    return {
      ...staleMemory,
      myCreeps: updatedCreeps,
      mySquads: updatedSquads,
      costMatrix: MovementMatrix.generateMatrix(),
      hostileDamageMatrix: DamageMatrix.generateMatrix()
    };
  }
}
