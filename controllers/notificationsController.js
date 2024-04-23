const db = require('../config/connect'); // Assuming config.js is in the same directory
const cron = require('node-cron');
const moment = require('moment-timezone');
let cronjobs = [];
// Set the time zone for France
const timeZone = 'Europe/Paris';
const { Timestamp, addDoc, collection, doc, getDoc, getDocs, limit, query, serverTimestamp, startAt, updateDoc, where, setDoc, orderBy } = require("firebase/firestore");
const { auth, dbfirebase } = require("./firebase");
const axios = require('axios');
const { DateTime } = require('luxon');



const getTokens = async (users) => {
  try {
    const usersCollection = collection(dbfirebase, 'users');
    const q1 = query(usersCollection);

    const tokens = [];

    const snapshot = await getDocs(q1);

    snapshot.forEach((doc) => {
      const data = doc.data();

      if (users?.includes(data.id_user)) {
        tokens.push(data.token);
      }

    });


    console.log("tokens : ", tokens);

    return tokens;
  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Server error",
    });
  }
};



const pushNotif = async (courseId, type, sessionId, title, message) => {
  try {
      console.log("session :", sessionId, " , ", type, " , ", courseId);
      let users;
      if (type == "C") {
        const [collectifUsers] = await db.query(`SELECT orders.user_id
                                 FROM orders
                                 JOIN order_sessions AS os ON orders.id = os.order_id
                                 JOIN collectif_sessions AS cs ON os.session_id = cs.id
                                 WHERE cs.id = ?
       `, [sessionId]);

      users = collectifUsers;
    }
    else {
      const [indUsers] = await db.query(`SELECT orders.user_id
    FROM orders
    JOIN order_sessions AS os ON orders.id = os.order_id
    JOIN individual_sessions AS iss ON os.session_id = iss.id

    WHERE iss.id=?
    `, [sessionId]);
      users = indUsers;
    }





    users = users.map((e) => e.user_id);
    console.log("users : ", users);

    const tokens = await getTokens(users);
    const serverKey = "AAAAvLf39Ec:APA91bGHvFUB3gbLlbtsFxHzyGp-kzDOqAXvmoG3iORqIbOeWPh4Smg1C0qM8Ji9TVpfSHRvZ-3VZDRlEz0GD85VD0DZ_Q4uwxX8K4-L52mzJAJb-WGugh4gD0uUxdvurT68TTuEqXMz";

    tokens.forEach(async (e) => {
      try {
        console.log("single not ", e);
        const response = await axios(
          {
            url: 'https://fcm.googleapis.com/fcm/send',
            method: 'post',
            data: {
              notification: {
                title: title,
                body: message,
              },
              priority: 'high',
              data: {
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                id: '1',
                status: 'done',
                title: title,
                body: message,
                navigate: 'true',
              },
              to: e,
            },
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `key=${serverKey}`,
            },
          });
          
        console.log('FCM API Response:', response.data);
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    })
  }
  catch (e) {
    console.log("errrr : ", e);

  }
}

const destroyCrons = () => {
  for (let i = 0; i < cronjobs.length; i++) {
    console.log("shed : ", cronjobs[i]);
    cronjobs[i].scheduledJob.stop();
  }
  cronjobs.splice(0, cronjobs.length);
}

