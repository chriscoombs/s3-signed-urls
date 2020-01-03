// Lambda@Edge does not support environment variables, hence InlineCode with !Sub
const bucket = '${Bucket}'
const expires = ${Duration};
const stage = '${StageName}'
const role = '${Assume.Arn}'
const region = '${AWS::Region}'

const AWS = require('aws-sdk');

const handler = async (event, context) => {
  let response;
  if (
    // If API Gateway event or
    event.httpMethod ||
    // CloudFront event and origin has thrown oversized error
    (event.Records &&
      event.Records[0].cf.response.status === '413')
  ) {
    const sts = new AWS.STS();
    const data = await sts.assumeRole({
      RoleArn: role,
      RoleSessionName: context.awsRequestId,
    }).promise();
    const s3 = new AWS.S3({
      credentials: sts.credentialsFrom(data),
      region,
    });
    const method = event.Records ? event.Records[0].cf.request.method : event.httpMethod;
    const path = event.Records ? event.Records[0].cf.request.uri.replace('/' + stage, '').substr(1) : event.pathParameters.proxy;
    const url = s3.getSignedUrl(method === 'GET' ? 'getObject' : 'putObject', {
      Bucket: bucket,
      Key: path,
      Expires: expires,
    });
    if (event.Records) {
      response = event.Records[0].cf.response;
      response.status = '307';
      response.headers.location = [{
        key: 'Location',
        value: url,
      }];
    } else {
      response = {
        statusCode: 307,
        headers: {
          Location: url,
        },
      };
    }
  } else {
    response = event.Records[0].cf.response;
  }
  return response;
};

module.exports = {
  handler,
};
