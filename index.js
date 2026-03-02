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

app.get("/", (req, res) => {
  res.render("login"); 
});

app.get("/admin", (req, res) => {
  // you must write code for retrieve from database
  res.render("adInfo"); 
});

app.get("/admin/manAc", (req, res) => {
  // you must write code for retrieve from database
  res.render("adMan"); 
});

app.get("/admin/manAc/student", (req, res) => {
  // you must write code for retrieve from database
  res.render("adManStu"); 
});

app.get("/admin/manAc/teacher", (req, res) => {
  // you must write code for retrieve from database
  res.render("adManTea"); 
});

app.get("/admin/manAc/addStu", (req, res) => {
  res.render("addInStu"); 
});

app.get("/admin/manAc/addTea", (req, res) => {
  res.render("addInTea"); 
});

app.get("/admin/manAc/edit/", (req, res) => {
  // you must write code for retrieve from database
  res.render("editInStu"); // test edit student inforamtion only. change it later
});

// app.get("/admin/manAc/del/:id", (req, res) => {
//   // you must write code for retrieve from database
//   res.render("adManTea"); // test delete student inforamtion only. change it later
// });

app.listen(port, () => {
  console.log(`Starting server at port ${port}`);
});