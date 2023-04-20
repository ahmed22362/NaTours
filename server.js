/* eslint-disable n/no-path-concat */
const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/config.env' });

const app = require('./app');
const port = 3000;

const mongoose = require('mongoose');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.ATLAS_DATABASE_PASSWORD
);

mongoose.set('strictQuery', false);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('MongoDB connected Successfully ');
  });
const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('UnhandledRejection Shutting down .......');
  server.close(() => {
    process.exit(1);
  });
});
