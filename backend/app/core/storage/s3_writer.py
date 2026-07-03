"""
MinIO/S3 storage helper — uploads screenshot bytes and returns a public URL.

Environment variables:
  MINIO_ENDPOINT    — e.g. minio:9000 (Docker) or localhost:9000 (dev)
  MINIO_ACCESS_KEY  — root user
  MINIO_SECRET_KEY  — root password
  MINIO_BUCKET      — bucket name (created on first upload if missing)
  MINIO_PUBLIC_URL  — browser-reachable base URL (e.g. http://31.97.110.197:9000)
"""

import logging
import os
from io import BytesIO

from minio import Minio
from minio.error import S3Error

logger = logging.getLogger(__name__)

# Config from env (with sensible defaults for local dev)
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "ad-screenshots")
MINIO_PUBLIC_URL = os.getenv("MINIO_PUBLIC_URL", "http://localhost:9000")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"

# Lazy-initialized client
_client: Minio | None = None


def _get_client() -> Minio:
    """Get or create the MinIO client (thread-safe singleton)."""
    global _client
    if _client is None:
        _client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=MINIO_SECURE,
        )
    return _client


def _ensure_bucket():
    """Create the bucket if it doesn't exist."""
    client = _get_client()
    try:
        if not client.bucket_exists(MINIO_BUCKET):
            client.make_bucket(MINIO_BUCKET)
            logger.info(f"[minio] Created bucket: {MINIO_BUCKET}")
    except S3Error as e:
        logger.warning(f"[minio] Bucket check failed: {e}")


async def upload_bytes(data: bytes, key: str, content_type: str = "image/png") -> str:
    """
    Upload bytes to MinIO and return the public URL.

    Args:
        data: Raw file bytes (e.g. screenshot PNG)
        key: Object key / path in bucket (e.g. "ad_library/brand/timestamp_ad_001.png")
        content_type: MIME type

    Returns:
        Public URL to the uploaded object
    """
    client = _get_client()
    _ensure_bucket()

    stream = BytesIO(data)
    length = len(data)

    try:
        client.put_object(
            MINIO_BUCKET,
            key,
            stream,
            length=length,
            content_type=content_type,
        )
    except S3Error as e:
        logger.error(f"[minio] Upload failed for {key}: {e}")
        raise

    # Build public URL
    # Replace internal Docker hostname with public URL
    url = f"{MINIO_PUBLIC_URL}/{MINIO_BUCKET}/{key}"
    return url
