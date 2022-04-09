import { CreepRecord } from 'coreLib/memory';
import { Memory } from 'coreLib/memory';
import { CARRY, MOVE, RESOURCE_ENERGY } from 'game/constants';
import { Creep, StructureContainer, StructureSpawn } from 'game/prototypes';
import { getObjectsByPrototype } from 'game/utils';

const haulerLimit = 1;
export class HaulingManager {
  private static runHauler(
    hauler: CreepRecord,
    mySpawn: StructureSpawn
  ): CreepRecord {
    const { creep, memory } = hauler;
    if (!creep.exists) {
      return hauler;
    }
    let working = memory.working;
    // set memory
    if (creep.store.getFreeCapacity() === 0) {
      working = false;
    } else {
      working = true;
    }
    // actions
    const containers = getObjectsByPrototype(StructureContainer).filter(
      (c) => c.store.getUsedCapacity() ?? 0 > 0
    );
    const targetPos = creep.findClosestByPath(containers);
    const container = containers.filter(
      (c) => targetPos && c.getRangeTo(targetPos) === 0
    )[0];
    switch (true) {
      case working && creep.getRangeTo(container) <= 1:
        creep.withdraw(container, RESOURCE_ENERGY);
        break;
      case working && creep.getRangeTo(container) > 1:
        creep.moveTo(container);
        break;
      case !working && creep.getRangeTo(mySpawn) <= 1:
        creep.transfer(mySpawn, RESOURCE_ENERGY);
        break;
      case !working && creep.getRangeTo(mySpawn) > 1:
        creep.moveTo(mySpawn);
        break;
    }

    return {
      ...hauler,
      memory: {
        ...memory,
        working,
      },
    };
  }
  private static spawnHauler(
    mySpawn: StructureSpawn,
    myHaulers: CreepRecord[]
  ): CreepRecord | undefined {
    const budget = mySpawn.store[RESOURCE_ENERGY];
    if (myHaulers.length < haulerLimit && budget >= 500) {
      const eachPartCount = Math.floor(budget / 100);
      const spawning = mySpawn.spawnCreep([
        ...Array(eachPartCount).fill(MOVE),
        ...Array(eachPartCount).fill(CARRY),
      ]).object;
      if (spawning) {
        return {
          creep: spawning,
          memory: { role: 'hauler', working: true },
        };
      }
    }
    return undefined;
  }
  public static run(memory: Memory): Memory {
    const myHaulers = memory.myCreeps.filter((c) => c.memory.role === 'hauler');
    const mySpawn = getObjectsByPrototype(StructureSpawn).filter(
      (s) => s.my
    )[0];
    const newCreep = this.spawnHauler(mySpawn, myHaulers);
    // running
    const workedHaulers = myHaulers.map((c) => this.runHauler(c, mySpawn));
    // updating memory
    const updatedCreeps = memory.myCreeps.map(
      (c) => workedHaulers.find((h) => h.creep.id === c.creep.id) || c
    );
    if (newCreep) {
      updatedCreeps.push(newCreep);
    }
    return {
      ...memory,
      myCreeps: updatedCreeps,
    };
  }
}
