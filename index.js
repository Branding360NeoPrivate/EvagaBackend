import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import path from "path";
dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

console.log(process.env.PORT, "process.env.PORT");

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });
