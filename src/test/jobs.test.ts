import { subqlTest } from "@subql/testing";

// See https://academy.subquery.network/build/testing.html

subqlTest(
  "handleJobRegistrationStoredEvent test", // Test name
  3149916, // Block height to test at
  [], // Dependent entities
  [], // Expected entities
  "handleJobRegistrationStoredEvent" // handler name
);

subqlTest(
  "handleJobRegistrationStoredEvent with allowedSources test", // Test name
  3155257, // Block height to test at
  [], // Dependent entities
  [], // Expected entities
  "handleJobRegistrationStoredEvent" // handler name
);
