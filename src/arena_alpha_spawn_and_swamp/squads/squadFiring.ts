import { SquadRecord } from "coreLib/memory";
import { HEAL } from "game/constants";
import { Creep, Structure } from "game/prototypes";

export class SquadFiring {
  private static shouldMassAttack(creep: Creep, hostileCreeps: Creep[]): boolean {
    const range1Count = hostileCreeps.filter(c => c.getRangeTo(creep) === 1).length;
    const range2Count = hostileCreeps.filter(c => c.getRangeTo(creep) === 2).length;
    const range3Count = hostileCreeps.filter(c => c.getRangeTo(creep) === 3).length;
    return range1Count * 10 + range2Count * 4 + range3Count * 1 >= 10;
  }
  public static run(squad: SquadRecord, hostileCreeps: Creep[], target: Structure | Creep): void {
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
}
