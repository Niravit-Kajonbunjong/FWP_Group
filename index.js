const express = require("express");
const path = require("path");
const port = 3000;
const sqlite3 = require('sqlite3').verbose();
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const app = express();

app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));

// เรียกใช้ Middleware จากไฟล์ auth.js
<<<<<<< Updated upstream
const { teacher_auth, student_auth, admin_auth, regis_auth } = require('./middleware/auth.js');
=======
const { teacher_auth, student_auth, admin_auth, regis_auth, general_auth } = require('./middleware/auth.js');
>>>>>>> Stashed changes
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const kate = "wowzaeiei";

const generateAccessToken = (payload) => {
    return jwt.sign(payload, kate, { expiresIn: '7d' });
}

app.post("/login", async(req, res) => {
    try {
        const { email, password } = req.body;
        console.log("email: ", email);
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
                } else if (results.role === 'registration') {
                    return res.redirect('/home');
                } else if (results.role === 'student') {
                    return res.redirect('/student/home'); 
                } else if (results.role === 'admin') {
<<<<<<< Updated upstream
                    return res.redirect('/admin/dashboard'); 
=======
                    return res.redirect('/home');
>>>>>>> Stashed changes
                } else {
                    return res.redirect('/');
                }
            });

        });
    } catch (error) {
        console.error("Unexpected error", error);
        res.status(500).json({ message: "Unexpected error processing login" });
    }
});

app.post('/logout', (req, res) => {
    res.cookie('accessToken', '', { expires: new Date(0), httpOnly: true });
    res.redirect('/');
});

app.get("/", (req, res) => {
  res.render("login"); 
});

