
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const todos = require("./models/todos");
const { promisify } = require("util");

const redisClient = require("redis").createClient;
const redis = redisClient({
    host: 'my-redis'
  });
// const redis = redisClient(
//     {
//         port: 6380,
//         host: 'spw.redis.cache.windows.net',
//         password: "Fm5WgdADgBIsZvniUKuMSQROaSQOd0lbbiPLa0qZrO0=", 
//     });
const getAsync = promisify(redis.get).bind(redis);

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

mongoose.connect("mongodb://mongodb:27017/todos");

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Connected MongoDB");
});

redis.on("error", err => {
  console.error("Redis Error " + err);
});

app.get("/todos", async (req, res) => {
  try {
    const result = await todos.find({});
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (e) {
    console.error("Unable to get todos", e);
  }
});

// get todo by title
app.get("/todo/:title", async (req, res) => {
  try {
    const title = req.params.title;

    if (!title) {
      res.status(400).json({
        success: false,
        message: "Invalid param"
      });
    }

    // find from cache
    let getTitleDataFromCache = await getAsync(title);

    if (!getTitleDataFromCache) {
      let result = await todos.findOne({ title: title });

      if (!result) {
        throw 'Not found todo';
      }

      // set to cache
      await redis.set(title, JSON.stringify(result));

      res.status(200).json({
        success: true,
        source: "mongodb",
        data: result
      });
    }

    res.status(200).json({
      success: true,
      source: "redis service name spw.redis.cache.windows.net",
      data: JSON.parse(getTitleDataFromCache)
    });
  } catch (e) {
    console.error("Unable to get todo by title", e);
    res.status(400).json({
      success: false,
      message: e
    });
  }
});

// create new todo
app.post("/todo", async (req, res) => {
  try {
    if (!req.body) {
      res.status(400).json({
        success: false,
        message: "Please send the todo body"
      });
    }
    try {
        let todo = new todos(req.body);
        await todo.save();
  
        res.status(200).json({
          success: true,
          data: todo
        });
    } catch (e) {
      throw "Unable to insert new document";
    }
  } catch (e) {
    console.error("Unable to add new todo", e);
    res.status(400).json({
      success: false,
      message: "Unable to add new todo"
    });
  }
});

// update todo status by title
app.patch("/todo/:title", async (req, res) => {
  const title = req.params.title;
  const isDone = req.body.isDone;

  if (!title) {
    res.status(400).json({
      success: false,
      message: "Please send the todo title"
    });
  }

  // update mongodb
  let result = await todos.findOneAndUpdate(
    {
      title: title
    },
    {
      $set: {
        isDone: isDone
      }
    },
    { new: true }
  );

  // update cache
  await redis.setex(title,360,JSON.stringify(result));

  res.status(200).json({
    success: true,
    data: result
  });
});

app.listen(8080, () => {
  console.log("Listening on port 8080");
});