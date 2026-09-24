import hashlib
import os
import logging
from typing import Optional
from django.conf import settings
from .models import FeedbackRecord

logger = logging.getLogger('feedback.services')


def compute_image_sha256(file_path: str) -> str:
    """Computes SHA256 checksum of an image file for deduplication and deterministic partitioning."""
    h = hashlib.sha256()
    try:
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(65536), b''):
                h.update(chunk)
        return h.hexdigest()
    except Exception as e:
        logger.warning("Could not compute SHA256 for %s: %s", file_path, e)
        return ""


def determine_split_by_hash(sha256_hash: str) -> str:
    """
    Deterministic 80 / 10 / 10 split based on SHA256 hash.
    Ensures identical image bytes never cross splits.
    """
    if not sha256_hash:
        return 'unassigned'
    try:
        val = int(sha256_hash[:8], 16) % 100
        if val < 80:
            return 'train'
        elif val < 90:
            return 'val'
        else:
            return 'test'
    except Exception:
        return 'unassigned'


def sync_expert_review_to_feedback(review) -> Optional[FeedbackRecord]:
    """
    Creates or updates a FeedbackRecord ONLY on expert confirm or correct (NOT reject).
    Includes full provenance:
    - scan id, original AI class + confidence
    - expert class, reviewer FK, crop, region
    - image sha256 (dedupe)
    - deterministic 80/10/10 hash-based split
    - is_demo flag marking demo users for exclusion
    """
    # Strict PS requirement: create FeedbackRecord ONLY on confirm / correct
    if review.status not in ['confirmed', 'corrected']:
        logger.info("Skipping feedback creation for review #%s with status %s", review.id, review.status)
        return None

    scan = review.scan
    if not scan:
        return None

    # Construct clean ground truth label (e.g. Tomato___Late_blight)
    if review.is_healthy:
        crop_clean = (review.expert_crop or scan.crop_type or 'Plant').replace(' ', '_')
        gt_label = f"{crop_clean}___healthy"
    else:
        disease_clean = (review.expert_disease or scan.disease_name or 'Disease').replace(' ', '_')
        crop_clean = (review.expert_crop or scan.crop_type or 'Plant').replace(' ', '_')
        gt_label = f"{crop_clean}___{disease_clean}"

    # Compute SHA256 checksum if image exists
    img_path = scan.image.name if scan.image else ''
    sha256_hash = ""
    if scan.image and hasattr(scan.image, 'path') and os.path.exists(scan.image.path):
        sha256_hash = compute_image_sha256(scan.image.path)

    # Deduplication by image sha256: if already exists, link review and update without creating duplicate record
    if sha256_hash:
        existing = FeedbackRecord.objects.filter(image_sha256=sha256_hash).first()
        if existing and existing.scan != scan:
            logger.info("FeedbackRecord already exists for image sha256 %s (id: %s)", sha256_hash, existing.id)
            existing.review = review
            existing.ground_truth_label = gt_label
            existing.save()
            return existing

    # Deterministic split by hash
    split = determine_split_by_hash(sha256_hash)

    # Determine region and demo flag
    farm = scan.farm
    region_str = getattr(farm, 'location_name', '') if farm else ''
    is_demo_user = bool(
        getattr(scan.user, 'is_demo', False) or
        getattr(review.expert, 'is_demo', False)
    )

    record, created = FeedbackRecord.objects.get_or_create(
        scan=scan,
        defaults={
            'review': review,
            'reviewer': review.expert,
            'image_path': img_path,
            'image_sha256': sha256_hash,
            'crop': review.expert_crop or scan.crop_type or (farm.crop if farm else ''),
            'region': region_str,
            'is_demo': is_demo_user,
            'original_prediction': scan.predicted_class or scan.disease_name or 'Unknown',
            'original_confidence': scan.confidence or 0.0,
            'ground_truth_label': gt_label,
            'validation_source': 'expert_verified',
            'dataset_split': split,
            'notes': review.diagnosis_notes or '',
        }
    )

    if not created:
        record.review = review
        record.reviewer = review.expert
        record.ground_truth_label = gt_label
        record.notes = review.diagnosis_notes or ''
        if sha256_hash:
            record.image_sha256 = sha256_hash
            if record.dataset_split == 'unassigned':
                record.dataset_split = split
        record.is_demo = is_demo_user
        record.save()

    return record


def auto_partition_splits():
    """
    Partitions unassigned feedback records using hash-based deterministic split.
    """
    unassigned = FeedbackRecord.objects.filter(dataset_split='unassigned')
    updated = 0
    for rec in unassigned:
        if rec.image_sha256:
            rec.dataset_split = determine_split_by_hash(rec.image_sha256)
        else:
            rec.dataset_split = 'train'
        rec.save()
        updated += 1
    return updated
