const { response } = require('express');
const db = require('../config/connect'); // Assuming config.js is in the same directory
const { DateTime } = require('luxon');
const moment = require('moment-timezone');
const axios = require('axios');

const getAllCourses = async (req, res) => {
  try {
    const { date } = req.query;
    //   console.log(typeof(week) ,year);
    const inputDate = DateTime.fromFormat(date, 'yyyy/L/d');
    const startOfMonth = inputDate.startOf('month').toFormat('yyyy-MM-dd HH:mm');
    const endOfMonth = inputDate.endOf('month').toFormat('yyyy-MM-dd HH:mm');
    console.log("Start of the month:", startOfMonth);
    console.log("End of the month:", endOfMonth);

    // const startOfWeek = DateTime.fromObject({ weekYear: year, weekNumber: week });
    // const date_start = startOfWeek.startOf('day').toFormat('yyyy-MM-dd HH:mm');

    // // Get the end of the week
    // const endOfWeek = startOfWeek.endOf('week');
    // const date_end = endOfWeek.endOf('day').toFormat('yyyy-MM-dd HH:mm');

    // console.log("start : ", date_start, "end", date_end);

    const [collectif_courses] = await db.query(`
        SELECT
               "C" AS type,
               collectif_courses.start_at AS hour_start,
               collectif_courses.id as course_id,collectives.material,program_id,collectif_sessions.id as session_id,
               IF(collectif_plannings.duration, collectif_plannings.duration, collectif_courses.duration) as duration,
               DATE_ADD(collectif_courses.start_at, INTERVAL IF(collectif_plannings.duration, collectif_plannings.duration, collectif_courses.duration)*60 MINUTE) as hour_end,
               CASE
                 WHEN collectif_courses.start_at <= NOW() AND NOW() <= DATE_ADD(collectif_courses.start_at, INTERVAL order_sessions.hours HOUR) THEN "S"
                 WHEN NOW() < collectif_courses.start_at THEN "N"
                 WHEN NOW() > DATE_ADD(collectif_courses.start_at, INTERVAL 15 MINUTE) THEN "E"
               END AS status,
               collectives.title,
               trans_title.value as t_title,
               order_sessions.id as order_sessions_id,
               CONCAT(collectives.material, "-", program_id, "-" , collectif_sessions.id, "-" ,collectif_courses.id) AS "ref"


        FROM orders
    
        JOIN order_sessions ON orders.id = order_sessions.order_id
        JOIN collectif_sessions ON order_sessions.session_id = collectif_sessions.id
        JOIN collectif_courses ON collectif_courses.session_id = collectif_sessions.id
        LEFT JOIN collectif_plannings ON collectif_courses.planning_id = collectif_plannings.id
        JOIN collectives ON collectives.id = collectif_sessions.collectif_id
        LEFT JOIN translations as trans_title ON trans_title.foreign_key = collectives.id AND trans_title.table_name = 'collectives' AND trans_title.column_name = 'title'
       

        WHERE collectif_courses.start_at BETWEEN ? AND ?
          AND orders.user_id = ?
          AND orders.paid_at IS NOT NULL
          AND orders.program_type = 'C'
          AND orders.paid_at IS NOT NULL
        GROUP BY  type,
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
        ORDER BY collectif_courses.start_at DESC
      `, [startOfMonth, endOfMonth, res.locals.id]);

    const [individual_courses] = await db.query(`
        SELECT 
        "I" AS type,
             individual_courses.start_at as hour_start,
               individual_courses.id as course_id,individuals.material,program_id,individual_sessions.id as session_id,
               IF(individual_plannings.duration, individual_plannings.duration, individual_courses.duration) as duration,
               DATE_ADD(individual_courses.start_at, INTERVAL IF(individual_plannings.duration, individual_plannings.duration, individual_courses.duration)*60 MINUTE) as hour_end,
               CASE
                 WHEN individual_courses.start_at <= NOW() AND NOW() <= DATE_ADD(individual_courses.start_at, INTERVAL order_sessions.hours HOUR) THEN "S"
                 WHEN NOW() < individual_courses.start_at THEN "N"
                 WHEN NOW() > DATE_ADD(individual_courses.start_at,  INTERVAL 15 MINUTE) THEN "E"
               END AS status,
               individuals.title,
               trans_title.value as t_title,
               order_sessions.id as order_sessions_id,
               CONCAT(individuals.material, "-" , program_id , "-" , individual_sessions.id , "-" , individual_courses.id) AS "ref"

        FROM orders
        JOIN order_sessions ON orders.id = order_sessions.order_id
        JOIN individual_sessions ON order_sessions.session_id = individual_sessions.id
        JOIN individual_courses ON individual_courses.session_id = individual_sessions.id
        LEFT JOIN individual_plannings ON individual_courses.planning_id = individual_plannings.id
        JOIN individuals ON individuals.id = individual_sessions.individual_id
        LEFT JOIN translations as trans_title ON trans_title.foreign_key = individuals.id AND trans_title.table_name = 'individuals' AND trans_title.column_name = 'title'
        
        WHERE individual_courses.start_at BETWEEN ? AND ?
          AND orders.user_id = ?
          AND orders.paid_at IS NOT NULL
          AND orders.program_type = 'I'
          AND orders.paid_at IS NOT NULL
        GROUP BY  type,
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
        ORDER BY individual_courses.start_at DESC
      `, [startOfMonth, endOfMonth, res.locals.id]);

      // const sqlQuery = "SHOW VARIABLES LIKE 'sql_mode'";
      // const [type]= await db.query(sqlQuery);
      // console.log("type : ",type);
      // req.get('accept-language'),
      // AND trans_title.locale = ? 

    const courses = [...collectif_courses, ...individual_courses];
    const currentTime = DateTime.now().setZone('Europe/Paris');
    
    for (let crs in courses) {
      console.log("date 1 : ",courses[crs].hour_start);
      const courseStart = new Date(courses[crs].hour_start);
      const courseEnd = new Date(courses[crs].hour_end);
      console.log("courseStart : ",courseStart);
      const fifteenMinutesAgo = new Date(courseStart.getTime() - 15 * 60000);

      const fifteenMinutesLater = new Date(courseEnd.getTime() + 15 * 60000); // 15 minutes in milliseconds




      // Get the current time
      
      // Subtract 15 minutes from the current time
      console.log("current time : ",currentTime, " ,before  ",fifteenMinutesAgo, " , after ",fifteenMinutesLater);
      
      // Compare the course start time with 15 minutes ago
      if (currentTime < fifteenMinutesAgo || currentTime >fifteenMinutesLater) {
        console.log("hereeeeeeee");
        courses[crs].bbb="";
        continue;
      }      
      const bbb = await getbbbUrl(courses[crs].type, courses[crs].course_id, res.locals.id);
      courses[crs].bbb = bbb || "";
    }
    res.json({
      courses: courses
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

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



const addCourseNote = async (req, res) => {
  try {
    const { courseId, remarkTo, note,raison,success,program_type,course_id } = req.body;
    const createdAt = new Date();

    const [existingNotes] = await db.query(
      'SELECT * FROM course_remarks WHERE course_id=? AND remark_to=? AND remark_by=?',
      [courseId,remarkTo,res.locals.id]
    );
    if (existingNotes.length !== 0) {
      return res.json({
        success: false,
        message: 'You already sent a response for this course',
      });
    }

    const [result] = await db.query(
      'INSERT INTO course_remarks (course_id, remark_to, remark_by , note, remark,success,program_type,course_id,created_at) VALUES (?, ?,?,?, ?, ?,?,?,?)',
      [courseId,remarkTo,res.locals.id,note,raison,success,program_type,course_id,createdAt]
    );

    // Check if the note was successfully inserted
    if (result.affectedRows === 1) {
      res.status(200).json({
        success: true,
        message: 'Course note added successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to add course note'
      });
    }
  }
  catch (e) {
    console.log("error : ",e);
    res.status(500).json({
      message: "Server error"
    });
  }
}

const getNotesForStudent = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const [notes] = await db.query(
      ` SELECT

            CASE
                WHEN crs.program_type = 'C' THEN cs.id
                WHEN crs.program_type = 'I' THEN iss.id
            END AS session_id,

            CASE
                WHEN crs.program_type = 'I' AND  ic.start_at <= now() AND now() <= DATE_ADD(ic.start_at, INTERVAL os.hours HOUR) THEN "S"
                WHEN crs.program_type = 'I' AND now() < ic.start_at THEN "N"
                WHEN crs.program_type = 'I' AND now() > DATE_ADD(ic.start_at, INTERVAL os.hours HOUR) THEN "E"

                WHEN crs.program_type = 'C' AND cc.start_at <= now() AND now() <= DATE_ADD(cc.start_at, INTERVAL cp.duration HOUR) THEN "S"
                WHEN crs.program_type = 'C' AND  now() < cc.start_at THEN "N"
                WHEN crs.program_type = 'C' AND  now() > DATE_ADD(cc.start_at, INTERVAL 15 MINUTE) THEN "E"
            END AS status,

            CASE 
                WHEN crs.program_type="C" THEN col.material
                WHEN crs.program_type="I" THEN ind.material
            END AS material,

            Case 
                WHEN crs.program_type="C" THEN    CONCAT(col.material, "-",  orders.program_id, "-", cs.id, "-" ,cc.id) 
                WHEN crs.program_type="I" THEN  CONCAT(ind.material, "-",   orders.program_id, "-", iss.id, "-" ,ic.id) 
            END AS ref,

            CASE 
                WHEN crs.program_type = 'C' THEN col.title
                WHEN crs.program_type = 'I' THEN ind.title
            END AS title ,

            CASE 
            WHEN crs.program_type = 'C' THEN cp.duration
            WHEN crs.program_type = 'I' THEN ip.duration  
            END AS duration,
            
            CASE 
              WHEN crs.program_type = 'I' THEN ic.start_at
              WHEN crs.program_type = 'C' THEN cc.start_at
            END AS date,

            orders.paid_at, orders.program_id as program_id , crs.id,crs.program_type, crs.course_id , crs.remark_to as Student , crs.remark_by as teacher , crs.note as teachernote , crs2.note as studentresponse  
            FROM course_remarks as crs 
            LEFT JOIN course_remarks as crs2 ON crs2.remark_to = crs.remark_by AND crs2.remark_by= ?  AND crs.course_id=crs2.course_id 
            
            LEFT JOIN 
            individual_courses AS ic 
            ON crs.program_type = 'I' AND crs.course_id = ic.id
            
            LEFT JOIN
            collectif_courses AS cc 
            ON crs.program_type = 'C' AND crs.course_id = cc.id
            
            LEFT JOIN 
            collectif_sessions AS cs 
            ON crs.program_type = 'C' AND cc.session_id = cs.id
            
            LEFT JOIN 
            individual_sessions AS iss
            ON crs.program_type = 'I' AND ic.session_id = iss.id
            
            LEFT JOIN 
            order_sessions AS os
            ON crs.program_type = 'I' AND os.session_id=iss.id
            
            LEFT JOIN 
            collectives AS col
            ON crs.program_type = 'C' AND cs.collectif_id=col.id
            
            LEFT JOIN 
            individuals AS ind
            ON crs.program_type = 'I' AND  iss.individual_id=ind.id
            
            LEFT JOIN 
            collectif_plannings AS cp
            ON  crs.program_type = 'C' AND cp.collectif_id=col.id

            LEFT JOIN 
            individual_plannings AS ip
            ON crs.program_type = 'I' AND ip.individual_id=ind.id

            LEFT JOIN 
            order_sessions AS ordersession
            ON ordersession.session_id=cs.id OR ordersession.session_id = iss.id
            
            LEFT JOIN 
            orders AS orders
            ON orders.id = ordersession.order_id
            
            WHERE crs.remark_to = ? AND orders.paid_at IS NOT NULL
            ORDER BY date DESC
            LIMIT ?, ?

            
          `,
          [res.locals.id, res.locals.id, offset, pageSize]
    );

    res.json({
      notes,
      page,
      pageSize,
      length: notes.length
    })
  }
  catch (e) {
    console.log(e);
    res.status(500).json({
      message: "Server error"
    });
  }
} 

module.exports = {
  addCourseNote,
  getAllCourses,
  getNotesForStudent
}