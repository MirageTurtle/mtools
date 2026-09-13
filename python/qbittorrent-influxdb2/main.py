# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "influxdb-client>=1.50.0",
#     "qbittorrent-api>=2026.8.1",
# ]
# ///

"""Collect qBittorrent transfer statistics in an InfluxDB 2.x bucket."""

from __future__ import annotations

import argparse
import json
from collections.abc import Iterable, Mapping
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import qbittorrentapi
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS

MEASUREMENT = "qbittorrent"
EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)
DEFAULT_CONFIG = Path(__file__).with_name("config.json")


def load_config(path: Path) -> dict[str, Any]:
    """Load and minimally validate the collector configuration."""
    with path.open(encoding="utf-8") as config_file:
        config = json.load(config_file)

    for section in ("qbittorrent", "influxdb"):
        if not isinstance(config.get(section), dict):
            raise TypeError(f"Missing or invalid {section!r} configuration section")

    for key in ("url",):
        if not config["qbittorrent"].get(key):
            raise ValueError(f"Missing qbittorrent.{key}")

    for key in ("url", "token", "org", "bucket"):
        if not config["influxdb"].get(key):
            raise ValueError(f"Missing influxdb.{key}")

    return config


def make_qbittorrent_client(
    qbittorrent_config: Mapping[str, Any],
) -> qbittorrentapi.Client:
    """Create an authenticated qBittorrent Web API client."""
    return qbittorrentapi.Client(
        host=str(qbittorrent_config["url"]),
        username=qbittorrent_config.get("username"),
        password=qbittorrent_config.get("password"),
        api_key=qbittorrent_config.get("api_key"),
        VERIFY_WEBUI_CERTIFICATE=qbittorrent_config.get("verify_ssl", True),
        FORCE_SCHEME_FROM_HOST=True,
        REQUESTS_ARGS={"timeout": qbittorrent_config.get("timeout", 30)},
        SIMPLE_RESPONSES=True,
    )


def get_data(
    qbittorrent_client: qbittorrentapi.Client,
) -> tuple[list[dict[str, Any]], datetime]:
    """Fetch the torrent list through the authenticated Web API client."""
    data = qbittorrent_client.torrents_info()
    if not isinstance(data, list):
        raise TypeError("qBittorrent returned a non-list response")
    return data, datetime.now(timezone.utc)


def make_points(data: Iterable[Mapping[str, Any]], collected_at: datetime) -> list[Point]:
    """Convert qBittorrent API records to InfluxDB points."""
    timestamp = int(collected_at.timestamp())
    points: list[Point] = []

    for item in data:
        point = (
            Point(MEASUREMENT)
            .tag("name", str(item["name"]))
            .tag("hash", str(item["hash"]))
            .tag("category", str(item.get("category", "")))
            .field("added_on", timestamp - int(item["added_on"]))
            .field("size", int(item["size"]))
            .field("last_activity", timestamp - int(item["last_activity"]))
            .field("seen_complete", timestamp - int(item["seen_complete"]))
            .field("ratio", float(item["ratio"]))
            .field("downloaded", int(item["downloaded"]))
            .field("uploaded", int(item["uploaded"]))
            .time(collected_at, WritePrecision.S)
        )
        points.append(point)

    return points


def upload_points(client: InfluxDBClient, bucket: str, points: list[Point]) -> None:
    """Synchronously write one collection batch."""
    if not points:
        return
    with client.write_api(write_options=SYNCHRONOUS) as write_api:
        write_api.write(bucket=bucket, record=points)


def collect(
    client: InfluxDBClient,
    bucket: str,
    qbittorrent_client: qbittorrentapi.Client,
) -> None:
    data, collected_at = get_data(qbittorrent_client)
    upload_points(client, bucket, make_points(data, collected_at))


def stored_hashes(client: InfluxDBClient, bucket: str, org: str) -> set[str]:
    """Return all hash tag values stored for this measurement."""
    query = f'''
import "influxdata/influxdb/schema"

schema.tagValues(
    bucket: _bucket,
    tag: "hash",
    predicate: (r) => r._measurement == "{MEASUREMENT}",
    start: 0,
)
'''
    tables = client.query_api().query(
        query=query,
        org=org,
        params={"_bucket": bucket},
    )
    return {
        str(record.get_value())
        for table in tables
        for record in table.records
        if record.get_value() is not None
    }


def delete_predicate(torrent_hash: str) -> str:
    """Build an escaped InfluxDB delete predicate for one torrent hash."""
    return (
        f'_measurement={json.dumps(MEASUREMENT)} '
        f'AND hash={json.dumps(torrent_hash)}'
    )


def gc(
    client: InfluxDBClient,
    bucket: str,
    org: str,
    qbittorrent_client: qbittorrentapi.Client,
) -> None:
    """Delete series belonging to torrents no longer in qBittorrent."""
    data, collected_at = get_data(qbittorrent_client)
    active_hashes = {str(item["hash"]) for item in data}
    stale_hashes = stored_hashes(client, bucket, org) - active_hashes
    delete_api = client.delete_api()
    stop = datetime.now(timezone.utc) + timedelta(seconds=1)

    for torrent_hash in sorted(stale_hashes):
        print(f"[{collected_at:%Y-%m-%d %H:%M:%S}] Removing {torrent_hash}")
        delete_api.delete(
            start=EPOCH,
            stop=stop,
            predicate=delete_predicate(torrent_hash),
            bucket=bucket,
            org=org,
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Collect qBittorrent statistics in InfluxDB 2.x",
    )
    parser.add_argument(
        "action",
        choices=("collect", "gc"),
        nargs="?",
        default="collect",
        help="collect metrics (default) or delete series for removed torrents",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=DEFAULT_CONFIG,
        help=f"configuration file (default: {DEFAULT_CONFIG})",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = load_config(args.config)
    influxdb_config = dict(config["influxdb"])
    bucket = influxdb_config.pop("bucket")
    org = influxdb_config["org"]
    qbittorrent_client = make_qbittorrent_client(config["qbittorrent"])

    with InfluxDBClient(**influxdb_config) as client:
        if args.action == "collect":
            collect(client, bucket, qbittorrent_client)
        else:
            gc(client, bucket, org, qbittorrent_client)


if __name__ == "__main__":
    main()
