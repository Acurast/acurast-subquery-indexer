import { Codec } from "@polkadot/types/types";
import { MultiOriginKind } from "../types";

export type JobId = [MultiOriginProps, bigint];

export type MultiOriginProps = {
  originKind: MultiOriginKind;
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
      originKind: MultiOriginKind.Acurast,
      origin: data.asAcurast.toHex(),
    };
  } else if (data.isTezos) {
    return {
      originKind: MultiOriginKind.Tezos,
      origin: data.asTezos.toHex(),
    };
  } else if (data.isEthereum) {
    return {
      originKind: MultiOriginKind.Ethereum,
      origin: data.asEthereum.toHex(),
    };
  } else if (data.isAlephZero) {
    return {
      originKind: MultiOriginKind.AlephZero,
      origin: data.asAlephZero.toHex(),
    };
  } else if (data.isVara) {
    return {
      originKind: MultiOriginKind.Vara,
      origin: data.asVara.toHex(),
    };
  }

  throw Error(`Unknown MultiOrigin variant in ${codec.toHuman()}`);
}
