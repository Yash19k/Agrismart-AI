import csv
from django.http import HttpResponse, JsonResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from collections import Counter

from accounts.permissions import IsOfficer
from .models import FeedbackRecord
from .serializers import FeedbackRecordSerializer
from .services import auto_partition_splits


@api_view(['GET', 'POST'])
@permission_classes([IsOfficer])
def feedback_list_view(request):
    """
    GET: List feedback records for retraining (officer only).
    POST: Create a manual feedback entry (officer only).
    """
    if request.method == 'GET':
        qs = FeedbackRecord.objects.all()
        split = request.query_params.get('split')
        source = request.query_params.get('source')
        if split:
            qs = qs.filter(dataset_split=split)
        if source:
            qs = qs.filter(validation_source=source)

        serializer = FeedbackRecordSerializer(qs[:100], many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = FeedbackRecordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            rec = serializer.save()
            return Response(FeedbackRecordSerializer(rec, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsOfficer])
def feedback_stats_view(request):
    """
    GET /api/feedback/stats/
    Returns distribution statistics, concordance rate, and split sizes.
    """
    records = list(FeedbackRecord.objects.all())
    total = len(records)
    if total == 0:
        return Response({
            'total_samples': 0,
            'model_accuracy_vs_ground_truth': 0.0,
            'concordant_count': 0,
            'discordant_count': 0,
            'splits': {'train': 0, 'val': 0, 'test': 0, 'unassigned': 0},
            'class_distribution': []
        })

    concordant = sum(1 for r in records if r.is_concordant)
    discordant = total - concordant
    accuracy = round((concordant / total) * 100, 1)

    splits = {
        'train': sum(1 for r in records if r.dataset_split == 'train'),
        'val': sum(1 for r in records if r.dataset_split == 'val'),
        'test': sum(1 for r in records if r.dataset_split == 'test'),
        'unassigned': sum(1 for r in records if r.dataset_split == 'unassigned'),
    }

    class_counts = Counter(r.ground_truth_label for r in records)
    class_dist = [{'class': k, 'count': v} for k, v in class_counts.most_common(10)]

    return Response({
        'total_samples': total,
        'model_accuracy_vs_ground_truth': accuracy,
        'concordant_count': concordant,
        'discordant_count': discordant,
        'splits': splits,
        'class_distribution': class_dist,
    })


@api_view(['POST'])
@permission_classes([IsOfficer])
def feedback_auto_split_view(request):
    """
    POST /api/feedback/partition/
    Assigns unpartitioned samples to 70% train / 15% val / 15% test.
    """
    assigned = auto_partition_splits()
    return Response({'status': 'partitioned', 'records_updated': assigned})


@api_view(['GET'])
@permission_classes([IsOfficer])
def feedback_export_csv_view(request):
    """
    GET /api/feedback/export/csv/
    Streams CSV format dataset manifest for model training.
    """
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="agrismart_retraining_dataset.csv"'

    writer = csv.writer(response)
    writer.writerow([
        'record_id', 'scan_id', 'image_path', 'original_prediction',
        'original_confidence', 'ground_truth_label', 'is_concordant',
        'dataset_split', 'validation_source', 'created_at'
    ])

    for r in FeedbackRecord.objects.all():
        writer.writerow([
            r.id,
            r.scan_id,
            r.image_path,
            r.original_prediction,
            r.original_confidence,
            r.ground_truth_label,
            r.is_concordant,
            r.dataset_split,
            r.validation_source,
            r.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        ])

    return response


@api_view(['GET'])
@permission_classes([IsOfficer])
def feedback_export_json_view(request):
    """
    GET /api/feedback/export/json/
    Returns full JSON manifest for PyTorch / TensorFlow DataLoader pipelines.
    """
    records = []
    for r in FeedbackRecord.objects.all():
        records.append({
            'id': r.id,
            'scan_id': r.scan_id,
            'image_file': r.image_path,
            'ai_prediction': r.original_prediction,
            'ai_confidence': r.original_confidence,
            'ground_truth': r.ground_truth_label,
            'is_concordant': r.is_concordant,
            'split': r.dataset_split,
            'source': r.validation_source,
            'notes': r.notes,
            'created_at': r.created_at.isoformat(),
        })

    return JsonResponse({'dataset': 'AgriSmart Retraining Manifest', 'count': len(records), 'samples': records})


@api_view(['PATCH'])
@permission_classes([IsOfficer])
def feedback_update_split_view(request, pk):
    """Update dataset split for a specific record."""
    rec = FeedbackRecord.objects.filter(pk=pk).first()
    if not rec:
        return Response({'detail': 'Record not found.'}, status=status.HTTP_404_NOT_FOUND)

    new_split = request.data.get('dataset_split')
    if new_split in ['train', 'val', 'test', 'unassigned']:
        rec.dataset_split = new_split
        rec.save()
        return Response(FeedbackRecordSerializer(rec, context={'request': request}).data)
    return Response({'detail': 'Invalid split choice.'}, status=status.HTTP_400_BAD_REQUEST)
