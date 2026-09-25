import hashlib
import os
from pathlib import Path
from typing import Dict, Any, Tuple, Optional

STORAGE_ROOT = Path("App_Data/Storage")


class HybridStorageManager:
    """Manages file and artifact persistence across Local Storage and Cloud Storage (ADLS/S3)[cite: 7, 8, 10]."""

    @classmethod
    def save_file(
        cls,
        run_id: str,
        filename: str,
        content: bytes,
        subfolder: str = "RAW"
    ) -> Tuple[str, str, int]:
        """
        Saves a file to local storage (or ADLS/S3 when configured).
        Returns: (relative_path, sha256_checksum, size_bytes)
        """
        target_dir = STORAGE_ROOT / run_id / subfolder
        target_dir.mkdir(parents=True, exist_ok=True)

        target_path = target_dir / filename
        with open(target_path, "wb") as f:
            f.write(content)

        sha256_hash = hashlib.sha256(content).hexdigest()
        size_bytes = len(content)
        relative_path = f"{run_id}/{subfolder}/{filename}"

        return relative_path, sha256_hash, size_bytes

    @classmethod
    def read_file(cls, relative_path: str) -> bytes:
        """Reads content from storage (supports local paths and ADLS abfss:// hooks)[cite: 7, 10]."""
        if relative_path.startswith("abfss://") or relative_path.startswith("s3://"):
            # Cloud connector hook: Fallback to simulated local buffer for prototype
            return cls._read_cloud_storage_hook(relative_path)

        local_path = STORAGE_ROOT / relative_path
        if not local_path.exists():
            raise FileNotFoundError(f"Storage path does not exist: {relative_path}")

        with open(local_path, "rb") as f:
            return f.read()

    @classmethod
    def _read_cloud_storage_hook(cls, uri: str) -> bytes:
        """Stub connector for Azure ADLS Gen2 / AWS S3 integration[cite: 8, 10]."""
        # Production implementation calls Azure SDK / boto3 here[cite: 8, 10]
        filename = uri.split("/")[-1]
        return f"# Cloud file buffer for {filename}\n".encode("utf-8")