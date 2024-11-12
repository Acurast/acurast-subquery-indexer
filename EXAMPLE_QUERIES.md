# Example queries

### Stats over processed events

```
query {
  stats {
    nodes {
      id
      number
    }
  }
}
```

### L2-jobs

```graphql
query($filter: JobFilter)  {
  jobs(filter: $filter) {
    nodes {
      id
      duration
      status
      script
      allowedSources
      originKind
      instantMatch {

        nodes {
          id
        }
      }
    }
  }
}

{
  "filter": {"originKind": {"notEqualTo": "Acurast"}}
}
```


## Specific job with instantMatch and those matched processor's heartbeats 

```
query {
  job(id: "Acurast#5322") {
    
      id
      duration
      status
      script
      allowedSources
      originKind
      instantMatch {
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



```
query($jobId: String!)  {
  job(id: $jobId) {
      id
      duration
      status
      script
      allowedSources
      originKind
      matches {
        nodes {
          id
          instant
          blockNumber
        }
      }
  }
}

{
  "jobId": "Acurast#5300"
}
```


## Filter finalized jobs

```
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
