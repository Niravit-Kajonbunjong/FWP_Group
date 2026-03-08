const express = require("express");
const path = require("path");
const port = 3000;
const sqlite3 = require('sqlite3').verbose();
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const app = express();

app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));

// const { teacher_auth }  = require('./middleware/auth.js');
const { teacher_auth,student_auth,admin_auth,registration_auth }  = require('./middleware/auth.js');
app.use(cookieParser());

// Connect to SQLite database
let db = new sqlite3.Database('db.db', (err) => {    
  if (err) {
      return console.error(err.message);
  }
  console.log('Connected to the SQlite database.');
});

app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const kate = "wowzaeiei";
app.post("/login", async(req, res) => {
    try {
        const { email, password } = req.body;
        console.log("email: ", email)
        const sql = 'SELECT * FROM User WHERE email = ? AND password = ?';
        db.get(sql, [email, password], async function (err, results) {
            if (err) {
                console.error("Error processing request", err);
                return res.status(500).send({ message: "Error processing request" });
            }
            if (!results) {
                res.status(404).send('Authentication failed: user not found.');
                return;
            }
            const payload = {
                id: results.user_id,
                role: results.role
            };

            const accessToken = generateAccessToken(payload);

            jwt.sign(payload, kate, { expiresIn: '7d' }, (err, token) => {
                if (err) throw err;
                res.cookie('accessToken', accessToken, { httpOnly: true, secure: true });
                if(results.role === 'teacher') {
                    return res.redirect('/home');
                }else {
                    return res.redirect('/');
                }
            });

        });
    } catch (error) {
        console.error("Unexpected error", error);
        res.status(500).json({ message: "Unexpected error processing login" });
    }
});

const generateAccessToken = (payload) => {
    return jwt.sign(payload, kate, { expiresIn: '7d' })
}

app.get("/", (req, res) => {
  res.send('eiei'); 
});

app.post('/logout', (req, res) => {
    res.cookie('accessToken', '', { expires: new Date(0), httpOnly: true });
    res.redirect('/login');
});

app.get("/login", (req, res) => {
  res.render("login"); 
});
//teacher_auth => student_auth
app.get("/home", teacher_auth, (req, res) => {
    
    const userData = req.teacher;
    // const userData = req.student;

    const sql = `
        SELECT 
            u.user_id,
            u.email,
            u.role,
            u.gender,
            u.first_name,
            u.last_name,
            u.birth_date,
            u.phone,
            u.profile_image,
            t.teacher_code,
            t.education_level
        FROM User u
        LEFT JOIN Teacher t ON u.user_id = t.user_id
        WHERE u.user_id = ?
    `;

    db.get(sql, [userData.id], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
        }
        
        if (!row) {
            return res.status(404).send("ไม่พบข้อมูลผู้ใช้นี้ในระบบ");
        }

        row.avatar = row.profile_image;

        res.render("home", { user: row }); 
    });
});

const getActiveSemester = (callback) => {
    db.get("SELECT semester_id, term, year FROM Semester WHERE is_active = 1 LIMIT 1", [], (err, row) => {
        callback(err, row);
    });
};

app.get("/teacher/schedule", teacher_auth, (req, res) => {
    const userData = req.teacher;

    const sqlUser = `
        SELECT u.*, t.teacher_id 
        FROM User u 
        LEFT JOIN Teacher t ON u.user_id = t.user_id 
        WHERE u.user_id = ?
    `;

    db.get(sqlUser, [userData.id], (err, user) => {
        if (err || !user) return res.status(500).send("ไม่พบข้อมูลผู้ใช้");

        db.get("SELECT * FROM Semester WHERE is_active = 1 LIMIT 1", [], (err, activeSem) => {
            if (err || !activeSem) return res.status(500).send("ไม่พบภาคเรียนที่เปิดใช้งาน (is_active=1)");

            const sqlSchedule = `
                SELECT cs.*, c.course_code, c.course_name, s.year, s.term
                FROM CourseSection cs
                JOIN Course c ON cs.course_id = c.course_id
                JOIN Semester s ON cs.semester_id = s.semester_id
                WHERE cs.teacher_id = ? 
                AND cs.is_active = 1 
                AND s.semester_id = ?
                ORDER BY CASE cs.schedule_day 
                    WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 
                    WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 
                    WHEN 'Friday' THEN 5 END, cs.start_time
            `;

            db.all(sqlSchedule, [user.teacher_id, activeSem.semester_id], (err, schedules) => {
                res.render("teacherSchedule", { 
                    user: user, 
                    schedules: schedules || [], 
                    currentSemester: activeSem
                });
            });
        });
    });
});

