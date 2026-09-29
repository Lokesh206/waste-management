#!/usr/bin/env python3
"""
SWMS AI Waste Classification Model Training Script
Performs transfer learning using MobileNetV2 with PyTorch and torchvision.
Includes dataset preparation, data augmentation, training loop, evaluation metrics,
and saves weights to ai/models/mobilenetv2_waste.pth.
"""

import os
import sys
import time
import copy
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader

CLASSES = [
    'Plastic',
    'Paper',
    'Glass',
    'Metal',
    'Organic',
    'E-Waste',
    'Hazardous',
    'Other'
]

def train_waste_model(data_dir, num_epochs=10, batch_size=16, learning_rate=0.001):
    print("=" * 60)
    print("SWMS AI WASTE CLASSIFICATION TRAINING PIPELINE")
    print(f"Target Classes ({len(CLASSES)}): {', '.join(CLASSES)}")
    print(f"Data Directory: {data_dir}")
    print(f"Epochs: {num_epochs} | Batch Size: {batch_size} | LR: {learning_rate}")
    print("=" * 60)

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"Using computing device: {device}")

    # Data Augmentation & Normalization transforms
    data_transforms = {
        'train': transforms.Compose([
            transforms.RandomResizedCrop(224),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(15),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
        'val': transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
    }

    if not os.path.exists(os.path.join(data_dir, 'train')):
        print(f"Notice: Train folder not found at {data_dir}/train.")
        print("To train on real images, structure your dataset as:")
        print("ai/datasets/")
        print("  ├── train/ (Plastic/, Paper/, Glass/, etc.)")
        print("  └── val/   (Plastic/, Paper/, Glass/, etc.)")
        return None

    image_datasets = {
        x: datasets.ImageFolder(os.path.join(data_dir, x), data_transforms[x])
        for x in ['train', 'val']
    }

    dataloaders = {
        x: DataLoader(image_datasets[x], batch_size=batch_size, shuffle=(x == 'train'), num_workers=0)
        for x in ['train', 'val']
    }
    dataset_sizes = {x: len(image_datasets[x]) for x in ['train', 'val']}
    class_names = image_datasets['train'].classes

    print(f"Loaded datasets: {dataset_sizes['train']} train images, {dataset_sizes['val']} validation images.")
    print(f"Detected classes: {class_names}")

    # Load MobileNetV2 with pretrained ImageNet weights
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)

    # Freeze base feature extractor layers for transfer learning
    for param in model.features.parameters():
        param.requires_grad = False

    # Replace classifier head for target classes
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_ftrs, len(class_names))
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.classifier.parameters(), lr=learning_rate)

    best_model_wts = copy.deepcopy(model.state_dict())
    best_acc = 0.0

    start_time = time.time()

    for epoch in range(num_epochs):
        print(f"Epoch {epoch+1}/{num_epochs}")
        print("-" * 15)

        for phase in ['train', 'val']:
            if phase == 'train':
                model.train()
            else:
                model.eval()

            running_loss = 0.0
            running_corrects = 0

            for inputs, labels in dataloaders[phase]:
                inputs = inputs.to(device)
                labels = labels.to(device)

                optimizer.zero_grad()

                with torch.set_grad_enabled(phase == 'train'):
                    outputs = model(inputs)
                    _, preds = torch.max(outputs, 1)
                    loss = criterion(outputs, labels)

                    if phase == 'train':
                        loss.backward()
                        optimizer.step()

                running_loss += loss.item() * inputs.size(0)
                running_corrects += torch.sum(preds == labels.data)

            epoch_loss = running_loss / dataset_sizes[phase]
            epoch_acc = running_corrects.double() / dataset_sizes[phase]

            print(f"{phase.capitalize()} Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}")

            if phase == 'val' and epoch_acc > best_acc:
                best_acc = epoch_acc
                best_model_wts = copy.deepcopy(model.state_dict())

    time_elapsed = time.time() - start_time
    print(f"Training complete in {time_elapsed // 60:.0f}m {time_elapsed % 60:.0f}s")
    print(f"Best Validation Accuracy: {best_acc:4f}")

    # Save best model weights
    models_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(models_dir, exist_ok=True)
    save_path = os.path.join(models_dir, 'mobilenetv2_waste.pth')
    torch.save(best_model_wts, save_path)
    print(f"Model saved successfully to: {save_path}")

    return model

if __name__ == '__main__':
    default_dataset = os.path.join(os.path.dirname(__file__), 'datasets')
    train_waste_model(default_dataset, num_epochs=5)

