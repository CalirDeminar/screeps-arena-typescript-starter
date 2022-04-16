import { CreepRecord, Memory, SquadRecord } from "coreLib/memory";
import { ATTACK, HEAL, MOVE, RANGED_ATTACK, TERRAIN_SWAMP, TERRAIN_WALL } from "game/constants";
import { CostMatrix, searchPath } from "game/path-finder";
import { Creep, StructureSpawn, Structure, RoomPosition } from "game/prototypes";
import { findPath, getObjectsByPrototype, getTerrainAt } from "game/utils";

export class Squad {
  private static moveSquad(
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
        c.creep.moveTo(path[1]);
        costMatrix.set(path[1].x, path[1].y, 255);
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
          hc.fatigue === 0 && hc.body.some(bp => bp.type === MOVE) ? 2 : 1
        ).length > 0
    );
    const nearbyRangedCeeps = hostileCreeps.filter(
      hc =>
        hc.body.some(b => b.type === RANGED_ATTACK) &&
        hc.findInRange(
          creeps.map(mc => mc.creep),
          hc.fatigue === 0 && hc.body.some(bp => bp.type === MOVE) ? 4 : 3
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

    const targetPoint = targetPath[1];
    if (isFleeing) {
      console.log(`${squad.id} - Fleeing to: `, targetPoint);
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
      creep.creep.moveTo(step);
      costMatrix.set(step.x, step.y, 255);
      return costMatrix;
    }, costMatrix);
  }

  private static shouldMassAttack(creep: Creep, hostileCreeps: Creep[]): boolean {
    const range1Count = hostileCreeps.filter(c => c.getRangeTo(creep) === 1).length;
    const range2Count = hostileCreeps.filter(c => c.getRangeTo(creep) === 2).length;
    const range3Count = hostileCreeps.filter(c => c.getRangeTo(creep) === 3).length;
    return range1Count * 10 + range2Count * 4 + range3Count * 1 >= 10;
  }

  private static fireSquad(squad: SquadRecord, hostileCreeps: Creep[], target: Structure | Creep): void {
    const { creeps } = squad;
    const hostileHeals = hostileCreeps.filter(hc => hc.body.some(b => b.type === HEAL));
    const targetHealer = hostileHeals.find(hh => hh.getRangeTo(target) <= 1);
    creeps.map(c => {
      switch (true) {
        case this.shouldMassAttack(c.creep, hostileCreeps):
          c.creep.rangedMassAttack();
          console.log(`Squad ${squad.id} Creep: ${c.creep.id} mass Attacking`);
          break;
        case targetHealer && c.creep.rangedAttack(targetHealer) >= 0:
          console.log(`Squad ${squad.id} Creep: ${c.creep.id} attacking ${targetHealer?.id}`);
          break;
        case target && c.creep.rangedAttack(target) >= 0:
          console.log(`Squad ${squad.id} Creep: ${c.creep.id} attacking ${target.id}`);
          break;
        default:
          const fallback = c.creep.findClosestByRange(hostileCreeps);
          const res = fallback ? c.creep.rangedAttack(fallback) : -1;
          if (res >= 0) {
            console.log(`Squad ${squad.id} Creep: ${c.creep.id} attacking ${fallback?.id}`);
          }
      }
    });
  }

  private static healSquad(squad: SquadRecord): void {
    const { creeps } = squad;
    const healthSorted = creeps.filter(creep => creep.creep.hits < creep.creep.hitsMax);
    const friendlyCreeps = getObjectsByPrototype(Creep).filter(c => c.my);
    healthSorted.sort((a, b) => a.creep.hits - b.creep.hits);
    const healTarget = healthSorted[0];
    console.log(
      `Squad ${squad.id} Health: `,
      healthSorted.map(h => h.creep.hits),
      `Healing: ${healTarget?.creep.id} at: ${healTarget?.creep.hits}`
    );
    creeps.map(c => {
      if (healTarget?.creep) {
        c.creep.heal(healTarget.creep) < 0 && c.creep.rangedHeal(healTarget.creep);
      } else {
        const healables = c.creep.findInRange(friendlyCreeps, 3).filter(creep => creep.hits < creep.hitsMax);
        healables.sort((a, b) => a.hits - b.hits);
        const newHeal = healables[0];
        console.log(`Squad: ${squad.id}: fallback healing: ${newHeal?.id}`);
        c.creep.heal(newHeal) < 0 && c.creep.rangedHeal(newHeal);
      }
    });
  }

  public static run(memory: Memory, squad: SquadRecord, mySpawn: StructureSpawn): Memory {
    const { creeps, lead } = squad;
    if (!squad.active || creeps.some(c => c.creep.getRangeTo(mySpawn) === 0)) {
      return memory;
    }
    const leadCreep = creeps.find(c => c.creep.id === lead) || creeps[0];

    // target lock
    const hostileCreeps = getObjectsByPrototype(Creep).filter(c => !c.my);
    const hostileSpawn = getObjectsByPrototype(StructureSpawn).filter(s => !s.my)[0];
    const targetList = [...hostileCreeps, hostileSpawn];
    targetList.sort((o) => leadCreep.creep.getRangeTo(o));
    const target = leadCreep.creep.findClosestByPath(targetList);
    if(!target){
      return memory;
    }
    console.log(`Squad: ${squad.id} - Target: `, { x: target.x, y: target.y });
    // healing
    this.healSquad(squad);
    // movement
    this.moveSquad(squad, hostileCreeps, target, memory.costMatrix, memory.hostileDamageMatrix);
    // firing
    this.fireSquad(squad, hostileCreeps, target);

    const endSquadState = {
      ...squad,
      lead: leadCreep.creep.id
    };
    console.log(`----------`);
    return {
      ...memory,
      mySquads: memory.mySquads.map(s => (s.id === endSquadState.id ? endSquadState : s))
    };
  }
}
