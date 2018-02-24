const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const s3 = new AWS.S3();

const { bucket } = process.env;

// the number of seconds to expire the pre-signed URL operation in, default is 900 (15 minutes)
const expires = 900;
const methodOperations = new Map([
  ['GET', 'getObject'],
  ['PUT', 'putObject'],
]);

const getSignedUrl = (method, path) => {
  const operation = methodOperations.get(method);
  const params = {
    Bucket: bucket,
    Key: path,
    Expires: expires,
  };
  return s3.getSignedUrl(operation, params);
};

const handler = (event, context, callback) => {
  const method = event.httpMethod;
  const path = event.pathParameters.proxy;
  if (methodOperations.get(method)) {
    const url = getSignedUrl(method, path);
    callback(null, {
      statusCode: 307,
      headers: {
        Location: url,
      },
    });
  } else {
    callback(null, {
      statusCode: 405,
    });
  }
};

module.exports = {
  handler,
};
