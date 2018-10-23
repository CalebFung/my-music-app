// Adapted from Google Cloud Platform NodeJS Bookshelf series.
// (https://github.com/GoogleCloudPlatform/nodejs-getting-started)
//
// Adapted for UT Dallas 2018 GCP Workshop.

'use strict';

const {Storage} = require('@google-cloud/storage');
const Multer = require('multer');
const config = require('../config');

const projectId = config.get('GCLOUD_PROJECT');
const bucketId = config.get('CLOUD_BUCKET');

const storage = new Storage({
  projectId: projectId
});
const bucket = storage.bucket(bucketId);
const multer = Multer({
  storage: Multer.MemoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // no larger than 5mb
  }
});

function getPublicUrl (filename) {
  return `https://storage.googleapis.com/${bucketId}/${filename}`;
}


// Express middleware that will automatically pass uploads to Cloud Storage.
// req.file is processed and will have two new properties:
// * ``cloudStorageObject`` the object name in cloud storage.
// * ``cloudStoragePublicUrl`` the public url to the object.
// [START process]
function sendUploadToGCS (req, res, next) {
  if (!req.file) {
    return next();
  }

  const gcsname = Date.now() + req.file.originalname;
  const file = bucket.file(gcsname);

  const stream = file.createWriteStream({
    metadata: {
      contentType: req.file.mimetype
    },
    resumable: false
  });

  stream.on('error', (err) => {
    req.file.cloudStorageError = err;
    next(err);
  });

  stream.on('finish', () => {
    req.file.cloudStorageObject = gcsname;
    file.makePublic().then(() => {
      req.file.cloudStoragePublicUrl = getPublicUrl(gcsname);
      next();
    });
  });

  stream.end(req.file.buffer);
}

module.exports = {
  getPublicUrl,
  sendUploadToGCS,
  multer
};