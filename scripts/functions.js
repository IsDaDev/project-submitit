const sqlite3 = require('sqlite3');
const path = require('path');
const filePath = path.join(__dirname, '..', 'data.db');
const db = new sqlite3.Database(filePath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Error while connecting', err);
  }
});

function getFormattedDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}_${hours}:${minutes}`;
}

const fetchFromDB = async (selection, database, condition) => {
  try {
    let retData = [];
    return new Promise((resolve, reject) => {
      sql = `SELECT ${selection} FROM ${database}`;

      if (condition != '') {
        sql += ` WHERE ${condition};`;
      } else {
        sql += ';';
      }

      db.all(sql, (err, data) => {
        if (err) {
          reject(err);
        } else {
          data.forEach((element) => {
            retData.push(element);
          });
          console.log('SQL:', sql);
          console.log('Data:', retData);
          resolve(retData);
        }
      });
    });
  } catch (error) {
    console.log(error);
    return false;
  }
};

const insertIntoDB = async (database, fields, values) => {
  return new Promise((resolve, reject) => {
    sql = `INSERT INTO ${database} (${fields}) VALUES (${values});`;
    db.run(sql, (err, response) => {
      if (err) {
        reject(err);
      } else {
        resolve(response);
      }
    });
  });
};

const deletePost = async (id) => {
  return new Promise((resolve, reject) => {
    sql = `DELETE FROM posts WHERE post_id = ${id}`;
    db.run(sql, (err, respo) => {
      if (err) {
        reject(err);
      } else {
        resolve(respo);
      }
    });
  });
};

module.exports = {
  fetchFromDB,
  deletePost,
  insertIntoDB,
  getFormattedDate,
};
