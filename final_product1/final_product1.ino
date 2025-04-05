#include <WiFi.h>
#include <FirebaseESP32.h>
#include <time.h>

// ข้อมูล Firebase
#define FIREBASE_HOST "https://lmao-b1971-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define FIREBASE_AUTH "7lBnFsjp88H7V8JjITTorUTiyeeaYrX16Xe4L6"

// ข้อมูล WiFi
#define WIFI_SSID "eieieiei"
#define WIFI_PASSWORD "1234567890"


FirebaseData firebaseData;
FirebaseConfig config;
FirebaseAuth auth;

int vibrationPin = 34;  // พินที่เชื่อมต่อกับเซนเซอร์สั่นสะเทือน
int vibrationCount = 0;

unsigned long vibrationStartTime = 0;
unsigned long lastVibrationTime = 0;
unsigned long lastSendTime = 0;

bool washingRunning = false;
bool waitingForVibrations = true;

const unsigned long detectionInterval = 300000;   // 5 นาที (5 * 60 * 1000 มิลลิวินาที)
const unsigned long washingDuration = 300000;    // 1 ชั่วโมง (1 * 5 * 60 * 1000 มิลลิวินาที)
const unsigned long pickupDuration = 600000;      // 10 นาที (10 * 60 * 1000 มิลลิวินาที)
const unsigned long vibrationPauseLimit = 1500000; // 25 นาที (25 * 60 * 1000 มิลลิวินาที)

unsigned long washingStartTime = 0;
unsigned long washingEndTime = 0;
unsigned long pickupEndTime = 0;

unsigned long lastDebounceTime = 0;  // เวลาสุดท้ายที่มีการตรวจจับการสั่น
const unsigned long debounceDelay = 1000;  // หน่วงเวลา 1 วินาที

enum MachineState {
  IDLE,
  WASHING,
  WASHING_COMPLETE,
  WAITING_FOR_PICKUP
};

MachineState currentState = IDLE;

void setup() {
  Serial.begin(115200);
  pinMode(vibrationPin, INPUT);

    // เชื่อมต่อ WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi");
  // ตั้งค่า Firebase
  config.host = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // ตั้งค่าเวลา
  
  // ตั้งค่า timezone เป็น GMT+7 (ประเทศไทย)
  const long gmtOffset_sec = 7 * 3600;  // +7 ชั่วโมง
  const int daylightOffset_sec = 0;     // ไม่มี daylight saving time
  configTime(gmtOffset_sec, daylightOffset_sec, "pool.ntp.org", "time.nist.gov");
}

void loop() {
  
  int vibration = digitalRead(vibrationPin);

  switch (currentState) {
    case IDLE:
      // ตรวจสอบการหน่วงเวลาเพื่อป้องกันการตรวจจับซ้ำ
      if (vibration == HIGH && (millis() - lastDebounceTime > debounceDelay)) {
        lastDebounceTime = millis();  // บันทึกเวลาการสั่นครั้งล่าสุด

        // ตรวจจับการสั่น
        if (waitingForVibrations) {
          vibrationStartTime = millis();
          waitingForVibrations = false;
        }
        vibrationCount++;
        lastVibrationTime = millis();

        // ตรวจสอบเวลาว่าครบ 5 นาทีหรือยัง
        if (millis() - vibrationStartTime <= detectionInterval) {
          if (vibrationCount >= 15) {
            // เริ่มกระบวนการซักผ้า
            startWashingCycle();
          }
        } else {
          // ไม่ครบ 15 ครั้งภายใน 5 นาที รีเซ็ตค่า
          resetToIdle();
        }
      }
      break;

    case WASHING:
      if (vibration == HIGH) {
        lastVibrationTime = millis();
      }

      // ตรวจสอบการหยุดสั่นเกิน 25 นาที
      if (millis() - lastVibrationTime >= vibrationPauseLimit) {
        // รีเซ็ตระบบ
        resetToIdle();
      }

      // ส่งเวลาที่เหลือทุก ๆ 1 นาที
      if (millis() - lastSendTime >= 60000) {
        lastSendTime = millis();
        sendRemainingTime();
      }

      // ตรวจสอบว่าครบ 1 ชั่วโมงหรือยัง
      if (millis() - washingStartTime >= washingDuration) {
        // กระบวนการซักผ้าเสร็จสิ้น
        currentState = WASHING_COMPLETE;
        washingEndTime = millis();
        Firebase.setString(firebaseData, "/washing_machine/status", "การซักผ้าเสร็จสิ้นรอคนนำผ้าออก 10 นาที");
        Serial.println("Washing complete");
      }
      break;

    case WASHING_COMPLETE:
      // เริ่มนับเวลา 10 นาที
      if (millis() - washingEndTime >= pickupDuration) {
        // เปลี่ยนสถานะเป็นเครื่องว่าง
        currentState = IDLE;
        Firebase.setString(firebaseData, "/washing_machine/status", "เครื่องนี้ว่างพร้อมใช้งาน");
        Serial.println("Machine is now available");
        resetToIdle();
      }
      break;

    case WAITING_FOR_PICKUP:
      // สถานะนี้ถ้าต้องการเพิ่มสามารถทำได้
      break;
  }
}

void startWashingCycle() {
  currentState = WASHING;
  washingStartTime = millis();
  lastVibrationTime = millis();
  lastSendTime = millis();

  // บันทึกเวลาปัจจุบันและเวลาสิ้นสุด
  time_t now;
  time(&now);
  washingEndTime = washingStartTime + washingDuration;

  struct tm *timeinfo = localtime(&now);
  char timeString[25];
  strftime(timeString, sizeof(timeString), "%Y-%m-%d %H:%M:%S", timeinfo);

  // เวลาสิ้นสุด
  timeinfo->tm_hour += 1; // เพิ่ม 1 ชั่วโมง
  time_t endTime = mktime(timeinfo);
  char endTimeString[25];
  strftime(endTimeString, sizeof(endTimeString), "%Y-%m-%d %H:%M:%S", timeinfo);

  unsigned long remainingTime = (washingDuration - (millis() - washingStartTime)) / (1000 * 60); // นาที

  // ส่งข้อมูลไปยัง Firebase
  Firebase.setString(firebaseData, "/washing_machine/status", "เครื่องซักผ้ากำลังทำงานอยู่");
  Firebase.setString(firebaseData, "/washing_machine/start_time", String(timeString));
  Firebase.setString(firebaseData, "/washing_machine/end_time", String(endTimeString));
  Firebase.setInt(firebaseData, "/washing_machine/remaining_time" , remainingTime);

  Serial.println("Washing cycle started");
}

void sendRemainingTime() {
  unsigned long remainingTime = (washingDuration - (millis() - washingStartTime)) / (1000 * 60); // นาที
  Firebase.setInt(firebaseData, "/washing_machine/remaining_time", remainingTime);
  Serial.print("Remaining time: ");
  Serial.println(remainingTime);
}

void resetToIdle() {
  // รีเซ็ตตัวแปรทั้งหมด
  vibrationCount = 0;
  waitingForVibrations = true;
  currentState = IDLE;

  // รีเซ็ตข้อมูลใน Firebase
  Firebase.setString(firebaseData, "/washing_machine/status", "เครื่องนี้ว่าง");
  Firebase.setString(firebaseData, "/washing_machine/start_time", "รอการทำงาน");
  Firebase.setString(firebaseData, "/washing_machine/end_time", "รอการทำงาน");
  Firebase.setString(firebaseData, "/washing_machine/remaining_time", "รอการทำงาน");

  Serial.println("System reset to IDLE");
}

