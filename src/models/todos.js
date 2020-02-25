
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const todoSchema = mongoose.Schema({
  title: {
    type: String,
    index: true,
    unique: false
  },
  isDone: Boolean,
  date: { type: Date, default: Date.now }
});

const todos = mongoose.model('todos', todoSchema);

module.exports = todos;