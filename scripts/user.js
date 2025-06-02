// imports modules 
const crypto = require('crypto');
const sqlite3 = require('sqlite3');
const path = require('path');
const argon2 = require('argon2');
const funcs = require('./functions.js');

// filepath for the db file
const filePath = path.join(__dirname, '..', 'data.db');

// opens the db connection
const db = new sqlite3.Database(filePath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Error while connecting', err);
  }
});

// hash function to return the argon2 hash
const hash = async (input) => {
  return argon2.hash(input);
};

// function to fetch all users from the db
const fetchUserFromDB = async (user) => {
  try {
    // new promise
    return new Promise((resolve, reject) => {
      // secure sql to fight against sqli
      db.all(`SELECT * FROM users WHERE name = ?`, [user], (err, data) => {
        if (err) {
          reject(err);
        } else {
          // resolves the promise
          resolve(data);
        }
      });
    });
    // catches error
  } catch (error) {
    console.error(error);
  }
};

// function to insert new user to db
const insertUser = async (username, password, bday) => {
  const hashedPassword = await hash(password); // await the hash
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO users (name, password, bday, acc_created) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, bday, funcs.getFormattedDate()],
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


// function to compare hashes
const loginCheck = async (user, password) => {
  try {
    let result = await fetchUserFromDB(user);

    if (!result || result.length === 0) {
      return false;
    }

    // result[0].password is the hashed password stored in DB
    const storedHash = result[0].password;

    const isMatch = await argon2.verify(storedHash, password);
    return isMatch;
  } catch (error) {
    console.log(`Faulty login\nUser tried to log in via ${user}:${password}`);
    return false;
  }
};


// function to check if a username exists
const checkIfUsernameAvailable = async (user) => {
  // tries to fetch the user
  let result = await funcs.fetchFromDB('*', 'users', `name = '${user}'`);

  // returns the amount of users
  return result.length;
};

// function to convert username in as ID into a name and otherwise
const convUsername = async (user) => {
  try {
    return new Promise((resolve, reject) => {
      sql = '';
      // checks the type and selects the correct sql statement
      if (typeof user === 'number') {
        sql = `SELECT name FROM users WHERE user_id = '${user}';`;
      } else {
        sql = `SELECT user_id FROM users WHERE name = '${user}';`;
      }

      // fetches the opposite result of what is given
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

// function to modify some field for a user
const modifyUser = async (user, field, newValue) => {
  try {
    return new Promise((resolve, reject) => {
      // creates sql statement
      sql = `UPDATE users SET ${field} = ${newValue} WHERE user_id = ${user}`;

      // runs it through the db
      db.all(sql, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve('Success');
        }
      });
    });

    // error handling
  } catch (err) {
    console.log(err);
  }
};

// exports modules
module.exports = {
  loginCheck,
  checkIfUsernameAvailable,
  insertUser,
  convUsername,
  modifyUser,
};
