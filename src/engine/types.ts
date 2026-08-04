export type InputType="choice"|"boolean"|"voltage"|"current"|"resistance"|"diode"|"observation"|"text";
export type Status="PASS"|"FAIL"|"ABNORMAL"|"UNKNOWN";
export interface RuleStep{id:string;title:string;instruction:string;why:string;inputType:InputType;unit?:string;testPoint?:string;options?:string[];min?:number;max?:number;pass?:string;fail?:string;unknown?:string;}
export interface DiagnosticFlow{id:string;device:string;symptom:string;title:string;reference?:string;steps:RuleStep[];faultGroups:string[];}
export interface Evidence{stepId:string;title:string;value:string;status:Status;timestamp:string;}
export interface Session{id:string;flowId:string;device:string;symptom:string;currentStep:string;evidence:Evidence[];status:"ACTIVE"|"COMPLETED"|"ABORTED";}