<<<<<<< Updated upstream
app.get("/home", teacher_auth, (req, res) => {
    const userData = req.teacher;

    const sql = `
        SELECT 
            u.user_id, u.email, u.role, u.gender, u.first_name, u.last_name,
            u.birth_date, u.phone, u.profile_image, t.teacher_code, t.education_level
        FROM User u
        LEFT JOIN Teacher t ON u.user_id = t.user_id
        WHERE u.user_id = ?
    `;

    db.get(sql, [userData.id], (err, row) => {
        if (err) return res.status(500).send("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
        if (!row) return res.status(404).send("ไม่พบข้อมูลผู้ใช้นี้ในระบบ");

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
    const sqlUser = `SELECT u.*, t.teacher_id FROM User u LEFT JOIN Teacher t ON u.user_id = t.user_id WHERE u.user_id = ?`;

    db.get(sqlUser, [userData.id], (err, user) => {
        if (err || !user) return res.status(500).send("ไม่พบข้อมูลผู้ใช้");

        db.get("SELECT * FROM Semester WHERE is_active = 1 LIMIT 1", [], (err, activeSem) => {
            if (err || !activeSem) return res.status(500).send("ไม่พบภาคเรียนที่เปิดใช้งาน (is_active=1)");

            const sqlSchedule = `
                SELECT cs.*, c.course_code, c.course_name, s.year, s.term
                FROM CourseSection cs
                JOIN Course c ON cs.course_id = c.course_id
                JOIN Semester s ON cs.semester_id = s.semester_id
                WHERE cs.teacher_id = ? AND cs.is_active = 1 AND s.semester_id = ?
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
=======

app.get("/home", general_auth, (req, res) => {
    const userData = req.user; 

    const sql = `
        SELECT u.*, 
               t.teacher_code, t.education_level 
        FROM User u
        LEFT JOIN Teacher t ON u.user_id = t.user_id
        WHERE u.user_id = ?
    `;

    db.get(sql, [userData.id], (err, row) => {
        if (err || !row) {
            console.error("ไม่พบข้อมูลผู้ใช้ หรือ DB Error");
            return res.redirect("/");
        }

        row.avatar = row.profile_image;

        res.render("home", { user: row, active: 'home' }); 
    });
});

app.get("/teacher/schedule", teacher_auth, (req, res) => {
    const userData = req.teacher;
    const sqlUser = `SELECT u.*, t.teacher_id FROM User u LEFT JOIN Teacher t ON u.user_id = t.user_id WHERE u.user_id = ?`;

    db.get(sqlUser, [userData.id], (err, user) => {
        if (err || !user) return res.status(500).send("ไม่พบข้อมูลผู้ใช้");

        db.get("SELECT * FROM Semester WHERE is_active = 1 LIMIT 1", [], (err, activeSem) => {
            if (err || !activeSem) return res.status(500).send("ไม่พบภาคเรียนที่เปิดใช้งาน (is_active=1)");

            const sqlSchedule = `
                SELECT cs.*, c.course_code, c.course_name, s.year, s.term
                FROM CourseSection cs
                JOIN Course c ON cs.course_id = c.course_id
                JOIN Semester s ON cs.semester_id = s.semester_id
                WHERE cs.teacher_id = ? AND cs.is_active = 1 AND s.semester_id = ?
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

const getActiveSemester = (callback) => {
    db.get("SELECT semester_id, term, year FROM Semester WHERE is_active = 1 LIMIT 1", [], (err, row) => {
        callback(err, row);
    });
};

app.get("/teacher/grading", teacher_auth, (req, res) => {
    const userData = req.teacher; 

    db.get("SELECT * FROM User WHERE user_id = ?", [userData.id], (err, user) => {
        if (err || !user) return res.status(500).send("ไม่พบข้อมูลผู้ใช้");
        user.avatar = user.profile_image;

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
                        currentSemester: activeSem,
                        active: 'grading'
                    });
                });
            });
        });
    });
});

app.get("/teacher/grading/:section_id", teacher_auth, (req, res) => {
    const sectionId = req.params.section_id;
    const userData = req.teacher;

    const sqlStudents = `
        SELECT s.student_id, s.student_code, u.first_name, u.last_name,
               g.assignment_score, g.midterm_score, g.final_score, g.grade_letter
        FROM Student s
        JOIN User u ON s.user_id = u.user_id
        JOIN CourseSection cs ON cs.section_id = ?
        JOIN Course c ON cs.course_id = c.course_id
        LEFT JOIN Grade g ON s.student_id = g.student_id AND g.section_id = cs.section_id
        WHERE (
            (c.course_type = 'CORE' AND (
                (c.course_code LIKE '%10_' AND s.student_code LIKE '68%') OR 
                (c.course_code LIKE '%20_' AND s.student_code LIKE '67%') OR 
                (c.course_code LIKE '%30_' AND s.student_code LIKE '66%')    
            ))
            OR 
            (c.course_type IN ('TRACK', 'ELECTIVE', 'CLUB') AND s.student_id IN (
                SELECT student_id FROM Enrollment WHERE section_id = cs.section_id
            ))
        )
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
        if (err) return res.send("❌ DB User Error: " + err.message);
        if (user) user.avatar = user.profile_image;

        db.get(sqlCourse, [sectionId], (err, course) => {
            if (err) return res.send("❌ DB Course Error: " + err.message);
            if (!course) return res.status(404).send("ไม่พบรายวิชานี้");

            db.all(sqlStudents, [sectionId], (err, students) => {
                if (err) return res.send("❌ DB Students Error: " + err.message);
                
                res.render("teacherGrading", { 
                    user: user || {}, 
                    sectionId: sectionId, 
                    course: course || {}, 
                    students: students || [],
                    active: 'grading'
                });
            });
        });
    });
});

app.post("/teacher/grading/:section_id", teacher_auth, (req, res) => {
    const userData = req.teacher;
    const sectionId = req.params.section_id;

    if (!req.body.student_id) {
        return res.redirect("/teacher/grading/" + sectionId);
    }

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

    const totalStudents = studentIds.length;
    let completedQueries = 0;

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        for (let i = 0; i < totalStudents; i++) {
            let sId = studentIds[i];
            let asn = parseFloat(assigns[i]) || 0;
            let mid = parseFloat(midterms[i]) || 0;
            let fin = parseFloat(finals[i]) || 0;
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
                
                completedQueries++;
                
                if (completedQueries === totalStudents) {
                    db.run("COMMIT", (commitErr) => {
                        if (commitErr) console.error("Commit Error:", commitErr.message);
                        res.redirect("/teacher/grading/" + sectionId);
                    });
                }
            });
        }
    });
});

app.get("/regis/curriculum", regis_auth, (req, res) => {
    const userData = req.registration;
    const searchQuery = req.query.search || '';
    db.get("SELECT *, profile_image AS avatar FROM User WHERE user_id = ?", [userData.id], (err, user) => {
        const sql = `
            SELECT 
                c.course_id AS subject_id, c.course_code, c.course_name AS subject_name, 
                c.credit_hours AS credits, cs.room, cs.schedule_day, cs.max_students,
                u_t.first_name || ' ' || u_t.last_name AS teacher_name
            FROM Course c
            LEFT JOIN CourseSection cs ON c.course_id = cs.course_id
            LEFT JOIN Teacher t ON cs.teacher_id = t.teacher_id
            LEFT JOIN User u_t ON t.user_id = u_t.user_id
            WHERE c.course_name LIKE ? OR c.course_code LIKE ?
            GROUP BY c.course_id`;
        
        db.all(sql, [`%${searchQuery}%`, `%${searchQuery}%`], (err, subjects) => {
            res.render("subjects", { 
                user: user, subjects: subjects || [], searchQuery: searchQuery 
            });
        });
    });
});

app.post("/regis/add-subject", regis_auth, (req, res) => {
    const { course_code, subject_name, credits, course_type, room } = req.body;
    
    db.get("SELECT teacher_id FROM Teacher LIMIT 1", (err, teacher) => {
        db.get("SELECT semester_id FROM Semester ORDER BY semester_id DESC LIMIT 1", (err, semester) => {
            
            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                
                const sqlCourse = `INSERT INTO Course (course_code, course_name, credit_hours, course_type) VALUES (?, ?, ?, ?)`;
                db.run(sqlCourse, [course_code, subject_name, credits, course_type], function(err) {
                    if (err) { db.run("ROLLBACK"); return res.status(500).send(err.message); }
                    
                    const newCourseId = this.lastID;
                    const sqlSection = `INSERT INTO CourseSection (course_id, teacher_id, semester_id, room, schedule_day, start_time, end_time, max_students) 
                                       VALUES (?, ?, ?, ?, 'จันทร์', '08:00', '10:00', 40)`;
                    
                    db.run(sqlSection, [newCourseId, teacher.teacher_id, semester.semester_id, room], (err) => {
                        if (err) { db.run("ROLLBACK"); return res.status(500).send(err.message); }
                        db.run("COMMIT");
                        res.redirect("/regis/curriculum");
                    });
                });
            });
        });
    });
});

app.get("/regis/edit/:id", regis_auth, (req, res) => {
    const userData = req.registration;
    const courseId = req.params.id;
    db.get(`SELECT c.*, cs.room, cs.schedule_day, cs.start_time, cs.end_time, cs.max_students, cs.teacher_id 
            FROM Course c 
            LEFT JOIN CourseSection cs ON c.course_id = cs.course_id 
            WHERE c.course_id = ? LIMIT 1`, [courseId], (err, subject) => {
        db.get("SELECT *, profile_image AS avatar FROM User WHERE user_id = ?", [userData.id], (err, user) => {
            db.all("SELECT t.teacher_id, u.first_name, u.last_name FROM Teacher t JOIN User u ON t.user_id = u.user_id", (err, teachers) => {
                res.render("edit_subject", { 
                    user: user, subject: subject || {}, teachers: teachers || []
                });
            });
        });
    });
});

app.post("/regis/update-subject/:id", regis_auth, (req, res) => {
    const { course_name, credit_hours, description, teacher_id, schedule_day, start_time, end_time, room, max_students } = req.body;
    db.serialize(() => {
        db.run("UPDATE Course SET course_name = ?, credit_hours = ?, description = ? WHERE course_id = ?", [course_name, credit_hours, description, req.params.id]);
        db.run("UPDATE CourseSection SET teacher_id = ?, schedule_day = ?, start_time = ?, end_time = ?, room = ?, max_students = ? WHERE course_id = ?", [teacher_id, schedule_day, start_time, end_time, room, max_students, req.params.id], () => {
            res.redirect("/regis/curriculum");
        });
    });
});

app.get("/regis/enrollment", regis_auth, (req, res) => {
    const userData = req.registration;
    db.get("SELECT *, profile_image AS avatar FROM User WHERE user_id = ?", [userData.id], (err, user) => {
        const sqlRequests = `
            SELECT 
                e.enrollment_id, e.status, u_student.first_name AS student_fname, 
                u_student.last_name AS student_lname, s.student_code, 
                c.course_code, c.course_name, cs.room
            FROM ENROLLMENT e
            INNER JOIN Student s ON e.student_id = s.student_id
            INNER JOIN User u_student ON s.user_id = u_student.user_id
            INNER JOIN CourseSection cs ON e.section_id = cs.section_id
            INNER JOIN Course c ON cs.course_id = c.course_id
            ORDER BY e.enrollment_id DESC`;

        db.all(sqlRequests, [], (err, rows) => {
            if (err) return res.status(500).send("SQL Error: " + err.message);
            res.render("approve_registration", { 
                user: user, requests: rows || [] 
            });
        });
    });
});

app.post("/regis/update-status/:id", regis_auth, (req, res) => {
    const { status } = req.body;
    
    const adminId = req.registration.id; 
    
    const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' });

    db.run("UPDATE ENROLLMENT SET status = ?, approved_by = ?, approved_at = ? WHERE enrollment_id = ?", 
        [status, adminId, now, req.params.id], (err) => {
        if (err) return res.status(500).send(err.message);
        res.redirect("/regis/enrollment");
    });
});

app.post("/regis/delete-enrollment/:id", regis_auth, (req, res) => {
    db.run("DELETE FROM ENROLLMENT WHERE enrollment_id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).send(err.message);
        res.redirect("/regis/enrollment");
    });
});

app.post("/regis/delete/:id", regis_auth, (req, res) => {
    db.serialize(() => {
        db.run("DELETE FROM CourseSection WHERE course_id = ?", [req.params.id]);
        db.run("DELETE FROM Course WHERE course_id = ?", [req.params.id], () => {
            res.redirect("/regis/curriculum");
        });
    });
});

//Admin N'น็อต
// --- ส่วนการจัดการนักเรียน (Student Management) ---
// แสดงรายชื่อนักเรียนทั้งหมด
app.get("/admin/man/student", admin_auth, (req, res) => {
    const adminId = req.admin.id;

    db.get("SELECT * FROM User WHERE user_id = ?", [adminId], (err, adminUser) => {
        if (err || !adminUser) return res.status(500).send("ไม่พบข้อมูลแอดมิน");

        const sql = `SELECT * FROM User INNER JOIN Student ON User.user_id = Student.user_id;`;
        db.all(sql, (err, rows) => {
            if (err) console.error(err.message);
            res.render('adManStu', { 
                data: rows || [], 
                total: rows ? rows.length : 0, 
                active: 'student',
                user: adminUser
            });
        });
    });
});

// หน้าฟอร์มเพิ่มนักเรียน
app.get("/admin/man/addStu", admin_auth, (req, res) => {
    res.render("addInStu", { user: req.admin, active: 'student' });
});

// บันทึกข้อมูลนักเรียนใหม่ (เปลี่ยนเป็น POST)
app.post("/admin/man/saveStu", admin_auth, (req, res) => {
    const { first, last, gender, DOB, tel, ID, email, password, room } = req.body;
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        const userSql = `INSERT INTO User(email, password, role, gender, first_name, last_name, birth_date, phone, profile_image, is_active, created_at) 
                         VALUES(?, ?, 'student', ?, ?, ?, ?, ?, ?, 1, ?)`;
        
        db.run(userSql, [email, password, gender, first, last, DOB, tel, ID + ".png", timestamp], function(err) {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).send("Error creating user: " + err.message);
            }

            const newUserId = this.lastID;
            const studentSql = `INSERT INTO Student(user_id, homeroom_id, student_code, student_status) VALUES (?, ?, ?, 'active')`;

            db.run(studentSql, [newUserId, room, ID], (err) => {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).send("Error creating student: " + err.message);
                }
                db.run("COMMIT");
                res.redirect("/admin/man/student");
            });
        });
    });
});

// ลบข้อมูลนักเรียน
app.get("/admin/man/delStu/:id", admin_auth, (req, res) => {
    const user_id = req.params.id;
    db.serialize(() => {
        // ลบตารางลูกก่อนเสมอ
        db.run(`DELETE FROM Student WHERE user_id = ?`, [user_id]);
        db.run(`DELETE FROM User WHERE user_id = ?`, [user_id], (err) => {
            if (err) console.error(err.message);
            res.redirect('/admin/man/student');
>>>>>>> Stashed changes
        });
    });
});

<<<<<<< Updated upstream
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
                        user: user, courses: courses, currentSemester: activeSem 
                    });
                });
=======
// --- ส่วนการจัดการอาจารย์ (Teacher Management) ---
app.get("/admin/man/teacher", admin_auth, (req, res) => {
    const adminId = req.admin.id;

    db.get("SELECT * FROM User WHERE user_id = ?", [adminId], (err, adminUser) => {
        if (err || !adminUser) return res.status(500).send("ไม่พบข้อมูลแอดมิน");

        const sql = `SELECT * FROM User INNER JOIN Teacher ON User.user_id = Teacher.user_id;`;
        db.all(sql, (err, rows) => {
            if (err) console.error(err.message);
            res.render('adManTea', { 
                data: rows || [], 
                total: rows ? rows.length : 0, 
                active: 'teacher',
                user: adminUser
>>>>>>> Stashed changes
            });
        });
    });
});

<<<<<<< Updated upstream
app.get("/teacher/grading/:section_id", teacher_auth, (req, res) => {
    const sectionId = req.params.section_id;
    const userData = req.teacher;

    console.log("📌 ค่า Section ID ที่ได้รับคือ:", sectionId);
    const sqlStudents = `
        SELECT s.student_id, s.student_code, u.first_name, u.last_name,
            g.assignment_score, g.midterm_score, g.final_score, g.grade_letter
        FROM Student s
        JOIN User u ON s.user_id = u.user_id
        JOIN CourseSection cs ON cs.section_id = ?
        JOIN Course c ON cs.course_id = c.course_id
        LEFT JOIN Grade g ON s.student_id = g.student_id AND g.section_id = cs.section_id
        WHERE (
            (c.course_type = 'CORE' AND (
                (c.course_code LIKE '%10_' AND s.student_code LIKE '68%') OR -- ม.4
                (c.course_code LIKE '%20_' AND s.student_code LIKE '67%') OR -- ม.5
                (c.course_code LIKE '%30_' AND s.student_code LIKE '66%')    -- ม.6
            ))
            OR 
            -- กรณีวิชา TRACK / ELECTIVE: ดึงจากตาราง Enrollment ตามปกติ
            (c.course_type IN ('TRACK', 'ELECTIVE', 'CLUB') AND s.student_id IN (
                SELECT student_id FROM Enrollment WHERE section_id = cs.section_id
            ))
        )
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
        if (err) return res.send("❌ DB User Error: " + err.message);
        if (user) user.avatar = user.profile_image;

        db.get(sqlCourse, [sectionId], (err, course) => {
            if (err) return res.send("❌ DB Course Error: " + err.message);
            if (!course) return res.status(404).send("ไม่พบรายวิชานี้");

            db.all(sqlStudents, [sectionId], (err, students) => {
                if (err) return res.send("❌ DB Students Error: " + err.message);
                
                console.log(`✅ ดึงข้อมูลสำเร็จ! เจอนักเรียนใน Section ${sectionId} จำนวน: ${students ? students.length : 0} คน`);
                
                if (students && students.length > 0) {
                    console.log("👉 ตัวอย่างข้อมูลนักเรียนคนแรก:", students[0]);
                }
                
                res.render("teacherGrading", { 
                    user: user || {}, 
                    sectionId: sectionId, 
                    course: course || {}, 
                    students: students || []
                });
            });
        });
    });
});

