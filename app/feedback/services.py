import random
from .models import FeedbackRecord


def sync_expert_review_to_feedback(review) -> FeedbackRecord:
    """
    Creates or updates a FeedbackRecord when an expert reviews a scan.
    Maps expert crop and disease into standard class label.
    """
    scan = review.scan
    if not scan:
        return None

    # Construct clean ground truth label (e.g. Tomato___Late_blight)
    if review.is_healthy:
        gt_label = f"{review.expert_crop or scan.crop_type or 'Plant'}___healthy"
    else:
        disease_clean = (review.expert_disease or scan.disease_name or 'Disease').replace(' ', '_')
        crop_clean = (review.expert_crop or scan.crop_type or 'Plant').replace(' ', '_')
        gt_label = f"{crop_clean}___{disease_clean}"

    img_path = scan.image.name if scan.image else ''

    record, created = FeedbackRecord.objects.get_or_create(
        scan=scan,
        defaults={
            'review': review,
            'image_path': img_path,
            'original_prediction': scan.predicted_class or scan.disease_name or 'Unknown',
            'original_confidence': scan.confidence or 0.0,
            'ground_truth_label': gt_label,
            'validation_source': 'expert_verified',
            'notes': review.diagnosis_notes or '',
        }
    )

    if not created:
        record.review = review
        record.ground_truth_label = gt_label
        record.notes = review.diagnosis_notes or ''
        record.save()

    return record


def auto_partition_splits(train_pct: float = 0.70, val_pct: float = 0.15):
    """
    Partitions unassigned feedback records into train / val / test sets.
    """
    unassigned = list(FeedbackRecord.objects.filter(dataset_split='unassigned'))
    # Deterministic pseudo-shuffle based on ID
    unassigned.sort(key=lambda x: x.id)

    n = len(unassigned)
    if n == 0:
        return 0

    n_train = int(n * train_pct)
    n_val = int(n * val_pct)

    for i, rec in enumerate(unassigned):
        if i < n_train:
            rec.dataset_split = 'train'
        elif i < n_train + n_val:
            rec.dataset_split = 'val'
        else:
            rec.dataset_split = 'test'
        rec.save()

    return n
