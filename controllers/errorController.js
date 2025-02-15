import customError from "../utils/customError.js";
const devErrors = (res, error) => {
  res.status(error.statusCode).json({
    status: error.statusCode,
    message: error.message,
    stackTrace: error.stack,
    error: error,
  });
};

const prodErrors = (res, error) => {
  if (error.isOperational) {
    res.status(error.statusCode).json({
      status: error.statusCode,
      message: error.message,
    });
  } else {
    res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};

const castErrorHandle = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new customError(message, 400);
};

const handleDuplicateFields = (error) => {
  const message = `Duplicate field value: ${error.keyValue.name}. Please use another value!`;
  return new customError(message, 400);
};

const handleValidationError = (error) => {
  const errors = Object.values(error.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new customError(message, 400);
};

const globalErrorHandler = (error, req, res, next) => {
  error.statusCode = error.statusCode || 500;
  error.status = error.status || "error";

  if (process.env.NODE_ENV === "development") {
    devErrors(res, error);
  } else if (process.env.NODE_ENV == "production") {
    if (error.name === "CastError") error = castErrorHandle(error);
    if (error.code === 11000) error = handleDuplicateFields(error);
    if (error.name === "ValidationError") error = handleValidationError(error);

    prodErrors(res, error);
  }
};

export default globalErrorHandler;
