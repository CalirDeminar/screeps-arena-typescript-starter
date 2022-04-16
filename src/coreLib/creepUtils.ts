import { MOVE } from "game/constants";
import { CostMatrix, FindPathOpts, PathStep } from "game/path-finder";
import { Creep } from "game/prototypes";

export class CreepUtils {
    public static creepCanMove(creep: Creep): boolean {
        return creep.fatigue <= 0 && creep.body.filter((b) => b.type === MOVE && b.hits === 100).length > 1;
    }
    public static moveWithMatrix(creep: Creep, target: PathStep, costMatrix: CostMatrix, options: FindPathOpts = {}): void {
        const path = creep.findPathTo(target, {...options});
        const step = path[0];
        creep.moveTo(step);
        costMatrix.set(step.x, step.y, 255);
    }
}
