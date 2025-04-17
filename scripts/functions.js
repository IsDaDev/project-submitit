const sqlite3 = require('sqlite3');
const crypto = require('crypto');
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

const fetchUserFromDB = async (user) => {
  try {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM users WHERE name = ?`, [user], (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  } catch (error) {
    console.error(error);
  }
};

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

const makeHash = (input) => {
  return crypto.hash('sha512', input);
};

const insertUser = async (username, password, bday) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO users (name, password, bday, acc_created) VALUES (?, ?, ?, ?)',
      [username, makeHash(password), bday, getFormattedDate()],
      (err, ret) => {
        if (err) {
          reject(err);
        } else {
          resolve(ret);
        }
      }
    );
  });
};

const loginCheck = async (user, password) => {
  try {
    let result = await fetchUserFromDB(user);

    if (result[0].length === 0) {
      return false;
    }

    if (result[0].password === makeHash(password)) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log(`Faulty login\nUser tried to log in via ${user}:${password}`);
    return false;
  }
};

const checkIfUsernameAvailable = async (user) => {
  let result = await fetchFromDB('*', 'users', `name = '${user}'`);

  return result.length;
};

const convUsername = async (user) => {
  try {
    return new Promise((resolve, reject) => {
      sql = '';
      if (typeof user === 'number') {
        sql = `SELECT name FROM users WHERE user_id = '${user}';`;
      } else {
        sql = `SELECT user_id FROM users WHERE name = '${user}';`;
      }

      db.all(sql, (err, data) => {
        console.log('sql:', sql);
        if (err) {
          reject(err);
        } else {
          console.log(typeof user);
          switch (typeof user) {
            case 'number':
              resolve(data[0]['user_id']);
              break;

            default:
              resolve(data[0]['name']);
              break;
          }
        }
      });
    });
  } catch (err) {
    console.log(err);
  }
};

const modifyUser = async (user, field, newValue) => {
  try {
    return new Promise((resolve, reject) => {
      sql = `UPDATE users SET ${field} = ${newValue} WHERE user_id = ${user}`;

      db.all(sql, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve('Success');
        }
      });
    });
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  loginCheck,
  checkIfUsernameAvailable,
  insertUser,
  fetchFromDB,
  insertIntoDB,
  convUsername,
  modifyUser,
};