const cronjob = async () => {
  try {
    destroyCrons();
    const currentDate = new Date();
    console.log("current date : ", currentDate);
    const [collectif_courses] = await db.query(`
        SELECT
        'C' as type,
        DATE_FORMAT(collectif_courses.start_at, "%d/%m/%Y %H:%i") as hour_start,
               collectif_courses.id as course_id,col.material,program_id,collectif_sessions.id as session_id,
               IF(collectif_plannings.duration, collectif_plannings.duration, collectif_courses.duration) as duration,
               DATE_ADD(collectif_courses.start_at, INTERVAL IF(collectif_plannings.duration, collectif_plannings.duration, collectif_courses.duration)*60 MINUTE) as hour_end,
               CASE
                 WHEN collectif_courses.start_at <= NOW() AND NOW() <= DATE_ADD(collectif_courses.start_at, INTERVAL order_sessions.hours HOUR) THEN "S"
                 WHEN NOW() < collectif_courses.start_at THEN "N"
                 WHEN NOW() > DATE_ADD(collectif_courses.start_at,  INTERVAL 15 MINUTE) THEN "E"
               END AS status,
               collectives.title,
               trans_title.value as t_title,
               order_sessions.id as order_sessions_id,
               CONCAT(col.material, "-", program_id, "-", collectif_sessions.id, "-" ,collectif_courses.id) AS "ref"

        FROM orders
    
        JOIN order_sessions ON orders.id = order_sessions.order_id
        JOIN collectif_sessions ON order_sessions.session_id = collectif_sessions.id
        JOIN collectif_courses ON collectif_courses.session_id = collectif_sessions.id
        LEFT JOIN collectif_plannings ON collectif_courses.planning_id = collectif_plannings.id
        JOIN collectives ON collectives.id = collectif_sessions.collectif_id
        LEFT JOIN translations as trans_title ON trans_title.foreign_key = collectives.id AND trans_title.table_name = 'collectives' AND trans_title.column_name = 'title'
        LEFT JOIN 
        collectives AS col
        ON collectif_sessions.collectif_id=col.id

        WHERE collectif_courses.start_at > ? 
          AND orders.paid_at IS NOT NULL
          AND orders.program_type = 'C'
          AND orders.paid_at IS NOT NULL
        GROUP BY type,
        hour_start,
        course_id,
        material,
        program_id,
        session_id,
        duration,
        hour_end,
        status,
        title,
        t_title,
        order_sessions_id,
        ref
        ORDER BY collectif_courses.start_at

      `, [currentDate]);

    const [individual_courses] = await db.query(`
        SELECT
        'I' as type,
          DATE_FORMAT(individual_courses.start_at, "%d/%m/%Y %H:%i") as hour_start,
               individual_courses.id as course_id,ind.material,program_id,individual_sessions.id as session_id,
               IF(individual_plannings.duration, individual_plannings.duration, individual_courses.duration) as duration,
               DATE_ADD(individual_courses.start_at, INTERVAL IF(individual_plannings.duration, individual_plannings.duration, individual_courses.duration)*60 MINUTE) as hour_end,
               CASE
                 WHEN individual_courses.start_at <= NOW() AND NOW() <= DATE_ADD(individual_courses.start_at, INTERVAL order_sessions.hours HOUR) THEN "S"
                 WHEN NOW() < individual_courses.start_at THEN "N"
                 WHEN NOW() > DATE_ADD(individual_courses.start_at,  INTERVAL 15 MINUTE ) THEN "E"
               END AS status,
               individuals.title,
               trans_title.value as t_title,
               order_sessions.id as order_sessions_id,
               CONCAT(ind.material, "-" , program_id , "-" , individual_sessions.id , "-" , individual_courses.id) AS "ref"

        FROM orders
        JOIN order_sessions ON orders.id = order_sessions.order_id
        JOIN individual_sessions ON order_sessions.session_id = individual_sessions.id
        JOIN individual_courses ON individual_courses.session_id = individual_sessions.id
        LEFT JOIN individual_plannings ON individual_courses.planning_id = individual_plannings.id
        JOIN individuals ON individuals.id = individual_sessions.individual_id
        LEFT JOIN translations as trans_title ON trans_title.foreign_key = individuals.id AND trans_title.table_name = 'individuals' AND trans_title.column_name = 'title'
        LEFT JOIN 
        individuals AS ind
        ON individual_sessions.individual_id=ind.id
        WHERE individual_courses.start_at > ?
        AND orders.paid_at IS NOT NULL
        AND orders.program_type = 'I'
        AND orders.paid_at IS NOT NULL
        GROUP BY type,
        hour_start,
        course_id,
        material,
        program_id,
        session_id,
        duration,
        hour_end,
        status,
        title,
        t_title,
        order_sessions_id,
        ref
        ORDER BY individual_courses.start_at

      `, [currentDate]);

    const notifs = [...collectif_courses, ...individual_courses];



    for (let i = 0; i < notifs.length; i++) {
      let ntf = notifs[i];

      console.log('date : ', ntf.hour_start);
      let parsedDateTime = moment(ntf.hour_start, 'DD/MM/YYYY HH:mm').subtract(15, 'minutes');

      // Extract minute, hour, day of the month, month, and day of the week
      let minute = parsedDateTime.format('mm');
      let hour = parsedDateTime.format('HH');
      let dayOfMonth = parsedDateTime.format('D');
      let month = parsedDateTime.format('M');
      let dayOfWeek = parsedDateTime.format('d');

      // letruct the cron expression
      let cronExpression = `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
      let triggerCron = async () => {
        console.log(`Cron triggered on ${ntf.hour_start}`);
        const message = "Votre cours " + ntf.material == "A" ? "Arabe" : "Coran" + " débute dans 15 minutes";
        const title = "Cours";
        await pushNotif(ntf.course_id, ntf.type, ntf.session_id, title, message);
        object.scheduledJob.stop(); // Stop the cron job after execution
      };
      let object = {};
      object.sessionId = ntf.session_id;
      object.scheduledJob = cron.schedule(cronExpression, triggerCron, { timezone: timeZone });
      cronjobs.push(object);
      //console.log(`Alarm scheduled in ${timeZone}:`, alarmSchedule);
    }
  }
  catch (e) {
    console.log(e);
  }
}

cronjob();


const stopCronJob = async (req, res) => {
  try {

    const { sessionId } = req.params;
    console.log("session : ", sessionId);

    cronjobs.forEach((e) => {
      if (e.sessionId == sessionId) {
        e.scheduledJob.stop();
      }
    })

    return res.json({
      success: true,
      message: "Stoped successfully"
    });

  }
  catch (e) {
    console.log(e);
    res.status(500).json({
      message: "Server error"
    });
  }
}

const restartCron = async (req, res) => {
  try {
    await cronjob();
    res.json({
      success: true,
      message: "Restarted successfully"
    });
  }
  catch (e) {
    console.log(e);
    res.status(500).json({
      message: "Server error"
    });
  }
}

// Define your alarm schedule (using cron syntax)


// const cron = require('node-cron');

// const sessions = [
//   { id: 1, start_at: new Date('2024-01-30T08:00:00') },
//   { id: 2, start_at: new Date('2024-01-30T10:30:00') },
//   // ... other sessions
//  ];

//   sessions.forEach(session => {
//   const sessionStartDate = session.start_at;
//   const fifteenMinutesBefore = new Date(sessionStartDate.getTime() - 15 * 60 * 1000); // 15 minutes in milliseconds

//   // Schedule the task to run 15 minutes before the session start time
//   cron.schedule(fifteenMinutesBefore.toString(), () => {
//     // Send the FCM notification
//     admin.messaging().sendToDevice(registrationToken, payload)
//       .then((response) => {
//         console.log(`Successfully sent notification for session ${session.id}:`, response);
//       })
//       .catch((error) => {
//         console.error(`Error sending notification for session ${session.id}:`, error);
//       });
//   });
// });


const notifications = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;


    const currentDate = new Date();
    const currentDatePlus15Minutes = new Date(currentDate.getTime() + 15 * 60000); // 15 minutes in milliseconds

    console.log("Current date:", currentDate);
    console.log("Current date + 15 minutes:", currentDatePlus15Minutes);

    const [collectif_courses] = await db.query(`
        SELECT "C" AS type , collectif_courses.start_at as hour_start,
        orders.user_id,  collectif_courses.id as course_id,col.material,program_id,collectif_sessions.id as session_id,
               IF(collectif_plannings.duration, collectif_plannings.duration, collectif_courses.duration) as duration,
               DATE_ADD(collectif_courses.start_at, INTERVAL IF(collectif_plannings.duration, collectif_plannings.duration, collectif_courses.duration)*60 MINUTE) as hour_end,
               CASE
                 WHEN collectif_courses.start_at <= NOW() AND NOW() <= DATE_ADD(collectif_courses.start_at, INTERVAL order_sessions.hours HOUR) THEN "S"
                 WHEN NOW() < collectif_courses.start_at THEN "N"
                 WHEN NOW() > DATE_ADD(collectif_courses.start_at,  INTERVAL 15 MINUTE) THEN "E"
               END AS status,
               collectives.title,
               trans_title.value as t_title,
               order_sessions.id as order_sessions_id,
               CONCAT(col.material, "-", program_id, "-", collectif_sessions.id, "-" ,collectif_courses.id) AS "ref"

        FROM orders
    
        JOIN order_sessions ON orders.id = order_sessions.order_id
        JOIN collectif_sessions ON order_sessions.session_id = collectif_sessions.id
        JOIN collectif_courses ON collectif_courses.session_id = collectif_sessions.id
        LEFT JOIN collectif_plannings ON collectif_courses.planning_id = collectif_plannings.id
        JOIN collectives ON collectives.id = collectif_sessions.collectif_id
        LEFT JOIN translations as trans_title ON trans_title.foreign_key = collectives.id AND trans_title.table_name = 'collectives' AND trans_title.column_name = 'title'
        LEFT JOIN 
        collectives AS col
        ON collectif_sessions.collectif_id=col.id

        WHERE collectif_courses.start_at <= ? 
          AND orders.user_id = ?
          AND orders.paid_at IS NOT NULL
          AND orders.program_type = 'C'
          AND orders.paid_at IS NOT NULL
        GROUP BY hour_start,
        user_id,
        course_id,
        material,
        program_id,
        session_id,
        duration,
        hour_end,
        status,
        title,
        t_title,
        order_sessions_id,
        ref
        ORDER BY collectif_courses.start_at DESC
        LIMIT ?, ?

      `, [currentDatePlus15Minutes, res.locals.id, offset, pageSize]);

    const [individual_courses] = await db.query(`
        SELECT "I" AS type , individual_courses.start_at as hour_start,
        orders.user_id,individual_courses.id as course_id,ind.material,program_id,individual_sessions.id as session_id,
               IF(individual_plannings.duration, individual_plannings.duration, individual_courses.duration) as duration,
               DATE_ADD(individual_courses.start_at, INTERVAL IF(individual_plannings.duration, individual_plannings.duration, individual_courses.duration)*60 MINUTE) as hour_end,
               CASE
                 WHEN individual_courses.start_at <= NOW() AND NOW() <= DATE_ADD(individual_courses.start_at, INTERVAL order_sessions.hours HOUR) THEN "S"
                 WHEN NOW() < individual_courses.start_at THEN "N"
                 WHEN NOW() > DATE_ADD(individual_courses.start_at,  INTERVAL 15 MINUTE ) THEN "E"
               END AS status,
               individuals.title,
               trans_title.value as t_title,
               order_sessions.id as order_sessions_id,
               CONCAT(ind.material, "-" , program_id , "-" , individual_sessions.id , "-" , individual_courses.id) AS "ref"

        FROM orders
        JOIN order_sessions ON orders.id = order_sessions.order_id
        JOIN individual_sessions ON order_sessions.session_id = individual_sessions.id
        JOIN individual_courses ON individual_courses.session_id = individual_sessions.id
        LEFT JOIN individual_plannings ON individual_courses.planning_id = individual_plannings.id
        JOIN individuals ON individuals.id = individual_sessions.individual_id
        LEFT JOIN translations as trans_title ON trans_title.foreign_key = individuals.id AND trans_title.table_name = 'individuals' AND trans_title.column_name = 'title'
        LEFT JOIN 
        individuals AS ind
        ON individual_sessions.individual_id=ind.id
        WHERE individual_courses.start_at <=?
        AND orders.user_id = ?
        AND orders.paid_at IS NOT NULL
        AND orders.program_type = 'I'
        AND orders.paid_at IS NOT NULL
        GROUP BY  hour_start,
        user_id,
        course_id,
        material,
        program_id,
        session_id,
        duration,
        hour_end,
        status,
        title,
        t_title,
        order_sessions_id,
        ref
        ORDER BY individual_courses.start_at DESC
        LIMIT ?, ?

      `, [currentDatePlus15Minutes, res.locals.id, offset, pageSize]);
    //   req.get('accept-language'),
    // AND trans_title.locale = ? 

    const notifs = [...collectif_courses, ...individual_courses];

   const currentTime = DateTime.now().setZone('Europe/Paris');


    for (let crs in notifs) {
      console.log("date 1 : ",notifs[crs].hour_start);
      const courseStart = new Date(notifs[crs].hour_start);
      const courseEnd = new Date(notifs[crs].hour_end);
      console.log("courseStart : ",courseStart);
      const fifteenMinutesAgo = new Date(courseStart.getTime() - 15 * 60000);

      const fifteenMinutesLater = new Date(courseEnd.getTime() + 15 * 60000); // 15 minutes in milliseconds



      
      // Get the current time
      
      // Subtract 15 minutes from the current time
      console.log("current time : ",currentTime, " ,before  ",fifteenMinutesAgo, " , after ",fifteenMinutesLater);
      
      // Compare the course start time with 15 minutes ago
      if (currentTime < fifteenMinutesAgo || currentTime >fifteenMinutesLater) {
        notifs[crs].bbb="";
        continue;
      }      
      const bbb = await getbbbUrl(notifs[crs].type, notifs[crs].course_id, res.locals.id);
      (notifs[crs].bbb = bbb || "");
    }

    return res.json({
      notifs,
      page,
      pageSize,
      length: notifs.length
    });
  }
  catch (e) {
    console.log(e);
    res.status(500).json({
      message: "Server error"
    })
  }
}

const getbbbUrl = async (courseType, courseId, userId) => {
  try {
    let url="";
    const link = "https://al-fissah.com/api/mobile/meeting/" + courseType + "/" + courseId + "/join/" + userId;
    const response = await axios({ url: link , method: "get" });
    if (response.data) {
      url = response.data;
    }
    console.log("substring : ",url?.substring(0,4));
    if(url?.substring(0,4)=="http"){
          return url;

    }
    return "";
  }
  catch (e) {
    console.log(e);
    return "";
  }

}


module.exports = {
  notifications,
  stopCronJob,
  restartCron,
}