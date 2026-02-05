# %%

# %%
import os
import random
import numpy as np
import torch
from torch.utils.data import DataLoader
import torchvision
from torchvision.datasets import CocoDetection
import matplotlib
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from PIL import Image
import cv2
from pycocotools.coco import COCO
from transformers import pipeline
from transformers import Owlv2ImageProcessor, Owlv2Processor, Owlv2ForObjectDetection
from transformers import AutoProcessor, CLIPModel
from torchmetrics.detection.mean_ap import MeanAveragePrecision
from tqdm import tqdm
import pandas as pd
import glob

random.seed(42)
np.random.seed(42)
torch.manual_seed(42)

# %%
if torch.cuda.is_available():
    device = torch.device('cuda')
else:
    device = torch.device('cpu')

print(device)

# %%
val_image_dir = r'/mnt/active_storage/Joe/coco_set/val2017/images'
val_annotation_path = r'/mnt/active_storage/Joe/coco_set/val2017/annotations/ovd_ins_val2017_b.json'

coco_val_dataset = CocoDetection(
    root=val_image_dir, 
    annFile=val_annotation_path,
)

ovd_base_image_ids = []
for item in coco_val_dataset:
    ovd_base_image_ids.append(item[1][0]['image_id'])

category_names = ['person', 'bicycle', 'car', 'motorcycle', 'train', 'truck', \
    'boat', 'bench', 'bird', 'horse', 'sheep', 'bear', 'zebra', 'giraffe', \
    'backpack', 'handbag', 'suitcase', 'frisbee', 'skis', 'kite', 'surfboard', \
    'bottle', 'fork', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange', \
    'broccoli', 'carrot', 'pizza', 'donut', 'chair', 'bed', 'toilet', 'tv', \
    'laptop', 'mouse', 'remote', 'microwave', 'oven', 'toaster', \
    'refrigerator', 'book', 'clock', 'vase', 'toothbrush']

category_ids = coco_val_dataset.coco.loadCats(coco_val_dataset.coco.getCatIds())

targets = []
target_boxes = []
target_labels = []

for idx, image_tuple in enumerate(coco_val_dataset):
    image = image_tuple[0]
    annotations = image_tuple[1]
    
    for annotation in annotations:
        label_name = [category['name'] for category in category_ids if category['id'] == annotation['category_id']][0]

        try:
            label = category_names.index(label_name)
        except ValueError as e:
            # If the annotation is not part of the base categories, skip it
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
        'image_id': ovd_base_image_ids[idx],
        'boxes': target_boxes,
        'labels': target_labels
    }

    targets.append(target_image_dict)

    # Clear boxes and labels
    target_boxes = []
    target_labels = []

# %%
predictions_df_total = pd.read_parquet(r'/mnt/archive/owlvit_results/owlv2_coco_base_predictions.parquet')

# %%
objectness_threshold = 0.2
score_threshold = 0.1

predictions_likely_objects = predictions_df_total[predictions_df_total['objectness_score'] >= objectness_threshold].sort_values('objectness_score', ascending=False).groupby('image_id').head(100).sort_values('image_id')
predictions_likely_objects = predictions_likely_objects.loc[predictions_likely_objects['image_id'].isin(ovd_base_image_ids)]

known_objects = predictions_likely_objects[predictions_likely_objects['score'] >= score_threshold]

print(f"Number of Known Annotations: {len(known_objects)}. Number of Unknown Annotations: {len(predictions_likely_objects) - len(known_objects)}")

# %%
unknown_objects_updated = pd.read_parquet(r'/mnt/active_storage/Joe/owlvit_results/unknown_objects_base_updated_obj2_cls1_clipvitbase32.parquet')

unknown_objects_updated_filtered = unknown_objects_updated[unknown_objects_updated['score'] >= score_threshold]

# %%
all_objects = pd.concat([known_objects, unknown_objects_updated_filtered])
all_objects = all_objects.sort_values(by='image_id')

# %%
predictions_dict = all_objects.to_dict('records')

# %%
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

# %%
print(len(preds))

# %%
if len(preds) < len(coco_val_dataset):
    pred_image_ids = np.unique([pred['image_id'] for pred in preds])
    missing_ids = list(set(ovd_base_image_ids) - set(pred_image_ids))
    missing_ids.sort()

    for missing_id in missing_ids:
        missing_id_dict = {
            'image_id': missing_id,
            'boxes': torch.tensor([], dtype=torch.int),
            'scores': torch.tensor([], dtype=torch.float),
            'objectness_scores': torch.tensor([], dtype=torch.float),
            'labels': torch.tensor([], dtype=torch.int),
        }
        preds.insert(ovd_base_image_ids.index(missing_id), missing_id_dict)

# %%
assert len(preds) == len(coco_val_dataset)
for idx in range (len(preds)):
    assert preds[idx]['image_id'] == ovd_base_image_ids[idx]

# %%
for idx in range(len(targets)):
    assert targets[idx]['image_id'] == preds[idx]['image_id']

# %%
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

# %%
computed_metric = metric.compute()

# %%
print(f"Objectness Threshold: {objectness_threshold}; Score Threshold: {score_threshold}")
print(f"mAP: {round(computed_metric['map'].item(), 4):.4f}\nKnown: {len(known_objects)}\nUnknown: {len(predictions_likely_objects) - len(known_objects)}")