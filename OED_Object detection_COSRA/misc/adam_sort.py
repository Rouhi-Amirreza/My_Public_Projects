adam_results = 'bicycle 63.72 83.90 86.85 car 94.85 97.82 98.15 book 60.19 75.85 87.65 \
vase 43.00 65.59 75.35 bus 50.31 75.62 81.48 laptop 77.66 84.11 88.10 \
mouse 37.42 48.31 53.02 motorcycle 68.13 83.70 88.56 stopsign 84.48 89.66 91.38 \
keyboard 50.30 65.87 73.57 cow 61.29 70.97 77.42 umbrella 57.81 73.42 76.79 \
sink 29.72 47.74 54.02 firehydrant 71.88 82.81 87.50 train 67.86 89.29 96.43 \
refrigerator 56.82 70.56 75.68 parkingmeter 47.06 61.76 69.12 tv 77.35 89.54 93.16 \
frisbee 50.00 50.00 50.00 couch 49.30 62.80 68.39 sheep 84.44 84.44 86.67 \
diningtable 26.26 38.65 45.35 horse 75.51 81.63 81.63 bed 56.66 72.10 78.30 \
cellphone 56.50 72.06 77.83 kite 42.86 57.14 57.14 surfboard 89.47 89.47 89.47 \
clock 79.65 84.95 86.70 elephant 53.57 53.57 57.14 boat 65.71 81.43 82.86 \
microwave 51.68 65.65 72.54 airplane 76.35 81.19 93.04 oven 56.32 75.05 80.73 \
toaster 43.95 62.78 72.20 snowboard 25.00 50.00 50.00 zebra 0.00 3.55 5.24 \
giraffe 0.00 2.94 5.09 bird 32.26 41.94 51.61 bench 44.68 59.57 65.25 \
chair 51.01 66.23 71.89 cup 58.89 75.12 81.36 trafficlight 31.28 45.96 53.84 \
bowl 33.25 49.86 56.72 handbag 56.83 71.47 79.13 wineglass 60.31 75.45 81.71 \
carrot 62.27 77.23 83.69 donut 63.69 78.65 85.12 tie 74.53 84.71 89.62 \
apple 51.29 69.78 76.34 orange 57.48 72.89 79.11 baseballbat 57.30 70.56 76.98 \
sandwich 68.84 80.72 88.31 toothbrush 83.50 91.26 95.43 teddybear 77.66 87.82 92.41 \
person 78.85 85.23 90.14 backpack 67.15 78.34 85.12 banana 83.46 90.56 94.12 \
baseballglove 60.16 75.42 80.87 bear 50.68 67.23 72.85 bottle 59.21 72.34 78.62 \
broccoli 62.71 76.81 83.45 cake 55.52 70.23 77.18 cat 76.68 85.12 90.34 \
dog 52.59 69.12 74.81 fork 54.55 68.76 75.23 hairdrier 44.93 61.14 68.45 \
hotdog 51.28 68.34 73.45 knife 61.29 74.58 80.23 pizza 50.31 67.92 73.23 \
pottedplant 52.40 70.19 77.64 remote 35.93 52.81 61.34 scissors 52.66 67.58 74.15 \
skateboard 30.70 55.43 60.24 skis 64.70 78.23 83.92 spoon 77.69 88.12 92.34 \
sportsball 56.50 74.23 79.81 suitcase 78.67 85.67 89.14 tennisracket 76.68 84.92 88.76 \
toilet 61.14 80.17 86.19 truck 66.69 79.34 85.43'

adam_results = adam_results.split(' ')
#print(adam_results)

results_dict = {}
for idx in range(0, len(adam_results), 4):
    results_dict[adam_results[idx]] = (float(adam_results[idx+1]), float(adam_results[idx+2]), float(adam_results[idx+3]))

sorted_results = sorted(results_dict.keys(), key=lambda x: results_dict[x][0], reverse=True)

for idx in range(0, len(sorted_results), 3):
    result_line = sorted_results[idx] + " & "
    result_line = result_line + str(results_dict[sorted_results[idx]][0]) + " & "
    result_line = result_line + str(results_dict[sorted_results[idx]][1]) + " & "
    result_line = result_line + str(results_dict[sorted_results[idx]][2]) + " & "

    result_line = result_line + sorted_results[idx+1] + " & "
    result_line = result_line + str(results_dict[sorted_results[idx+1]][0]) + " & "
    result_line = result_line + str(results_dict[sorted_results[idx+1]][1]) + " & "
    result_line = result_line + str(results_dict[sorted_results[idx+1]][2]) + " & "

    try:
        result_line = result_line + sorted_results[idx+2] + " & "
        result_line = result_line + str(results_dict[sorted_results[idx+2]][0]) + " & "
        result_line = result_line + str(results_dict[sorted_results[idx+2]][1]) + " & "
        result_line = result_line + str(results_dict[sorted_results[idx+2]][2]) + "\\\\"
    except Exception as e:
        pass
    print(result_line)