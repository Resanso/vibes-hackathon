# Nera Behavioral Anomaly Detection Model

This directory contains the trained Behavioral Anomaly Detection model for the Nera's Hybrid AI Financial Crisis Intervention System.

The model is a **Conv1D Autoencoder** trained using **unsupervised learning** to learn normal smartphone behavioral patterns. During inference, anomaly detection is performed using **reconstruction error** rather than class prediction.

---

## Files

### 1. `best_autoencoder.pth`

PyTorch checkpoint containing the trained model weights.

**Purpose**

- Continue training (fine-tuning)

- Model debugging

- Research experiments

- Re-export to ONNX if needed

**Required for Deployment?**

❌ No

Only required during development.

---

### 2. `conv1d_autoencoder.onnx`

ONNX version of the trained model.

**Purpose**

- Production inference

- ONNX Runtime

- Flutter integration

- Android Edge AI deployment

**Required for Deployment?**

✅ Yes

---

### 3. `conv1d_autoencoder.onnx.data`

External weight file used by the ONNX model.

Some ONNX exports store model weights separately as external data.

**Important**

- Keep this file together with `conv1d_autoencoder.onnx`.

- Do **NOT** rename or delete it unless the model is re-exported as a single-file ONNX.

**Required for Deployment?**

✅ Yes (if present)

---

### 4. `scaler.pkl`

Serialized StandardScaler used during model training.

The model expects input features to be normalized using this scaler before inference.

The same scaler **must** be used during deployment to ensure feature distributions match the training data.

**Required for Deployment?**

✅ Yes

---

# Input Features

The model expects the following **12 normalized features** in this exact order:

1. unlock_count

2. notification_total

3. loan_app_open

4. unique_loan_apps

5. otp_received

6. aggressive_notification

7. app_switch

8. avg_session_duration_sec

9. financial_ratio

10. loan_velocity

11. otp_velocity

12. hour

The input tensor shape is:

```

(batch_size, sequence_length, 12)

```

where

```

sequence_length = 24

```

---

# Training Strategy

This model was trained using **unsupervised anomaly detection**.

Training data:

- Normal behavior only

Evaluation data:

- Normal

- Reminder

- Threat

- Panic

- Recovery

The model reconstructs normal behavioral sequences and computes reconstruction error.

Higher reconstruction error indicates greater behavioral deviation.

---

# Inference Pipeline

```

Behavior Features

        │

        ▼

StandardScaler

 (scaler.pkl)

        │

        ▼

Sequence Builder

24 Consecutive Windows

        │

        ▼

Conv1D Autoencoder

 (ONNX Runtime)

        │

        ▼

Reconstruction Error

        │

        ▼

Threshold

        │

        ▼

Anomaly Score

        │

        ▼

Rule Engine

        │

        ▼

Emergency Intervention

```

---

# Deployment Files

For Android / Flutter deployment, the following files are required:

```

conv1d_autoencoder.onnx

conv1d_[autoencoder.onnx.data](http://autoencoder.onnx.data)   (if present)

scaler.pkl

```

The PyTorch checkpoint `best_autoencoder.pth`) is **not required** for production deployment.

---

# Notes

- Do not retrain using anomaly samples.

- Always normalize input using `scaler.pkl`.

- Maintain the exact feature order used during training.

- Use sliding windows of **24 consecutive time windows** before inference.

- The model outputs reconstructed sequences; anomaly scores are calculated from reconstruction error using a predefined threshold.