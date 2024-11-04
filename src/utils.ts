import {
  SubstrateExtrinsic,
  SubstrateEvent,
  SubstrateBlock,
} from "@subql/types";
import { Account, MultiOrigin, MultiOriginKind, Transfer } from "./types";
import { Balance } from "@polkadot/types/interfaces";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";
import { isHex, u8aToHex } from "@polkadot/util";
import { Codec } from "@polkadot/types-codec/types";
import { JobId, MultiOriginProps } from "./mappings/convert";
import { Prefix } from "@polkadot/util-crypto/types";

export async function getOrCreateAccount(
  address: Codec | string
): Promise<Account> {
  const id = typeof address === "string" ? address : address.toString(); // id is ss58 address
  let account = await Account.get(id);
  if (!account) {
    // We couldn't find the account
    account = Account.create({
      id,
      publicKey: u8aToHex(decodeAddress(id)),
    });
  }
  return account;
}

export async function getOrCreateMultiOrigin(
  props: MultiOriginProps
): Promise<MultiOrigin> {
  let { originKind, origin } = props;
  let multiOrigin = (
    await MultiOrigin.getByFields(
      [
        ["originKindString", "=", originKind.toString()],
        ["origin", "=", origin],
      ],
      {
        limit: 1,
      }
    )
  ).at(0);
  if (!multiOrigin) {
    // We couldn't find the account
    switch (originKind) {
      case MultiOriginKind.Acurast:
        const address = encodeAddress(origin, 42);

        const account = await getOrCreateAccount(address);
        await account.save();

        multiOrigin = MultiOrigin.create({
          // use the account address here for faster filtering on related entities
          id: multiOriginPrefix(originKind, address),
          originKind,
          originKindString: originKind.toString(),
          origin,
          // only Acurast MultiOrigins get automatically linked to their native account
          accountId: account.id,
        });
        break;
      case MultiOriginKind.AlephZero:
        multiOrigin = MultiOrigin.create({
          id: multiOriginPrefix(originKind, encodeAddress(origin, 42)),
          originKind,
          originKindString: originKind.toString(),
          origin,
        });
        break;
      case MultiOriginKind.Vara:
        multiOrigin = MultiOrigin.create({
          id: multiOriginPrefix(originKind, encodeAddress(origin, 137)),
          originKind,
          originKindString: originKind.toString(),
          origin,
        });
        break;
      default:
        multiOrigin = MultiOrigin.create({
          id: multiOriginPrefix(originKind, origin),
          originKind,
          originKindString: originKind.toString(),
          origin,
        });
        break;
    }
  }
  return multiOrigin;
}

export function jobIdToString(jobId: JobId): string {
  return multiOriginPrefix(jobId[0].originKind, jobId[1].toString());
}

export function multiOriginPrefix(kind: MultiOriginKind, text: string): string {
  switch (kind) {
    case MultiOriginKind.Acurast:
      return `Acurast#${text}`;
    case MultiOriginKind.Tezos:
      return `Tezos#${text}`;
    case MultiOriginKind.Ethereum:
      return `Ethereum#${text}`;
    case MultiOriginKind.AlephZero:
      return `AlephZero#${text}`;
    case MultiOriginKind.Vara:
      return `Vara#${text}`;
    default:
      throw Error(`Unknown JobId variant: ${kind}`);
  }
}
