import { getTerrainAt } from "game";
import { ATTACK, TERRAIN_SWAMP, TERRAIN_WALL } from "game/constants";
import { CostMatrix } from "game/path-finder";
import { Creep, StructureSpawn } from "game/prototypes";
import { getObjectsByPrototype } from "game/utils";
import { Visual } from "game/visual";

export class MovementMatrix {
  public static visualiseMatrix(matrix: CostMatrix): void {
    let vis = new Visual(2);
    for (let x = 0; x < 100; x++) {
      for (let y = 0; y < 100; y++) {
        const val = matrix.get(x, y);
        const isTerrain = getTerrainAt({ x, y }) === TERRAIN_WALL;
        if (val >= 20 && !isTerrain) {
          vis = vis.circle({ x, y }, { radius: 0.5, fill: "#0000ff", opacity: 0.25 });
        }
      }
    }
  }
  public static generateMatrix(damageMatrix: CostMatrix): CostMatrix {
    const costMatrix = new CostMatrix();
    for (let x = 0; x < 100; x++) {
      for (let y = 0; y < 100; y++) {
        const terrain = getTerrainAt({ x, y });
        const weight = terrain === TERRAIN_WALL ? 255 : terrain === TERRAIN_SWAMP ? 10 : 1;
        const damage = 0;
        const damageWeight = weight === 10 ? damage * 2 : damage;
        costMatrix.set(x, y, Math.max(weight, damageWeight));
      }
    }
    getObjectsByPrototype(StructureSpawn).map((spawn) => costMatrix.set(spawn.x, spawn.y, 255));
    getObjectsByPrototype(Creep).map((c) => costMatrix.set(c.x, c.y, 255))
    return costMatrix;
  }
}
