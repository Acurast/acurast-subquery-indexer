import { Codec } from "@polkadot/types-codec/types";
import { SubstrateEvent } from "@subql/types";
import {
  Account,
  AssignmentStrategy,
  Job,
  JobAllowsSource,
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

  const allowedSources: JobAllowsSource[] = [];
  const sources: Account[] = [];
  if (data.allowedSources.isSome) {
    for (const allowedSource of data.allowedSources.unwrap()) {
      const sourceAddress = allowedSource.toString();
      const sourceAccount = await getOrCreateAccount(sourceAddress);
      const id = `${job.id}-${sourceAddress}`;
      // the runtime makes sure we do not save duplicates but still returns all updates (with potential duplicates) so we check for existence
      if (!(await JobAllowsSource.get(id))) {
        allowedSources.push(
          JobAllowsSource.create({
            id: `${job.id}-${sourceAddress}`,
            jobId: job.id,
            sourceId: sourceAccount.id,
          })
        );
        sources.push(sourceAccount);
      }
    }
  }
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
    ...sources.map((s) => s.save()),
    ...allowedSources.map((s) => s.save()),
  ]);
}

export async function handleAllowedSourcesUpdatedEvent(
  event: SubstrateEvent
): Promise<void> {
  logger.info(
    `handleAllowedSourcesUpdatedEvent event found at block ${event.block.block.header.number.toString()}`
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

  const allowedSources: JobAllowsSource[] = [];
  const sources: Account[] = [];
  await data.allowedSources
    .unwrapOr(undefined)
    ?.map(async (allowedSource: any) => {
      const sourceAddress = allowedSource.toString();
      const sourceAccount = await getOrCreateAccount(sourceAddress);
      const id = `${job.id}-${sourceAddress}`;
      // the runtime makes sure we do not save duplicates but still returns all updates (with potential duplicates) so we check for existence
      if (!(await JobAllowsSource.get(id))) {
        allowedSources.push(
          JobAllowsSource.create({
            id: `${job.id}-${sourceAddress}`,
            jobId: job.id,
            sourceId: sourceAccount.id,
          })
        );
        sources.push(sourceAccount);
      }
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
    ...sources.map((s) => s.save()),
    ...allowedSources.map((s) => s.save()),
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
