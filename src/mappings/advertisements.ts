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
      data: [advertisementCodec, sourceCodec],
    },
  } = event;

  await upsertAdvertisement(event, sourceCodec.toString(), advertisementCodec);
}

export async function handleProcessorAdvertisementEvent(
  event: SubstrateEvent
): Promise<void> {
  await logAndStats(event);

  // Get data from the event
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [_managerCodec, sourceCodec, advertisementCodec],
    },
  } = event;

  await upsertAdvertisement(event, sourceCodec.toString(), advertisementCodec);
}

async function upsertAdvertisement(
  event: SubstrateEvent,
  sourceAddress: string,
  data: any
): Promise<void> {
  const blockNumber: number = event.block.block.header.number.toNumber();

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
        (module: any) => module.__variant === "DataEncryption"
      ) || false,
    networkRequestQuota: data.networkRequestQuota.toNumber(),
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

  await Promise.all([advertisement.save(), sourceAccount.save()]);
}

export async function handleAdvertisementRemovedEvent(
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

  let advertisement = await Advertisement.get(source.toString());
  if (advertisement) {
    advertisement.removed = true;
    await advertisement?.save();
  } else {
    logger.warn(
      `AdvertisementRemoved event skipped for ${source.toString()} at block ${event.block.block.header.number.toString()}`
    );
  }
}
