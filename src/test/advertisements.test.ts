import { subqlTest } from "@subql/testing";

// See https://academy.subquery.network/build/testing.html

subqlTest(
  "handleAdvertisementStoredEvent test", // Test name
  3148993, // Block height to test at
  [], // Dependent entities
  [], // Expected entities
  "handleAdvertisementStoredEvent" // handler name
);

subqlTest(
  "handleProcessorHeartbeatWithVersionEvent test", // Test name
  3149416, // Block height to test at
  [], // Dependent entities
  [], // Expected entities
  "handleProcessorHeartbeatWithVersionEvent" // handler name
);
