const crypto = require('crypto');
const sqlite3 = require('sqlite3');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data.db');

const db = new sqlite3.Database(filePath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Error while connecting', err);
  }
});

const makeHash = (input) => {
  return crypto.hash('sha512', input);
};

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
        if (err) {
          reject(err);
        } else {
          if (data[0]['user_id']) {
            resolve(data[0]['user_id']);
          } else {
            resolve(data[0]['name']);
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
  convUsername,
  modifyUser,
};
