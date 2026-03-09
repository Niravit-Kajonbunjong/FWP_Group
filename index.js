const express = require("express");
const path = require("path");
const sqlite3 = require('sqlite3').verbose();
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;
const SECRET_KEY = "wowzaeiei"; 

// --- Configurations & Middleware ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));

const { teacher_auth, regis_auth } = require('./middleware/auth.js');

const db = new sqlite3.Database('db.db', (err) => {    
    if (err) return console.error("❌ Database Error: ", err.message);
    console.log('✅ Connected to the SQLite database.');
});

const generateAccessToken = (payload) => jwt.sign(payload, SECRET_KEY, { expiresIn: '7d' });

// --- 1. Authentication Routes ---
app.get("/login", (req, res) => res.render("login", { error: null }));
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    db.get('SELECT * FROM User WHERE email = ? AND password = ?', [email, password], (err, user) => {
        if (err || !user) return res.render("login", { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        const payload = { id: user.user_id, role: user.role };
        const accessToken = generateAccessToken(payload);
        res.cookie('accessToken', accessToken, { httpOnly: true, secure: false, sameSite: 'strict' });
        if (user.role === 'teacher') return res.redirect('/home');
        if (user.role === 'registration') return res.redirect('/regis/curriculum');
        res.redirect('/');
    });
});
app.post('/logout', (req, res) => {
    res.clearCookie('accessToken');
    res.redirect('/login');
});

// --- 2. Registration Routes (ฝ่ายทะเบียน) ---

// 2.1 หน้าจัดการวิชาและหลักสูตร
app.get("/regis/curriculum", regis_auth, (req, res) => {
    const searchQuery = req.query.search || '';
    db.get("SELECT *, profile_image AS avatar FROM User WHERE user_id = ?", [req.user.id], (err, user) => {
        const sql = `
            SELECT 
                c.course_id AS subject_id, 
                c.course_code, 
                c.course_name AS subject_name, 
                c.credit_hours AS credits,
                c.course_type, -- เพิ่มส่วนนี้เพื่อให้ตรงกับหน้า EJS ใหม่
                cs.room,
                cs.schedule_day,
                cs.max_students,
                u_t.first_name || ' ' || u_t.last_name AS teacher_name
            FROM Course c
            LEFT JOIN CourseSection cs ON c.course_id = cs.course_id
            LEFT JOIN Teacher t ON cs.teacher_id = t.teacher_id
            LEFT JOIN User u_t ON t.user_id = u_t.user_id
            WHERE c.course_name LIKE ? OR c.course_code LIKE ?
            GROUP BY c.course_id`;
        
        db.all(sql, [`%${searchQuery}%`, `%${searchQuery}%`], (err, subjects) => {
            res.render("subjects", { 
                user: user, 
                subjects: subjects || [], 
                searchQuery: searchQuery 
            });
        });
    });
});

// 2.2 เพิ่มรายวิชาใหม่ (Route ใหม่เพื่อรองรับหน้า subjects.ejs ตัวใหม่)
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
        });
    });
});

// 2.3 แก้ไขวิชา (GET)
app.get("/regis/edit/:id", regis_auth, (req, res) => {
    const courseId = req.params.id;
    db.get(`SELECT c.*, cs.room, cs.schedule_day, cs.start_time, cs.end_time, cs.max_students, cs.teacher_id 
            FROM Course c 
            LEFT JOIN CourseSection cs ON c.course_id = cs.course_id 
            WHERE c.course_id = ? LIMIT 1`, [courseId], (err, subject) => {
        db.get("SELECT *, profile_image AS avatar FROM User WHERE user_id = ?", [req.user.id], (err, user) => {
            db.all("SELECT t.teacher_id, u.first_name, u.last_name FROM Teacher t JOIN User u ON t.user_id = u.user_id", (err, teachers) => {
                res.render("edit_subject", { 
                    user: user, 
                    subject: subject || {},
                    teachers: teachers || []
                });
            });
        });
    });
});

