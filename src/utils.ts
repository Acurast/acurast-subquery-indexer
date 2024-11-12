import { Codec } from "@polkadot/types-codec/types";
import { u8aToHex } from "@polkadot/util";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";
import { JobId, MultiOriginProps } from "./mappings/convert";
import { Account, MultiOrigin, MultiOriginVariant } from "./types";

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
  let { originVariant, origin } = props;
  let multiOrigin = (
    await MultiOrigin.getByFields(
      [
        ["originVariantString", "=", originVariant.toString()],
        ["origin", "=", origin],
      ],
      {
        limit: 1,
      }
    )
  ).at(0);
  if (!multiOrigin) {
    // We couldn't find the account
    switch (originVariant) {
      case MultiOriginVariant.Acurast:
        const address = encodeAddress(origin, 42);

        const account = await getOrCreateAccount(address);
        await account.save();

        multiOrigin = MultiOrigin.create({
          // use the account address here for faster filtering on related entities
          id: multiOriginPrefix(originVariant, address),
          originVariant,
          originVariantString: originVariant.toString(),
          origin,
          // only Acurast MultiOrigins get automatically linked to their native account
          accountId: account.id,
        });
        break;
      case MultiOriginVariant.AlephZero:
        multiOrigin = MultiOrigin.create({
          id: multiOriginPrefix(originVariant, encodeAddress(origin, 42)),
          originVariant,
          originVariantString: originVariant.toString(),
          origin,
        });
        break;
      case MultiOriginVariant.Vara:
        multiOrigin = MultiOrigin.create({
          id: multiOriginPrefix(originVariant, encodeAddress(origin, 137)),
          originVariant,
          originVariantString: originVariant.toString(),
          origin,
        });
        break;
      default:
        multiOrigin = MultiOrigin.create({
          id: multiOriginPrefix(originVariant, origin),
          originVariant,
          originVariantString: originVariant.toString(),
          origin,
        });
        break;
    }
  }
  return multiOrigin;
}

export function jobIdToString(jobId: JobId): string {
  return multiOriginPrefix(jobId[0].originVariant, jobId[1].toString());
}

export function multiOriginPrefix(variant: MultiOriginVariant, text: string): string {
  switch (variant) {
    case MultiOriginVariant.Acurast:
      return `Acurast#${text}`;
    case MultiOriginVariant.Tezos:
      return `Tezos#${text}`;
    case MultiOriginVariant.Ethereum:
      return `Ethereum#${text}`;
    case MultiOriginVariant.AlephZero:
      return `AlephZero#${text}`;
    case MultiOriginVariant.Vara:
      return `Vara#${text}`;
    default:
      throw Error(`Unknown JobId variant: ${variant}`);
  }
}
