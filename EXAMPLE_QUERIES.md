# Example queries

### Stats over processed events

```graphql
query {
  stats {
    nodes {
      id
      number
    }
  }
}
```

### Heartbeats per block

```graphql
query {
  heartbeats {
    groupedAggregates(groupBy: BLOCK_NUMBER) {
      keys
      distinctCount {
        id
      }
    }
  }
}
```

### Assignments and their fee per execution over time

```graphql
query {
  assignments {
    nodes {
      id
      feePerExecution
      match {
        jobId
        sourceId
      }
      timestamp
      blockNumber
    }
  }
}
```

### L2-jobs

```graphql
query {
  jobs(filter: {originVariant: {notEqualTo: Acurast}}) {
    nodes {
      id
      duration
      status
      script
      originVariant
    }
  }
}
```

### Specific job with instantMatch and its matched processor's heartbeats with build_number

```graphql
query {
  job(id: "Acurast#1202") {
      id
      status
      matches {
        nodes {
          id
          source {
            id
            heartbeats {
              nodes {
                blockNumber
                buildNumber
              }
            }
          }
        }
      }
  }
}
```

### Filter finalized jobs

```graphql
query  {
  jobs(filter: {matchesExist:true, matches: {every: {assignmentsExist:true, assignments: {every: {finalizationsExist: true}}}}}) {
    nodes {
      id
      status
      statusChanges {
        nodes {
          status
          blockNumber
        }
      }
      matches {
        nodes {
          assignments {
            nodes {
              id
              pubKeys
              finalizations {
                nodes {
                  id
                  blockNumber
                }
              }
            }
          }
        }
      }
    }
  }
}
```
