#!/usr/bin/env python

import ipaddress
import argparse


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Check if an IP address is in a given network."
    )
    parser.add_argument("ip", type=str, help="IP address to check")
    parser.add_argument(
        "network", type=str, help="Network in CIDR notation (e.g., 192.168.0.0/24)"
    )

    args = parser.parse_args()
    return args


def check_ip_in_network(ip: str, network: str) -> bool:
    try:
        ip_obj = ipaddress.ip_address(ip)
        network_obj = ipaddress.ip_network(network, strict=False)
        return ip_obj in network_obj
    except ValueError as e:
        print(f"Error: {e}")
        return False


if __name__ == "__main__":
    args = parse_args()
    if check_ip_in_network(args.ip, args.network):
        print(f"{args.ip} is in the network {args.network}.")
    else:
        print(f"{args.ip} is NOT in the network {args.network}.")
