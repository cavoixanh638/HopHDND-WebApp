/** Declaration for dedicated no-dependency Node WebSocket fault proxy (.mjs). */
export interface WireAckFaultEvidence {
  operationId:string;
  revision:number;
  requestId:number|null;
  requestSeen:boolean;
  casHashPresent:boolean;
  ackSeen:boolean;
  ackStatus:string;
  ackDropped:boolean;
  independent:{
    active:{operationId:string;generationId:string;revision:number};
    operations:number;generations:number;
  };
  error:string|null;
  direction:'RTDB server -> SDK';
  source:'real server WebSocket';
}
export declare class NetworkAckFaultProxy {
  constructor(options?:{port?:number});
  readonly port:number;
  readonly evidence:Array<{
    operationId:string;requestId:number|null;ackStatus:string;
    casHashPresent:boolean;server:WireAckFaultEvidence['independent'];
    ackFramesForwarded:0;
  }>;
  arm(operationId:string,revision:number):void;
  start():Promise<this>;
  requireDroppedAck(options?:{timeoutMs?:number}):Promise<WireAckFaultEvidence>;
  close():Promise<void>;
}
