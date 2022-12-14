# metric-tracker
A fork of 0xTracker component to specialise of Metric related trades only

# Deployment

set up elasticsearch vm conf: 
```shell
sysctl -w vm.max_map_count=262144
```

and persist it for next runs 

```shell
echo "vm.max_map_count=262144" >> /etc/sysctl.conf
```

init env configs for 0xTracker processes
```shell
cp 0x-tracker-api/.env.example 0x-tracker-api/.env
cp 0x-tracker-worker/.env.example 0x-tracker-worker/.env
cp 0x-event-extractor/.env.example 0x-event-extractor/.env
```

then run 
```shell
docker-compose up -d
```

In order to serve the API over https you need to setup a certificate using `certbot`. 
Follow this [tutorial](https://www.vultr.com/docs/setup-letsencrypt-on-linux) to set it up
and then redirect the domain url to the local port `3001`.

This is done by adding the following into the nginx config under `/etc/nginx/sites-enabled/default`:

```shell
        location / {
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $remote_addr;
                proxy_pass  http://127.0.0.1:3001/;
        }
```

finally, the http ports need to be opened on the host firewall
```shell
ufw allow http
ufw allow https
```

## Troubleshooting 

Sometime some fills maybe missing. A straightforward way to regenerate them is by removing the `fillCreated` tag
from the events as the following:

`db.events.updateMany({ fillCreated: { $in: [false, null] }, scheduler: { $ne: null } } , [ {$unset: "scheduler" } ] );`

the filter part can be adapted to match a specific transaction using `transactionHash` attribute