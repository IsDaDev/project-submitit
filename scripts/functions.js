// includes modules
const sqlite3 = require('sqlite3');
const path = require('path');

// sets the filepath for the .db file
const filePath = path.join(__dirname, '..', 'data.db');

// opens the database connection
const db = new sqlite3.Database(filePath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Error while connecting', err);
  }
});

// function to get the formatted date
function getFormattedDate() {
  // object to get the current date
  const now = new Date();

  // formats the date to a specific format
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  // returns the date in a format
  return `${year}-${month}-${day}_${hours}:${minutes}`;
}

// function to fetch from db, takes the selection, database and condition
const fetchFromDB = async (selection, database, condition) => {
  try {
    // empty array for the data
    let retData = [];
    // new promise 
    return new Promise((resolve, reject) => {
      // builds the sql statement
      sql = `SELECT ${selection} FROM ${database}`;

      // checks if a condition is given
      if (condition != '') {
        // if it is then it is added
        sql += ` WHERE ${condition};`;
      } else {
        sql += ';';
      }

      // queries the database with the sql
      db.all(sql, (err, data) => {
        // error handling
        if (err) {
          reject(err);
        } else {
          // if there is no error the data is put into the array
          data.forEach((element) => {
            retData.push(element);
          });

          // debugging output
          // console.log('SQL:', sql);
          // console.log('Data:', retData);

          // resolves the promise with the data
          resolve(retData);
        }
      });
    });
    // error handling
  } catch (error) {
    console.log(error);
    return false;
  }
};

// functiont o insert into the database
const insertIntoDB = async (database, fields, values) => {
  // new promise
  return new Promise((resolve, reject) => {
    // builds the sql statement
    sql = `INSERT INTO ${database} (${fields}) VALUES (${values});`;
    // runs the command on the database
    db.run(sql, (err, response) => {
      // error handling or successful response
      if (err) {
        reject(err);
      } else {
        resolve(response);
      }
    });
  });
};

// function to delete posts
const deletePost = async (id) => {
  // new promise
  return new Promise((resolve, reject) => {
    // builds sql statement
    sql = `DELETE FROM posts WHERE post_id = ${id}`;

    // runs the sql command
    db.run(sql, (err, respo) => {
      if (err) {
        reject(err);
      } else {
        resolve(respo);
      }
    });
  });
};

// function to delete comments
const deleteComment = async (id) => {
  // creates a new promise
  return new Promise((resolve, reject) => {
    // builds sql statement
    sql = `DELETE FROM comments WHERE comment_id = ${id}`;
    // runs the command on the db
    db.run(sql, (err, respo) => {
      if (err) {
        reject(err);
      } else {
        resolve(respo);
      }
    });
  });
};

// exports all the function
module.exports = {
  deleteComment,
  fetchFromDB,
  deletePost,
  insertIntoDB,
  getFormattedDate,
};
