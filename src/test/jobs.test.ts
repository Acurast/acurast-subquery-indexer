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

subqlTest(
  "handleJobRegistrationAssignedEvent", // Test name
  3155263, // Block height to test at
  [], // Dependent entities
  [], // Expected entities
  "handleJobRegistrationAssignedEvent" // handler name
);

subqlTest(
  "handleJobFinalizedEvent", // Test name
  3155346, // Block height to test at
  [], // Dependent entities
  [], // Expected entities
  "handleJobFinalizedEvent" // handler name
);

subqlTest(
  "handleReportedEvent", // Test name
  3155278, // Block height to test at
  [], // Dependent entities
  [], // Expected entities
  "handleReportedEvent" // handler name
);
