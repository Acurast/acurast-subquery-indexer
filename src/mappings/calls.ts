import { SubstrateExtrinsic } from "@subql/types";
import { Extrinsic } from "../types";
import { getOrCreateAccount } from "../utils";

export async function handleCall(call: SubstrateExtrinsic): Promise<void> {
  const blockNumber = call.block.block.header.number.toNumber();
  const address = await getOrCreateAccount(call.extrinsic.signer);

  const section = call.extrinsic.callIndex[0];
  const method = call.extrinsic.callIndex[1];

  // filter out heartbeat and heartbeat_with_version that we index smartly saving on storage
  if (!(section == 42 && method in [3, 5])) {
    await Extrinsic.create({
      id: `${blockNumber}-${call.idx}`,
      section,
      method,
      data: call.extrinsic.toHex(),
      accountId: address.id,
      args: JSON.stringify(call.extrinsic.args.map((i) => i.toJSON())),
      success: call.success,
      events: call.events.map((e) => ({
        idx: e.event.index.toHex(),
        data: JSON.stringify(e.event.data.toJSON()),
      })),
      blockNumber,
      timestamp: call.block.timestamp!,
    }).save();
  }
}
