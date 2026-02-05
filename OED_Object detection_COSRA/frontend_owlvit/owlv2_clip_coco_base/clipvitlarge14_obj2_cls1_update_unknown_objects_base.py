# %%
#%cd ~/user_data/research/git/zero-shot-object-detection/frontend_owlvit/owlv2_clip_coco_base
#%pwd

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
#%matplotlib inline
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

# %%
print(len(coco_val_dataset))

# %%
ovd_base_image_ids = []
for item in coco_val_dataset:
    ovd_base_image_ids.append(item[1][0]['image_id'])

print(len(ovd_base_image_ids))

# %%
# image_filenames = os.listdir(val_image_dir)
# image_filenames.sort()

# image_ids = []
# for image_filename in image_filenames:
#     image_id = image_filename.split('.')[0].lstrip('0')
#     image_ids.append(image_id)

# %%
category_names = ['person', 'bicycle', 'car', 'motorcycle', 'train', 'truck', \
    'boat', 'bench', 'bird', 'horse', 'sheep', 'bear', 'zebra', 'giraffe', \
    'backpack', 'handbag', 'suitcase', 'frisbee', 'skis', 'kite', 'surfboard', \
    'bottle', 'fork', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange', \
    'broccoli', 'carrot', 'pizza', 'donut', 'chair', 'bed', 'toilet', 'tv', \
    'laptop', 'mouse', 'remote', 'microwave', 'oven', 'toaster', \
    'refrigerator', 'book', 'clock', 'vase', 'toothbrush']

# %%
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

# %% [markdown]
# # Evaluation Code

# %%
#%pwd

# %%
model_checkpoint = "openai/clip-vit-large-patch14"
model = CLIPModel.from_pretrained(model_checkpoint)
processor = AutoProcessor.from_pretrained(model_checkpoint)

# %%
text_inputs = []
for category_name in category_names:
    text_inputs.append(f"a photo of a {category_name}")

# %%
predictions_df_total = pd.read_parquet(r'./owlv2_coco_base_predictions.parquet')

# %%
objectness_threshold = 0.2
score_threshold = 0.1

predictions_likely_objects = predictions_df_total[predictions_df_total['objectness_score'] >= objectness_threshold].sort_values('objectness_score', ascending=False).groupby('image_id').head(100).sort_values('image_id')
predictions_likely_objects = predictions_likely_objects.loc[predictions_likely_objects['image_id'].isin(ovd_base_image_ids)]

known_objects = predictions_likely_objects[predictions_likely_objects['score'] >= score_threshold]
unknown_objects = predictions_likely_objects[predictions_likely_objects['score'] < score_threshold]

#display(known_objects)
#display(unknown_objects)

print(f"Number of Known Annotations: {len(known_objects)}. Number of Unknown Annotations: {len(unknown_objects)}")

# %%
# image_id | [known object labels] | [known object locations] | unknown object location

# %%
for idx, unknown_object in tqdm(unknown_objects.iterrows(), total=unknown_objects.shape[0]):
    image = coco_val_dataset[ovd_base_image_ids.index(unknown_object['image_id'])][0]
    crop = image.crop((unknown_object['xmin'], unknown_object['ymin'], unknown_object['xmax'], unknown_object['ymax'], ))
    inputs = processor(
        text=text_inputs, images=crop, return_tensors='pt', padding=True
    )
    with torch.no_grad():
        outputs = model(**inputs)
    logits = outputs.logits_per_image
    probs = logits.softmax(dim=1)
    probs_list = probs.detach().tolist()[0]
    unknown_objects.loc[idx, 'label'] = category_names[probs_list.index(max(probs_list))]
    unknown_objects.loc[idx, 'score'] = max(probs_list)

print("Finished running CLIP with base classes over all unknown objects")

# %%
unknown_objects.to_parquet(r'./unknown_objects_base_updated_obj2_cls1_clipvitlarge14.parquet')