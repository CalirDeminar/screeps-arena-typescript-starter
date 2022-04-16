import { getTerrainAt } from "game";
import { ATTACK, CARRY, HEAL, MOVE, RANGED_ATTACK, TERRAIN_SWAMP, TERRAIN_WALL } from "game/constants";
import { CostMatrix, FindPathOpts, PathStep } from "game/path-finder";
import { Creep } from "game/prototypes";

export class CreepUtils {
    public static creepCanMove(creep: Creep): boolean {
        return creep.fatigue <= 0 && creep.body.filter((b) => b.type === MOVE && b.hits === 100).length > 1;
    }
    public static moveWithMatrix(creep: Creep, target: PathStep, costMatrix: CostMatrix, options: FindPathOpts = {}): void {
        const path = creep.findPathTo(target, {...options});
        const step = path[0];
        const currentTerrain = getTerrainAt(creep);
        const currentWeight = currentTerrain === TERRAIN_WALL ? 255 : currentTerrain === TERRAIN_SWAMP ? 10 : 1
        if(creep.fatigue <= 0 && step && creep.moveTo(step)||0>=0){
            costMatrix.set(step.x, step.y, 255);
            costMatrix.set(creep.x, creep.y, currentWeight);
        }

    }
    public static countBodyPart(creep: Creep, part: MOVE | CARRY | ATTACK | RANGED_ATTACK | HEAL): number {
        return creep.body.filter((p) => p.type === part && p.hits > 0).length;
    }
}