app.post("/teacher/grading/:section_id", teacher_auth, (req, res) => {
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

app.get("/home/regis", regis_auth, (req, res) => {
    const userData = req.registration;

    const sql = `
        SELECT u.*, 'เจ้าหน้าที่ฝ่ายทะเบียน' as position
        FROM User u
        WHERE u.user_id = ?
    `;

    db.get(sql, [userData.id], (err, row) => {
        if (err || !row) return res.status(404).send("ไม่พบข้อมูลเจ้าหน้าที่");
        res.render("home", { user: row }); 
    });
});

app.get("/regis/curriculum", regis_auth, (req, res) => {
    const userData = req.registration;
    const searchQuery = req.query.search || '';
    db.get("SELECT *, profile_image AS avatar FROM User WHERE user_id = ?", [userData.id], (err, user) => {
        const sql = `
            SELECT 
                c.course_id AS subject_id, c.course_code, c.course_name AS subject_name, 
                c.credit_hours AS credits, cs.room, cs.schedule_day, cs.max_students,
                u_t.first_name || ' ' || u_t.last_name AS teacher_name
            FROM Course c
            LEFT JOIN CourseSection cs ON c.course_id = cs.course_id
            LEFT JOIN Teacher t ON cs.teacher_id = t.teacher_id
            LEFT JOIN User u_t ON t.user_id = u_t.user_id
            WHERE c.course_name LIKE ? OR c.course_code LIKE ?
            GROUP BY c.course_id`;
        
        db.all(sql, [`%${searchQuery}%`, `%${searchQuery}%`], (err, subjects) => {
            res.render("subjects", { 
                user: user, subjects: subjects || [], searchQuery: searchQuery 
            });
        });
    });
});

app.post("/regis/add-subject", regis_auth, (req, res) => {
    const { course_code, subject_name, credits, course_type, room } = req.body;
    
    // ค้นหา teacher_id และ semester_id ตัวอย่างมาใส่ก่อนเพื่อไม่ให้ติด NOT NULL Constraint
    db.get("SELECT teacher_id FROM Teacher LIMIT 1", (err, teacher) => {
        db.get("SELECT semester_id FROM Semester ORDER BY semester_id DESC LIMIT 1", (err, semester) => {
            
            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                
                // 1. เพิ่มลงตาราง Course
                const sqlCourse = `INSERT INTO Course (course_code, course_name, credit_hours, course_type) VALUES (?, ?, ?, ?)`;
                db.run(sqlCourse, [course_code, subject_name, credits, course_type], function(err) {
                    if (err) { db.run("ROLLBACK"); return res.status(500).send(err.message); }
                    
                    const newCourseId = this.lastID;
                    // 2. เพิ่มลงตาราง CourseSection (เพื่อให้ปรากฏในหน้าแสดงผล)
                    const sqlSection = `INSERT INTO CourseSection (course_id, teacher_id, semester_id, room, schedule_day, start_time, end_time, max_students) 
                                       VALUES (?, ?, ?, ?, 'จันทร์', '08:00', '10:00', 40)`;
                    
                    db.run(sqlSection, [newCourseId, teacher.teacher_id, semester.semester_id, room], (err) => {
                        if (err) { db.run("ROLLBACK"); return res.status(500).send(err.message); }
                        db.run("COMMIT");
                        res.redirect("/regis/curriculum");
                    });
                });
            });
=======
// หน้าฟอร์มเพิ่มอาจารย์
app.get("/admin/man/addTea", admin_auth, (req, res) => {
    res.render("addInTea", { user: req.admin });
});

// บันทึกข้อมูลอาจารย์ใหม่ (เปลี่ยนเป็น POST)
app.post("/admin/man/saveTea", admin_auth, (req, res) => {
    const { first, last, gender, DOB, tel, ID, email, password, edLev } = req.body;
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        const userSql = `INSERT INTO User(email, password, role, gender, first_name, last_name, birth_date, phone, profile_image, is_active, created_at) 
                         VALUES(?, ?, 'teacher', ?, ?, ?, ?, ?, ?, 1, ?)`;

        db.run(userSql, [email, password, gender, first, last, DOB, tel, ID + ".png", timestamp], function(err) {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).send("Error: " + err.message);
            }
            const newUserId = this.lastID;
            const teacherSql = `INSERT INTO Teacher(user_id, teacher_code, education_level) VALUES (?, ?, ?)`;
            
            db.run(teacherSql, [newUserId, ID, edLev], (err) => {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).send("Error: " + err.message);
                }
                db.run("COMMIT");
                res.redirect("/admin/man/teacher");
            });
        });
    });
});

