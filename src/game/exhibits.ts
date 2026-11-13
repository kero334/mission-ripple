// Optional science exhibits placed in existing rooms. Each one is a verified fact from the
// research package (see src/science/exhibits-v1.json) and pays a one-time optional-discovery reward.
export type Exhibit={id:'data-check'|'surface-typical'|'solar-catalog'|'iss-environment';room:string;x:number;y:number;icon:string};
export const EXHIBITS:Exhibit[]=[
  {id:'data-check',room:'research',x:145,y:202,icon:'science-rows'},
  {id:'surface-typical',room:'shelter',x:499,y:206,icon:'science-mars-day'},
  {id:'solar-catalog',room:'command',x:148,y:202,icon:'science-sun'},
  {id:'iss-environment',room:'habitat',x:164,y:200,icon:'science-station'},
];
