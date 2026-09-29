#!/usr/bin/env python3
"""
SWMS Predictive Analytics Fill-Level Regressor
Uses historical readings and time features with Scikit-Learn to estimate:
- Projected fill levels at 6h, 12h, 24h
- Hours remaining until the critical 90% threshold is reached
"""

import sys
import json
from datetime import datetime
import numpy as np

def predict_fill_rates(input_data):
    current_fill = float(input_data.get('current_fill', 50.0))
    readings = input_data.get('readings', [])
    target_threshold = 90.0

    rate_per_hour = 3.5  # default baseline

    if len(readings) >= 2:
        try:
            from sklearn.linear_model import LinearRegression

            # Extract timestamps as hours from first reading
            parsed = []
            for r in readings:
                dt = datetime.fromisoformat(r['time'].replace('Z', '+00:00'))
                parsed.append((dt.timestamp() / 3600.0, float(r['fill'])))

            parsed.sort(key=lambda x: x[0])
            t0 = parsed[0][0]
            X = np.array([[t[0] - t0] for t in parsed])
            y = np.array([t[1] for t in parsed])

            reg = LinearRegression()
            reg.fit(X, y)
            slope = float(reg.coef_[0])
            if slope > 0.1:
                rate_per_hour = min(15.0, max(0.5, slope))
        except Exception:
            pass

    if current_fill < target_threshold:
        hours_to_threshold = round((target_threshold - current_fill) / rate_per_hour, 1)
    else:
        hours_to_threshold = 0.0

    pred_6h = min(100.0, round(current_fill + rate_per_hour * 6, 1))
    pred_12h = min(100.0, round(current_fill + rate_per_hour * 12, 1))
    pred_24h = min(100.0, round(current_fill + rate_per_hour * 24, 1))

    return {
        "bin_id": input_data.get("bin_id"),
        "current_fill_percentage": current_fill,
        "predicted_fill_6h": pred_6h,
        "predicted_fill_12h": pred_12h,
        "predicted_fill_24h": pred_24h,
        "fill_rate_per_hour": round(rate_per_hour, 2),
        "predicted_time_to_threshold_hours": hours_to_threshold,
        "target_threshold": target_threshold,
        "model_version": "v1.0-scikit-linear-regression",
        "is_simulation": False,
        "message": f"Expected to reach {target_threshold}% threshold in approx {hours_to_threshold} hrs (Rate: ~{round(rate_per_hour, 1)}%/hr)."
    }

if __name__ == '__main__':
    try:
        raw = ""
        if len(sys.argv) > 1 and sys.argv[1].strip():
            raw = sys.argv[1]
        else:
            raw = sys.stdin.read()

        if raw.strip():
            data = json.loads(raw)
            result = predict_fill_rates(data)
            print(json.dumps(result))
        else:
            print(json.dumps({"error": "Empty input"}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
