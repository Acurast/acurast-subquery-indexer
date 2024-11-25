# Example queries

## Graphql

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

### Matches where there are also assignments for same job

```graphql
query {
  assignments {
    nodes {
      id
      feePerExecution
      job {
        jobDataByJobIdId {
          nodes {
            startTime
            endTime
          }
        }
        matches {
          nodes {
            id
          }
        }
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
  jobs(filter: {multiOrigin: {originVariant: {notEqualTo: Acurast}}}) {
    nodes {
      id
    }
  }
}
```

### Specific job with instantMatch and its matched processor's heartbeats with build_number

```graphql
query {
  jobs(filter: {matches: {some: {instant: {equalTo: true}}}}) {
    nodes {
      id
      matches {
        nodes {
          id
          instant
          processor {
            id
            heartbeats(last: 1) {
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
}
```

## Postgres SQL

### Heartbeats per day over given time period
```sql
WITH date_range AS (
    SELECT generate_series(
        DATE '2024-11-01', 
        DATE '2024-11-20', 
        '1 day'::interval
    ) AS day
)
SELECT 
    dr.day as "time",
    COUNT(DISTINCT h.processor_id) AS heartbeating_processor_count
FROM 
    date_range dr
LEFT JOIN 
    heartbeats h
ON 
    dr.day BETWEEN DATE_TRUNC('day', h.timestamp) AND DATE_TRUNC('day', h.latest_timestamp)
GROUP BY 
    dr.day
HAVING 
    COUNT(DISTINCT h.processor_id) > 0
ORDER BY 
    dr.day;
```

**HINT**: the filtering for specific range of days is usefule for grafana timeseries graphs; E.g. this is how to filter by dynamic range of currently displayed timespan:

```sql
WITH date_range AS (
    SELECT generate_series(
        DATE '${__from:date:YYYY-MM-DD}', 
        DATE '${__to:date:YYYY-MM-DD}', 
        '1 day'::interval
    ) AS day
)
```