// Adapted from Google Cloud Platform NodeJS Bookshelf series.
// (https://github.com/GoogleCloudPlatform/nodejs-getting-started)
//
// Adapted for UT Dallas 2018 GCP Workshop.

'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./config');

const app = express();

app.use(cors());

app.disable('etag');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('trust proxy', true);

app.use('/albums', require('./albums/crud'));
app.use('/api/albums', require('./albums/api'));

// Redirect root to /albums
app.get('/', (req, res) => {
  res.redirect('/albums');
});

// Handler 404
app.use((req, res) => {
  res.status(404).send('Not Found');
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send(err.response || 'Something broke!');
});

// Start the server
const server = app.listen(config.get('PORT'), () => {
  const port = server.address().port;
  console.log(`App listening on port ${port}`);
});

module.exports = app;