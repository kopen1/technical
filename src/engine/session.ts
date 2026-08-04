import type {Session,Evidence} from "./types";
export function newSession(flowId:string,device:string,symptom:string,firstStep:string):Session{return{id:crypto.randomUUID(),flowId,device,symptom,currentStep:firstStep,evidence:[],status:"ACTIVE"}}
export function addEvidence(s:Session,e:Evidence){s.evidence.push(e)}