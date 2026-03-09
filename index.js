const express = require("express");
const path = require("path");
const port = 3000;
const sqlite3 = require('sqlite3').verbose();
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const app = express();

app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));

const { teacher_auth, student_auth } = require('./middleware/auth.js');

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

const generateAccessToken = (payload) => {
    return jwt.sign(payload, kate, { expiresIn: '7d' })
}

app.post("/login", async(req, res) => {
    try {
        const { email, password } = req.body;

        const sql = 'SELECT * FROM User WHERE email = ? AND password = ?';

        db.get(sql, [email, password], async function (err, results) {

            if (err) {
                console.error(err);
                return res.status(500).send("Database error");
            }

            if (!results) {
                return res.status(404).send("Authentication failed");
            }

            const payload = {
                id: results.user_id,
                role: results.role
            };

            const accessToken = generateAccessToken(payload);

            res.cookie('accessToken', accessToken, { httpOnly: true, secure: true });

            if(results.role === 'teacher'){
                return res.redirect('/home');
            }
            else if(results.role === 'student'){
                return res.redirect('/student/home');
            }
            else{
                return res.redirect('/');
            }

        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Unexpected error");
    }
});

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

app.get("/student/home", student_auth, (req, res) => {

    const userData = req.student;

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
            s.student_code,
            h.room_name
        FROM User u
        LEFT JOIN Student s ON u.user_id = s.user_id
        LEFT JOIN Homeroom h ON s.homeroom_id = h.homeroom_id
        WHERE u.user_id = ?
    `;

    db.get(sql, [userData.id], (err, row) => {

        if (err) {
            console.error(err.message);
            return res.status(500).send("Database error");
        }

        if (!row) {
            return res.status(404).send("User not found");
        }

        row.avatar = row.profile_image;

        res.render("home", { user: row });

    });

});

app.get("/student/timetable", student_auth, (req, res) => {

    const userData = req.student;

    const sqlUser = `
        SELECT u.*, s.student_id, s.student_code
        FROM User u
        LEFT JOIN Student s ON u.user_id = s.user_id
        WHERE u.user_id = ?
    `;

    db.get(sqlUser, [userData.id], (err, user) => {

        if (err) {
            console.error(err);
            return res.status(500).send("Database error");
        }

        if (!user) {
            return res.status(404).send("User not found");
        }

        const sqlSchedule = `
WITH student_info AS (
    SELECT 
        st.student_id,
        h.grade_level,
        h.track_id
    FROM Student st
    JOIN Homeroom h 
        ON st.homeroom_id = h.homeroom_id
    WHERE st.student_id = ?
)

-- CORE (Morning)
SELECT
    cs.schedule_day,
    cs.start_time,
    cs.end_time,
    cs.room,
    c.course_code,
    c.course_name,
    s.year,
    s.term
FROM student_info p
JOIN Course c 
    ON c.grade_level = p.grade_level
JOIN CourseSection cs 
    ON cs.course_id = c.course_id
JOIN Semester s 
    ON cs.semester_id = s.semester_id
WHERE c.course_type = 'CORE'
AND cs.start_time < '12:00'
AND s.is_active = 1

UNION ALL

-- TRACK (Afternoon)
SELECT
    cs.schedule_day,
    cs.start_time,
    cs.end_time,
    cs.room,
    c.course_code,
    c.course_name,
    s.year,
    s.term
FROM student_info p
JOIN Course c 
    ON c.grade_level = p.grade_level
    AND c.track_id = p.track_id
JOIN CourseSection cs 
    ON cs.course_id = c.course_id
JOIN Semester s 
    ON cs.semester_id = s.semester_id
WHERE c.course_type = 'TRACK'
AND cs.start_time >= '13:00'
AND s.is_active = 1

UNION ALL

-- ELECTIVE + CLUB (Afternoon)
SELECT
    cs.schedule_day,
    cs.start_time,
    cs.end_time,
    cs.room,
    c.course_code,
    c.course_name,
    s.year,
    s.term
FROM student_info p
JOIN Enrollment e 
    ON e.student_id = p.student_id
JOIN CourseSection cs 
    ON e.section_id = cs.section_id
JOIN Course c 
    ON cs.course_id = c.course_id
JOIN Semester s 
    ON cs.semester_id = s.semester_id
WHERE c.course_type IN ('ELECTIVE','CLUB')
AND cs.start_time >= '13:00'
AND e.status = 'active'
AND s.is_active = 1
`;

        db.all(sqlSchedule, [user.student_id], (err, schedules) => {

    if(err){
        console.error(err);
        return res.status(500).send("Schedule error");
    }

    res.render("studentSchedule", {
    user,
    schedules,
    term: schedules.length ? schedules[0].term : null,
    year: schedules.length ? schedules[0].year : null
});

});

    });

});

app.get("/student/grades", student_auth, (req, res) => {

const year = req.query.year;
const term = req.query.term;

let sql = `
SELECT 
c.course_code,
c.course_name,
c.credit_hours,
g.assignment_score,
g.midterm_score,
g.final_score,
g.grade_letter,
s.year,
s.term
FROM Grade g
JOIN CourseSection cs ON g.section_id = cs.section_id
JOIN Course c ON cs.course_id = c.course_id
JOIN Semester s ON cs.semester_id = s.semester_id
JOIN Student st ON g.student_id = st.student_id
WHERE st.user_id = ?
`;

let params = [req.student.id];

if(year){
sql += " AND s.year = ?";
params.push(year);
}

if(term){
sql += " AND s.term = ?";
params.push(term);
}

sql += " ORDER BY s.year DESC, s.term DESC";

db.all(sql, params, (err, grades) => {

if(err){
console.error(err);
return res.status(500).send("Grade error");
}

db.all(
`SELECT DISTINCT year FROM Semester ORDER BY year DESC`,
(err, years)=>{

db.get("SELECT * FROM User WHERE user_id = ?", [req.student.id], (err, user) => {

if(err){
console.error(err);
return res.status(500).send("User error");
}

res.render("studentGrades",{
user:user,
grades:grades,
years:years.map(y=>y.year),
selectedYear:year,
selectedTerm:term
});

});

});

});

});

app.get("/student/enroll", student_auth, (req,res)=>{

const sql = `
SELECT
cs.section_id,
c.course_code,
c.course_name,
c.course_type,
c.credit_hours,
cs.schedule_day,
cs.start_time,
cs.end_time,
cs.room
FROM CourseSection cs
JOIN Course c ON cs.course_id = c.course_id
JOIN Semester s ON cs.semester_id = s.semester_id
WHERE LOWER(c.course_type) IN ('elective','club')
AND cs.is_active = 1
AND c.is_active = 1
AND s.is_active = 1
`;

db.all(sql,(err,sections)=>{

if(err){
console.error(err);
return res.status(500).send("Database error");
}

db.get("SELECT * FROM User WHERE user_id = ?", [req.student.id], (err, user) => {

if(err){
console.error(err);
return res.status(500).send("User error");
}

res.render("studentEnrollment",{
user:user,
sections:sections
});

});

});

});

app.post("/student/enroll", student_auth, (req,res)=>{

const sectionId = req.body.section_id;
const userId = req.student.id;

if(!sectionId){
return res.redirect("/student/enroll");
}

const getStudentSql = `
SELECT student_id
FROM Student
WHERE user_id = ?
`;

db.get(getStudentSql,[userId],(err,student)=>{

if(err){
console.error(err);
return res.send("Student lookup error");
}

if(!student){
return res.send("Student not found");
}

const insertSql = `
INSERT INTO Enrollment (student_id, section_id, status, created_at)
VALUES (?, ?, 'pending', datetime('now'))
`;

db.run(insertSql,[student.student_id,sectionId],(err)=>{

if(err){
console.error(err);
return res.send("Enrollment error");
}

res.redirect("/student/enroll");

});

});

});
app.listen(port, () => {
  console.log(`Starting server at port ${port}`);
});