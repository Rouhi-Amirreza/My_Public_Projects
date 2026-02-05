import pandas as pd
from glob import glob

prediction_files = glob(r'./grouped_predictions/*.parquet')

predictions_dfs = []
for prediction_file in prediction_files:
    predictions_dfs.append(pd.read_parquet(prediction_file))

predictions_df_total = pd.concat(predictions_dfs)

predictions_df_total.sort_values(by=['image_id'], inplace=True)
predictions_df_total.rename(columns={'label_score': 'score'}, inplace=True)

predictions_df_total.to_parquet(r'/mnt/archive/owlvit_results/owlv2_coco_novel_predictions.parquet')