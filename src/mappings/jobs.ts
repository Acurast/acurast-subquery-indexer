import { SubstrateEvent } from "@subql/types";
import {
  Account,
  Assignment,
  AssignmentStrategy,
  Finalization,
  Job,
  JobAllowsProcessor,
  JobData,
  JobStatus,
  JobStatusChange,
  Match,
  PubKeys,
  Report,
  ReportVariant,
} from "../types";
import {
  getOrCreateAccount,
  getOrCreateJob as getOrCreateJob,
  getOrCreateMultiOrigin,
  jobIdToString,
} from "../utils";
import {
  codecToAssignmentStrategy,
  codecToJobAssignment,
  codecToJobId,
  PubKey,
} from "./convert";
import { logAndStats } from "./common";
import { TextDecoder } from "util";

export async function handleMatchedEvents(
  event: SubstrateEvent
): Promise<void> {
  await logAndStats(event);

  // Get data from the event
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [codec],
    },
  } = event;

  const data = codec as any;
  const jobId = await codecToJobId(data.jobId);
  const job = await getOrCreateJob(jobId);

  const blockNumber: number = event.block.block.header.number.toNumber();

  const promises: Promise<any>[] = [];
  for (const [index, match] of (data.sources as any).entries()) {
    // since this event is might be a match for all executions, execution can be undefined
    const execution: number | undefined = data.hasOwnProperty("executionIndex")
      ? data.executionIndex.toNumber()
      : undefined;
    const processor = await getOrCreateAccount(match.source.toString());
    promises.push(processor.save());
    promises.push(
      Match.create({
        // the slot is not needed in id since a processor gets only matched to one slot of a job
        id: execution
          ? `${job.id}-${match.source}-${execution}`
          : `${job.id}-${match.source}`,
        processorId: processor.id,
        jobId: job.id,
        slot: index,
        execution,
        startDelay: match.startDelay.toBigInt(),
        instant: false,
        blockNumber,
        timestamp: event.block.timestamp!,
      }).save()
    );
  }

  const change = JobStatusChange.create({
    id: `${job.id}-${blockNumber}-${event.idx}`,
    jobId: job.id,
    blockNumber,
    timestamp: event.block.timestamp!,
    status: JobStatus.Matched,
  });

  await Promise.all([change.save(), ...promises]);
}

export async function handleJobRegistrationAssignedEvent(
  event: SubstrateEvent
): Promise<void> {
  await logAndStats(event);

  // Get data from the event
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [jobIdCodec, processorCodec, assignmentCodec],
    },
  } = event;

  let job = await getOrCreateJob(await codecToJobId(jobIdCodec));

  const assignment = codecToJobAssignment(assignmentCodec);
  const processorAddress = processorCodec.toString();
  const blockNumber: number = event.block.block.header.number.toNumber();
  const timestamp = event.block.timestamp!;

  const id = assignment.execution
    ? `${job.id}-${processorAddress}-${assignment.execution}`
    : `${job.id}-${processorAddress}`;

  const assignmentEntity = Assignment.create({
    // since it's a one-to-one relation
    id,
    processorId: processorAddress,
    jobId: job.id,
    feePerExecution: assignment.feePerExecution,
    sla: assignment.sla,
    pubKeys: pubKeyToPubKeyEntity(assignment.pubKeys),
    blockNumber,
    timestamp,
  });
  const change = JobStatusChange.create({
    id: `${job.id}-${blockNumber}-${event.idx}`,
    jobId: job.id,
    blockNumber,
    timestamp,
    status: JobStatus.Assigned,
  });

  await Promise.all([job.save(), change.save(), assignmentEntity.save()]);
}

