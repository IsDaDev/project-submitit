// imports modules
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const express = require('express');
const cookieParser = require('cookie-parser');

// exports multiple settings for the app
module.exports = (app) => {
  // sets the view engine to ejs
  app.set('view engine', 'ejs');

  // instructs node to use bodyparser so we can get the body
  app.use(
    bodyParser.urlencoded({
      extended: true,
    })
  );

  app.use(cookieParser());

  // setting for the session plugin
  app.use(
    session({
      // sets a secret which is in the .env file
      secret: process.env.KEY,
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
    })
  );

  // tells the app to use json
  app.use(express.json());

  // sets a static directory for css files
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // middleware so when the user goes to 'http://www.example.com/' 
  // it removes it 'http://www.example.com'
  app.use((req, res, next) => {
    if (req.path.length > 1 && req.path.endsWith('/')) {
      const newPath = req.path.slice(0, -1);
      return res.redirect(301, newPath);
    }
    next();
  });

  // checks if the path the users wants to go to is public or not
  app.use((req, res, next) => {
    if (
      !req.session.user &&
      req.originalUrl !== '/favicon.ico' &&
      req.originalUrl !== '/login' &&
      req.originalUrl !== '/register' &&
      req.originalUrl !== '/' &&
      req.originalUrl !== '/user/validateUsername' &&
      req.originalUrl !== '/logout' &&
      !req.originalUrl.startsWith('/post') &&
      !req.originalUrl.startsWith('/s/') &&
      !req.originalUrl.startsWith('/public') &&
      !req.originalUrl.startsWith('/post/comment/create_comment')
    ) {
      req.session.redirectTo = req.originalUrl;
      return res.redirect('/login');
    }
    next();
  });
};
