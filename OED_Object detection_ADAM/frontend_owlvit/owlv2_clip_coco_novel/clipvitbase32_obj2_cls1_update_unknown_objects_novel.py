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
val_annotation_path = r'/mnt/active_storage/Joe/coco_set/val2017/annotations/ovd_ins_val2017_t.json'

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
category_names = ['airplane', 'bus', 'cat', 'dog', 'cow', 'elephant', 'umbrella', \
    'tie', 'snowboard', 'skateboard', 'cup', 'knife', 'cake', 'couch', 'keyboard', \
    'sink', 'scissors']

# %%
category_ids = coco_val_dataset.coco.loadCats(coco_val_dataset.coco.getCatIds())

# %% [markdown]
# # Evaluation Code

# %%
#%pwd

# %%
model_checkpoint = "openai/clip-vit-base-patch32"
model = CLIPModel.from_pretrained(model_checkpoint)
processor = AutoProcessor.from_pretrained(model_checkpoint)

# %%
text_inputs = []
for category_name in category_names:
    text_inputs.append(f"a photo of a {category_name}")

# %%
predictions_df_total = pd.read_parquet(r'/mnt/archive/owlvit_results/owlv2_coco_base_predictions.parquet')

# %%
objectness_threshold = 0.2
score_threshold = 0.1

predictions_likely_objects = predictions_df_total[predictions_df_total['objectness_score'] >= objectness_threshold].sort_values('objectness_score', ascending=False).groupby('image_id').head(100).sort_values('image_id')
predictions_likely_objects = predictions_likely_objects.loc[predictions_likely_objects['image_id'].isin(ovd_base_image_ids)]

known_objects = predictions_likely_objects[predictions_likely_objects['score'] >= score_threshold]
unknown_objects = predictions_likely_objects[predictions_likely_objects['score'] < score_threshold]

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

print("Finished running CLIP with novel classes over all unknown objects")

# %%
unknown_objects.to_parquet(r'/mnt/active_storage/Joe/owlvit_results/unknown_objects_updated_with_novel_labels_obj2_cls1_clipvitbase32.parquet')