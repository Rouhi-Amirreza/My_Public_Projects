predictions_path = r'/mnt/active_storage/Joe/owlvit_results/unknown_objects_updated_with_novel_labels_obj2_cls1_clipvitbase32.parquet'
example_output_path = r'./clipvitbase32_cocoshared_example.png'

import random
import numpy as np
import torch
from torchvision.datasets import CocoDetection
from PIL import ImageDraw
from torchmetrics.detection.mean_ap import MeanAveragePrecision
import pandas as pd

random.seed(42)
np.random.seed(42)
torch.manual_seed(42)

if torch.cuda.is_available():
    device = torch.device('cuda')
else:
    device = torch.device('cpu')

print(device)

val_image_dir = r'/mnt/active_storage/Joe/coco_set/val2017/images'
novel_annotation_path = r'/mnt/active_storage/Joe/coco_set/val2017/annotations/ovd_ins_val2017_t.json'

novel_coco_val_dataset = CocoDetection(
    root=val_image_dir, 
    annFile=novel_annotation_path,
)

base_annotation_path = r'/mnt/active_storage/Joe/coco_set/val2017/annotations/ovd_ins_val2017_b.json'

base_coco_val_dataset = CocoDetection(
    root=val_image_dir, 
    annFile=base_annotation_path,
)

print(f"Num Images in COCO Base: {len(base_coco_val_dataset)}")
print(f"Num Images in COCO Novel: {len(novel_coco_val_dataset)}")

base_image_ids = []
for item in base_coco_val_dataset:
    base_image_ids.append(item[1][0]['image_id'])

novel_image_ids = []
for item in novel_coco_val_dataset:
    novel_image_ids.append(item[1][0]['image_id'])

shared_image_ids = list(set(base_image_ids).intersection(set(novel_image_ids)))
shared_image_ids.sort()

print(f"Num Shared Images: {len(shared_image_ids)}")

shared_coco_val_dataset = []
for item in novel_coco_val_dataset:
    metadata_idx = 1
    image_id = item[metadata_idx][0]['image_id']
    if image_id in shared_image_ids:
        shared_coco_val_dataset.append(item)

category_names = ['airplane', 'bus', 'cat', 'dog', 'cow', 'elephant', 'umbrella', \
    'tie', 'snowboard', 'skateboard', 'cup', 'knife', 'cake', 'couch', 'keyboard', \
    'sink', 'scissors']

category_ids = novel_coco_val_dataset.coco.loadCats(novel_coco_val_dataset.coco.getCatIds())

targets = []
target_boxes = []
target_labels = []

for idx, image_tuple in enumerate(shared_coco_val_dataset):
    image = image_tuple[0]
    annotations = image_tuple[1]
    
    for annotation in annotations:
        label_name = [category['name'] for category in category_ids if category['id'] == annotation['category_id']][0]

        try:
            label = category_names.index(label_name)
        except ValueError as e:
            # If the annotation is not part of the novel categories, skip it
            continue

        # xmin, ymin, width, height -> xmin, ymin, xmax, ymax
        box = annotation['bbox']
        bbox = []
        bbox.append(int(round(box[0])))
        bbox.append(int(round(box[1])))
        bbox.append(int(round(box[0] + box[2])))
        bbox.append(int(round(box[1] + box[3])))

        target_boxes.append(bbox)
        target_labels.append(label)

    target_boxes = torch.tensor(target_boxes, dtype=torch.int)
    target_labels = torch.tensor(target_labels, dtype=torch.int)

    target_image_dict = {
        'image_id': shared_image_ids[idx],
        'boxes': target_boxes,
        'labels': target_labels
    }

    targets.append(target_image_dict)

    # Clear boxes and labels
    target_boxes = []
    target_labels = []

predictions_df_total = pd.read_parquet(predictions_path)

objectness_threshold = 0.2
score_threshold = 0.1
min_dim = 16

relevant_image_objects = predictions_df_total.loc[predictions_df_total['image_id'].isin(shared_image_ids)]

confident_objects = relevant_image_objects[relevant_image_objects['score'] >= score_threshold]
unconfident_objects = relevant_image_objects[relevant_image_objects['score'] < score_threshold]

confident_objects_sizelimited = confident_objects[((confident_objects['xmax'] - confident_objects['xmin']) > min_dim) & ((confident_objects['ymax'] - confident_objects['ymin']) > min_dim)]

print(f"Number of Confident Annotations: {len(confident_objects)}\n \
Number of Confident Annotations Sizelimited: {len(confident_objects_sizelimited)}\n \
Number of Unconfident Annotations: {len(unconfident_objects)}")

predictions_dict = confident_objects_sizelimited.to_dict('records')

preds = []
pred_boxes = []
pred_scores = []
pred_objectness_scores = []
pred_labels = []

