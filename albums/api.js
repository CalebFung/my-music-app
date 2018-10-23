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

router.use(bodyParser.json());

// GET /api/albums
// Retrieve a page of albums (up to ten at a time).
router.get('/', (req, res, next) => {
  const orderings = ['rating', 'title', 'year'];
  const limit = Number.parseInt(req.query.limit, 10) || 10;
  const order = orderings.includes(req.query.order) ? req.query.order : 'rating';
  // True - ascending, false - descending
  const sort = req.query.sort !== undefined && req.query.sort !== 'ascending';

  model.list(limit, req.query.pageToken, order, sort, (err, entities, cursor) => {
    if (err) {
      next(err);
      return;
    }
    res.json({
      items: entities,
      nextPageToken: cursor
    });
  });
});

// POST /api/albums
// Create a new album.
router.post(
  '/',
  uploads.multer.single('image'),
  uploads.sendUploadToGCS,
  (req, res, next) => {
    let data = req.body
    
    if (req.file && req.file.cloudStoragePublicUrl) {
      data.imageUrl = req.file.cloudStoragePublicUrl;
    }

    model.create(data, (err, entity) => {
      if (err) {
        next(err);
        return;
      }
      res.json(entity);
    });
  }
);

// GET /api/albums/:id
// Retrieve an album.
router.get('/:album', (req, res, next) => {
  model.read(req.params.album, (err, entity) => {
    if (err) {
      next(err);
      return;
    }
    res.json(entity);
  });
});

// PUT /api/albums/:id
// Update an album.
router.put('/:album', (req, res, next) => {
  model.update(req.params.album, req.body, (err, entity) => {
    if (err) {
      next(err);
      return;
    }
    res.json(entity);
  });
});

// DELETE /api/albums/:id
// Delete an album.
router.delete('/:album', (req, res, next) => {
  model.delete(req.params.album, (err) => {
    if (err) {
      next(err);
      return;
    }
    res.status(200).send('OK');
  });
});

// POST /api/albums/:id/tracks
// Create a new track.
router.post(
  '/:album/track', 
  uploads.multer.single('track'),
  uploads.sendUploadToGCS,
  (req, res, next) => {
    model.read(req.params.album, (err, entity) => {
      if (err) {
        next(err);
        return;
      }
      
      let data = {
        title: req.body.title || 'No name',
        fileUrl: ''
      };

      if (req.file && req.file.cloudStoragePublicUrl) {
        data.fileUrl = req.file.cloudStoragePublicUrl;
      } else {
        next({
          code: 400,
          message: 'Missing file!'
        });
        return;
      }
      
      if (!('tracks' in entity)) {
        entity.tracks = [];
      }
      entity.tracks.push(data);

      model.update(req.params.album, entity, (err, entity) => {
        if (err) {
          next(err);
          return;
        }
        res.json(entity);
      });
    });
  }
);

// Error handling
router.use((err, req, res, next) => {
  err.response = {
    message: err.message,
    internalCode: err.code
  };
  next(err);
});

module.exports = router;