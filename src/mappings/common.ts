import { SubstrateEvent } from "@subql/types";
import { Stats } from "../types";

export async function logAndStats(
  event: SubstrateEvent
): Promise<void> {
  const method = event.event.method;
  const blockNumber = event.block.block.header.number.toNumber();
  const timestamp = event.block.timestamp!;
  logger.info(
    `${method} found at block ${blockNumber.toString()}`
  );

  let s = await Stats.get(method);
  if (s) {
    s.number = s.number + 1;
    s.lastBlockNumber = blockNumber;
    s.lastTimestamp = timestamp;
    await s.save();
  } else {
    await Stats.create({
        id: method,
        number: 1,
        firstBlockNumber: blockNumber,
        firstTimestamp: timestamp,
        lastBlockNumber: blockNumber,
        lastTimestamp: timestamp
    }).save();
  }
}
