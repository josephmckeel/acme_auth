const express = require('express');
const app = express();
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
const {
  models: { User, Note },
} = require('./db');
const path = require('path');
const jwt = require('jsonwebtoken');

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/auth', async (req, res, next) => {
  try {
    const id = await User.authenticate(req.body);
    const token = await jwt.sign({ id: id }, process.env.JWT);
    res.send({ token: token });
  } catch (ex) {
    next(ex);
  }
});

app.get('/api/auth', async (req, res, next) => {
  try {
    const response = await jwt.verify(
      req.headers.authorization,
      process.env.JWT
    );
    res.send(await User.byToken(response.id));
  } catch (ex) {
    next(ex);
  }
});

app.get('/api/users/:id/notes', async (req, res, next) => {
  try {
    // console.log(req.params);
    const response = await jwt.verify(req.params.id, process.env.JWT);
    // console.log(response);
    const notes = await Note.findAll({
      where: {
        userId: response.id,
      },
    });
    res.send(notes);
  } catch (er) {
    console.log(er);
    next(er);
  }
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;
