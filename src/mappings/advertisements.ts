import { SubstrateEvent } from "@subql/types";
import { Advertisement } from "../types";
import { AdvertisementProps } from "../types/models/Advertisement";
import { getOrCreateAccount } from "../utils";
import { logAndStats } from "./common";
import { codecToSchedulingWindow } from "./convert";

export async function handleAdvertisementStoredEvent(
  event: SubstrateEvent
): Promise<void> {
  await logAndStats(event);

  // Get data from the event
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [advertisementCodec, processorCodec],
    },
  } = event;

  await upsertAdvertisement(event, processorCodec.toString(), advertisementCodec);
}

export async function handleProcessorAdvertisementEvent(
  event: SubstrateEvent
): Promise<void> {
  await logAndStats(event);

  // Get data from the event
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [_managerCodec, processorCodec, advertisementCodec],
    },
  } = event;

  await upsertAdvertisement(event, processorCodec.toString(), advertisementCodec);
}

async function upsertAdvertisement(
  event: SubstrateEvent,
  processorAddress: string,
  data: any
): Promise<void> {
  const blockNumber: number = event.block.block.header.number.toNumber();

  const processor = await getOrCreateAccount(processorAddress);

  let advertisement = await Advertisement.get(processorAddress);

  // prepare props
  const props: AdvertisementProps = {
    id: processorAddress,
    processorId: processor.id,
    blockNumber,
    timestamp: event.block.timestamp!,
    ...codecToSchedulingWindow(data.pricing.schedulingWindow),
    feePerMillisecond: data.pricing.feePerMillisecond.toBigInt(),
    feePerStorageByte: data.pricing.feePerStorageByte.toBigInt(),
    baseFeePerExecution: data.pricing.baseFeePerExecution.toBigInt(),
    maxMemory: data.maxMemory.toBigInt(),
    storageCapacity: data.storageCapacity.toBigInt(),
    availableModuleDataEncryption:
      !!data.availableModules.find(
        (module: any) => module.__variant === "DataEncryption"
      ) || false,
    networkRequestQuota: data.networkRequestQuota.toBigInt(),
    removed: false,
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

  await Promise.all([advertisement.save(), processor.save()]);
}

export async function handleAdvertisementRemovedEvent(
  event: SubstrateEvent
): Promise<void> {
  await logAndStats(event);

  // Get data from the event
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [processorCodec],
    },
  } = event;

  let advertisement = await Advertisement.get(processorCodec.toString());
  if (advertisement) {
    advertisement.removed = true;
    await advertisement?.save();
  } else {
    logger.warn(
      `AdvertisementRemoved event skipped for ${processorCodec.toString()} at block ${event.block.block.header.number.toString()}`
    );
  }
}
