import express from "express";
import dotenv from "dotenv";
import customError from "./utils/customError.js";
import globalErrorHandler from "./controllers/errorController.js";
import connectDB from "./config/connect.js";
import authRoute from "./routes/authRoute.js";

dotenv.config();

process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth",authRoute);

app.all("*", (req, res, next) => {
  const err = new customError(
    `Can't find ${req.originalUrl} on this server!`,
    404
  );
  next(err);
});

app.use(globalErrorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await connectDB();
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
