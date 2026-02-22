const express = require("express");
const path = require("path");
const port = 3000;
const sqlite3 = require('sqlite3').verbose();

const app = express();

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
  res.send("Hello! REST API");
});

app.listen(port, () => {
  console.log(`Starting server at port ${port}`);
});