import { CreepRecord, Memory } from "coreLib/memory";
import { CARRY, MOVE, RANGED_ATTACK, RESOURCE_ENERGY, HEAL } from "game/constants";
import { StructureContainer, StructureSpawn } from "game/prototypes";
import { getObjectsByPrototype } from "game/utils";

const ra_count = 3;
const mv_count = 4;
const hl_count = 1;
const trooperTemplate = [
  ...Array(ra_count).fill(RANGED_ATTACK),
  ...Array(mv_count).fill(MOVE),
  ...Array(hl_count).fill(HEAL)
];
const squadSize = 2;
export class SpawningManager {
  private static spawnQueen(memory: Memory, spawn: StructureSpawn): Memory {
    // const budget = spawn.store[RESOURCE_ENERGY];
    // const eachPartCount = Math.floor(budget / 100);
    const queenMoves = 3;
    const queenCarries = 6;
    const spawning = spawn.spawnCreep([...Array(queenMoves).fill(MOVE), ...Array(queenCarries).fill(CARRY)]).object;
    if (spawning) {
      return {
        ...memory,
        myCreeps: [
          ...memory.myCreeps,
          {
            creep: spawning,
            memory: { role: "queen", working: true }
          }
        ]
      };
    }
    return memory;
  }
  private static spawnFastHauler(memory: Memory, spawn: StructureSpawn): Memory {
    const haulerMoves = 6;
    const haulerCarries = 3;
    const spawning = spawn.spawnCreep([...Array(haulerMoves).fill(MOVE), ...Array(haulerCarries).fill(CARRY)]).object;
    if (spawning) {
      return {
        ...memory,
        myCreeps: [...memory.myCreeps, { creep: spawning, memory: { role: "fastHauler", working: true } }]
      };
    }
    return memory;
  }
  public static getTrooperCost(): number {
    return ra_count * 120 + mv_count * 50 + hl_count * 250;
  }
  public static getSquadCost(): number {
    return this.getTrooperCost() * squadSize;
  }
  private static formUpSquad(memory: Memory, spawn: StructureSpawn): Memory {
    const formingSquad = memory.mySquads.find(s => !s.active);
    if (!formingSquad) {
      return memory;
    }
    let nextCreep = spawn.spawnCreep(trooperTemplate).object;
    if (nextCreep) {
      const newTrooper: CreepRecord = {
        creep: nextCreep,
        memory: {
          role: "trooper"
        }
      };
      const newSquadCreepList = [...formingSquad.creeps, newTrooper];
      formingSquad.creeps = newSquadCreepList;
      formingSquad.active = newSquadCreepList.length >= squadSize;
      formingSquad.lead = formingSquad.lead || newTrooper.creep.id;
      return {
        ...memory,
        myCreeps: [...memory.myCreeps, newTrooper],
        mySquads: memory.mySquads.map(s => (s.id === formingSquad.id ? formingSquad : s))
      };
    }
    return memory;
  }
  private static newSquad(memory: Memory): Memory {
    return {
      ...memory,
      mySquads: [
        ...memory.mySquads,
        { id: memory.mySquads.length.toString(), active: false, lead: undefined, creeps: [] }
      ]
    };
  }
  public static run(memory: Memory): Memory {
    let rtnMem = memory;
    const spawn = getObjectsByPrototype(StructureSpawn).filter(s => s.my)[0];
    const allContainers = getObjectsByPrototype(StructureContainer);
    const hasArenaContainers = allContainers.length > 6;
    const myContainers = spawn.findInRange(allContainers, 5);
    const storedEnergy =
      spawn.store[RESOURCE_ENERGY] + myContainers.reduce((total, cont) => total + cont.store[RESOURCE_ENERGY], 0);
    const queens = memory.myCreeps.filter(c => c.memory.role === "queen");
    const fastHaulers = memory.myCreeps.filter(c => c.memory.role === "fastHauler");
    const squadForming = memory.mySquads.some(s => !s.active);
    const canStartNewSquad = !squadForming && storedEnergy > this.getSquadCost();
    switch (true) {
      case queens.length < 1:
        rtnMem = this.spawnQueen(rtnMem, spawn);
        // spawn hauler
        break;
      case squadForming:
        // form squad;
        rtnMem = this.formUpSquad(rtnMem, spawn);
        break;
      case hasArenaContainers && fastHaulers.length < 2:
        rtnMem = this.spawnFastHauler(rtnMem, spawn);
        // spawn fastHaulers
        break;
      case canStartNewSquad:
        // start new squad:
        rtnMem = this.newSquad(rtnMem);
    }
    return rtnMem;
  }
}
