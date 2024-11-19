## Connect volume to temporary pod with same image

**Connect shell to failed postgres pod:**

```
kubectl --context acurast-prod -n acurast-indexer run temp-postgres --rm -it --image=postgres:16-alpine --overrides='
{
  "apiVersion": "v1",
  "kind": "Pod",
  "spec": {
    "containers": [
      {
        "name": "temp-postgres",
        "image": "postgres:16-alpine",
        "command": ["sleep", "infinity"],
        "volumeMounts": [
          {
            "name": "postgres-pv",
            "mountPath": "/var/lib/postgresql/data",
            "subPath": "pg_data"
          }
        ]
      }
    ],
    "volumes": [
      {
        "name": "postgres-pv",
        "persistentVolumeClaim": {
          "claimName": "postgres-pv-claim"
        }
      }
    ]
  }
}' -- /bin/bash
```

### Recover from corrupted state

```sh
su postgres
pg_resetwal $PGDATA
```