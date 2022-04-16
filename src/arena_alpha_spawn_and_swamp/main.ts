import { Memory, MemoryKeeper, DefaultMemory } from 'coreLib/memory';
import { MovementMatrix } from 'coreLib/movementMatrix';
import { DamageMatrix } from 'coreLib/damageMatrix';
import { Squad } from './squads/squad';
import { SpawningManager } from './managers/spawningManager';
import { Haulers } from './haulers/haulers';

let memory: Memory = DefaultMemory;
export function loop(): void {
  memory = MemoryKeeper.houseKeeping(memory);
  memory = SpawningManager.run(memory);
  memory = Squad.run(memory);
  memory = Haulers.run(memory);
  MovementMatrix.visualiseMatrix(memory.costMatrix);
  DamageMatrix.visualiseMatrix(memory.hostileDamageMatrix);
}
