// Adapted from Google Cloud Platform NodeJS Bookshelf series.
// (https://github.com/GoogleCloudPlatform/nodejs-getting-started)
//
// Adapted for UT Dallas 2018 GCP Workshop.

'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const model = require('./model');
const uploads = require('./uploads');

const router = express.Router();

// Automatically parse request body as form data
router.use(bodyParser.urlencoded({ extended: false }));

// Set Content-Type for all responses for these routes
router.use((req, res, next) => {
  res.set('Content-Type', 'text/html');
  next();
});

// GET /albums
// Display a page of albums (up to ten at a time).
router.get('/', (req, res, next) => {
  const orderings = ['rating', 'title', 'year'];
  const limit = Number.parseInt(req.query.limit, 10) || 5;
  const order = orderings.includes(req.query.order) ? req.query.order : 'rating';
  // True - ascending, false - descending
  const sort = req.query.sort !== undefined && req.query.sort !== 'ascending';

  model.list(limit, req.query.pageToken, order, sort, (err, entities, cursor) => {
    if (err) {
      next(err);
      return;
    }

    res.render('albums/list.pug', {
      albums: entities,
      nextPageToken: cursor
    });
  });
});

// GET /albums/add
// Display a form for creating an album.
router.get('/add', (req, res) => {
  res.render('albums/form.pug', {
    album: {},
    action: 'Add'
  });
});

// POST /albums/add
// Create a album.
router.post(
  '/add',
  uploads.multer.single('image'),
  uploads.sendUploadToGCS,
  (req, res, next) => {
    let data = req.body;

    // Was an image uploaded? If so, we'll use its public URL
    // in cloud storage.
    if (req.file && req.file.cloudStoragePublicUrl) {
      data.imageUrl = req.file.cloudStoragePublicUrl;
    }

    // Save the data to the database.
    model.create(data, (err, savedData) => {
      if (err) {
        next(err);
        return;
      }
      res.redirect(`${req.baseUrl}/${savedData.id}`);
    });
  }
);

// GET /albums/:id/add-tracks
// Display a form for creating tracks.
router.get('/:album/add-track', (req, res, next) => {
  model.read(req.params.album, (err, entity) => {
    if (err) {
      next(err);
      return;
    }

    res.render('albums/form-track.pug', {
      album: entity
    });
  });
});

// POST /albums/:id/add-tracks
// Add tracks.
router.post(
  '/:album/add-track',
  uploads.multer.single('track'),
  uploads.sendUploadToGCS,
  (req, res, next) => {
    model.read(req.params.album, (err, entity) => {
      if (err) {
        next(err);
        return;
      }
      
      if (!('tracks' in entity)) {
        entity.tracks = [];
      }

      let track = {
        title: req.body.title,
        fileUrl: ''
      }
      
      if (req.file && req.file.cloudStoragePublicUrl) {
        track.fileUrl = req.file.cloudStoragePublicUrl;
        entity.tracks.push(track)
      } else {
        next({
          code: 400,
          message: 'Missing file!'
        });
        return;
      }

      model.update(req.params.album, entity, (err, savedData) => {
        if (err) {
          next(err);
          return;
        }
        res.redirect(`${req.baseUrl}/${savedData.id}`);
      });
    });
  }
);


// GET /albums/:id/edit
// Display an album for editing.
router.get('/:album/edit', (req, res, next) => {
  model.read(req.params.album, (err, entity) => {
    if (err) {
      next(err);
      return;
    }

    res.render('albums/form.pug', {
      album: entity,
      action: 'Edit'
    });
  });
});

// POST /albums/:id/edit
// Update a album.
router.post(
  '/:album/edit',
  uploads.multer.single('image'),
  uploads.sendUploadToGCS,
  (req, res, next) => {
    let data = req.body;

    if (req.file && req.file.cloudStoragePublicUrl) {
      data.imageUrl = req.file.cloudStoragePublicUrl;
    } else if (data.urlImage) {
      data.imageUrl = data.urlImage;
      delete data.urlImage;
    }

    model.update(req.params.album, data, (err, savedData) => {
      if (err) {
        next(err);
        return;
      }
      res.redirect(`${req.baseUrl}/${savedData.id}`);
    });
  }
);

// GET /albums/:id
// Display an album.
router.get('/:album', (req, res, next) => {

  res.header("Access-Control-Allow-Origin", "*");

  model.read(req.params.album, (err, entity) => {
    if (err) {
      next(err);
      return;
    }

    res.render('albums/view.pug', {
      album: entity
    });
  });
});

// GET /albums/:id/delete
// Delete a book.
router.get('/:album/delete', (req, res, next) => {
  model.delete(req.params.album, (err) => {
    if (err) {
      next(err);
      return;
    }
    res.redirect(req.baseUrl);
  });
});

// Handle errors
router.use((err, req, res, next) => {
  err.response = err.message;
  next(err);
});

module.exports = router;