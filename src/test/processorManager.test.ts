import { subqlTest } from "@subql/testing";

// See https://academy.subquery.network/build/testing.html

subqlTest(
  "handleProcessorPairingsUpdatedEvent test", // Test name
  1918139, // Block height to test at
  [], // Dependent entities
  [], // Expected entities
  "handleProcessorPairingsUpdatedEvent", // handler name
);
