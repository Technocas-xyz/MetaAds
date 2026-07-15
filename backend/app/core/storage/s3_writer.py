"""
MinIO/S3 storage helper — uploads screenshot/image bytes and returns a public URL.

Environment variables:
  MINIO_ENDPOINT    — e.g. minio:9000 (Docker) or localhost:9000 (dev)
  MINIO_ACCESS_KEY  — root user
  MINIO_SECRET_KEY  — root password
  MINIO_BUCKET      — bucket name (created on first upload if missing)
  MINIO_PUBLIC_URL  — browser-reachable base URL (e.g. http://31.97.110.197:9000)
  MINIO_SECURE      — "true" for HTTPS, default "false"
"""

import logging
import os
from io import BytesIO
from typing import Optional

import httpx
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
_client: Optional[Minio] = None
_bucket_ready: bool = False


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
    """Create the bucket if it doesn't exist and set public-read policy."""
    global _bucket_ready
    if _bucket_ready:
        return

    client = _get_client()
    try:
        if not client.bucket_exists(MINIO_BUCKET):
            client.make_bucket(MINIO_BUCKET)
            logger.info(f"[minio] Created bucket: {MINIO_BUCKET}")

        # Set bucket policy to public-read so images are accessible from browser
        import json
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "PublicRead",
                    "Effect": "Allow",
                    "Principal": {"AWS": "*"},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{MINIO_BUCKET}/*"],
                }
            ],
        }
        client.set_bucket_policy(MINIO_BUCKET, json.dumps(policy))
        _bucket_ready = True
        logger.info(f"[minio] Bucket '{MINIO_BUCKET}' ready with public-read policy")
    except S3Error as e:
        logger.warning(f"[minio] Bucket setup issue: {e}")
        _bucket_ready = True  # Don't retry on every call


async def upload_bytes(data: bytes, key: str, content_type: str = "image/png") -> str:
    """
    Upload bytes to MinIO and return the public URL.

    Args:
        data: Raw file bytes (e.g. screenshot PNG, JPEG image)
        key: Object key / path in bucket (e.g. "ad-creatives/brand/ad_001.jpg")
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
    url = f"{MINIO_PUBLIC_URL}/{MINIO_BUCKET}/{key}"
    return url


def upload_bytes_sync(data: bytes, key: str, content_type: str = "image/png") -> str:
    """Synchronous version of upload_bytes for use in scraper subprocess."""
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

    url = f"{MINIO_PUBLIC_URL}/{MINIO_BUCKET}/{key}"
    return url


async def download_and_store_image(
    image_url: str,
    key: str,
    timeout: float = 15.0,
) -> Optional[str]:
    """
    Download an image from a URL and upload to MinIO.

    Args:
        image_url: The source URL (e.g. Meta CDN scontent URL)
        key: Storage key in MinIO (e.g. "ad-creatives/{comp_id}/{ad_lib_id}.jpg")
        timeout: HTTP download timeout in seconds

    Returns:
        The stable MinIO public URL, or None if download/upload failed.
    """
    if not image_url:
        return None

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=timeout, verify=False) as http:
            resp = await http.get(image_url)
            if resp.status_code != 200:
                logger.debug(f"[minio] Download failed ({resp.status_code}): {image_url[:80]}")
                return None

            data = resp.content
            if len(data) < 500:
                # Too small — likely an error page, not an image
                return None

            # Detect content type
            ct = resp.headers.get("content-type", "image/jpeg")
            if "png" in ct:
                content_type = "image/png"
            elif "webp" in ct:
                content_type = "image/webp"
            elif "gif" in ct:
                content_type = "image/gif"
            else:
                content_type = "image/jpeg"

            return await upload_bytes(data, key, content_type)

    except Exception as e:
        logger.debug(f"[minio] Download+store failed for {image_url[:60]}: {e}")
        return None


def download_and_store_image_sync(
    image_url: str,
    key: str,
    timeout: float = 15.0,
) -> Optional[str]:
    """
    Synchronous version — downloads image and uploads to MinIO.
    For use in the scraper subprocess (sync Playwright context).
    """
    if not image_url:
        return None

    try:
        import httpx as _httpx
        with _httpx.Client(follow_redirects=True, timeout=timeout, verify=False) as http:
            resp = http.get(image_url)
            if resp.status_code != 200:
                return None

            data = resp.content
            if len(data) < 500:
                return None

            ct = resp.headers.get("content-type", "image/jpeg")
            if "png" in ct:
                content_type = "image/png"
            elif "webp" in ct:
                content_type = "image/webp"
            elif "gif" in ct:
                content_type = "image/gif"
            else:
                content_type = "image/jpeg"

            return upload_bytes_sync(data, key, content_type)

    except Exception as e:
        logger.debug(f"[minio] Sync download+store failed for {image_url[:60]}: {e}")
        return None
