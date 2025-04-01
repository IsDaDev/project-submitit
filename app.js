// TODO: add AGBs
// ************************************
const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const func = require('./scripts/functions.js');
const app = express();
const port = process.env.PORT || 3000;

require('./scripts/config.js')(app);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  } else {
    res.render('home');
  }
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  } else {
    res.render('login');
  }
});

app.post('/register', async (req, res) => {
  try {
    let username = req.body.username;
    let password = req.body.password;
    let bday = req.body.bday;

    const re = new RegExp('^[a-zA-Z0-9_.]{1,50}$');
    const passwordRe = new RegExp(
      `^(?!.*(--|;|'|"|/\*|\*/|union|select|insert|update|delete|drop|xp_))[\w!@#$%^&*()-+=]{8,64}$`
    );

    if (re.test(username) && passwordRe.test(password)) {
      await func.insertUser(username, password, bday);

      req.session.user = username;
      res.redirect('/');
    } else {
      throw new Error('Invalid Characters');
    }
  } catch (err) {
    console.error('Error while registering:', err);
    res.status(500).send('Error while registering, try again');
  }
});

app.post('/login', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (await func.loginCheck(username, password)) {
    req.session.user = username;
    return res.redirect('/');
  } else {
    res.send('invalid credentials');
  }
});

app.post('/logout', (req, res) => {
  if (!req.session) {
    return res.status(401).json({ message: 'No active session' });
  }

  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ message: 'Failed to logout.' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful', redirect: '/login' });
  });
});

app.post('/validateUsername', async (req, res) => {
  let username = req.body.user.trim();

  if (typeof username !== 'string' || username == '') {
    return res.json({ response: 'Invalid username' });
  }

  const re = new RegExp('^[a-zA-Z0-9_.]{1,50}$');

  let isValidUser = await func.checkIfUsernameAvailable(req.body.user);

  if (re.test(username) === false) {
    res.json({ response: 'Invalid username' });
  } else if (isValidUser == 1) {
    res.json({ response: 'Username is already taken' });
  } else {
    res.json({ response: 'Successful' });
  }
});

app.get('/profile', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  } else {
    const profile = await func.fetchFromDB(
      '*',
      'users',
      `name = '${req.session.user}'`
    );

    res.render('profile', { profile: profile[0] });
  }
});
