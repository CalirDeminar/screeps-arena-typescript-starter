import { Memory, SquadRecord } from 'coreLib/memory';
import { ATTACK, HEAL, TERRAIN_SWAMP, TERRAIN_WALL } from 'game/constants';
import { CostMatrix, searchPath } from 'game/path-finder';
import { Creep, StructureSpawn, Structure, RoomPosition } from 'game/prototypes';
import { findPath, getObjectsByPrototype, getTerrainAt } from 'game/utils';

export class Squad {
  private static moveSquad(
    squad: SquadRecord,
    hostileCreeps: Creep[],
    target: Structure | Creep
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
          2
        ).length > 0
    );
    let targetPoint = findPath(
      leadCreep.creep,
      nearbyMeleeCreeps[0] || target,
      {
        flee: !!nearbyMeleeCreeps[0],
        range: 2,
        ignore: creeps.map((c) => c.creep)
      }
    )[1];
    if(!targetPoint){
      return;
    }
    const costMatrix = new CostMatrix();
    for(let x=0; x<100;x++){
        for(let y=0;y<100;y++){
            const terrain = getTerrainAt({x, y});
            const weight = terrain=== TERRAIN_WALL ? 255 : terrain === TERRAIN_SWAMP ? 10 : 1;
            costMatrix.set(x, y, weight);
        }
    }
    hostileCreeps.map((c) => costMatrix.set(c.x, c.y, 255));
    [leadCreep, ...squadCreeps].reduce((costMatrix, creep) => {
        const step = findPath(creep.creep, targetPoint, {costMatrix: costMatrix})[0];
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
    return range1Count * 10 + range2Count * 4 + range3Count * 1 > 10;
  }

  private static fireSquad(
    squad: SquadRecord,
    hostileCreeps: Creep[],
    target: Structure | Creep
  ): void {
    const { creeps } = squad;
    creeps.map((c) => {
      if (this.shouldMassAttack(c.creep, hostileCreeps)) {
        c.creep.rangedMassAttack();
      } else {
        const inRangeHealer = hostileCreeps.find(
          (hc) =>
            hc.getRangeTo(c.creep) <= 4 && hc.body.some((b) => b.type === HEAL)
        );
        c.creep.rangedAttack(inRangeHealer || target);
      }
    });
  }

  private static healSquad(squad: SquadRecord): void {
    const { creeps } = squad;
    const healTarget = creeps.sort((c) => c.creep.hits)[0];
    creeps.map((c) => c.creep.heal(healTarget.creep));
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

    const targetPos = leadCreep.creep.findClosestByPath(hostileCreeps);
    const target = hostileCreeps.find(c => targetPos && c.getRangeTo(targetPos) === 0) || hostileSpawn;
    // healing
    this.healSquad(squad);
    // movement
    this.moveSquad(squad, hostileCreeps, target);
    // firing
    this.fireSquad(squad, hostileCreeps, target);

    const endSquadState = {
      ...squad,
      lead: leadCreep.creep.id
    };
    return {
      ...memory,
      mySquads: memory.mySquads.map(s => (s.id === endSquadState.id ? endSquadState : s))
    };
  }
}
