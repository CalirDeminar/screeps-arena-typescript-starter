import { SquadRecord } from "coreLib/memory";
import { getObjectsByPrototype } from "game";
import { Creep } from "game/prototypes";

export class SquadHealing {
    public static run(squad: SquadRecord): void {
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
}
