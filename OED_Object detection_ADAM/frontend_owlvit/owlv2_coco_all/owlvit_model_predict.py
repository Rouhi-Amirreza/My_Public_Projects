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
from torchmetrics.detection.mean_ap import MeanAveragePrecision
from tqdm import tqdm
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
val_annotation_path = r'/mnt/active_storage/Joe/coco_set/val2017/annotations/instances_val2017.json'

coco_val_dataset = CocoDetection(
    root=val_image_dir, 
    annFile=val_annotation_path,
)

category_ids = coco_val_dataset.coco.loadCats(coco_val_dataset.coco.getCatIds())
category_names = [category['name'] for category in category_ids]

image_filenames = os.listdir(val_image_dir)
image_filenames.sort()

image_ids = []
for image_filename in image_filenames:
    image_id = image_filename.split('.')[0].lstrip('0')
    image_ids.append(image_id)

images_with_ids = []
for idx, item in enumerate(coco_val_dataset):
    images_with_ids.append((item[0], image_ids[idx]))

images_with_ids[0]

owlvit_checkpoint = r'google/owlv2-base-patch16-ensemble'
owlvit_pipeline = pipeline(model=owlvit_checkpoint, task='zero-shot-object-detection', use_fast=True, device='cuda')
owlvit_model = Owlv2ForObjectDetection.from_pretrained("google/owlv2-base-patch16-ensemble")
owlvit_processor = processor = Owlv2Processor.from_pretrained("google/owlv2-base-patch16-ensemble")


def custom_collate(batch):
    images = []
    texts = []
    target_sizes = []
    batch_image_ids = []
    for item in batch:
        images.append(item[0])
        texts.append(category_names)
        batch_image_ids.append(int(item[1]))
        target_sizes.append((item[0].height, item[0].width))
        
    processed_batch = owlvit_processor(text=texts, images=images, return_tensors='pt')        

    target_sizes = torch.tensor(target_sizes)
    batch_image_ids = torch.tensor(batch_image_ids)

    processed_batch['target_sizes'] = target_sizes
    processed_batch['image_ids'] = batch_image_ids
    processed_batch['texts'] = texts

    return processed_batch

batch_size = 50
coco_dataloader = DataLoader(
    images_with_ids,
    batch_size=batch_size,
    shuffle=False,
    collate_fn=custom_collate,
)

skip_batches = 0
for batch_num, batch in enumerate(tqdm(coco_dataloader)):
    if batch_num < skip_batches:
        continue
    with torch.no_grad():
        outputs = owlvit_model(
            input_ids = batch['input_ids'],
            pixel_values = batch['pixel_values'],
            attention_mask = batch['attention_mask']
        )

    results = processor.post_process_grounded_object_detection(
        outputs=outputs, 
        target_sizes=batch['target_sizes'], 
        threshold=0.0,
        text_labels=batch['texts']
        )

    sigmoid = torch.nn.Sigmoid()
    objectness_scores = sigmoid(outputs.objectness_logits.squeeze()).numpy()

    for idx, result in enumerate(results):
        results[idx]['objectness_scores'] = objectness_scores[idx]
        results[idx]['image_id'] = batch['image_ids'][idx]

    result_dicts = []
    for result in results:
        for idx in range(len(result['scores'])):
            result_dict = {
                'image_id': result['image_id'].item(),
                'label': category_names[result['labels'][idx].item()],
                'label_score': result['scores'][idx].item(),
                'objectness_score': result['objectness_scores'][idx].item(),
                'xmin': result['boxes'][idx].tolist()[0],
                'ymin': result['boxes'][idx].tolist()[1],
                'xmax': result['boxes'][idx].tolist()[2],
                'ymax': result['boxes'][idx].tolist()[3],
            }

            result_dicts.append(result_dict)

    results_df = pd.DataFrame(result_dicts)
    parquet_path = f'model_predictions_{(batch_num+1)*batch_size}.parquet'
    results_df.to_parquet(parquet_path)
