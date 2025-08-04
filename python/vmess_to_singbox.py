#!/usr/bin/env python3

import argparse
import base64
import json
import sys
from pathlib import Path
from typing import Dict, Any


def get_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert vmess:// URL to sing-box format JSON"
    )
    parser.add_argument(
        "vmess_url", type=str, help="The vmess:// URL string to convert"
    )
    parser.add_argument(
        "-o", "--output", type=Path, help="Output file path (default: stdout)"
    )
    parser.add_argument(
        "-p", "--pretty", action="store_true", help="Pretty print JSON output"
    )
    parser.add_argument(
        "-t",
        "--tag",
        type=str,
        default="vmess-proxy",
        help="Tag name for the proxy (default: vmess-proxy)",
    )
    return parser.parse_args()


def decode_vmess_url(vmess_url: str) -> Dict[str, Any]:
    """
    Decode vmess:// URL to extract configuration parameters.

    vmess:// URLs are base64 encoded JSON objects.
    """
    if not vmess_url.startswith("vmess://"):
        raise ValueError("Invalid vmess URL: must start with 'vmess://'")

    # Remove vmess:// prefix and decode base64
    encoded_data = vmess_url[8:]
    try:
        decoded_bytes = base64.b64decode(encoded_data)
        decoded_str = decoded_bytes.decode("utf-8")
        vmess_config = json.loads(decoded_str)
    except Exception as e:
        raise ValueError(f"Failed to decode vmess URL: {e}")

    return vmess_config


def vmess_to_singbox(
    vmess_config: Dict[str, Any], tag: str = "vmess-proxy"
) -> Dict[str, Any]:
    """
    Convert vmess configuration to sing-box outbound format.
    """
    # Extract vmess parameters
    server = vmess_config.get("add", "")
    port = int(vmess_config.get("port", 443))
    uuid = vmess_config.get("id", "")
    alter_id = int(vmess_config.get("aid", 0))
    security = vmess_config.get("scy", "auto")
    network = vmess_config.get("net", "tcp")
    tls = vmess_config.get("tls", "")
    host = vmess_config.get("host", "")
    path = vmess_config.get("path", "")
    sni = vmess_config.get("sni", "")
    alpn = vmess_config.get("alpn", "")

    # Build sing-box outbound configuration
    outbound = {
        "type": "vmess",
        "tag": tag,
        "server": server,
        "server_port": port,
        "uuid": uuid,
        "security": security,
        "alter_id": alter_id,
    }

    # Add transport configuration based on network type
    transport = {}

    if network == "ws":
        transport = {
            "type": "ws",
            "path": path if path else "/",
        }
        if host:
            transport["headers"] = {"Host": host}
    elif network == "h2" or network == "http":
        transport = {
            "type": "http",
            "path": path if path else "/",
        }
        if host:
            transport["host"] = [host]
    elif network == "grpc":
        transport = {"type": "grpc", "service_name": path if path else ""}
    elif network == "quic":
        transport = {"type": "quic"}
        if host:
            transport["host"] = host

    if transport:
        outbound["transport"] = transport

    # Add TLS configuration
    if tls == "tls":
        tls_config = {"enabled": True, "insecure": False}
        if sni:
            tls_config["server_name"] = sni
        elif host:
            tls_config["server_name"] = host

        if alpn:
            tls_config["alpn"] = alpn.split(",") if "," in alpn else [alpn]

        outbound["tls"] = tls_config

    return outbound


def main() -> None:
    args = get_args()

    try:
        # Decode vmess URL
        vmess_config = decode_vmess_url(args.vmess_url)

        # Convert to sing-box format
        singbox_outbound = vmess_to_singbox(vmess_config, args.tag)

        # Format JSON output
        if args.pretty:
            json_output = json.dumps(singbox_outbound, indent=2, ensure_ascii=False)
        else:
            json_output = json.dumps(singbox_outbound, ensure_ascii=False)

        # Output result
        if args.output:
            with args.output.open("w", encoding="utf-8") as f:
                f.write(json_output)
            print(f"Output written to: {args.output}")
        else:
            print(json_output)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
