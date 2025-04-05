const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {WebhookClient} = require('dialogflow-fulfillment');

admin.initializeApp();
const db = admin.database();

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((req, res) => {
  const agent = new WebhookClient({ request: req, response: res });

  function handleTimeInfo(agent) {
    return db.ref('washing_machine').once('value')
      .then(snapshot1 => {
        const machine1 = snapshot1.val();
  
        return db.ref('washing_machine2').once('value')
          .then(snapshot2 => {
            const machine2 = snapshot2.val();
  
            // ฟอร์แมตข้อความเครื่องซักผ้าที่ 1
            let machine1Info = `เครื่องซักผ้า 1:\n` +
                               ` - เวลาเริ่ม⌚: ${machine1.start_time}\n` +
                               ` - เวลาสิ้นสุด⌚: ${machine1.end_time}\n` +
                               ` - เวลาที่เหลือ⌛: ${machine1.remaining_time} นาที\n`+
                               ` - สถานะ🟩🟥: ${machine1.status} `
  
            // ฟอร์แมตข้อความเครื่องซักผ้าที่ 2
            let machine2Info = `เครื่องซักผ้า 2:\n` +
                               ` - เวลาเริ่ม⌚: ${machine2.start_time2}\n` +
                               ` - เวลาสิ้นสุด⌚: ${machine2.end_time2}\n` +
                               ` - เวลาที่เหลือ⌛: ${machine2.remaining_time2} นาที\n`+
                               ` - สถานะ🟩🟥: ${machine2.status2} `
  
            // รวมข้อความทั้งหมดเป็นข้อความเดียวกัน
            let replyText = `${machine1Info}\n\n${machine2Info}`;
            
            agent.add(replyText);
          });
      })
      .catch(error => {
        console.error('Error fetching time info:', error);
        agent.add('❗มีข้อผิดพลาดในการดึงข้อมูลเวลาการทำงานของเครื่องซักผ้าครับ');
      });
  }
  

  function handleMachineStatus(agent) {
    return db.ref('washing_machine').once('value')
      .then(snapshot1 => {
        const machine1 = snapshot1.val();
  
        return db.ref('washing_machine2').once('value')
          .then(snapshot2 => {
            const machine2 = snapshot2.val();
  
            // ดึงสถานะของเครื่องซักผ้าที่ 1 และ 2
            const status1 = machine1.status;
            const status2 = machine2.status2;
  
            let replyText = '';
  
            // กรณีที่ผู้ใช้ถามถึงเครื่องที่ "ทำงานอยู่"
            if (agent.query.includes('ทำงาน')) {
              if (status1.includes('กำลังทำงาน')) {
                replyText += '🫧 เครื่องซักผ้าที่ 1 กำลังทำงานครับ 🫡\n';
              }
              if (status2.includes('กำลังทำงาน')) {
                replyText += '🫧 เครื่องซักผ้าที่ 2 กำลังทำงานครับ 🫡';
              }
              if (replyText === '') {
                replyText = '🙂‍↕️ ไม่มีเครื่องซักผ้าที่กำลังทำงานอยู่ สามารถนำผ้ามาซักตอนนี้ได้เลยครับ🫡';
              }
  
            // กรณีที่ผู้ใช้ถามถึงเครื่องที่ "ว่าง"
            } else if (agent.query.includes('กำลังว่าง')) {
              if (status1.includes('ว่างพร้อมใช้งาน')) {
                replyText += '🫧 เครื่องซักผ้าที่ 1 ว่างพร้อมใช้งานครับ 🫡\n';
              }
              if (status2.includes('ว่างพร้อมใช้งาน')) {
                replyText += '🫧 เครื่องซักผ้าที่ 2 ว่างพร้อมใช้งานครับ 🫡';
              }
              if (replyText === '') {
                replyText = '🙂‍↕️ ไม่มีเครื่องซักผ้าที่ว่างพร้อมใช้งานในตอนนี้ครับ😓🥹\n โปรดลองเช็คที่เมนู "เช็คเวลาการซักผ้า ➡️ เวลาการทำงาน" ที่เมนูด้านล่างนะครับ\n ขอบคุณครับ 🙇‍♂️🙇‍♂️';
              }
  
            // กรณีที่ผู้ใช้ถามถึงเครื่องที่ "รอคนนำผ้าออก"
            } else if (agent.query.includes('รอเจ้าของนำผ้าออก')) {
              if (status1.includes('รอคนนำผ้าออก')) {
                replyText += '✨เครื่องซักผ้าที่ 1 ซักเสร็จแล้ว✨ รอเจ้าของมานำผ้าออกครับ 🫡\n';
              }
              if (status2.includes('รอคนนำผ้าออก')) {
                replyText += '✨เครื่องซักผ้าที่ 2 ซักเสร็จแล้ว✨ รอเจ้าของมานำผ้าออกครับ 🫡';
              }
              if (replyText === '') {
                replyText = '🙂‍↕️ ไม่มีเครื่องซักผ้าที่รอให้เจ้าของมานำผ้าออกจากเครื่องครับ\n ❓❓อาจจะเป็นเพราะว่าเครื่องนั้น ๆ กำลังซักอยู่หรือซักเสร็จเเล้ว\n โปรดลองเช็คที่เมนู "เช็คเวลาการซักผ้า ➡️ เวลาการทำงาน" ที่เมนูด้านล่างนะครับ\n ขอบคุณครับ 🙇‍♂️🙇‍♂️';
              }
            } 
  
            agent.add(replyText);
          });
      })
      .catch(error => {
        console.error('Error fetching machine status:', error);
        agent.add('❗มีข้อผิดพลาดในการดึงข้อมูลสถานะของเครื่องซักผ้าครับ');
      });
  } 
  
  function handleCompareRemainingTime(agent) {
    return db.ref('washing_machine').once('value')
      .then(snapshot1 => {
        const machine1 = snapshot1.val();
  
        return db.ref('washing_machine2').once('value')
          .then(snapshot2 => {
            const machine2 = snapshot2.val();
  
            // ตรวจสอบค่า remaining_time ของเครื่องซักผ้าที่ 1
            let remainingTime1Message;
            if (machine1.remaining_time === "รอการทำงาน") {
              remainingTime1Message = "🫧 เครื่องซักผ้าที่ 1 กำลังรอการทำงานครับ 🫡";
            } else if (parseFloat(machine1.remaining_time2) === 0)  {
              remainingTime1Message = "🫧 เครื่องซักผ้าที่ 1 ซักเสร็จแล้วและกำลังรอให้เจ้าของนำผ้าออกจากเครื่องครับ 🫡";
            } else if (!isNaN(parseFloat(machine1.remaining_time)) && parseFloat(machine1.remaining_time) > 0) {
              remainingTime1Message = `🫧 เครื่องซักผ้าที่ 1 กำลังทำงาน ซึ่งเหลือเวลาอีก ${machine1.remaining_time} นาทีครับ 🙇‍♂️`;
            } else {
              remainingTime1Message = "❗ไม่สามารถระบุสถานะของเครื่องซักผ้าที่ 1 ได้ครับ";
            }
  
            // ตรวจสอบค่า remaining_time ของเครื่องซักผ้าที่ 2
            let remainingTime2Message;
            if (machine2.remaining_time2 === "รอการทำงาน") {
              remainingTime2Message = "🫧 เครื่องซักผ้าที่ 2 กำลังรอการทำงานครับ 🫡";
            } else if (parseFloat(machine2.remaining_time2) === 0)  {
              remainingTime2Message = "🫧 เครื่องซักผ้าที่ 2 ซักเสร็จแล้วและกำลังรอให้เจ้าของนำผ้าออกจากเครื่องครับ 🫡";
            } else if (!isNaN(parseFloat(machine2.remaining_time2)) && parseFloat(machine2.remaining_time2) > 0) {
              remainingTime2Message = `🫧 เครื่องซักผ้าที่ 2 กำลังทำงาน ซึ่งเหลือเวลาอีก ${machine2.remaining_time2} นาทีครับ 🙇‍♂️`;
            } else {
              remainingTime2Message = "❗ไม่สามารถระบุสถานะของเครื่องซักผ้าที่ 2 ได้ครับ";
            }
  
             // เปรียบเทียบเวลาในการทำงาน หากทั้งสองเครื่องกำลังทำงานอยู่
            let comparisonMessage = '';
            const remainingTime1 = parseFloat(machine1.remaining_time);
            const remainingTime2 = parseFloat(machine2.remaining_time2);

            if (!isNaN(remainingTime1) && !isNaN(remainingTime2) && remainingTime1 > 0 && remainingTime2 > 0) {
              const timeDifference = Math.abs(remainingTime1 - remainingTime2); // คำนวณความแตกต่างของเวลา

              if (remainingTime1 < remainingTime2) {
                comparisonMessage = `🤔 ผมแนะนำเครื่องซักผ้าที่ 1 เพราะเหลือเวลาน้อยกว่า ${timeDifference} นาทีครับ 🥰`;
              } else if (remainingTime1 > remainingTime2) {
                comparisonMessage = `🤔 ผมแนะนำเครื่องซักผ้าที่ 2 เพราะเหลือเวลาน้อยกว่า ${timeDifference} นาทีครับ 🥰`;
              } else {
                comparisonMessage = '😃 เครื่องซักผ้าทั้งสองเครื่องเหลือเวลาเท่ากันครับ 🫡';
              }
            } else {
              comparisonMessage = "🥹🥹 ขอโทษครับ ผมไม่สามารถเปรียบเทียบเวลาในการทำงานได้\n ❓อาจเป็นเพราะเครื่องซักผ้าบางเครื่องไม่ได้อยู่ในสถานะการทำงานหรือซักเสร็จไปแล้วและรอให้เจ้าของมานำผ้าออกจากเครื่อง คุณสามารถนำผ้ามารอซักได้เลยนะครับ 🙇‍♂️🙇‍♂️";
            }
  
            // ตอบกลับผู้ใช้ด้วยข้อมูลทั้งหมด
            let replyText = `${remainingTime1Message}\n${remainingTime2Message}\n\n${comparisonMessage}`;
            agent.add(replyText);
          });
      })
      .catch(error => {
        console.error('Error comparing remaining times:', error);
        agent.add('❗มีข้อผิดพลาดในการเปรียบเทียบเวลาในการทำงานครับ');
      });
  }
  
let intentMap = new Map();
intentMap.set('Time Info Intent', handleTimeInfo); // Intent สำหรับบอกเวลาเริ่ม-สิ้นสุด และเวลาที่เหลือ
intentMap.set('Machine Status Intent', handleMachineStatus); // Intent สำหรับบอกสถานะการทำงานของเครื่องซักผ้า
intentMap.set('Compare Remaining Time Intent', handleCompareRemainingTime); // Intent สำหรับเปรียบเทียบเวลาในการทำงานของเครื่อง
agent.handleRequest(intentMap);
});