// 2.4 บันทึกการแก้ไขวิชา (POST)
app.post("/regis/update-subject/:id", regis_auth, (req, res) => {
    const { course_name, credit_hours, description, teacher_id, schedule_day, start_time, end_time, room, max_students } = req.body;
    db.serialize(() => {
        db.run("UPDATE Course SET course_name = ?, credit_hours = ?, description = ? WHERE course_id = ?", [course_name, credit_hours, description, req.params.id]);
        db.run("UPDATE CourseSection SET teacher_id = ?, schedule_day = ?, start_time = ?, end_time = ?, room = ?, max_students = ? WHERE course_id = ?", [teacher_id, schedule_day, start_time, end_time, room, max_students, req.params.id], () => {
            res.redirect("/regis/curriculum");
        });
    });
});

// 2.5 หน้าอนุมัติการลงทะเบียน (คงเดิมตามที่คุณต้องการ)
app.get("/regis/enrollment", regis_auth, (req, res) => {
    db.get("SELECT *, profile_image AS avatar FROM User WHERE user_id = ?", [req.user.id], (err, user) => {
        const sqlRequests = `
            SELECT 
                e.enrollment_id, 
                e.status,
                u_student.first_name AS student_fname, 
                u_student.last_name AS student_lname, 
                s.student_code, 
                c.course_code, 
                c.course_name, 
                cs.room
            FROM ENROLLMENT e
            INNER JOIN Student s ON e.student_id = s.student_id
            INNER JOIN User u_student ON s.user_id = u_student.user_id
            INNER JOIN CourseSection cs ON e.section_id = cs.section_id
            INNER JOIN Course c ON cs.course_id = c.course_id
            ORDER BY e.enrollment_id DESC`;

        db.all(sqlRequests, [], (err, rows) => {
            if (err) {
                console.error("❌ SQL Error Detail:", err.message);
                return res.status(500).send("SQL Error: " + err.message);
            }
            res.render("approve_registration", { 
                user: user, 
                requests: rows || [] 
            });
        });
    });
});

// 2.6 อัปเดตสถานะการลงทะเบียน
app.post("/regis/update-status/:id", regis_auth, (req, res) => {
    const { status } = req.body;
    const adminId = req.user.id;
    const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' });
    db.run("UPDATE ENROLLMENT SET status = ?, approved_by = ?, approved_at = ? WHERE enrollment_id = ?", 
        [status, adminId, now, req.params.id], (err) => {
        if (err) return res.status(500).send(err.message);
        res.redirect("/regis/enrollment");
    });
});

// 2.7 ลบคำร้องการลงทะเบียน
app.post("/regis/delete-enrollment/:id", regis_auth, (req, res) => {
    db.run("DELETE FROM ENROLLMENT WHERE enrollment_id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).send(err.message);
        res.redirect("/regis/enrollment");
    });
});

// 2.8 ลบข้อมูลวิชา
app.post("/regis/delete/:id", regis_auth, (req, res) => {
    db.serialize(() => {
        db.run("DELETE FROM CourseSection WHERE course_id = ?", [req.params.id]);
        db.run("DELETE FROM Course WHERE course_id = ?", [req.params.id], () => {
            res.redirect("/regis/curriculum");
        });
    });
});

// --- 3. Teacher Routes ---
app.get("/home", teacher_auth, (req, res) => {
    db.get("SELECT u.*, u.profile_image AS avatar, t.teacher_code FROM User u LEFT JOIN Teacher t ON u.user_id = t.user_id WHERE u.user_id = ?", [req.user.id], (err, row) => {
        if (err || !row) return res.status(404).send("ไม่พบข้อมูลผู้ใช้");
        res.render("home", { user: row }); 
    });
});

app.get("/", (req, res) => {
    const token = req.cookies.accessToken;
    if (!token) return res.redirect("/login");
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.redirect("/login");
        res.redirect(decoded.role === 'registration' ? '/regis/curriculum' : '/home');
    });
});

app.listen(port, () => {
    console.log(`🚀 Server is running at http://localhost:${port}`);
});