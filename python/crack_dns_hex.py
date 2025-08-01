#!/usr/bin/env python3

import argparse


def get_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Crack DNS hex")
    parser.add_argument(
        "hex_string",
        type=str,
        help="The hex string to crack.",
    )
    return parser.parse_args()


def crack_dns_hex_using_scapy(hex_data: bytes) -> None:
    from scapy.all import DNS

    # Parse the packet
    pkt = DNS(hex_data)
    if DNS in pkt:
        print("DNS Packet Summary:")
        print(pkt.summary())
        print("-" * 7)
        print("Query Name:", pkt[DNS].qd.qname.decode("utf-8"))
        print("Transaction ID:", pkt[DNS].id)
        # print("Answer Count:", pkt[DNS].ancount)
        # print("Authority Count:", pkt[DNS].nscount)
        # print("Additional Count:", pkt[DNS].arcount)
    else:
        print("Not a valid DNS packet.")


def crack_dns_hex_by_hand(hex_data: bytes) -> None:
    # This function is a placeholder for manual parsing of DNS hex data.
    # Implementing this function would require detailed knowledge of the DNS protocol.
    print("Manual parsing of DNS hex data is not implemented yet.")
    print("Hex data:", hex_data.hex())
    # Further processing can be added here as needed.
    ...


def main() -> None:
    args = get_args()
    hex_string = args.hex_string
    hex_data = bytes.fromhex(hex_string)
    try:
        from scapy.all import DNS

        crack_dns_hex_using_scapy(hex_data)
    except ImportError:
        print("Scapy is not installed. Falling back to manual parsing.")
        crack_dns_hex_by_hand(hex_data)


if __name__ == "__main__":
    main()
