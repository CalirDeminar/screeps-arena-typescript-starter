import { Creep, Structure } from "game/prototypes";
import { SquadRecord } from "coreLib/memory";
import { CostMatrix } from "game/path-finder";
import { ATTACK, RANGED_ATTACK } from "game/constants";
import { CreepUtils } from "coreLib/creepUtils";
import { findPath } from "game";
import { inspect } from "util";

export class SquadMoving {
  public static run(
    squad: SquadRecord,
    hostileCreeps: Creep[],
    target: Structure | Creep,
    costMatrix: CostMatrix,
    damageMatrix: CostMatrix
  ): void {
    const { creeps, lead } = squad;
    const leadCreep = creeps.find(c => c.creep.id === lead) || creeps[0];
    const squadCreeps = creeps.filter(c => c.creep.id !== leadCreep.creep.id);
    //lagging
    const laggingCreeps = creeps.filter(c => c.creep.getRangeTo(leadCreep.creep) > 1);
    if (laggingCreeps.length > 0) {
      console.log(`Squad: ${squad.id}: Wait for lagging creep`);
      laggingCreeps.map(c => {
        const path = c.creep.findPathTo(leadCreep.creep);
        CreepUtils.moveWithMatrix(c.creep, path[0], costMatrix, { costMatrix });
      });
      creeps.filter(c => !laggingCreeps.includes(c)).map(c => costMatrix.set(c.creep.x, c.creep.y, 255));
      return;
    }
    //fatigue
    if (creeps.some(c => c.creep.fatigue > 0)) {
      creeps.map(c => costMatrix.set(c.creep.x, c.creep.y, 255));
      console.log(`Squad: ${squad.id}: Fatigue`);
      return;
    }
    // Fleeing
    const creepWeapons = creeps.map(c => ({
      weapon: c.creep.body.filter(b => b.type === RANGED_ATTACK || b.type === ATTACK).map(b => b.hits),
      incomingDamage: damageMatrix.get(c.creep.x, c.creep.y) * 10
    }));
    const hasDisarmedCreeps = creepWeapons.some(cw => cw.weapon.reduce((t, h) => t + h, 0) - cw.incomingDamage < 100);
    console.log(`Has Disarmed Creeps:${hasDisarmedCreeps}`);
    const nearbyMeleeCreeps = hostileCreeps.filter(
      hc =>
        hc.body.some(b => b.type === ATTACK) &&
        hc.findInRange(
          creeps.map(mc => mc.creep),
          CreepUtils.creepCanMove(hc) ? 2 : 1
        ).length > 0
    );
    const nearbyRangedCeeps = hostileCreeps.filter(
      hc =>
        hc.body.some(b => b.type === RANGED_ATTACK) &&
        hc.findInRange(
          creeps.map(mc => mc.creep),
          CreepUtils.creepCanMove(hc) ? 4 : 3
        ).length > 0
    );
    nearbyRangedCeeps.sort((a, b) => leadCreep.creep.getRangeTo(a) - leadCreep.creep.getRangeTo(b));

    const fleeTarget = nearbyMeleeCreeps[0] || (hasDisarmedCreeps && nearbyRangedCeeps[0]) || undefined;

    const isFleeing = !!fleeTarget;

    const targetPath = findPath(leadCreep.creep, fleeTarget || target, {
      flee: isFleeing,
      range: isFleeing ? 10 : 2,
      costMatrix: costMatrix
    });

    const targetPoint = targetPath[0];
    if (isFleeing) {
      console.log(
        `${squad.id} - Fleeing to: {x: ${targetPoint.x}, y: ${targetPoint.y}} from: {x: ${fleeTarget.x}, y: ${fleeTarget.y}}`
      );
    }
    if (!targetPoint) {
      creeps.map(c => costMatrix.set(c.creep.x, c.creep.y, 255));
      return;
    }
    hostileCreeps.map(c => costMatrix.set(c.x, c.y, 255));
    [leadCreep, ...squadCreeps].reduce((costMatrix, creep) => {
      costMatrix.set(targetPoint.x, targetPoint.x, creep.creep.id === leadCreep.creep.id ? 1 : 255);
      const step = findPath(creep.creep, targetPoint, { costMatrix: costMatrix })[0];
      console.log(`Squad ${squad.id} Creep ${creep.creep.id} Moving: `, step);
      CreepUtils.moveWithMatrix(creep.creep, step, costMatrix, { costMatrix });
      return costMatrix;
    }, costMatrix);
  }
}
