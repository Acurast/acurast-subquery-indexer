import { SubstrateEvent } from "@subql/types";
import { Manager } from "../types";
import { getOrCreateAccount } from "../utils";
import { logAndStats } from "./common";

export async function handleManagerCreatedEvent(
  event: SubstrateEvent
): Promise<void> {
  await logAndStats(event);

  // Get data from the event
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [managerCodec, managerIdCodec],
    },
  } = event;

  const managerAddress = managerCodec.toString();
  const manager = await Manager.get(managerAddress);
  if (manager) {
    return;
  }

  const blockNumber: number = event.block.block.header.number.toNumber();
  await Manager.create({
    id: managerAddress,
    accountId: managerAddress,
    managerId: (managerIdCodec as any).toBigInt(),
    blockNumber,
    timestamp: event.block.timestamp!,
  }).save();
}

export async function handleProcessorPairedEvent(
  event: SubstrateEvent
): Promise<void> {
  await logAndStats(event);

  // Get data from the event
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [processorCodec, pairingCodec],
    },
  } = event;

  const processorAddress = processorCodec.toString();
  const managerAddress = (pairingCodec as any).account.toString();

  const processorAccount = await getOrCreateAccount(processorAddress);
  const manager = await Manager.get(managerAddress);
  if (!manager) {
    return;
  }
  processorAccount.managerId = manager.id;
  await processorAccount.save();
}

export async function handleProcessorPairingsUpdatedEvent(
  event: SubstrateEvent
): Promise<void> {
  await logAndStats(event);

  // Get data from the event
  logger.info(JSON.stringify(event));

  const blockNumber: number = event.block.block.header.number.toNumber();

  try {
    const {
      event: {
        data: [managerCodec, pairingUpdatesCodec],
      },
    } = event;

    const manager = await Manager.get(managerCodec.toString());
    if (!manager) {
      return;
    }

    for (const u of pairingUpdatesCodec as any) {
      // get the ss58 address of the processor
      const processorAddress = u.item.toString();
      const sourceAccount = await getOrCreateAccount(processorAddress);
      if (u.operation.isAdd) {
        sourceAccount.managerId = manager.id;
        await sourceAccount.save();
      } else if (u.operation.isRemove) {
        sourceAccount.managerId = undefined;
        await sourceAccount.save();
      } else {
        throw new Error(
          `unsupported ListUpdateOperation variant in ListUpdate: ${u.toString()}`
        );
      }
    }
  } catch (e) {
    logger.warn(e);
  }
}
