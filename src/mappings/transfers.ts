import { Balance } from "@polkadot/types/interfaces";
import {
    SubstrateEvent
} from "@subql/types";
import { Transfer } from "../types";
import { getOrCreateAccount } from "../utils";

export async function handleTransferEvent(
  event: SubstrateEvent
): Promise<void> {
  logger.info(
    `Transfer event found at block ${event.block.block.header.number.toString()}`
  );

  // Get data from the event
  // The balances.transfer event has the following payload \[from, to, value\]
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [from, to, amount],
    },
  } = event;

  const blockNumber: number = event.block.block.header.number.toNumber();

  const fromAccount = await getOrCreateAccount(from);
  const toAccount = await getOrCreateAccount(to);

  const transfer = Transfer.create({
    id: `${blockNumber}-${event.idx}`,
    blockNumber,
    timestamp: event.block.timestamp!,
    amount: (amount as Balance).toBigInt(),
    fromId: fromAccount.id,
    toId: toAccount.id,
  });

  await Promise.all([fromAccount.save(), toAccount.save(), transfer.save()]);
}
