import { Memory, MemoryKeeper, DefaultMemory } from 'coreLib/memory';
import { HaulingManager } from 'arena_alpha_spawn_and_swamp/managers/haulingManager';
import { CombatManager } from './managers/combatManager';

let memory: Memory = DefaultMemory;
export function loop(): void {
  memory = MemoryKeeper.houseKeeping(memory);
  memory = CombatManager.run(memory);
  memory = HaulingManager.run(memory);
}