// แก้ไขข้อมูลอาจารย์ (Update)
app.post("/admin/man/changeTea", admin_auth, (req, res) => {
    const { first, last, tel, ID, email, edLev, status } = req.body;
    const isActive = (status === 'active' || status === '1') ? 1 : 0;

    db.serialize(() => {
        db.run(`UPDATE User SET first_name = ?, last_name = ?, phone = ?, is_active = ? WHERE email = ?`, 
                [first, last, tel, isActive, email]);
        db.run(`UPDATE Teacher SET education_level = ? WHERE teacher_code = ?`, 
                [edLev, ID], (err) => {
            res.redirect('/admin/man/teacher');
>>>>>>> Stashed changes
        });
    });
});

<<<<<<< Updated upstream
app.get("/regis/edit/:id", regis_auth, (req, res) => {
    const userData = req.registration;
    const courseId = req.params.id;
    db.get(`SELECT c.*, cs.room, cs.schedule_day, cs.start_time, cs.end_time, cs.max_students, cs.teacher_id 
            FROM Course c 
            LEFT JOIN CourseSection cs ON c.course_id = cs.course_id 
            WHERE c.course_id = ? LIMIT 1`, [courseId], (err, subject) => {
        db.get("SELECT *, profile_image AS avatar FROM User WHERE user_id = ?", [userData.id], (err, user) => {
            db.all("SELECT t.teacher_id, u.first_name, u.last_name FROM Teacher t JOIN User u ON t.user_id = u.user_id", (err, teachers) => {
                res.render("edit_subject", { 
                    user: user, subject: subject || {}, teachers: teachers || []
                });
            });
        });
    });
});

