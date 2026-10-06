"""
Minimal HTTP CONNECT proxy that sends all outgoing connections over IPv6.

The Ad Library scraper runs in a Docker network without IPv6, so its traffic
leaves from the server's single IPv4 address. Pointing the scraper's browser at
this proxy (SCRAPER_PROXY_URL) makes it use the server's IPv6 address instead.

Listens only on the address given by LISTEN_HOST (the Docker bridge), never on
a public interface. HTTPS only (CONNECT); nothing is decrypted or logged.
"""

import asyncio
import os
import socket

LISTEN_HOST = os.getenv("LISTEN_HOST", "172.22.0.1")
LISTEN_PORT = int(os.getenv("LISTEN_PORT", "8899"))
SOURCE_ADDR = os.getenv("SOURCE_ADDR", "")  # optional IPv6 source address


async def pipe(reader, writer):
    try:
        while data := await reader.read(65536):
            writer.write(data)
            await writer.drain()
    except (ConnectionError, asyncio.CancelledError):
        pass
    finally:
        writer.close()


async def handle(client_reader, client_writer):
    try:
        request = await asyncio.wait_for(client_reader.readuntil(b"\r\n\r\n"), timeout=15)
        method, target, _ = request.split(b"\r\n", 1)[0].decode().split(" ", 2)
        if method != "CONNECT":
            client_writer.write(b"HTTP/1.1 405 Method Not Allowed\r\n\r\n")
            return
        host, _, port = target.rpartition(":")
        local = (SOURCE_ADDR, 0) if SOURCE_ADDR else None
        up_reader, up_writer = await asyncio.wait_for(
            asyncio.open_connection(host.strip("[]"), int(port), family=socket.AF_INET6, local_addr=local),
            timeout=15,
        )
    except Exception:
        try:
            client_writer.write(b"HTTP/1.1 502 Bad Gateway\r\n\r\n")
            await client_writer.drain()
        finally:
            client_writer.close()
        return
    client_writer.write(b"HTTP/1.1 200 Connection Established\r\n\r\n")
    await client_writer.drain()
    await asyncio.gather(pipe(client_reader, up_writer), pipe(up_reader, client_writer))


async def main():
    server = await asyncio.start_server(handle, LISTEN_HOST, LISTEN_PORT)
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