current_img_id = predictions_dict[0]['image_id']
for prediction in predictions_dict:
    # If on a new image...
    if prediction['image_id'] != current_img_id:
        # Convert boxes, scores, and labels to tensors
        pred_boxes = torch.tensor(pred_boxes, dtype=torch.int)
        pred_scores = torch.tensor(pred_scores, dtype=torch.float)
        pred_objectness_scores = torch.tensor(pred_objectness_scores, dtype=torch.float)
        pred_labels = torch.tensor(pred_labels, dtype=torch.int)

        # Create the dict for preds
        pred_image_dict = {
            'image_id': current_img_id,
            'boxes': pred_boxes,
            'scores': pred_scores,
            'objectness_scores': pred_objectness_scores,
            'labels': pred_labels
        }

        preds.append(pred_image_dict)

        # Clear boxes, scores, and labels for the new image
        pred_boxes = []
        pred_scores = []
        pred_objectness_scores = []
        pred_labels = []

        # Set new current image id
        current_img_id = prediction['image_id']

    bbox = []
    bbox.append(prediction['xmin'])
    bbox.append(prediction['ymin'])
    bbox.append(prediction['xmax'])
    bbox.append(prediction['ymax'])

    pred_boxes.append(bbox)
    pred_scores.append(prediction['score'])
    pred_objectness_scores.append(prediction['objectness_score'])
    pred_labels.append(category_names.index(prediction['label']))

# Capture the predictions for the last image
pred_boxes = torch.tensor(pred_boxes, dtype=torch.int)
pred_scores = torch.tensor(pred_scores, dtype=torch.float)
pred_objectness_scores = torch.tensor(pred_objectness_scores, dtype=torch.float)
pred_labels = torch.tensor(pred_labels, dtype=torch.int)

# Create the dict for preds
pred_image_dict = {
    'image_id': current_img_id,
    'boxes': pred_boxes,
    'scores': pred_scores,
    'objectness_scores': pred_objectness_scores,
    'labels': pred_labels
}

preds.append(pred_image_dict)

pred_image_ids = np.unique([pred['image_id'] for pred in preds])
missing_ids = list(set(shared_image_ids) - set(pred_image_ids))
missing_ids.sort()

for missing_id in missing_ids:
    missing_id_dict = {
        'image_id': missing_id,
        'boxes': torch.tensor([], dtype=torch.int),
        'scores': torch.tensor([], dtype=torch.float),
        'objectness_scores': torch.tensor([], dtype=torch.float),
        'labels': torch.tensor([], dtype=torch.int),
    }
    preds.insert(shared_image_ids.index(missing_id), missing_id_dict)

assert len(preds) == len(shared_coco_val_dataset)
for idx in range (len(preds)):
    assert preds[idx]['image_id'] == shared_image_ids[idx]

for idx in range(len(targets)):
    assert targets[idx]['image_id'] == preds[idx]['image_id']

# Visualize some preds and targets
index = 0

visualized_image = shared_coco_val_dataset[index][0].copy()

draw = ImageDraw.Draw(visualized_image)

for box, label in zip(preds[index]['boxes'], preds[index]['labels']):
    draw.rectangle(xy=((box[0], box[1]), (box[2], box[3])), outline='red')
    draw.text(xy=(box[0], box[1]), text=category_names[label.item()])

for box, label in zip(targets[index]['boxes'], targets[index]['labels']):
    draw.rectangle(xy=((box[0], box[1]), (box[2], box[3])), outline='green')
    draw.text(xy=(box[0], box[1]), text=category_names[label.item()])

visualized_image.save(example_output_path)

metric = MeanAveragePrecision(
    box_format='xyxy',
    iou_type='bbox',
    iou_thresholds=None, # Defaults to trying from 0.5 -> 0.95 in steps of 0.05 
    rec_thresholds=None,
    max_detection_thresholds=None, # Uses [1, 10, 100]
    class_metrics=False,
    extended_summary=False, # This way, we can see the ious and scores calculated
    average='macro',
    backend='pycocotools'
)

metric.update(preds, targets)

computed_metric = metric.compute()

num_preds = 0
for pred in preds:
    num_preds = num_preds + len(pred['boxes'])

num_targets = 0
for target in targets:
    num_targets = num_targets + len(target['boxes'])

map = computed_metric['map'].item()
mar = computed_metric['mar_100'].item()
true_positives = map*num_preds
false_positives = num_preds - true_positives
false_negatives = num_targets - true_positives

print(f"Objectness Threshold: {objectness_threshold}; Score Threshold: {score_threshold}; Min Dim: {min_dim}")
print(f"mAP: {map:.4f}\n\
mAR_100: {mar:.4f}\n\
Num Predictions: {num_preds}\n\
Num Targets: {num_targets}\n\
True Positives: {true_positives}\n\
False Positives: {false_positives}\n\
False Negatives: {false_negatives}")
# Objectness Threshold: 0.2; Score Threshold: 0.1; Min Dim: 0
# mAP: 0.1742
# Num Objects: 13878