import { SubstrateEvent } from "@subql/types";
import { Stats } from "../types";

export async function logAndStats(
  event: SubstrateEvent
): Promise<void> {
  const blockNumber = event.block.block.header.number.toNumber();
  const timestamp = event.block.timestamp!;
  const id = `${event.event.section}.${event.event.method}`;
  logger.info(
    `${id} found at block ${blockNumber.toString()}`
  );

  let s = await Stats.get(id);
  if (s) {
    s.number = s.number + 1;
    s.lastBlockNumber = blockNumber;
    s.lastTimestamp = timestamp;
    await s.save();
  } else {
    await Stats.create({
        id,
        number: 1,
        firstBlockNumber: blockNumber,
        firstTimestamp: timestamp,
        lastBlockNumber: blockNumber,
        lastTimestamp: timestamp
    }).save();
  }
}
