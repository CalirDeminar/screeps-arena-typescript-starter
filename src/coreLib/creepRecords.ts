import { Creep } from "game/prototypes";
import { getObjectsByPrototype } from "game/utils";

export interface CreepRecord {
    creep: Creep;
    memory: {
        role: string;
        working: boolean;
    }
}
export class CreepRecords {
    public static houseKeeping(oldRecords: CreepRecord[]) {
        const myCurrentCreeps = getObjectsByPrototype(Creep).filter((creep) => creep.my);
        return oldRecords.filter((oldCreep) => myCurrentCreeps.some((c) => oldCreep.creep.id === c.id)).map((creep) => {
            const match = myCurrentCreeps.find((c) => c.id === creep.creep.id);
            if(match){
                return {
                    creep: match,
                    memory: creep.memory
                }
            }
            return creep;
        });
    }
}
