import { CreepRecord, Memory, SquadRecord } from 'coreLib/memory';
import { ATTACK, HEAL, MOVE, TERRAIN_SWAMP, TERRAIN_WALL } from 'game/constants';
import { CostMatrix, searchPath } from 'game/path-finder';
import { Creep, StructureSpawn, Structure, RoomPosition } from 'game/prototypes';
import { findPath, getObjectsByPrototype, getTerrainAt } from 'game/utils';

export class Squad {
  private static moveSquad(
    squad: SquadRecord,
    hostileCreeps: Creep[],
    target: Structure | Creep,
    costMatrix: CostMatrix
  ): void {
    const { creeps, lead } = squad;
    const leadCreep = creeps.find((c) => c.creep.id === lead) || creeps[0];
    const squadCreeps = creeps.filter((c) => c.creep.id !== leadCreep.creep.id);

    const laggingCreeps = creeps.filter(
      (c) => c.creep.getRangeTo(leadCreep.creep) > 1
    );
    if (laggingCreeps.length > 0) {
      console.log(`Squad: ${squad.id}: Wait for lagging creep`);
      laggingCreeps.map((c) => c.creep.moveTo(leadCreep.creep));
      return;
    }
    if(creeps.some((c) => c.creep.fatigue > 0)) {
      console.log(`Squad: ${squad.id}: Fatigue`);
      return;
    }
    const nearbyMeleeCreeps = hostileCreeps.filter(
      (hc) =>
        hc.body.some((b) => b.type === ATTACK) &&
        hc.findInRange(
          creeps.map((mc) => mc.creep),
          (hc.fatigue === 0 && hc.body.some((bp) => bp.type === MOVE)) ? 2 : 1
        ).length > 0
    );
    const isFleeing = !!(nearbyMeleeCreeps[0]);
    const targetPath = findPath(
      leadCreep.creep,
      nearbyMeleeCreeps[0] || target,
      {
        flee: isFleeing,
        range: isFleeing ? 5 : 1,
        costMatrix: costMatrix
      }
    );
    // console.log(`Squad ${squad.id} Path Len: `, targetPath.length);
    const targetPoint = targetPath[1];
    if(isFleeing){
      console.log(`${squad.id} - Fleeing to: `, targetPoint);
    }
    if(!targetPoint){
      return;
    }
    hostileCreeps.map((c) => costMatrix.set(c.x, c.y, 255));
    [leadCreep, ...squadCreeps].reduce((costMatrix, creep) => {
        costMatrix.set(targetPoint.x, targetPoint.x, creep.creep.id === leadCreep.creep.id ? 1 : 255);
        const step = findPath(creep.creep, targetPoint, {costMatrix: costMatrix})[0];
        console.log(`Squad ${squad.id} Creep ${creep.creep.id} Moving: `, step)
        creep.creep.moveTo(step);
        costMatrix.set(step.x, step.y, 255);
        return costMatrix;
    }, costMatrix)
  }

  private static shouldMassAttack(
    creep: Creep,
    hostileCreeps: Creep[]
  ): boolean {
    const range1Count = hostileCreeps.filter(
      (c) => c.getRangeTo(creep) === 1
    ).length;
    const range2Count = hostileCreeps.filter(
      (c) => c.getRangeTo(creep) === 2
    ).length;
    const range3Count = hostileCreeps.filter(
      (c) => c.getRangeTo(creep) === 3
    ).length;
    return range1Count * 10 + range2Count * 4 + range3Count * 1 >= 10;
  }

  private static fireSquad(
    squad: SquadRecord,
    hostileCreeps: Creep[],
    target: Structure | Creep
  ): void {
    const { creeps } = squad;
    const hostileHeals = hostileCreeps.filter((hc) => hc.body.some((b) => b.type === HEAL));
    const targetHealer = hostileHeals.find((hh) => hh.getRangeTo(target) <= 1);
    creeps.map((c) => {
      switch(true){
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
          if(res >= 0){
            console.log(`Squad ${squad.id} Creep: ${c.creep.id} attacking ${fallback?.id}`);
          }
      }
    });
  }

  private static healSquad(squad: SquadRecord): void {
    const { creeps } = squad;
    const healthSorted = creeps
    healthSorted.sort((a, b) => a.creep.hits - b.creep.hits);
    const healTarget = healthSorted[0];
    console.log(`Squad ${squad.id} Health: `, healthSorted.map((h) => h.creep.hits), `Healing: ${healTarget.creep.id} at: ${healTarget.creep.hits}`);
    if(healTarget){
      creeps.map((c) => c.creep.heal(healTarget.creep));
    }
  }

  public static run(
    memory: Memory,
    squad: SquadRecord,
    mySpawn: StructureSpawn
  ): Memory {
    const { creeps, lead } = squad;
    if (!squad.active || creeps.some(c => c.creep.getRangeTo(mySpawn) === 0)) {
      return memory;
    }
    const leadCreep = creeps.find(c => c.creep.id === lead) || creeps[0];

    // target lock
    const hostileCreeps = getObjectsByPrototype(Creep).filter(c => !c.my);
    const hostileSpawn = getObjectsByPrototype(StructureSpawn).filter(s => !s.my)[0];

    const target = leadCreep.creep.findClosestByPath(hostileCreeps) || hostileSpawn;
    console.log(`Squad: ${squad.id} - Target: `, {x: target.x, y: target.y})
    // healing
    this.healSquad(squad);
    // movement
    this.moveSquad(squad, hostileCreeps, target, memory.costMatrix);
    // firing
    this.fireSquad(squad, hostileCreeps, target);

    const endSquadState = {
      ...squad,
      lead: leadCreep.creep.id
    };
    console.log(`----------`)
    return {
      ...memory,
      mySquads: memory.mySquads.map(s => (s.id === endSquadState.id ? endSquadState : s))
    };
  }
}
