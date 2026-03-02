const express = require("express");
const path = require("path");
const port = 3000;
const sqlite3 = require('sqlite3').verbose();

const app = express();

app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));

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

// app.get("/", (req, res) => {
//   res.render("login"); 
// });

// app.get("/", (req, res) => {
//   res.render("teacherHome"); 
// });

// app.get("/", (req, res) => {
//   res.render("table"); 
// });

// app.get("/", (req, res) => {
//   res.render("partials/mlbar"); 
// });




app.get("/login", (req, res) => {
  res.render("login", { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }); 
});


app.get("/teacher", (req, res) => {
    
    const testUserId = 1; 

    const sql = `
        SELECT 
            u.user_id,
            u.first_name, 
            u.last_name, 
            u.gender, 
            u.birth_date, 
            u.email, 
            u.phone, 
            u.profile_image, 
            u.role,
            t.teacher_code,
            t.education_level
            -- , t.office_room <-- ถ้าคุณเพิ่มคอลัมน์ office_room ไปแล้ว ให้ลบ -- ออกครับ
        FROM User u
        JOIN Teacher t ON u.user_id = t.user_id
        WHERE u.user_id = ?
    `;

    db.get(sql, [testUserId], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
        }
        
        if (!row) {
            return res.status(404).send("ไม่พบข้อมูลผู้ใช้งานนี้ในระบบ");
        }

        row.avatar = row.profile_image;

        res.render("teacherHome", { user: row }); 
    });
});


app.get("/student", (req, res) => {
    const mockUser = { role: 'student', first_name: 'สมชาย', last_name: 'เรียนดี', avatar: '' };
    res.render("teacherHome", { user: mockUser });
});


app.get("/home", (req, res) => {
    
    const currentUserId = 1; 

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

    db.get(sql, [currentUserId], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
        }
        
        if (!row) {
            return res.status(404).send("ไม่พบข้อมูลผู้ใช้นี้ในระบบ");
        }

        row.avatar = row.profile_image;
        row.office_room = '502';

        res.render("home", { user: row }); 
    });
});


app.get("/teacher/schedule", (req, res) => {
    const currentUserId = 1;

    const sqlUser = `
        SELECT u.*, t.teacher_id, t.teacher_code 
        FROM User u 
        LEFT JOIN Teacher t ON u.user_id = t.user_id 
        WHERE u.user_id = ?
    `;

    db.get(sqlUser, [currentUserId], (err, user) => {
        if (err || !user) {
            return res.status(500).send("ไม่พบข้อมูลผู้ใช้");
        }
        user.avatar = user.profile_image;

        const sqlSchedule = `
            SELECT 
                cs.schedule_day,
                cs.start_time,
                cs.end_time,
                cs.room,
                c.course_code,
                c.course_name,
                c.credit_hours,
                s.year,
                s.term
            FROM CourseSection cs
            JOIN Course c ON cs.course_id = c.course_id
            JOIN Semester s ON cs.semester_id = s.semester_id
            WHERE cs.teacher_id = ? AND cs.is_active = 1
            ORDER BY 
                CASE cs.schedule_day
                    WHEN 'Monday' THEN 1
                    WHEN 'Tuesday' THEN 2
                    WHEN 'Wednesday' THEN 3
                    WHEN 'Thursday' THEN 4
                    WHEN 'Friday' THEN 5
                    WHEN 'Saturday' THEN 6
                    WHEN 'Sunday' THEN 7
                END, 
                cs.start_time;
        `;

        db.all(sqlSchedule, [user.teacher_id], (err, schedules) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send("เกิดข้อผิดพลาดในการดึงตารางสอน");
            }
            
            res.render("teacherSchedule", { user: user, schedules: schedules });
        });
    });
});


app.listen(port, () => {
  console.log(`Starting server at port ${port}`);
});

app.listen(port, () => {
  console.log(`Starting server at port ${port}`);
});