import {
  SubstrateDatasourceKind,
  SubstrateHandlerKind,
  SubstrateProject,
} from "@subql/types";

import * as dotenv from "dotenv";
import path from "path";

const mode = process.env.NODE_ENV || "production";

// Load the appropriate .env file
const dotenvPath = path.resolve(
  __dirname,
  `.env${mode !== "production" ? `.${mode}` : ""}`
);
dotenv.config({ path: dotenvPath });

// Can expand the Datasource processor types via the genreic param
const project: SubstrateProject = {
  specVersion: "1.0.0",
  version: "0.0.1",
  name: "acurast-canary-starter",
  description: "Acurast Indexer powered by Subquery",
  runner: {
    node: {
      name: "@subql/node",
      version: ">=3.0.1",
    },
    query: {
      name: "@subql/query",
      version: "*",
    },
  },
  schema: {
    file: "./schema.graphql",
  },
  network: {
    /* The genesis hash of the network (hash of block 0) */
    chainId: process.env.CHAIN_ID!,
    /**
     * These endpoint(s) should be public non-pruned archive node
     * We recommend providing more than one endpoint for improved reliability, performance, and uptime
     * Public nodes may be rate limited, which can affect indexing speed
     * When developing your project we suggest getting a private API key
     * If you use a rate limited endpoint, adjust the --batch-size and --workers parameters
     * These settings can be found in your docker-compose.yaml, they will slow indexing but prevent your project being rate limited
     */
    endpoint: process.env.ENDPOINT!?.split(",") as string[] | string,
    dictionary: "https://api.subquery.network/sq/subquery/dictionary-polkadot",
  },
  dataSources: [
    {
      kind: SubstrateDatasourceKind.Runtime,
      startBlock: 1872996,
      mapping: {
        file: "./dist/index.js",
        handlers: [
          /*{
            kind: SubstrateHandlerKind.Block,
            handler: "handleBlock",
            filter: {
              modulo: 100,
            },
          },*/
          /*{
            kind: SubstrateHandlerKind.Call,
            handler: "handleCall",
            filter: {
              module: "balances",
            },
          },*/
          {
            kind: SubstrateHandlerKind.Event,
            handler: "handleTransferEvent",
            filter: {
              module: "balances",
              method: "Transfer",
            },
          },
          {
            kind: SubstrateHandlerKind.Event,
            handler: "handleJobRegistrationStoredEvent",
            filter: {
              module: "acurast",
              method: "JobRegistrationStored",
            },
          },
          {
            kind: SubstrateHandlerKind.Event,
            handler: "handleAllowedSourcesUpdatedEvent",
            filter: {
              module: "acurast",
              method: "AllowedSourcesUpdated",
            },
          },
          {
            kind: SubstrateHandlerKind.Event,
            handler: "handleJobRegistrationRemovedEvent",
            filter: {
              module: "acurast",
              method: "JobRegistrationRemoved",
            },
          },
          {
            kind: SubstrateHandlerKind.Event,
            handler: "handleAttestationStoredEvent",
            filter: {
              module: "acurast",
              method: "AttestationStored",
            },
          },
          {
            kind: SubstrateHandlerKind.Event,
            handler: "handleAdvertisementStoredEvent",
            filter: {
              module: "acurastMarketplace",
              method: "AdvertisementStored",
            },
          },
          {
            kind: SubstrateHandlerKind.Event,
            handler: "handleAdvertisementRemovedEvent",
            filter: {
              module: "acurastMarketplace",
              method: "handleAdvertisementRemovedEvent",
            },
          },
          {
            kind: SubstrateHandlerKind.Event,
            handler: "handleMatchedEvents",
            filter: {
              module: "acurastMarketplace",
              method: "JobRegistrationMatched",
            },
          },
          {
            kind: SubstrateHandlerKind.Event,
            handler: "handleMatchedEvents",
            filter: {
              module: "acurastMarketplace",
              method: "JobExecutionMatched",
            },
          },
          {
            kind: SubstrateHandlerKind.Event,
            handler: "handleJobRegistrationAssignedEvent",
            filter: {
              module: "acurastMarketplace",
              method: "JobRegistrationAssigned",
            },
          },
          {
            kind: SubstrateHandlerKind.Event,
            handler: "handleReportedEvent",
            filter: {
              module: "acurastMarketplace",
              method: "Reported",
            },
          },
          // this events are currently not processed since we derive execution result from extrinsic actual parameters upon a `acurastMarketplace.Reported` event
          //   {
          //     kind: SubstrateHandlerKind.Event,
          //     handler: "handleExecutionSuccessEvent",
          //     filter: {
          //       module: "acurastMarketplace",
          //       method: "ExecutionSuccess",
          //     },
          //   },
          //   {
          //     kind: SubstrateHandlerKind.Event,
          //     handler: "handleExecutionFailureEvent",
          //     filter: {
          //       module: "acurastMarketplace",
          //       method: "ExecutionFailure",
          //     },
          //   },
          {
            kind: SubstrateHandlerKind.Event,
            handler: "handleJobFinalizedEvent",
            filter: {
              module: "acurastMarketplace",
              method: "JobFinalized",
            },
          },
          {
            kind: SubstrateHandlerKind.Event,
            handler: "handleProcessorAdvertisementEvent",
            filter: {
              module: "acurastProcessorManager",
              method: "ProcessorAdvertisement",
            },
          },
          {
            kind: SubstrateHandlerKind.Event,
            handler: "handleProcessorHeartbeatWithVersionEvent",
            filter: {
              module: "acurastProcessorManager",
              method: "ProcessorHeartbeatWithVersion",
            },
          },
          {
            kind: SubstrateHandlerKind.Event,
            handler: "handleManagerCreatedEvent",
            filter: {
              module: "acurastProcessorManager",
              method: "ManagerCreated",
            },
          },
          {
            kind: SubstrateHandlerKind.Event,
            handler: "handleProcessorPairedEvent",
            filter: {
              module: "acurastProcessorManager",
              method: "ProcessorPaired",
            },
          },
          {
            kind: SubstrateHandlerKind.Event,
            handler: "handleProcessorPairingsUpdatedEvent",
            filter: {
              module: "acurastProcessorManager",
              method: "ProcessorPairingsUpdated",
            },
          },
        ],
      },
    },
  ],
};

// Must set default to the project instance
export default project;