export async function handleReportedEvent(
  event: SubstrateEvent
): Promise<void> {
  await logAndStats(event);

  // Get data from the event
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [jobIdCodec, processorCodec, assignmentCodec],
    },
  } = event;

  let job = await getOrCreateJob(await codecToJobId(jobIdCodec));

  const assignment = codecToJobAssignment(assignmentCodec);
  const processorAddress = processorCodec.toString();
  const blockNumber: number = event.block.block.header.number.toNumber();
  const timestamp = event.block.timestamp!;
  const id = assignment.execution
    ? `${job.id}-${processorAddress}-${assignment.execution}`
    : `${job.id}-${processorAddress}`;
  await getOrCreateAccount(processorAddress);

  // retrieve execution result over extrinsic
  logger.info(JSON.stringify(event.extrinsic!.extrinsic.method.toHuman()));
  const [_exJobIdCodec, exExecutionResultCodec] =
    event.extrinsic!.extrinsic.method.args;

  const executionResult = exExecutionResultCodec as any;
  if (executionResult.isSuccess) {
    await Report.create({
      id: `${blockNumber}-${event.idx}`,
      processorId: processorAddress,
      jobId: job.id,
      blockNumber,
      timestamp,
      variant: ReportVariant.Success,
      operationHash: executionResult.asSuccess.toHex(),
    }).save();
  } else if (executionResult.isFailure) {
    await Report.create({
      id,
      processorId: processorAddress,
      jobId: job.id,
      blockNumber,
      timestamp,
      variant: ReportVariant.Failure,
      errorMessage: new TextDecoder().decode(executionResult.asFailure.toU8a()),
    }).save();
  } else {
    throw new Error(
      `unsupported ExecutionResult variant: ${executionResult.toString()}`
    );
  }
}

export async function handleJobFinalizedEvent(
  event: SubstrateEvent
): Promise<void> {
  await logAndStats(event);

  // Get data from the event
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [jobIdCodec],
    },
  } = event;

  let job = await getOrCreateJob(await codecToJobId(jobIdCodec));

  const blockNumber: number = event.block.block.header.number.toNumber();
  const timestamp = event.block.timestamp!;

  // retrieve execution origin over extrinsic
  const processorAddress = event.extrinsic!.extrinsic.signer.toString();
  logger.info(event.extrinsic!.extrinsic.signer.toString());
  logger.info(JSON.stringify(event.extrinsic!.extrinsic.signer.toJSON()));

  const id = `${job.id}-${processorAddress}`;

  await Finalization.create({
    id,
    processorId: processorAddress,
    jobId: job.id,
    blockNumber,
    timestamp,
  }).save();
}

function pubKeyToPubKeyEntity(pubKeys: PubKey[]) {
  const pubKeysEntity: PubKeys = {};
  for (const p of pubKeys) {
    if (p.ED25519) {
      pubKeysEntity.ED25519 = p.ED25519;
    } else if (p.SECP256k1) {
      pubKeysEntity.SECP256k1 = p.SECP256k1;
    } else if (p.SECP256r1) {
      pubKeysEntity.SECP256r1 = p.SECP256r1;
    } else if (p.SECP256k1Encryption) {
      pubKeysEntity.SECP256k1Encryption = p.SECP256k1Encryption;
    } else if (p.SECP256r1Encryption) {
      pubKeysEntity.SECP256r1Encryption = p.SECP256r1Encryption;
    } else {
      throw new Error(
        `expected at least on key type to be set in ${JSON.stringify(p)}`
      );
    }
  }
  return pubKeysEntity;
}