app.get("/teacher/grading", teacher_auth, (req, res) => {
    const userData = req.teacher; 

    db.get("SELECT * FROM User WHERE user_id = ?", [userData.id], (err, user) => {
        if (err || !user) return res.status(500).send("ไม่พบข้อมูลผู้ใช้");

        db.get("SELECT teacher_id FROM Teacher WHERE user_id = ?", [userData.id], (err, teacher) => {
            if (err || !teacher) return res.status(500).send("ไม่พบข้อมูลอาจารย์");

            getActiveSemester((err, activeSem) => {
                if (err || !activeSem) return res.status(500).send("ไม่พบข้อมูลภาคเรียนที่กำลังใช้งาน");

                const sqlCourses = `
                    SELECT cs.section_id, cs.room, c.course_code, c.course_name
                    FROM CourseSection cs
                    JOIN Course c ON cs.course_id = c.course_id
                    WHERE cs.teacher_id = ? AND cs.is_active = 1 AND cs.semester_id = ?
                `;

                db.all(sqlCourses, [teacher.teacher_id, activeSem.semester_id], (err, courses) => {
                    res.render("teacherCourseList", { 
                        user: user, 
                        courses: courses,
                        currentSemester: activeSem 
                    });
                });
            });
        });
    });
});


app.get("/teacher/grading/:section_id",teacher_auth, (req, res) => {
    const sectionId = req.params.section_id;
    const userData = req.teacher;

    const sqlStudents = `
        SELECT 
            s.student_id, 
            s.student_code, 
            u.first_name, 
            u.last_name,
            g.assignment_score, 
            g.midterm_score, 
            g.final_score, 
            g.grade_letter
        FROM Enrollment e
        JOIN Student s ON e.student_id = s.student_id
        JOIN User u ON s.user_id = u.user_id
        LEFT JOIN Grade g ON s.student_id = g.student_id AND g.section_id = e.section_id
        WHERE e.section_id = ? 
        AND e.status = 'active' 
        ORDER BY s.student_code ASC
    `;

    const sqlCourse = `
        SELECT c.course_code, c.course_name, s.term, s.year
        FROM CourseSection cs
        JOIN Course c ON cs.course_id = c.course_id
        JOIN Semester s ON cs.semester_id = s.semester_id
        WHERE cs.section_id = ?
    `;

    db.get("SELECT * FROM User WHERE user_id = ?", [userData.id], (err, user) => {
        if (user) user.avatar = user.profile_image;

        db.get(sqlCourse, [sectionId], (err, course) => {
            if (err || !course) return res.status(404).send("ไม่พบรายวิชานี้");

            db.all(sqlStudents, [sectionId], (err, students) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Internal Server Error");
                }
                console.log("เช็คข้อมูลนักเรียนคนแรก:", students[0]);
                res.render("teacherGrading", { 
                    user: user || {}, 
                    sectionId: sectionId,
                    course: course, 
                    students: students
                });
            });
        });
    });
});

app.post("/teacher/grading/:section_id",teacher_auth, (req, res) => {
    const userData = req.teacher;
    const sectionId = req.params.section_id;
    let studentIds = req.body.student_id;
    let assigns = req.body.assignment_score;
    let midterms = req.body.midterm_score;
    let finals = req.body.final_score;
    let grades = req.body.grade_letter;

    if (!Array.isArray(studentIds)) {
        studentIds = [studentIds];
        assigns = [assigns];
        midterms = [midterms];
        finals = [finals];
        grades = [grades];
    }

    for (let i = 0; i < studentIds.length; i++) {
        let sId = studentIds[i];
        
        let asn = (assigns[i] !== "" && assigns[i] !== undefined) ? parseFloat(assigns[i]) : 0;
        let mid = (midterms[i] !== "" && midterms[i] !== undefined) ? parseFloat(midterms[i]) : 0;
        let fin = (finals[i] !== "" && finals[i] !== undefined) ? parseFloat(finals[i]) : 0;
        let grd = grades[i] || 'F';

        const sqlSaveGrade = `
            INSERT INTO Grade (student_id, section_id, entered_by, assignment_score, midterm_score, final_score, grade_letter, entered_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(student_id, section_id) 
            DO UPDATE SET 
                assignment_score = excluded.assignment_score,
                midterm_score = excluded.midterm_score,
                final_score = excluded.final_score,
                grade_letter = excluded.grade_letter,
                entered_at = CURRENT_TIMESTAMP
        `;

        db.run(sqlSaveGrade, [sId, sectionId, userData.id, asn, mid, fin, grd], (err) => {
            if (err) console.error("Database Error:", err.message);
        });
    }

    setTimeout(() => {
        res.redirect("/teacher/grading/" + sectionId);
    }, 500);
});

app.listen(port, () => {
  console.log(`Starting server at port ${port}`);
});

app.listen(port, () => {
  console.log(`Starting server at port ${port}`);
});