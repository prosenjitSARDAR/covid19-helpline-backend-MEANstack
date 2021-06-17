const authRoute = require('./authRoute')


module.exports = {
    routes: function (app) {
        app.get('/', (req, res) => {
            res.json({ "message": req.headers.origin })
        });

        app.use('/api/auth', authRoute);

    }
}
