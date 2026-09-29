#!/usr/bin/env python3
"""
SWMS AI Model Evaluation Script
Computes Classification Report and Confusion Matrix on test/validation sets.
Reports actual empirical metrics without fabricating accuracy claims.
"""

import os
import sys
import torch
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader
from sklearn.metrics import classification_report, confusion_matrix
import numpy as np

def evaluate_model(data_dir, model_path=None):
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

    if model_path is None:
        model_path = os.path.join(os.path.dirname(__file__), 'models', 'mobilenetv2_waste.pth')

    if not os.path.exists(model_path):
        print(f"No trained weights file found at {model_path}.")
        print("Run ai/train.py first with your dataset to train and generate evaluation metrics.")
        return

    val_dir = os.path.join(data_dir, 'val')
    if not os.path.exists(val_dir):
        print(f"Validation directory not found at {val_dir}.")
        return

    val_transforms = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    val_dataset = datasets.ImageFolder(val_dir, val_transforms)
    val_loader = DataLoader(val_dataset, batch_size=16, shuffle=False)
    class_names = val_dataset.classes

    model = models.mobilenet_v2()
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = torch.nn.Linear(num_ftrs, len(class_names))
    model.load_state_dict(torch.load(model_path, map_location=device))
    model = model.to(device)
    model.eval()

    all_preds = []
    all_labels = []

    print("Evaluating model on validation dataset...")
    with torch.no_grad():
        for inputs, labels in val_loader:
            inputs = inputs.to(device)
            outputs = model(inputs)
            _, preds = torch.max(outputs, 1)

            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.numpy())

    print("\n" + "=" * 60)
    print("CLASSIFICATION REPORT")
    print("=" * 60)
    print(classification_report(all_labels, all_preds, target_names=class_names, digits=4))

    print("=" * 60)
    print("CONFUSION MATRIX")
    print("=" * 60)
    cm = confusion_matrix(all_labels, all_preds)
    print(cm)
    print("=" * 60)

if __name__ == '__main__':
    dataset_path = os.path.join(os.path.dirname(__file__), 'datasets')
    evaluate_model(dataset_path)

