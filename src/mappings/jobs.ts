import { Codec } from "@polkadot/types-codec/types";
import { SubstrateEvent } from "@subql/types";
import {
  AssignmentStrategy,
  Job,
  JobStatus,
  JobStatusChange,
  PlannedExecution,
} from "../types";
import {
  getOrCreateAccount,
  getOrCreateMultiOrigin,
  jobIdToString,
} from "../utils";
import { codecToJobId } from "./convert";

export async function handleJobRegistrationMatchedEvent(
  event: SubstrateEvent
): Promise<void> {
  logger.info(
    `JobRegistrationMatched event found at block ${event.block.block.header.number.toString()}`
  );

  // Get data from the event
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [codec],
    },
  } = event;

  const data = codec as any;
  const jobId = await codecToJobId(data.jobId);
  const id = jobIdToString(jobId);

  const blockNumber: number = event.block.block.header.number.toNumber();

  let job = await Job.get(id);
  if (!job) {
    return;
  }
  const plannedExecutions: PlannedExecution[] = data.sources.map(
    (plannedExecution: any) => {
      return PlannedExecution.create({
        id: `${job.id}-${plannedExecution.source}`,
        sourceId: plannedExecution.source.toString(),
        startDelay: plannedExecution.startDelay.toBigInt(),
        jobId: job.id,
        instant: false,
        blockNumber,
        timestamp: event.block.timestamp!,
      });
    }
  );
  job.status = JobStatus.Matched;
  const change = JobStatusChange.create({
    id: `${job.id}-${blockNumber}-${event.idx}`,
    jobId: job.id,
    blockNumber,
    timestamp: event.block.timestamp!,
    status: job.status,
  });

  await Promise.all([
    job.save(),
    change.save(),
    ...plannedExecutions.map((e) => e.save()),
  ]);
}

export async function handleJobRegistrationStoredEvent(
  event: SubstrateEvent
): Promise<void> {
  logger.info(
    `JobRegistrationStored event found at block ${event.block.block.header.number.toString()}`
  );

  // Get data from the event
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [jobRegistrationCodec, jobIdCodec],
    },
  } = event;

  const jobId = await codecToJobId(jobIdCodec);
  const id = jobIdToString(jobId);
  const account = await getOrCreateMultiOrigin(jobId[0]);

  const data = jobRegistrationCodec as any;
  const blockNumber: number = event.block.block.header.number.toNumber();

  let job = await Job.get(id);
  if (job) {
    return;
  }
  let plannedExecutions: PlannedExecution[] = [];
  const { assignmentStrategy, instantMatch } = codecToAssignmentStrategy(
    data.extra.requirements.assignmentStrategy
  );
  job = Job.create({
    id,
    origin: jobId[0].origin,
    originKind: jobId[0].originKind,
    originAccountId: account.id,
    jobIdSeq: jobId[1],

    script: data.script.toHex(),
    allowedSources: data.allowedSources
      .unwrapOr(undefined)
      ?.map((allowedSource: any) => allowedSource.toString()),
    allowOnlyVerifiedSources: data.allowOnlyVerifiedSources.toJSON(),
    memory: data.memory.toNumber(),
    networkRequests: data.networkRequests.toNumber(),
    storage: data.storage.toNumber(),
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

    status: JobStatus.Open,
  });
  const change = JobStatusChange.create({
    id: `${job.id}-${blockNumber}-${event.idx}`,
    jobId: job.id,
    blockNumber,
    timestamp: event.block.timestamp!,
    status: job.status,
  });
  if (assignmentStrategy == AssignmentStrategy.Single && instantMatch) {
    plannedExecutions = instantMatch.map((plannedExecution) => {
      return PlannedExecution.create({
        id: `${job.id}-${plannedExecution.source}`,
        sourceId: plannedExecution.source,
        startDelay: plannedExecution.startDelay,
        jobId: job.id,
        instant: true,
        blockNumber,
        timestamp: event.block.timestamp!,
      });
    });
  }

  await Promise.all([
    job.save(),
    account.save(),
    change.save(),
    ...plannedExecutions.map((e) => e.save()),
  ]);
}

function codecToAssignmentStrategy(codec: Codec): {
  assignmentStrategy: AssignmentStrategy;
  instantMatch?: PlannedExecutionProps[];
} {
  const data = codec as any;
  if (data.isSingle) {
    return {
      assignmentStrategy: AssignmentStrategy.Single,
      instantMatch: data.asSingle.unwrapOr(undefined)?.map((value: any) => ({
        source: value.source.toString(),
        startDelay: value.startDelay.toBigInt(),
      })),
    };
  } else if (data.isCompeting) {
    return { assignmentStrategy: AssignmentStrategy.Competing };
  }

  throw new Error(
    `unsupported AssignmentStrategy variant: ${codec.toString()}`
  );
}

export type PlannedExecutionProps = {
  source: string;
  startDelay: bigint;
};

export async function handleJobRegistrationRemovedEvent(
  event: SubstrateEvent
): Promise<void> {
  logger.info(
    `JobRegistrationRemoved event found at block ${event.block.block.header.number.toString()}`
  );

  // Get data from the event
  logger.info(JSON.stringify(event));
  const {
    event: {
      data: [jobIdCodec],
    },
  } = event;

  const jobId = await codecToJobId(jobIdCodec);
  const id = jobIdToString(jobId);
  const blockNumber: number = event.block.block.header.number.toNumber();

  let job = await Job.get(id);
  if (job) {
    job.status = JobStatus.Removed;
    const change = JobStatusChange.create({
      id: `${job.id}-${blockNumber}-${event.idx}`,
      jobId: job.id,
      blockNumber,
      timestamp: event.block.timestamp!,
      status: job.status,
    });

    await Promise.all([job.save(), change.save()]);
  } else {
    logger.warn(
      `JobRegistrationRemoved event skipped for ${id} at block ${event.block.block.header.number.toString()}`
    );
  }
}
