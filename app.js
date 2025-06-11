// TODO: add AGBs
// ************************************

// importes modules for express and .env
const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

// imports the functions from the files function.js and user.js
const func = require('./scripts/functions.js');
const userf = require('./scripts/user.js');

// prepares the server
const app = express();
const port = process.env.PORT || 3000;


// requires the config file
require('./scripts/config.js')(app);

// starts the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// root-route for home
app.get('/', async (req, res) => {
  // defines a variable userStatus which is set to false
  let userStatus = false;
  // fetches all the subforums that exist on the system
  let subforumList = await func.fetchFromDB('*', 'subforums', '');

  // checks if the user is logged in
  if (req.session.user) {
    // if the user is logged in it sets userStatus to true
    userStatus = true;
  }

  // renders the homepage and passes the list of subforums and the userStatus
  res.render('home', { logged_in: userStatus, subforumList: subforumList });
});

// GET-Route to register
app.get('/register', (req, res) => {
  // renders register
  res.render('register');
});

// GET-Route to login
app.get('/login', (req, res) => {
  // checks if the user is already logged in
  if (req.session.user) {
    // redirects to the homepage when the user is logged in
    res.render('/');
  } else {
    // else it renders the login page
    res.render('login');
  }
});

// POST-Route to register
app.post('/register', async (req, res) => {
  try {
    // defines variables that hold username, password and bday
    let username = req.body.username;
    let password = req.body.password;
    let bday = req.body.bday;

    // defines a new regex pattern for the username
    // the user can only use between 1-50 letters and numbers
    const usernameRegex = new RegExp('^[a-zA-Z0-9_.]{1,50}$');

    // defines a new regex pattern for the password
    // this is to force a length of 8-64 and denials some SQLi attacks
    const passwordRegex = new RegExp(
      '^(?!.*(--|;|\'|"|\\/\\*|\\*\\/|union|select|insert|update|delete|drop|xp_))' +
        '[\\w!@#$%^&*()\\-+=]{8,64}$'
    );

    // checks the input with the regex
    if (usernameRegex.test(username) && passwordRegex.test(password)) {
      // if that is successful it writes the user to the database
      // uses argon2 as its hashing algorithm
      await userf.insertUser(username, password, bday);

      // create a valid session for the user
      req.session.user = username;
      // redirects to the root path
      res.redirect('/');
    } else {
      // if there is an error it throws an error and
      // shows that there are invalid character
      throw new Error('Invalid Characters');
    }
  } catch (err) {
    // error handling to send the user to 404 page
    console.error('Error while registering:', err);
    res.status(500).render('404', {
      errorMsg:
        'Error while registering, try again later or contact site adminstrators',
    });
  }
});

// POST-Route for login
app.post('/login', async (req, res) => {
  // defines 2 variables to hold username and password
  const username = req.body.username;
  const password = req.body.password;

  // checks if the password and username match
  if (await userf.loginCheck(username, password)) {
    // if it matches it creates a valid session
    req.session.user = username;

    // redirects either to the last lcoation or to the root
    const redirectTo = req.session.redirectTo || '/';
    // sets the redirectTo var to null
    req.session.redirectTo = null;

    // redirects you to the right page
    return res.redirect(redirectTo);
  } else {
    // send text if credentials are wrong
    res.send('Invalid credentials');
  }
});

// POST-Route to log the user otu
app.get('/logout', (req, res) => {
  // if the user is not logged in
  if (!req.session) {
    // returns an error message
    return res.status(401).json({ message: 'No active session' });
  }

  // if the user is logged in it destroys the session
  req.session.destroy((err) => {
    // error handling in case there is an error
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ message: 'Failed to logout.' });
    }

    // clears the cookies
    res.clearCookie('connect.sid');

    // sends a response
    res.redirect('/')
  });
});

// POST-Route to validate the user
app.post('/user/validateUsername', async (req, res) => {
  // variable to hold the username from the req body
  let username = req.body.user.trim();

  // checks if the username is type of string and not empty
  if (typeof username !== 'string' || username == '') {
    // returns response when it is invalid
    return res.json({ response: 'Invalid username' });
  }

  // checks the username via regexpattern
  const re = new RegExp('^[a-zA-Z0-9_.]{1,50}$');

  // checks if the username is already in the database
  let isValidUser = await userf.checkIfUsernameAvailable(req.body.user);

  // if the test was false
  if (re.test(username) === false) {
    // returns error message
    res.json({ response: 'Invalid username' });
  } else if (isValidUser == 1) {
    // if the usernrame is already taken it returns a reponse saying exactly that
    res.json({ response: 'Username is already taken' });
  } else {
    // else it returns successful
    res.json({ response: 'Successful' });
  }
});

