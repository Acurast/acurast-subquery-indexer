import {
    SubstrateEvent
} from "@subql/types";
import {
    Advertisement,
    Heartbeat,
    SchedulingWindowKind
} from "../types";
import { AdvertisementProps } from "../types/models/Advertisement";
import { getOrCreateAccount } from "../utils";

export async function handleAdvertisementStoredEvent(
  event: SubstrateEvent
): Promise<void> {
  logger.info(
    `AdvertisementStored event found at block ${event.block.block.header.number.toString()}`
  );

  // Get data from the event
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [codec, source],
    },
  } = event;

  const sourceAddress = source.toString();

  const blockNumber: number = event.block.block.header.number.toNumber();
  const data = codec as any;

  const sourceAccount = await getOrCreateAccount(sourceAddress);

  let advertisement = await Advertisement.get(sourceAddress);

  // prepare props
  const props: AdvertisementProps = {
    id: sourceAddress,
    sourceId: sourceAccount.id,
    blockNumber,
    timestamp: event.block.timestamp!,
    ...codecToSchedulingWindow(data.pricing.schedulingWindow),
    feePerMillisecond: data.pricing.feePerMillisecond.toBigInt(),
    feePerStorageByte: data.pricing.feePerStorageByte.toBigInt(),
    baseFeePerExecution: data.pricing.baseFeePerExecution.toBigInt(),
    maxMemory: data.maxMemory.toNumber(),
    storageCapacity: data.storageCapacity.toNumber(),
    availableModuleDataEncryption:
      !!data.availableModules.find(
        (module: any) => module.__kind === "DataEncryption"
      ) || false,
    networkRequestQuota: data.networkRequestQuota.toNumber(),
    deleted: false,
  };

  // update or create with prepared props
  if (advertisement) {
    for (const key in props) {
      if (key in advertisement) {
        // @ts-ignore - Ignoring TypeScript error for dynamically setting properties
        advertisement[key] = props[key];
      }
    }
  } else {
    advertisement = Advertisement.create(props);
  }

  await Promise.all([advertisement.save(), sourceAccount.save()]);
}

function codecToSchedulingWindow(data: any): {
  schedulingWindowKind: SchedulingWindowKind;
  schedulingWindowEnd?: Date;
  schedulingWindowDelta?: bigint;
} {
  if (data.isDelta) {
    return {
      schedulingWindowKind: SchedulingWindowKind.Delta,
      schedulingWindowDelta: data.asDelta.toBigInt(),
    };
  } else if (data.isEnd) {
    return {
      schedulingWindowKind: SchedulingWindowKind.End,
      schedulingWindowEnd: new Date(data.asEnd.toNumber()),
    };
  } else {
    throw Error(
      `Unknown SchedulingWindow variant in ${JSON.stringify(data.toJSON())}`
    );
  }
}

export async function handleAdvertisementRemovedEvent(
  event: SubstrateEvent
): Promise<void> {
  logger.info(
    `AdvertisementRemoved event found at block ${event.block.block.header.number.toString()}`
  );

  // Get data from the event
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [source],
    },
  } = event;

  let advertisement = await Advertisement.get(source.toHex());
  if (advertisement) {
    advertisement.deleted = true;
    await advertisement?.save();
  } else {
    logger.warn(
      `AdvertisementRemoved event skipped for ${source.toHex()} at block ${event.block.block.header.number.toString()}`
    );
  }
}

export async function handleProcessorHeartbeatWithVersionEvent(
  event: SubstrateEvent
): Promise<void> {
  logger.info(
    `ProcessorHeartbeatWithVersionEvent event found at block ${event.block.block.header.number.toString()}`
  );

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
