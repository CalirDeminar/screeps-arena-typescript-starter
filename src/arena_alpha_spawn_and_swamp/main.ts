import { Memory, MemoryKeeper, DefaultMemory } from 'coreLib/memory';
import { HaulingManager } from 'arena_alpha_spawn_and_swamp/managers/haulingManager';
import { CombatManager } from './managers/combatManager';
import { MovementMatrix } from 'coreLib/movementMatrix';
import { DamageMatrix } from 'coreLib/damageMatrix';

let memory: Memory = DefaultMemory;
export function loop(): void {
  memory = MemoryKeeper.houseKeeping(memory);
  memory = CombatManager.run(memory);
  memory = HaulingManager.run(memory);
  MovementMatrix.visualiseMatrix(memory.costMatrix);
  DamageMatrix.visualiseMatrix(memory.hostileDamageMatrix);
}
