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

app.get("/login", (req, res) => {
  let { email, password } = req.query;
  const sql = ` SELECT * FROM User WHERE email = ? AND password = ?`;

  db.all(sql,[email, password], (err, rows) => {
    if (err) {
      console.log(err.message);
    }
    if(rows[0].role == 'admin'){
      res.render('adInfo', { data: rows[0] });
    }
  });
});

app.get("/admin/man/student", (req, res) => {
    const sql = ` SELECT * 
    FROM User 
    INNER JOIN Student
    ON User.user_id = Student.user_id
    WHERE User.role = 'student';`;

  db.all(sql, (err, rows) => {
    if (err) {
      console.log(err.message);
    }
    res.render('adManStu', { data: rows , total: rows.length});
  });
});

app.get("/admin/man/teacher", (req, res) => {
  // you must write code for retrieve from database
      const sql = ` SELECT * 
    FROM User 
    INNER JOIN Teacher
    ON User.user_id = Teacher.user_id
    WHERE User.role = 'teacher';`;

  db.all(sql, (err, rows) => {
    if (err) {
      console.log(err.message);
    }
    res.render('adManTea', { data: rows , total: rows.length});
  });
});

app.get("/admin/man/addStu", (req, res) => {
  res.render("addInStu");
});

app.get("/admin/man/saveStu", (req, res) => {
  let { first, last, gender, DOB, tel, ID, email, password, room} = req.query;
  const userId = `SELECT COUNT(*) FROM User;`;
  const User = `INSERT INTO User VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ,?);`;
  
  db.run(User, [userId, email, password, 'student', gender, first, DOB, tel, ID + ".png", 1, new Date().toISOString().slice(0, 19).replace('T', ' ')], (err) => { 
    if (err) { 
      return console.error('Error insert User data:', err.message); 
    } 
    console.log('Table user inserted data successful'); 
  });

  const studentrId = `SELECT COUNT(*) FROM Student;`;
  const Student = `INSERT INTO Student VALUES (?, ?, ?, ?, ?)`;
  db.run(Student, [studentrId, userId, room, ID, 'active'], (err) => { 
    if (err) { 
      return console.error('Error insert Student data:', err.message); 
    } 
    console.log('Table student inserted data successful'); 
  });

  res.redirect("adManStu");
});

app.get("/admin/man/addTea", (req, res) => {
  res.render("addInTea");
});

app.get("/admin/man/saveTea", (req, res) => {
  res.redirect("adManTea");
});

app.get("/admin/man/edit/", (req, res) => {
  // you must write code for retrieve from database
  res.render("editInStu"); // test edit student inforamtion only. change it later
});

// app.get("/admin/man/del/:id", (req, res) => {
//   // you must write code for retrieve from database
//   res.render("adManTea"); // test delete student inforamtion only. change it later
// });

app.listen(port, () => {
  console.log(`Starting server at port ${port}`);
});