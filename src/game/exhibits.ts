// Optional science exhibits placed in existing rooms. Each one is a verified fact from the
// research package (see src/science/exhibits-v1.json) and pays a one-time optional-discovery reward.
export type Exhibit={id:'data-check'|'surface-typical'|'solar-catalog'|'iss-environment'|'crop-education'|'mars-map';room:string;x:number;y:number;icon:string};
export const EXHIBITS:Exhibit[]=[
  {id:'data-check',room:'research',x:145,y:202,icon:'science-rows'},
  {id:'surface-typical',room:'shelter',x:499,y:206,icon:'science-mars-day'},
  {id:'solar-catalog',room:'command',x:148,y:202,icon:'science-sun'},
  {id:'iss-environment',room:'habitat',x:164,y:200,icon:'science-station'},
  {id:'crop-education',room:'greenhouse',x:150,y:195,icon:'ui-plant-pixel'},
  {id:'mars-map',room:'comms',x:148,y:204,icon:'ui-map-pixel'},
];