// GET-Route for the user to view his own profile
app.get('/profile', async (req, res) => {
  // checks if the user is logged in
  if (!req.session.user) {
    // when the user is not logged in he gets transportet to the login page
    return res.redirect('/login');
  } else {
    // if the user is logged in it loads the data from the db
    const profile = await func.fetchFromDB(
      '*',
      'users',
      `name = '${req.session.user}'`
    );

    // loads the list of all the posts the user made
    const listOfPosts = await func.fetchFromDB(
      '*',
      'posts',
      `posted_by = '${await userf.convUsername(req.session.user)}'`
    );

    // checks if the user is an admin (for the admin dashboard button)
    const isAdmin = await func.fetchFromDB(
      'role',
      'users',
      `name = '${req.session.user}' AND role = 'admin'`
    );

    // renders the profile and passes the loaded data
    res.render('profile', {
      profile: profile[0],
      posts: listOfPosts,
      isAdmin: isAdmin[0]['role'],
    });
  }
});

// GET-Route to view the subforums
app.get('/s/:sub', async (req, res) => {
  // try-catch block to catch all errors
  try {
    // tries to fetch all the information about the subforum
    let subforum = await func.fetchFromDB(
      '*',
      'subforums',
      `name = '${req.params.sub}'`
    );

    // checks if the subforum can be found
    if (subforum.length === 0) {
      throw new Error('Subforum not found');
    }

    // fetches all posts in the subforum
    let content = await func.fetchFromDB(
      '*',
      'posts',
      `link_to_subforum = '${subforum[0]['subforum_id']}' LIMIT 3`
    );

    // defines a variable that holds the amount of posts loaded from the cookies
    let loadedPosts = req.cookies.load;

    // if it is undefined it defines a new cookie called load with the value 5
    if (loadedPosts === undefined) {
      res.cookie('load', 5, {
        httpOnly: false,
        sameSite: 'lax',
      });
    }

    // renders the sub page with all the arguments
    res.render('sub', {
      sub: subforum[0],
      posts: content,
      posts_loaded: content.length,
    });

    // catches an error and prints an error message
  } catch (err) {
    res.status(404).render('404', { errorMsg: `Sub could not be found: ${err}` });
  }
});

// GET-Route to create a new post in a sub
app.get('/s/:sub/createNew', async (req, res) => {
  // checks if the user is logged in, if not he is redirected
  // to the login page and the last page he was on is safed as a cookie
  if (!req.session.user) {
    res.cookie('redirect', `/s/${req.params.sub}/createNew`);
    return res.redirect('/login');
  } else {
    // if the user is logged in it renders the page for creating a new post
    res.render('new', { subName: req.params.sub });
  }
});

// GET-Route to view the different posts
app.get('/s/:sub/view/:postID', async (req, res) => {
  try {
    // tries to fetch the id of the sub
    const sub_id = await func.fetchFromDB(
      'subforum_id',
      'subforums',
      `name = '${req.params.sub}'`
    );

    // tries to fetch the data from the psot
    const postData = await func.fetchFromDB(
      '*',
      'posts',
      `post_id = ${req.params.postID} AND link_to_subforum = ${sub_id[0]['subforum_id']}`
    );

    // fetches who posted the post
    const posted_by = await func.fetchFromDB(
      'name',
      'users',
      `user_id = '${postData[0]['posted_by']}'`
    );

    // fetches comments for the post
    const comments = await func.fetchFromDB(
      '*',
      'comments',
      `post = '${req.params.postID}'`
    );

    // sets a session key so the user can return to the main sub
    req.session.returnTo = `/s/${req.params.sub}`;

    // checks if the data is empty and the post does not exist
    if (postData.length == 0) {
      // ensures data is not empty
      throw new Error('empty data returned');
    } else {
      console.log(posted_by)
      // if the post exists it renders the post and passes all the arguments
      res.render('view', {
        post: postData[0],
        poster: posted_by[0]['name'],
        viewer: req.session.user,
        subforum: req.params.sub,
        comments,
      });
    }

    // catches errors and prints them on a 404 page
  } catch (err) {
    console.log(err)
    res
      .status(404)
      .render('404', { errorMsg: 'The page you requested does not exist' });
  }
});