export async function handleJobRegistrationStoredEvent(
  event: SubstrateEvent
): Promise<void> {
  await logAndStats(event);

  // Get data from the event
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [jobRegistrationCodec, jobIdCodec],
    },
  } = event;

  const jobId = await codecToJobId(jobIdCodec);
  const job = await getOrCreateJob(jobId);

  const data = jobRegistrationCodec as any;
  const blockNumber: number = event.block.block.header.number.toNumber();

  let jobData = await JobData.get(job.id);
  if (jobData) {
    // Don't reindex since job data is immutable (except status field which is always Open on registration)
    return;
  }
  let matchs: Match[] = [];
  const { assignmentStrategy, instantMatch } = codecToAssignmentStrategy(
    data.extra.requirements.assignmentStrategy
  );

  // to be future proof we want to fail soft and just store the bytes as hex if it's not UTF-8 text
  let script = "";
  try {
    script = new TextDecoder("utf-8", { ignoreBOM: true }).decode(
      data.script.toU8a()
    );
    if (script.length) {
      script = script.slice(1);
    }
  } catch (e) {
    script = data.script.toHex();
  }

  jobData = JobData.create({
    id: job.id,
    jobIdId: job.id,

    script,
    allowOnlyVerifiedProcessors: data.allowOnlyVerifiedSources.toJSON(),
    memory: data.memory.toBigInt(),
    networkRequests: data.networkRequests.toBigInt(),
    storage: data.storage.toBigInt(),
    requiredModuleDataEncryption:
      !!data.requiredModules.find(
        (module: any) => module.__kind === "DataEncryption"
      ) || false,

    // schedule
    duration: data.schedule.duration.toBigInt(),
    startTime: new Date(data.schedule.startTime.toNumber()),
    endTime: new Date(data.schedule.endTime.toNumber()),
    interval: data.schedule.interval.toBigInt(),
    maxStartDelay: data.schedule.maxStartDelay.toBigInt(),

    //  extra.requirements
    slots: data.extra.requirements.slots.toNumber(),
    reward: data.extra.requirements.reward.toBigInt(),
    minReputation: data.extra.requirements.minReputation
      .unwrapOr(undefined)
      ?.toBigInt(),

    assignmentStrategy,
  });

  const allowedProcessors: JobAllowsProcessor[] = [];
  const processors: Account[] = [];
  if (data.allowedSources.isSome) {
    for (const allowedProcessor of data.allowedSources.unwrap()) {
      const processorAddress = allowedProcessor.toString();
      const processor = await getOrCreateAccount(processorAddress);
      const id = `${jobData.id}-${processorAddress}`;
      // the runtime makes sure we do not save duplicates but still returns all updates (with potential duplicates) so we check for existence
      if (!(await JobAllowsProcessor.get(id))) {
        // only push if JobAllowsProcessor did not yet exist
        processors.push(processor);
        allowedProcessors.push(
          JobAllowsProcessor.create({
            id: `${jobData.id}-${processorAddress}`,
            jobId: jobData.id,
            processorId: processor.id,
          })
        );
      }
    }
  }
  const change = JobStatusChange.create({
    id: `${jobData.id}-${blockNumber}-${event.idx}`,
    jobId: jobData.id,
    blockNumber,
    timestamp: event.block.timestamp!,
    status: JobStatus.Open,
  });
  if (assignmentStrategy == AssignmentStrategy.Single && instantMatch) {
    matchs = instantMatch.map((match, index: number) => {
      return Match.create({
        id: `${jobData.id}-${match.processor}`,
        processorId: match.processor,
        jobId: jobData.id,
        slot: index,
        execution: undefined, // since this event is matching all executions
        startDelay: match.startDelay,
        instant: true,
        blockNumber,
        timestamp: event.block.timestamp!,
      });
    });
  }

  await Promise.all([
    jobData.save(),
    change.save(),
    ...matchs.map((e) => e.save()),
    ...processors.map((s) => s.save()),
    ...allowedProcessors.map((s) => s.save()),
  ]);
}

export async function handleAllowedSourcesUpdatedEvent(
  event: SubstrateEvent
): Promise<void> {
  await logAndStats(event);

  // Get data from the event
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [jobIdCodec, _, updatesCodec],
    },
  } = event;

  const jobId = await codecToJobId(jobIdCodec);
  const id = jobIdToString(jobId);

  let job = await Job.get(id);
  if (!job) {
    return;
  }

  const promises: Promise<any>[] = [];
  for (const u of updatesCodec as any) {
    // get the ss58 address of the processor
    const processorAddress = u.item.toString();
    const id = `${job.id}-${processorAddress}`;
    if (u.operation.isAdd) {
      const processor = await getOrCreateAccount(processorAddress);
      // the runtime makes sure we do not save duplicates but still returns all updates (with potential duplicates) so we check for existence
      if (!(await JobAllowsProcessor.get(id))) {
        // only push if JobAllowsProcessor did not yet exist
        promises.push(processor.save());
        promises.push(
          JobAllowsProcessor.create({
            id: `${job.id}-${processorAddress}`,
            jobId: job.id,
            processorId: processor.id,
          }).save()
        );
      }
    } else if (u.operation.isRemove) {
      promises.push(JobAllowsProcessor.remove(id));
    } else {
      throw new Error(
        `unsupported ListUpdateOperation variant in ListUpdate: ${u.toString()}`
      );
    }
  }

  await Promise.all(promises);
}

export type MatchProps = {
  processor: string;
  startDelay: bigint;
};

export async function handleJobRegistrationRemovedEvent(
  event: SubstrateEvent
): Promise<void> {
  await logAndStats(event);

  // Get data from the event
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [jobIdCodec],
    },
  } = event;

  const blockNumber: number = event.block.block.header.number.toNumber();

  let job = await getOrCreateJob(await codecToJobId(jobIdCodec));
  await JobStatusChange.create({
    id: `${job.id}-${blockNumber}-${event.idx}`,
    jobId: job.id,
    blockNumber,
    timestamp: event.block.timestamp!,
    status: JobStatus.Removed,
  }).save();
}
