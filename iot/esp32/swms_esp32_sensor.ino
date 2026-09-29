/*
 * Smart Waste Management System (SWMS) - ESP32 Smart Bin Telemetry Firmware
 *
 * Hardware:
 * - ESP32 Dev Module
 * - HC-SR04 Ultrasonic Distance Sensor (Trig: GPIO 5, Echo: GPIO 18)
 * - Status LED: GPIO 2
 *
 * Workflow:
 * 1. Measure distance to waste surface via ultrasonic pulse.
 * 2. Connect to WiFi network.
 * 3. Send HTTPS POST request to /api/iot/bin-reading with x-api-key authentication.
 * 4. Sleep until next measurement interval.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ================= USER CONFIGURATION =================
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// SWMS API Server URL
const char* SERVER_URL = "http://192.168.1.100:5000/api/iot/bin-reading";
const char* IOT_API_KEY = "swms_iot_device_secure_token_998877";

// Smart Bin Hardware Identification
const char* BIN_CODE = "BIN-001";
const float BIN_HEIGHT_CM = 100.0; // Total internal vertical height

// Pin Definitions
#define PIN_TRIG 5
#define PIN_ECHO 18
#define PIN_LED  2

// Telemetry Interval (e.g. 60 seconds)
const unsigned long INTERVAL_MS = 60000;
// ======================================================

void setup() {
  Serial.begin(115200);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_LED, OUTPUT);

  Serial.println("\n[SWMS IoT] Booting Smart Bin Node...");
  Serial.print("[SWMS IoT] Bin Code: ");
  Serial.println(BIN_CODE);

  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("[SWMS IoT] Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[SWMS IoT] WiFi connected! IP: " + WiFi.localIP().toString());
}

float measureDistanceCm() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  long duration = pulseIn(PIN_ECHO, HIGH, 30000); // 30ms timeout (~5m max)
  if (duration == 0) {
    return -1.0; // Sensor timeout / error
  }
  // Speed of sound: 343 m/s = 0.0343 cm/us -> distance = (duration * 0.0343) / 2
  float distance = duration * 0.0343 / 2.0;
  return distance;
}

void sendTelemetry(float distanceCm) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[SWMS IoT] WiFi not connected. Skipping telemetry.");
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", IOT_API_KEY);

  StaticJsonDocument<256> doc;
  doc["bin_code"] = BIN_CODE;
  doc["sensor_status"] = (distanceCm >= 0) ? "OK" : "ERROR";

  if (distanceCm >= 0) {
    doc["distance_cm"] = distanceCm;
    // Calculate fill percentage
    float fill = ((BIN_HEIGHT_CM - distanceCm) / BIN_HEIGHT_CM) * 100.0;
    if (fill < 0) fill = 0;
    if (fill > 100) fill = 100;
    doc["fill_percentage"] = fill;
  }

  String requestBody;
  serializeJson(doc, requestBody);

  digitalWrite(PIN_LED, HIGH);
  int httpResponseCode = http.POST(requestBody);
  digitalWrite(PIN_LED, LOW);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("[SWMS IoT] HTTP Code: %d | Response: %s\n", httpResponseCode, response.c_str());
  } else {
    Serial.printf("[SWMS IoT] HTTP Error: %s\n", http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}

void loop() {
  float distance = measureDistanceCm();
  Serial.printf("[SWMS IoT] Measured Distance: %.2f cm\n", distance);

  sendTelemetry(distance);
  delay(INTERVAL_MS);
}

