// TODO: add AGBs
//       add create date to posts
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

app.get('/', async (req, res) => {
  let userStatus = false;
  let subforumList = await func.fetchFromDB('*', 'subforums', '');
  console.log(subforumList);
  if (req.session.user) {
    userStatus = true;
  }
  res.render('home', { logged_in: userStatus, subforumList: subforumList });
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/login', (req, res) => {
  if (req.session.user) {
    res.render('/');
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
    res.status(500).render('404', {
      errorMsg:
        'Error while registering, try again later or contact site adminstrators',
    });
  }
});

app.post('/login', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (await func.loginCheck(username, password)) {
    req.session.user = username;

    const redirectTo = req.session.redirectTo || '/';
    req.session.redirectTo = null;

    return res.redirect(redirectTo);
  } else {
    res.send('Invalid credentials');
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

    const listOfPosts = await func.fetchFromDB(
      '*',
      'posts',
      `posted_by = '${await func.convUsername(req.session.user)}'`
    );

    console.log(await func.convUsername(req.session.user));

    res.render('profile', { profile: profile[0], posts: listOfPosts });
  }
});

app.get('/s/:sub', async (req, res) => {
  try {
    let subforum = await func.fetchFromDB(
      '*',
      'subforums',
      `name = '${req.params.sub}'`
    );
    let content = await func.fetchFromDB(
      '*',
      'posts',
      `link_to_subforum = '${subforum[0]['subforum_id']}' LIMIT 10`
    );
    if (subforum.length > 0) {
      res.render('sub', {
        sub: subforum[0],
        posts: content,
        posts_loaded: content.length,
      });
    }
  } catch (err) {
    res.status(404).render('404', { errorMsg: 'Sub could not be found' });
  }
});

app.post('/loadMorePosts', async (req, res) => {
  const sub = req.body.sub;
  const index = req.body.startIndex || 0;

  let newContent = await func.fetchFromDB(
    '*',
    'posts',
    `link_to_subforum = '${sub}' LIMIT 10 OFFSET ${index}`
  );

  res.json(newContent);
});

app.get('/s/:sub/createNewPost', async (req, res) => {
  if (!req.session.user) {
    res.cookie('redirect', `/s/${req.params.sub}/createNewPost`);
    return res.redirect('/login');
  } else {
    res.render('newPost', { subName: req.params.sub });
  }
});

app.get('/s/:sub/viewPost/:postID', async (req, res) => {
  try {
    const sub_id = await func.fetchFromDB(
      'subforum_id',
      'subforums',
      `name = '${req.params.sub}'`
    );

    const postData = await func.fetchFromDB(
      '*',
      'posts',
      `post_id = ${req.params.postID} AND link_to_subforum = ${sub_id[0]['subforum_id']}`
    );

    const posted_by = await func.fetchFromDB(
      'name',
      'users',
      `user_id = '${postData[0]['posted_by']}'`
    );

    req.session.returnTo = `/s/${req.params.sub}`;

    // ensures data is not empty
    if (postData.length == 0) {
      throw new Error('');
    } else {
      res.render('viewPost', {
        post: postData[0],
        poster: posted_by[0]['name'],
      });
    }
  } catch (err) {
    res
      .status(404)
      .render('404', { errorMsg: 'The page you requested does not exist' });
  }
});

app.post('/s/:sub/createNewPost', async (req, res) => {
  try {
    const user = await func.fetchFromDB(
      'user_id',
      'users',
      `name = '${req.session.user}'`
    );
    const sub_id = await func.fetchFromDB(
      'subforum_id',
      'subforums',
      `name = '${req.params.sub}'`
    );

    await func.insertIntoDB(
      'posts',
      'title, content, posted_by, link_to_subforum',
      `"${req.body.title}", "${req.body.content}" , "${user[0]['user_id']}", "${sub_id[0]['subforum_id']}"`
    );

    await func.modifyUser(user[0].user_id, 'posts_count', 'posts_count + 1');

    const post_num = await func.fetchFromDB(
      'post_id',
      'posts',
      `title = '${req.body.title}' AND posted_by = '${user[0].user_id}'`
    );

    let buildUp = `http://localhost:3000/s/${req.params.sub}/viewPost/${post_num[0]['post_id']}`;

    res.status(200).redirect(buildUp);
  } catch (err) {
    console.log(err);
    res.send('You are not logged in, log in to create posts');
  }
});
