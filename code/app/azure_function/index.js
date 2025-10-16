module.exports = async function (context, req) {
    if (req.method === 'GET') {
        context.res = { status:200, body: { region: process.env.REGION || 'azure-unknown', status: 'ok' } };
    } else if (req.method === 'POST') {
        const body = req.body || {};
        context.res = { status:201, body: { id: body.userId || 'generated-id' } };
    } else {
        context.res = { status:405, body: 'Method not allowed' };
    }
};
