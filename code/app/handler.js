// Minimal serverless handler (Node.js) - AWS Lambda (HTTP API)
exports.handler = async (event) => {
  try {
    const method = (event.httpMethod || (event.requestContext && event.requestContext.http && event.requestContext.http.method)) || 'GET';
    if (method === 'GET') {
      return { statusCode: 200, body: JSON.stringify({ region: process.env.REGION || 'aws-unknown', status: 'ok' }) };
    } else if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      // In real app: write to DB and publish event to queue
      return { statusCode: 201, body: JSON.stringify({ id: body.userId || 'generated-id' }) };
    }
    return { statusCode: 405, body: 'Method not allowed' };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
