import { getObjectsByPrototype, getTerrainAt } from "game";
import { ATTACK, ATTACK_POWER, HEAL, HEAL_POWER, RANGED_ATTACK, RANGED_ATTACK_POWER, RANGED_HEAL_POWER, TERRAIN_WALL } from "game/constants";
import { CostMatrix } from "game/path-finder";
import { Creep } from "game/prototypes";
import { Visual } from "game/visual";
import { CreepUtils } from "./creepUtils";

export class DamageMatrix {
  private static clampPosition(no: number): number {
    if (no >= 100) {
      return 99;
    }
    if (no < 0) {
      return 0;
    }
    return no;
  }
  private static runForRange(pos: { x: number; y: number }, range: number, fnct: (x: number, y: number) => void): void {
    for (let x = this.clampPosition(pos.x - range); x <= pos.x + range; x++) {
      for (let y = this.clampPosition(pos.y - range); y <= pos.y + range; y++) {
        fnct(x, y);
      }
    }
  }
  public static visualiseMatrix(matrix: CostMatrix): void {
    let vis = new Visual(1);
    for (let x = 0; x < 100; x++) {
      for (let y = 0; y < 100; y++) {
        const val = matrix.get(x, y);
        if (val > 0) {
          vis = vis.circle({ x, y }, { radius: 0.5, fill: "#dd0000", opacity: 0.25 });
          vis = vis.text(`${val*10}`, { x, y }, { color: "#ffffff", font: 0.3, opacity: 0.5 });
        }
      }
    }
  }
  public static generateMatrix(my: boolean = false): CostMatrix {
    const hostileCreeps = getObjectsByPrototype(Creep).filter(c => (my ? c.my : !c.my));
    const friendlyCreeps = getObjectsByPrototype(Creep).filter(c => (my ? !c.my : c.my));
    const matrix = new CostMatrix();
    hostileCreeps.map(creep => {
      // melee
      const meleeRange = CreepUtils.creepCanMove(creep) ? 2 : 1;
      this.runForRange({ x: creep.x, y: creep.y }, meleeRange, (x: number, y: number) => {
        const currentValue = matrix.get(x, y);
        const newValue = currentValue + CreepUtils.countBodyPart(creep, ATTACK) * (ATTACK_POWER/10);
        matrix.set(x, y, newValue);
      });
      // rangedAttack
      const rangedRange = CreepUtils.creepCanMove(creep) ? 4 : 3;
      this.runForRange({ x: creep.x, y: creep.y }, rangedRange, (x: number, y: number) => {
        const currentValue = matrix.get(x, y);
        const newValue = currentValue + CreepUtils.countBodyPart(creep, RANGED_ATTACK) * (RANGED_ATTACK_POWER/10);
        matrix.set(x, y, newValue);
      });
    });
    // friendly healing
    friendlyCreeps.map((creep) => {
        const longHealRange = 3;
        const shortHealRange = 1;
        const healPartCount = CreepUtils.countBodyPart(creep, HEAL);
        const longHealAmount = healPartCount * (RANGED_HEAL_POWER/10);
        const shortHealAmount = healPartCount * ((HEAL_POWER - RANGED_HEAL_POWER)/10);
        this.runForRange({x: creep.x, y: creep.y}, longHealRange, (x: number, y: number) => {
            const currentDamage = matrix.get(x, y);
            const newDamage = Math.max(0, currentDamage - longHealAmount);
            matrix.set(x, y, newDamage);
        });
        this.runForRange({x: creep.x, y: creep.y}, shortHealRange, (x: number, y: number) => {
            const currentDamage = matrix.get(x, y);
            const newDamage = Math.max(0, currentDamage - shortHealAmount);
            matrix.set(x, y, newDamage);
        });
    })
    return matrix;
  }
}
