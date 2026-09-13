# qBittorrent to InfluxDB 2.x

Collect per-torrent qBittorrent statistics in an InfluxDB 2.x bucket. This is
an InfluxDB 2.x adaptation of
[iBug/pyGadgets](https://github.com/iBug/pyGadgets/blob/master/qbittorrent-influxdb/main.py).

## Configuration

Copy `config.example.json` to `config.json`, then set:

- `qbittorrent.url`: qBittorrent Web UI base URL. The endpoint must be reachable
  from the collector.
- `qbittorrent.username` and `qbittorrent.password`: Web UI credentials. They
  may be omitted when qBittorrent bypasses authentication for the collector.
- `qbittorrent.api_key`: optional API key for qBittorrent 5.2 or later. When
  present, it takes precedence over username/password authentication.
- `influxdb.url`: InfluxDB 2.x server URL.
- `influxdb.token`: API token with write/query/delete access to the bucket.
- `influxdb.org`: organization name or ID.
- `influxdb.bucket`: destination bucket name or ID.

`qbittorrent.timeout` and `qbittorrent.verify_ssl` are optional. Communication
with qBittorrent uses
[`qbittorrent-api`](https://pypi.org/project/qbittorrent-api/), which manages
login sessions and automatically re-authenticates expired sessions.

## Usage

Run a collection:

```shell
uv run main.py collect
```

Remove all stored series whose torrent hash is no longer returned by
qBittorrent:

```shell
uv run main.py gc
```

Both commands read `config.json` next to the script by default. Use
`--config /path/to/config.json` to override it. Run `collect` periodically with
your preferred scheduler.
