const express = require("express");
const path = require("path");
const port = 3000;
const sqlite3 = require('sqlite3').verbose();

const app = express();

app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));

// Connect to SQLite database
// let db = new sqlite3.Database('your-db-filename.db', (err) => {    
//   if (err) {
//       return console.error(err.message);
//   }
//   console.log('Connected to the SQlite database.');
// });

app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get("/", (req, res) => {
  res.render("login"); 
});

app.get('/user', function (req, res) {
  // let {email, password} = req.query;
  // const query = `SELECT role FROM User WHERE email = ? AND password = ?;`;
  // db.run(query, [email, password], (err, rows) => {
  //   if (err) {
  //     console.log("email หรือ password ไม่ถูกต้อง");
  //   }
  //   res.redirect('login');
  // });

  // const qryTable = ``;
  // db.all(query, [email, password], (err, rows) => {
  //   res.render('user', {info : rows});
  // });

  res.render('userT'); //use for test userInfo_page ONLY!!
});

app.listen(port, () => {
  console.log(`Starting server at port ${port}`);
});