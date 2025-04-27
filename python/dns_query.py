#!/usr/bin/env python3

import argparse
from pathlib import Path
import re
import logging
import sys

# Set up logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
formatter = logging.Formatter(
    "%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
stream_handler = logging.StreamHandler(sys.stderr)
stream_handler.setFormatter(formatter)
logger.addHandler(stream_handler)


def query_dns(domain, only_cname=False) -> list:
    """Perform a DNS query for the given domain."""
    import subprocess

    try:
        command = ["dig", "+short", domain]
        if only_cname:
            command.append("CNAME")
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        return result.stdout.strip().splitlines()
    except subprocess.CalledProcessError as e:
        print(f"Error querying DNS for {domain}: {e}")
        return []


def extract_domains_from_file(file_path: Path) -> list:
    """Extract domains from a given file."""
    with open(file_path, "r") as file:
        content = file.readlines()
    return extract_domains_from_list(content)


def extract_domains_from_list(domains: list) -> list:
    """Extract domains from a given list."""
    valid_domains = []
    for domain in domains:
        # only allow domain or http(s)://domain
        if re.match(r"^(https?://)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$", domain):
            logger.debug(f"Valid domain found: {domain}")
            valid_domains.append(re.sub(r"^(https?://)?", "", domain).strip())
        else:
            logger.warning(f"Invalid domain format: {domain}")
    return valid_domains


def query_cname_recursively_and_print(domain: str, indent: int = 1):
    """Recursively query CNAME records and print them. (Recursive function)"""
    if indent > 10:
        logger.warning("Maximum recursion depth reached.")
        return
    results = query_dns(domain, only_cname=True)
    if results:
        # print(" " * indent + f"Results for {domain}:")
        for result in results:
            print(" " * (indent) + f"- {result}")
            # Recursively query the CNAME record
            query_cname_recursively_and_print(result, indent + 1)
    # else:
    #     print(" " * indent + "- []")


def main():
    parser = argparse.ArgumentParser(description="DNS Query Tool")
    parser.add_argument(
        "-f", "--file", type=Path, help="Path to the file containing domains"
    )
    parser.add_argument("-d", "--domain", type=str, help="Single domain to query")
    parser.add_argument(
        "-c", "--only-cname", action="store_true", help="Query only CNAME records"
    )
    parser.add_argument(
        "-r",
        "--recursive",
        action="store_true",
        help="Recursively query gotten subdomains (dedicated for only_cname mode)",
    )
    args = parser.parse_args()

    if args.file:
        domains = extract_domains_from_file(args.file)
    elif args.domain:
        domains = [args.domain]
    else:
        parser.error("Either --file or --domain must be provided.")

    if args.only_cname and args.recursive:
        for domain in domains:
            print(f"Querying CNAME records for {domain}:")
            query_cname_recursively_and_print(domain)
    else:
        for domain in domains:
            print(f"Querying DNS records for {domain}:")
            results = query_dns(domain, only_cname=args.only_cname)
            if results:
                # print("Results:")
                for result in results:
                    print(f" - {result}")
            # else:
            #     print(" - []")


if __name__ == "__main__":
    main()