app.post("/regis/update-subject/:id", regis_auth, (req, res) => {
    const { course_name, credit_hours, description, teacher_id, schedule_day, start_time, end_time, room, max_students } = req.body;
    db.serialize(() => {
        db.run("UPDATE Course SET course_name = ?, credit_hours = ?, description = ? WHERE course_id = ?", [course_name, credit_hours, description, req.params.id]);
        db.run("UPDATE CourseSection SET teacher_id = ?, schedule_day = ?, start_time = ?, end_time = ?, room = ?, max_students = ? WHERE course_id = ?", [teacher_id, schedule_day, start_time, end_time, room, max_students, req.params.id], () => {
            res.redirect("/regis/curriculum");
=======
app.get("/admin/man/editStu/:id", admin_auth, (req, res) => {
    let user_id = req.params.id;
    const sql = `SELECT * FROM User JOIN Student ON User.user_id = Student.user_id WHERE Student.user_id = ?;`;

    db.get(sql, [user_id], (err, row) => {
        if (err) console.error(err.message);
        res.render("editInStu", { 
            data: row, 
            user: req.admin,
            active: 'student'
>>>>>>> Stashed changes
        });
    });
});

<<<<<<< Updated upstream
app.get("/regis/enrollment", regis_auth, (req, res) => {
    const userData = req.registration;
    db.get("SELECT *, profile_image AS avatar FROM User WHERE user_id = ?", [userData.id], (err, user) => {
        const sqlRequests = `
            SELECT 
                e.enrollment_id, e.status, u_student.first_name AS student_fname, 
                u_student.last_name AS student_lname, s.student_code, 
                c.course_code, c.course_name, cs.room
            FROM ENROLLMENT e
            INNER JOIN Student s ON e.student_id = s.student_id
            INNER JOIN User u_student ON s.user_id = u_student.user_id
            INNER JOIN CourseSection cs ON e.section_id = cs.section_id
            INNER JOIN Course c ON cs.course_id = c.course_id
            ORDER BY e.enrollment_id DESC`;

        db.all(sqlRequests, [], (err, rows) => {
            if (err) return res.status(500).send("SQL Error: " + err.message);
            res.render("approve_registration", { 
                user: user, requests: rows || [] 
=======
app.post("/admin/man/changeStu", admin_auth, (req, res) => { 
    let { first, last, tel, ID, email, room, status } = req.body;
    let isActive = (status === 'active') ? 1 : 0;

    db.serialize(() => {
        const chUser = `UPDATE User SET first_name = ?, last_name = ?, phone = ?, is_active = ? WHERE email = ?`;
        db.run(chUser, [first, last, tel, isActive, email], (err) => { 
            if (err) return console.error('Error changing user data:', err.message);

            const chStu = `UPDATE Student SET homeroom_id = ?, student_status = ? WHERE student_code = ?`;
            db.run(chStu, [room, status, ID], (err) => { 
                if (err) return console.error('Error changing student data:', err.message);
                res.redirect('/admin/man/student');
>>>>>>> Stashed changes
            });
        });
    });
});

<<<<<<< Updated upstream
app.post("/regis/update-status/:id", regis_auth, (req, res) => {
    const { status } = req.body;
    
    const adminId = req.registration.id; 
    
    const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' });

    db.run("UPDATE ENROLLMENT SET status = ?, approved_by = ?, approved_at = ? WHERE enrollment_id = ?", 
        [status, adminId, now, req.params.id], (err) => {
        if (err) return res.status(500).send(err.message);
        res.redirect("/regis/enrollment");
    });
});

app.post("/regis/delete-enrollment/:id", regis_auth, (req, res) => {
    db.run("DELETE FROM ENROLLMENT WHERE enrollment_id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).send(err.message);
        res.redirect("/regis/enrollment");
    });
});

app.post("/regis/delete/:id", regis_auth, (req, res) => {
    db.serialize(() => {
        db.run("DELETE FROM CourseSection WHERE course_id = ?", [req.params.id]);
        db.run("DELETE FROM Course WHERE course_id = ?", [req.params.id], () => {
            res.redirect("/regis/curriculum");
=======
app.get("/admin/man/editTea/:id", admin_auth, (req, res) => {
    let user_id = req.params.id;
    const sql = `SELECT * FROM User JOIN Teacher ON User.user_id = Teacher.user_id WHERE Teacher.user_id = ?;`;

    db.get(sql, [user_id], (err, row) => {
        if (err) console.error(err.message);
        res.render("editInTea", { 
            data: row, 
            user: req.admin, 
            active: 'teacher' 
>>>>>>> Stashed changes
        });
    });
});

app.listen(port, () => {
  console.log(`Starting server at port ${port}`);
});