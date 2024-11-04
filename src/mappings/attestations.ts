import { SubstrateEvent } from "@subql/types";
import { Attestation } from "../types";
import { getOrCreateAccount } from "../utils";

export async function handleAttestationStoredEvent(
  event: SubstrateEvent
): Promise<void> {
  logger.info(
    `AttestationStored event found at block ${event.block.block.header.number.toString()}`
  );

  // Get data from the event
  // logger.info(JSON.stringify(event));
  const {
    event: {
      data: [codec, source],
    },
  } = event;

  const sourceAddress = source.toString();

  const blockNumber: number = event.block.block.header.number.toNumber();
  const data = codec as any;

  const sourceAccount = await getOrCreateAccount(sourceAddress);

  // prepare props
  const attestation = Attestation.create({
    id: `${sourceAddress}-${blockNumber}-${event.idx}`,
    sourceId: sourceAccount.id,
    blockNumber,
    timestamp: event.block.timestamp!,
    notBefore: data.validity.notBefore.toBigInt(),
    notAfter: data.validity.notAfter.toBigInt(),
    raw: JSON.stringify(data.toJSON()),
  });

  await Promise.all([attestation.save(), sourceAccount.save()]);
}