// POST-Route to create a new post
app.post('/s/:sub/createNew', async (req, res) => {
  try {
    // fetches the user
    const user = await func.fetchFromDB(
      'user_id',
      'users',
      `name = '${req.session.user}'`
    );

    // fetches the id of the sub
    const sub_id = await func.fetchFromDB(
      'subforum_id',
      'subforums',
      `name = '${req.params.sub}'`
    );

    // inserts into the database
    await func.insertIntoDB(
      'posts',
      'title, content, posted_by, link_to_subforum, posted_date',
      `"${req.body.title}", "${req.body.content}" , "${user[0]['user_id']}", "
      ${sub_id[0]['subforum_id']}", "${func.getFormattedDate()}"`
    );

    // modifies the attribute posts_count on the user +1
    await userf.modifyUser(user[0].user_id, 'posts_count', 'posts_count + 1');

    // fetches the post id from the database
    const post_num = await func.fetchFromDB(
      'post_id',
      'posts',
      `title = '${req.body.title}' AND posted_by = '${user[0].user_id}'`
    );

    // builds up a link to redirect the user to the post after creation
    let buildUp = `/s/${req.params.sub}/view/${post_num[0]['post_id']}`;

    // redirects the user to the link
    res.status(200).redirect(buildUp);
  } catch (err) {
    // if there is an error it sends the user the text 
    console.log(err);
    res.send('You are not logged in, log in to create posts');
  }
});

// POST-Route to load more posts
app.post('/post/loadMorePosts', async (req, res) => {
  // two variables that hold the sub and the index we are currently on
  // (which is saved in the cookies)
  const sub = req.body.sub;
  const index = req.body.startIndex || 0;

  // fetches 10 new posts
  let newContent = await func.fetchFromDB(
    '*',
    'posts',
    `link_to_subforum = '${sub}' LIMIT 10 OFFSET ${index}`
  );

  // sends the new posts in json format back to the frontend to handle
  console.log(JSON.stringify(newContent))
  res.json(newContent);
});

// POST-Route to update the cookie that holds the amount of posts loaded
app.post('/post/updateLoadedPosts', (req, res) => {
  const currentAmount = req.cookies.load;

  // updates the amount +3
  res.cookie('load', (currentAmount += 10), { sameSite: 'lax' });
  res.status(200).json({ success: true });
});

// POST-Route to delete a post
app.post('/post/delete', async (req, res) => {
  try {
    // checks if the user who requests the deletion is also the user who 
    // posted the post in the first place
    if (req.session.user == req.body.posted_by) {
      // deletes the post
      const deletion = func.deletePost(req.body.post_id);
      // redirects the user to the last page they have been on
      const redirect_link = '/s/' + req.body.path;
      res.status(200).json({ redirect: redirect_link });
    } else {
      // throws a new error when the user is not autorized to delete
      throw new Error('Not authorized to delete');
    }
  } catch (error) {
    console.error(error);
    res.status(403).json({ error: 'Not authorized' });
  }
});

// POST-Route to create a new comment
app.post('/post/comment/create_comment', async (req, res) => {

  try {
    // 1. Require login
    if (!req.session.user) {
      return res.status(401).json({ error: 'Unauthorized', redirect: "/login" });
    }

    const { post_id, content } = req.body;
    const username = req.session.user;

    console.log(post_id + " : " + content + " : " + username)

    // 2. Validate input
    if (!post_id || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 3. Get user ID from username
    const user_id = await userf.convUsername(username);

    console.log(`${user_id}, ${post_id}, '${content.replace(/'/g, "''")}'`)

    // 4. Use parameterized insertion or properly formatted string
    await func.insertIntoDB(
      'comments',
      'poster, poster_id, post, content',
      `'${username}', ${user_id}, ${post_id}, '${content.replace(/'/g, "''")}'`
    );

    res.json({ success: 1 });

  } catch (error) {
    console.error('Error inserting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// POST-Route to delete comments
app.post('/post/comment/delete_comment', async (req, res) => {
  try {
    // checks if the user is logged in
    if (req.session.user) {
      // deletes the comment
      const deletion = await func.deleteComment(req.body.comment_id);
      res.json({ success: 1 });
    }

    // catches errors and prints them
  } catch (error) {
    console.error(error);
    res.status(404).json({ error });
  }
});

// GET-Route for the admni dashboard
app.get('/admin/dashboard', async (req, res) => {
  // loads the user from the database
  const validationUser = await func.fetchFromDB(
    'role',
    'users',
    `name = '${req.session.user}'`
  );

  // if the user is an admin
  if (validationUser[0]['role'] == 'admin') {
    // it fetches users, posts, subs
    const users = await func.fetchFromDB('*', 'users', '');
    const posts = await func.fetchFromDB('*', 'posts', '');
    const subs = await func.fetchFromDB('*', 'subforums', '');
    // and renders them
    res.render('dashboard', { users, posts, subs });
  } else {
    // otherwise it tells the user he is not authorized
    res.send('Unauthorized');
  }
});
