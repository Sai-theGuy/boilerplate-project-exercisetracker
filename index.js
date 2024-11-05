const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
let bodyParser = require("body-parser");
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

let exerciseSessionSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    date: {
      type: String,
    },
  },
  { _id: false }
);

let userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  sessionLogs: {
    type: [exerciseSessionSchema],
  },
});

let exerciseSessionLog = mongoose.model("SessionLog", exerciseSessionSchema);
let user = mongoose.model("User", userSchema);

app.use(bodyParser.urlencoded({ extended: false }));

app.post("/api/users", (request, response) => {
  let newUser = user({ username: request.body.username });

  newUser.save((error, data) => {
    if (error) {
      response.json(error);
    } else {
      let resObj = {};
      resObj["username"] = data.username;
      resObj["_id"] = data._id;
      response.json(resObj);
    }
  });
});

app.get("/api/users", (request, response) => {
  user.find({}, (error, data) => {
    if (error) {
      console.log(error);
    } else {
      response.json(data);
    }
  });
});

app.post("/api/users/:_id/exercises", (request, response) => {
  let newExerciseLog = new exerciseSessionLog({
    description: request.body.description,
    duration: parseInt(request.body.duration),
    date: new Date(request.body.date).toString().substring(0, 15)
  });
  const date = Date();
  
  if (newExerciseLog.date == "Invalid Date") {
    newExerciseLog.date = date.toString().substring(0, 15);
  }
  // response.json({body: })
  user.findByIdAndUpdate(
    request.params._id,
    { $push: { sessionLogs: newExerciseLog } },
    { new: true },
    (error, data) => {
      if (!error) {
        let responseObj = {};

        responseObj["username"] = data.username;
        responseObj["description"] = newExerciseLog.description;
        responseObj["duration"] = newExerciseLog.duration;
        responseObj["date"] = newExerciseLog.date;
        responseObj["_id"] = data._id;

        response.json(responseObj);
      }
    }
  );
});

app.get("/api/users/:_id/logs", (request, response) => {
  user.findById(request.params._id, (error, data) => {
    if (!error) {
      let resObj = {};
      resObj['username'] = data.username;
      // let i = 0;
      // while(i < data.sessionLogs.length){
      //   data.sessionLogs[i]['date'] = new Date(data.sessionLogs[i]['date']).toDateString();
      //   i++;
      // }

      if (request.query.from || request.query.to) {
        let fromDate = new Date(0);
        let toDate = new Date();

        if (request.query.from) {
          fromDate = new Date(request.query.from);
        }
        if (request.query.to) {
          toDate = new Date(request.query.to);
        }

        fromDate = fromDate.getTime();
        toDate = toDate.getTime();

        data.sessionLogs = data.sessionLogs.filter((session) => {
          let sessionDate = new Date(session.date).getTime();
          return sessionDate >= fromDate && sessionDate <= toDate;
        });
      }
      if (request.query.limit) {
        data.sessionLogs = data.sessionLogs.slice(0, request.query.limit);
      }
      resObj["count"] = data.sessionLogs.length;
      resObj['_id'] = data._id;
      resObj['log'] = data.sessionLogs;  
      response.json(resObj);
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
