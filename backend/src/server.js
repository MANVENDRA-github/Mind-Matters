import express from "express";
import "dotenv/config"; //has the port in it
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js";
import { connect } from "mongoose";
import { connectDB } from "./lib/db.js";

const app = express();
const PORT = process.env.PORT;

const __dirname = path.resolve();

// app.get("/api/auth/signup", (req, res) => {
//   res.send("Signup route");
// });

// app.get("/api/auth/login", (req, res) => {
//   res.send("login route");
// });

// app.get("/api/auth/logout", (req, res) => {
//   res.send("logout route");
// });

app.use(
  cors({
  origin: "http://localhost:5173",//frontend url
  credentials: true, //allow frontend to send cookies
})); //to allow cross origin requests
app.use(express.json()); //to parse json body
app.use(cookieParser()); //to parse cookies

//calling the routes from auth.route.js
app.use("/api/auth", authRoutes); 

//calling the routes from user.route.js
app.use("/api/users", userRoutes); 

//calling the routes from chat.route.js
app.use("/api/chat",chatRoutes);

if(process.env.NODE_ENV==="production"){
  app.use(express.static(path.join(__dirname,"../frontend/dist")));
  app.get('*',(req,res)=>{
    res.sendFile(path.join(__dirname,"../frontend/dist/index.html"));
  });}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});

