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
# %matplotlib inline
from PIL import Image
import cv2
from pycocotools.coco import COCO
from transformers import pipeline
from transformers import Owlv2ImageProcessor, Owlv2Processor, Owlv2ForObjectDetection
from torchmetrics.detection.mean_ap import MeanAveragePrecision
from tqdm import tqdm
import pandas as pd

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
val_annotation_path = r'/mnt/active_storage/Joe/coco_set/val2017/annotations/instances_val2017.json'

coco_val_dataset = CocoDetection(
    root=val_image_dir, 
    annFile=val_annotation_path,
)

# %%
category_ids = coco_val_dataset.coco.loadCats(coco_val_dataset.coco.getCatIds())
category_names = [category['name'] for category in category_ids]
images = [coco_item[0] for coco_item in coco_val_dataset]

image_filenames = os.listdir(val_image_dir)
image_filenames.sort()

image_ids = []
for image_filename in image_filenames:
    image_id = image_filename.split('.')[0].lstrip('0')
    image_ids.append(image_id)

# %% [markdown]
# # Model Code

# %%
owlvit_checkpoint = r'google/owlv2-base-patch16-ensemble'
owlvit_pipeline = pipeline(model=owlvit_checkpoint, task='zero-shot-object-detection', use_fast=True, device='cuda')

# %%
predictions = []

starting_index = 501
for index, image in enumerate(tqdm(images[starting_index:])):
    image_prediction = owlvit_pipeline(
        image,
        candidate_labels=category_names
    )

    predictions.append(image_prediction)

    adjusted_index = starting_index + index
    if (adjusted_index != 0 and adjusted_index % 500 == 0) or adjusted_index == 4999:
        prediction_dicts = []
        for img_idx, prediction in enumerate(predictions):
            # Starting at 501, when we get to 1000 then:
                # starting_index=501
                # adjusted_index=1000
                # index=499
                # img_idx=[0, 499]
                # We want image_id_lookup=[501, 1000]
            # When we get to 1500
                # starting_index=501
                # adjusted_index=1500
                # index=999
                # img_idx=[0, 499]
                # We want image_id_lookup=[1001, 1500]
            # When we get to 4999
                # starting_index=501
                # adjusted_index=4999
                # index=4498
                # img_idx=[0, 498]
                # We want image_id_lookup=[4501, 4999]
            image_id_lookup = starting_index + (500*(index // 500)) + img_idx
            image_id = image_ids[image_id_lookup]
            for pred_idx, prediction in enumerate(prediction):
                try:
                    prediction_dict = {
                        'image_id': image_id,
                        'score': prediction['score'],
                        'label': prediction['label'],
                        'xmin': prediction['box']['xmin'],
                        'xmax': prediction['box']['xmax'],
                        'ymin': prediction['box']['ymin'],
                        'ymax': prediction['box']['ymax'],
                    }

                    prediction_dicts.append(prediction_dict)
                except Exception as e:
                    print(f"Problem with prediction {pred_idx} in image {img_idx}.")
                    print(e)
                    continue

        prediction_df = pd.DataFrame(prediction_dicts)
        parquet_path = f'prediction_results_{adjusted_index}.parquet'
        prediction_df.to_parquet(parquet_path, index=False)
        # Reset predictions after saving to ease deduplication
        predictions = []
        print(f"Predictions successfully written to parquet! Saved to path {parquet_path}")