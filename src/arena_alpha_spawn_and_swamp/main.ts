import { Memory, MemoryKeeper, DefaultMemory } from 'coreLib/memory';
import { HaulingManager } from 'arena_alpha_spawn_and_swamp/managers/haulingManager';
import { CombatManager } from './managers/combatManager';
import { Visual } from 'game/visual';
import { getTerrainAt } from 'game';
import { TERRAIN_SWAMP, TERRAIN_WALL } from 'game/constants';

let memory: Memory = DefaultMemory;
export function loop(): void {
  memory = MemoryKeeper.houseKeeping(memory);
  memory = CombatManager.run(memory);
  memory = HaulingManager.run(memory);
  const costMatrix = memory.costMatrix;
  let vis = new Visual(1);
  for(let x=0;x<100;x++){
    for(let y=0;y<100;y++){
      const val = costMatrix.get(x, y);
      const isTerrain = getTerrainAt({x, y}) === TERRAIN_WALL;
      if(val >= 20 && !isTerrain){
        vis = vis.circle({x, y}, {radius: 0.5, fill: '#ff0000', opacity: 0.25})
      }
    }
  }
}
