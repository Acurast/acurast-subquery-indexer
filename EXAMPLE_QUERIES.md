# Example queries

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