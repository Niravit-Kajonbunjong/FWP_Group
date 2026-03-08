const express = require("express");
const path = require("path");
const port = 3000;
const sqlite3 = require('sqlite3').verbose();

const app = express();

app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));

// Connect to SQLite database
let db = new sqlite3.Database('dbCop.db', (err) => {
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

app.get("/", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  let { email, password } = req.body;
  const sql = ` SELECT * FROM User WHERE email = ? AND password = ?`;

  db.all(sql,[email, password], (err, rows) => {
    if (err) {
      console.log(err.message);
    }
//    console.log(rows); //to watch data
    if(rows[0].role == 'admin'){
      res.render('adInfo', { data: rows[0] });
    }
  });
});

app.get("/admin/man/student", (req, res) => {
    const sql = ` SELECT * 
    FROM User 
    INNER JOIN Student
    ON User.user_id = Student.user_id;`;

  db.all(sql, (err, rows) => {
    if (err) {
      console.log(err.message);
    }
//    console.log(rows); //to watch data
    res.render('adManStu', { data: rows , total: rows.length});
  });
});

app.get("/admin/man/teacher", (req, res) => {
      const sql = ` SELECT * 
    FROM User 
    INNER JOIN Teacher
    ON User.user_id = Teacher.user_id;`;

  db.all(sql, (err, rows) => {
    if (err) {
      console.log(err.message);
    }
//    console.log(rows); //to watch data
    res.render('adManTea', { data: rows , total: rows.length});
  });
});

app.get("/admin/man/addStu", (req, res) => {
  res.render("addInStu");
});

app.get("/admin/man/saveStu", (req, res) => {
  let { first, last, gender, DOB, tel, ID, email, password, room} = req.query;
  const userId = `SELECT COUNT(*) FROM User;`;
  console.log(userId);
  const User = `INSERT INTO User VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ,?);`;
  
  db.run(User, [Number(userId) + 1, email, password, 'student', gender, first, last, DOB, tel, ID + ".png", 1, new Date().toISOString().slice(0, 19).replace('T', ' ')], (err) => { 
    if (err) { 
      return console.error('Error insert User data:', err.message); 
    } 
    console.log('Table user inserted data successful'); 
  });

  const studentrId = `SELECT COUNT(*) FROM Student;`;
  const Student = `INSERT INTO Student VALUES (?, ?, ?, ?, ?)`;
  db.run(Student, [Number(studentrId) + 1, Number(userId) + 1, room, ID, 'active'], (err) => { 
    if (err) { 
      return console.error('Error insert Student data:', err.message); 
    } 
    console.log('Table student inserted data successful'); 
  });

  res.redirect("/admin/man/student");
});

app.get("/admin/man/addTea", (req, res) => {
  res.render("addInTea");
});

app.get("/admin/man/saveTea", (req, res) => {
    let { first, last, gender, DOB, tel, ID, email, password, edLev} = req.query;
  const userId = `SELECT COUNT(*) FROM User;`;
  const User = `INSERT INTO User VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ,?);`;
  
  db.run(User, [Number(userId) + 1, email, password, 'teacher', gender, first, last, DOB, tel, ID + ".png", 1, new Date().toISOString().slice(0, 19).replace('T', ' ')], (err) => { 
    if (err) { 
      return console.error('Error insert user data:', err.message); 
    } 
    console.log('User table inserted data successful'); 
  });

  const teacherId = `SELECT COUNT(*) FROM Teacher;`;
  const Teacher = `INSERT INTO Teacher VALUES (?, ?, ?, ?, ?)`;
  db.run(Teacher, [teacherId, Number(userId) + 1, ID, edLev, 1], (err) => { 
    if (err) { 
      return console.error('Error insert Student data:', err.message); 
    } 
    console.log('Table student inserted data successful'); 
  });

  res.redirect("/admin/man/teacher");
});

app.get("/admin/man/editStu/:id", (req, res) => {
  let user_id = req.params.id;
        const sql = ` SELECT * 
    FROM User 
    JOIN Student
    ON User.user_id = Student.user_id
    WHERE Student.user_id = ?;`;

  db.all(sql, [user_id], (err, rows) => {
    if (err) {
      console.log(err.message);
    }
//    console.log(rows); //to watch data
    res.render("editInStu", {data: rows[0]});
  });
});

app.get("/admin/man/changeStu", (req, res) => {
  let { first, last, gender, DOB, tel, ID, email, room, status} = req.query;
  const chUser = `UPDATE User
  SET first_name = ?, last_name = ?, phone = ?, is_active = ?
  WHERE email = ${email};`;
  
  let active = 1;
  if (status != 'active') active = 0;

  db.run(chUser, [first, last, tel, active], (err) => { 
    if (err) { 
      return console.error('Error change user data:', err.message); 
    } 
    console.log('User table changed data successful'); 
  });

  const chStu = `UPDATE Student
  SET homeroom_id = ?, student_status = ?
  WHERE student_code = ${ID};`;

  db.run(chStu, [room, status], (err) => { 
    if (err) { 
      return console.error('Error change student data:', err.message); 
    } 
    console.log('Student table changed data successful'); 
  });

  res.redirect('/admin/man/student');

});

app.get("/admin/man/delStu/:id", (req, res) => {
  let user_id = req.params.id;
  console.log(user_id);
  const delUser = ` DELETE FROM User WHERE user_id = ?`;

  db.run(delUser, [user_id], (err) => {
    if (err) {
      console.log(err.message);
    }
    console.log(`Row(s) in user table has been deleted.`);
  });

  const delStu = ` DELETE FROM Student WHERE user_id = ?`
    db.run(delStu, [user_id], (err) => {
    if (err) {
      console.log(err.message);
    }
    console.log(`Row(s) in student table has been deleted.`);
  });

  res.redirect('/admin/man/student');
});

app.get("/admin/man/editTea/:id", (req, res) => {
  let user_id = req.params.id;
        const sql = ` SELECT * 
    FROM User 
    JOIN Teacher
    ON User.user_id = Teacher.user_id
    WHERE Teacher.user_id = ?;`;

  db.all(sql, [user_id], (err, rows) => {
    if (err) {
      console.log(err.message);
    }
//    console.log(rows); //to watch data
    res.render("editInTea", {data: rows[0]});
  });
});

app.get("/admin/man/changeTea", (req, res) => {
  let { first, last, gender, DOB, tel, ID, email, edLev, status} = req.query;
  const chUser = `UPDATE User
  SET first_name = ?, last_name = ?, phone = ?, is_active = ?
  WHERE email = ${email};`;

  db.run(chUser, [first, last, tel, status], (err) => { 
    if (err) { 
      return console.error('Error change user data:', err.message); 
    } 
    console.log('User table changed data successful'); 
  });

  const chStu = `UPDATE Teacher
  SET education_level = ?, is_active = ?
  WHERE teacher_code = ${ID};`;

  db.run(chStu, [edLev, status], (err) => { 
    if (err) { 
      return console.error('Error change teacher data:', err.message); 
    } 
    console.log('Teacher table changed data successful'); 
  });

  res.redirect('/admin/man/teacher');

});

app.get("/admin/man/delTea/:id", (req, res) => {
  let user_id = req.params.id;
  const delUser = ` DELETE FROM User WHERE user_id = ?`;

  db.run(delUser, [user_id], (err) => {
    if (err) {
      console.log(err.message);
    }
    console.log(`Row(s) in user table has been deleted.`);
  });

  const delTea = ` DELETE FROM Teacher WHERE user_id = ?`
    db.run(delTea, [user_id], (err) => {
    if (err) {
      console.log(err.message);
    }
    console.log(`Row(s) in student table has been deleted.`);
  });

  res.redirect('/admin/man/teacher');
});

app.listen(port, () => {
  console.log(`Starting server at port ${port}`);
});