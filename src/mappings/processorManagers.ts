import { SubstrateEvent } from "@subql/types";
import { Heartbeat, Manager, ProcessorReward } from "../types";
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
}

export async function handleProcessorHeartbeatEvent(
  event: SubstrateEvent
): Promise<void> {
  await logAndStats(event);

  // Get data from the event
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [source],
    },
  } = event;

  const sourceAddress = source.toString();

  const blockNumber: number = event.block.block.header.number.toNumber();

  const sourceAccount = await getOrCreateAccount(sourceAddress);

  const heartbeat = Heartbeat.create({
    id: `${blockNumber}-${event.idx}`,
    sourceId: sourceAccount.id,
    blockNumber,
    timestamp: event.block.timestamp!,
  });

  await Promise.all([heartbeat.save(), sourceAccount.save()]);
}

export async function handleProcessorHeartbeatWithVersionEvent(
  event: SubstrateEvent
): Promise<void> {
  await logAndStats(event);

  // Get data from the event
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [source, codec],
    },
  } = event;

  const sourceAddress = source.toString();

  const blockNumber: number = event.block.block.header.number.toNumber();
  const data = codec as any;

  const sourceAccount = await getOrCreateAccount(sourceAddress);

  const heartbeat = Heartbeat.create({
    id: `${blockNumber}-${event.idx}`,
    sourceId: sourceAccount.id,
    blockNumber,
    timestamp: event.block.timestamp!,
    platform: data.platform.toNumber(),
    build_number: data.buildNumber.toNumber(),
  });

  await Promise.all([heartbeat.save(), sourceAccount.save()]);
}

export async function handleProcessorRewardSentEvent(
  event: SubstrateEvent
): Promise<void> {
  await logAndStats(event);

  // Get data from the event
  logger.info(JSON.stringify(event));

  const blockNumber: number = event.block.block.header.number.toNumber();

  // Get data from the event
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [processorCodec, amountCodec],
    },
  } = event;

  const processorAddress = processorCodec.toString();
  await ProcessorReward.create({
    id: `${blockNumber}-${event.idx}`,
    sourceId: processorAddress,
    blockNumber,
    timestamp: event.block.timestamp!,
    amount: (amountCodec as any).toBigInt(),
  }).save();
}
