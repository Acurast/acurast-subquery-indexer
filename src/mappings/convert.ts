import { Codec } from "@polkadot/types/types";
import {
  AssignmentStrategy,
  MultiOriginVariant,
  SchedulingWindowVariant,
} from "../types";
import { MatchProps } from "./jobs";

export type JobId = [MultiOriginProps, bigint];

export type MultiOriginProps = {
  originVariant: MultiOriginVariant;
  // the origin as hex, for most chain corresponds to the public key
  origin: string;
};

export async function codecToJobId(codec: Codec): Promise<JobId> {
  const data = codec as any;
  return [await codecToMultiOrigin(data[0]), data[1].toBigInt()];
}

export async function codecToMultiOrigin(
  codec: Codec
): Promise<MultiOriginProps> {
  const data = codec as any;
  if (data.isAcurast) {
    return {
      originVariant: MultiOriginVariant.Acurast,
      origin: data.asAcurast.toHex(),
    };
  } else if (data.isTezos) {
    return {
      originVariant: MultiOriginVariant.Tezos,
      origin: data.asTezos.toHex(),
    };
  } else if (data.isEthereum) {
    return {
      originVariant: MultiOriginVariant.Ethereum,
      origin: data.asEthereum.toHex(),
    };
  } else if (data.isAlephZero) {
    return {
      originVariant: MultiOriginVariant.AlephZero,
      origin: data.asAlephZero.toHex(),
    };
  } else if (data.isVara) {
    return {
      originVariant: MultiOriginVariant.Vara,
      origin: data.asVara.toHex(),
    };
  }

  throw Error(`Unknown MultiOrigin variant in ${codec.toHuman()}`);
}

export type JobAssignment = {
  slot: number;
  startDelay: bigint;
  feePerExecution: bigint;
  acknowledged: boolean;
  sla: JobAssignmentSla;
  pubKeys: PubKey[];
  execution: number | null;
};

export type PubKey = {
  SECP256r1?: string;
  SECP256k1?: string;
  ED25519?: string;
  SECP256r1Encryption?: string;
  SECP256k1Encryption?: string;
};

export type JobAssignmentSla = {
  total: number;
  met: number;
};

export function codecToJobAssignment(codec: Codec): JobAssignment {
  const data = codec as any;
  return {
    slot: data.slot.toNumber(),
    startDelay: data.startDelay.toBigInt(),
    feePerExecution: data.feePerExecution.toBigInt(),
    acknowledged: data.acknowledged.isTrue,
    sla: {
      total: data.sla.total.toNumber(),
      met: data.sla.met.toNumber(),
    },
    pubKeys: data.pubKeys.toJSON().map((value: any) => ({
      SECP256r1: value.secp256r1,
      SECP256k1: value.secp256k1,
      ED25519: value.ed25519,
      SECP256r1Encryption: value.secp256r1Encryption,
      SECP256k1Encryption: value.secp256k1Encryption,
    })),
    execution: data.execution.isAll ? null : data.execution.asIndex.toNumber(),
  };
}
export function codecToSchedulingWindow(data: any): {
  schedulingWindowVariant: SchedulingWindowVariant;
  schedulingWindowEnd?: Date;
  schedulingWindowDelta?: bigint;
} {
  if (data.isDelta) {
    return {
      schedulingWindowVariant: SchedulingWindowVariant.Delta,
      schedulingWindowDelta: data.asDelta.toBigInt(),
    };
  } else if (data.isEnd) {
    return {
      schedulingWindowVariant: SchedulingWindowVariant.End,
      schedulingWindowEnd: new Date(data.asEnd.toNumber()),
    };
  } else {
    throw Error(
      `Unknown SchedulingWindow variant in ${JSON.stringify(data.toJSON())}`
    );
  }
}
export function codecToAssignmentStrategy(codec: Codec): {
  assignmentStrategy: AssignmentStrategy;
  instantMatch?: MatchProps[];
} {
  const data = codec as any;
  if (data.isSingle) {
    return {
      assignmentStrategy: AssignmentStrategy.Single,
      instantMatch: data.asSingle.unwrapOr(undefined)?.map((value: any) => ({
        source: value.source.toString(),
        startDelay: value.startDelay.toBigInt(),
      })),
    };
  } else if (data.isCompeting) {
    return { assignmentStrategy: AssignmentStrategy.Competing };
  }

  throw new Error(
    `unsupported AssignmentStrategy variant: ${codec.toString()}`
  );
}
