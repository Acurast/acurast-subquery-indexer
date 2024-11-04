import { subqlTest } from "@subql/testing";

// See https://academy.subquery.network/build/testing.html

subqlTest(
  "handleTransferEvent test", // Test name
  3148644, // Block height to test at
  [], // Dependent entities
  [], // Expected entities
  "handleTransferEvent", // handler name
);
