import { CreepUtils } from "coreLib/creepUtils";
import { Memory, CreepRecord } from "coreLib/memory";
import { CARRY, MOVE, RESOURCE_ENERGY } from "game/constants";
import { CostMatrix } from "game/path-finder";
import { StructureContainer, StructureSpawn } from "game/prototypes";
import { getObjectsByPrototype } from "game/utils";

export class Haulers {
  private static runQueen(hauler: CreepRecord, mySpawn: StructureSpawn, costMatrix: CostMatrix): CreepRecord {
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
    const myContainers = getObjectsByPrototype(StructureContainer).filter(c => c.getRangeTo(mySpawn) <= 5);
    const containersLeftOfSpawn = mySpawn.x < myContainers[1].x;
    const containerSweetSpot = { x: mySpawn.x + (containersLeftOfSpawn ? 3 : -3), y: mySpawn.y };
    const spawnSweetSpot = { x: mySpawn.x + (containersLeftOfSpawn ? 1 : -1), y: mySpawn.y };
    myContainers.sort(a => a.store[RESOURCE_ENERGY]);
    const container = myContainers.filter(c => c.store[RESOURCE_ENERGY] > 0)[0];
    if (container) {
      switch (true) {
        case working && creep.getRangeTo(container) <= 1:
          creep.withdraw(container, RESOURCE_ENERGY);
          break;
        case working && creep.getRangeTo(container) > 1:
          CreepUtils.moveWithMatrix(creep, containerSweetSpot, costMatrix);
          break;
        case !working && creep.getRangeTo(mySpawn) <= 1:
          creep.transfer(mySpawn, RESOURCE_ENERGY);
          break;
        case !working && creep.getRangeTo(mySpawn) > 1:
          CreepUtils.moveWithMatrix(creep, spawnSweetSpot, costMatrix, { costMatrix });
          break;
      }
    }

    return {
      ...hauler,
      memory: {
        ...memory,
        working
      }
    };
  }
  private static runFastHauler(
    hauler: CreepRecord,
    mySpawn: StructureSpawn,
    costMatrix: CostMatrix,
    damageMatrix: CostMatrix
  ): CreepRecord {
    const { creep, memory } = hauler;
    let working = memory.working;
    if (creep.store.getUsedCapacity() || 0 > 0) {
      working = false;
    } else {
      working = true;
    }
    const heavyCarries = Math.ceil(
      creep.store[RESOURCE_ENERGY] / (creep.body.filter(b => b.type === CARRY).length * 50)
    );
    const moves = creep.body.filter(b => b.type === MOVE).length;
    const swampCost = Math.max(Math.min(Math.ceil((heavyCarries * 5) / moves), 1), 5);
    const moveArgs = { swampCost: swampCost, costMatrix: damageMatrix };
    const harvestContainers = getObjectsByPrototype(StructureContainer).filter(
      c =>
        c.findInRange(getObjectsByPrototype(StructureSpawn), 5).length === 0 &&
        c.store[RESOURCE_ENERGY] > (creep.store.getCapacity() || 0)
    );
    const storageContainers = getObjectsByPrototype(StructureContainer).filter(
      c => (c.getRangeTo(mySpawn) <= 5 && c.store.getFreeCapacity()) || 0 > 0
    );
    const storeTarget = creep.findClosestByPath(storageContainers);
    const target = creep.findClosestByPath(harvestContainers);
    if (target) {
      switch (true) {
        case working && creep.getRangeTo(target) > 2:
          CreepUtils.moveWithMatrix(creep, target, costMatrix, moveArgs);
          break;
        case working && creep.getRangeTo(target) <= 2:
          CreepUtils.moveWithMatrix(creep, target, costMatrix, moveArgs);
          creep.withdraw(target, RESOURCE_ENERGY);
          break;
        case !working && creep.getRangeTo(storeTarget || mySpawn) > 2:
          CreepUtils.moveWithMatrix(creep, storeTarget || mySpawn, costMatrix, moveArgs);
          break;
        case !working && creep.getRangeTo(storeTarget || mySpawn) <= 2:
          CreepUtils.moveWithMatrix(creep, storeTarget || mySpawn, costMatrix, moveArgs);
          creep.transfer(storeTarget || mySpawn, RESOURCE_ENERGY);
          break;
      }
    }

    return {
      ...hauler,
      memory: {
        ...memory,
        working
      }
    };
  }
  public static run(memory: Memory): Memory {
    const mySpawn = getObjectsByPrototype(StructureSpawn).filter(s => s.my)[0];
    const queens = memory.myCreeps.filter(c => c.memory.role === "queen");
    const fastHaulers = memory.myCreeps.filter(c => c.memory.role === "fastHauler");
    const haulerDamageMatrix = new CostMatrix();
    for (let x = 0; x < 100; x++) {
      for (let y = 0; y < 100; y++) {
        const costVal = memory.costMatrix.get(x, y);
        const damageVal = memory.hostileDamageMatrix.get(x, y);
        haulerDamageMatrix.set(x, y, damageVal ? 255 : costVal);
      }
    }

    const workedHaulers = fastHaulers.map(c => this.runFastHauler(c, mySpawn, memory.costMatrix, haulerDamageMatrix));
    const workedQueens = queens.map(c => this.runQueen(c, mySpawn, memory.costMatrix));
    // updating memory
    const updatedCreeps = memory.myCreeps.map(
      c => workedQueens.find(h => h.creep.id === c.creep.id) || workedHaulers.find(h => h.creep.id === c.creep.id) || c
    );
    return {
      ...memory,
      myCreeps: updatedCreeps
    };
  }
}
