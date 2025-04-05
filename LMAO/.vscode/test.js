const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { WebhookClient } = require('dialogflow-fulfillment');

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.database();

// Function to handle the status of the washing machine
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((req, res) => {
  const agent = new WebhookClient({ request: req, response: res });

  // Function to get machine status from Firebase
  function handleWashingMachineStatus(agent) {
    return db.ref('washing_machine/status').once('value')  // เปลี่ยน path ตรงนี้ให้ตรงกับโครงสร้างข้อมูล
      .then((snapshot) => {
        const machineStatus = snapshot.val();  // ดึงค่า status จาก Firebase

        // ส่งสถานะเครื่องซักผ้ากลับไปที่ผู้ใช้
        agent.add(`สถานะเครื่องซักผ้าคือ: ${machineStatus}`);
      })
      .catch((error) => {
        console.error('Error fetching machine status:', error);
        agent.add('เกิดข้อผิดพลาดในการดึงข้อมูลสถานะเครื่องซักผ้า.');
      });
  }

  // Map intents to the corresponding handler function
  let intentMap = new Map();
  intentMap.set('WashingMachineStatusIntent', handleWashingMachineStatus);  // แก้ชื่อ Intent ตรงนี้ให้ตรงกับ Intent ใน Dialogflow
  agent.handleRequest(intentMap);
});
