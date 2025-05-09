const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const express = require('express');
const cookieParser = require('cookie-parser');

module.exports = (app) => {
  app.set('view engine', 'ejs');
  app.use(express.static('public'));
  app.use(
    bodyParser.urlencoded({
      extended: true,
    })
  );
  app.use(
    session({
      secret: process.env.KEY,
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
    })
  );

  app.use(bodyParser.json());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));
  app.use((req, res, next) => {
    if (req.path.length > 1 && req.path.endsWith('/')) {
      const newPath = req.path.slice(0, -1);
      return res.redirect(301, newPath);
    }
    next();
  });

  app.use(cookieParser());

  app.set('view engine', 'ejs');
  app.use((req, res, next) => {
    if (
      !req.session.user &&
      req.originalUrl !== '/login' &&
      req.originalUrl !== '/register' &&
      req.originalUrl !== '/' &&
      req.originalUrl !== '/user/validateUsername' &&
      req.originalUrl !== '/logout' &&
      !req.originalUrl.startsWith('/post') &&
      !req.originalUrl.startsWith('/s/') &&
      !req.originalUrl.startsWith('/public')
    ) {
      req.session.redirectTo = req.originalUrl;
      return res.redirect('/login');
    }
    next();
  });
};
