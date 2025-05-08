import swaggerJSDoc from "swagger-jsdoc";
import dotenv from "dotenv";

dotenv.config();

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Optima API",
      version: "1.0.0",
      description: "Optima API documentation",
    },
    servers: [{ url: process.env.BASE_URL }, { url: "http://localhost:3000" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: { type: "string", example: "65f47a8cde3a6e7b5a1c9b91" },
            firstName: { type: "string", example: "John" },
            lastName: { type: "string", example: "Doe" },
            email: {
              type: "string",
              format: "email",
              example: "john@example.com",
            },
            role: {
              type: "string",
              enum: ["seeker", "helper"],
              example: "helper",
            },
            googleId: { type: "string", example: "123456789" },
            myPeople: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  customFirstName: { type: "string", example: "Bestie" },
                  customLastName: { type: "string", example: "Smith" },
                  user: { type: "string", example: "65f47a8cde3a6e7b5a1c9b92" },
                },
              },
            },
            resetPasswordCode: { type: "string", example: "1234" },
            resetPasswordExpire: { type: "string", format: "date-time" },
            verifiedCode: { type: "boolean", example: false },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        FriendRequest: {
          type: "object",
          properties: {
            _id: { type: "string", example: "65f47a8cde3a6e7b5a1c9b93" },
            seekerId: { type: "string", example: "65f47a8cde3a6e7b5a1c9b91" },
            helperId: { type: "string", example: "65f47a8cde3a6e7b5a1c9b92" },
            customFirstName: { type: "string", example: "Bestie" },
            customLastName: { type: "string", example: "Smith" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Meeting: {
          type: "object",
          properties: {
            _id: { type: "string", example: "65f47a8cde3a6e7b5a1c9b94" },
            seeker: { type: "string", example: "65f47a8cde3a6e7b5a1c9b91" },
            type: {
              type: "string",
              enum: ["global", "specific"],
              example: "global",
            },
            helper: { type: "string", example: "65f47a8cde3a6e7b5a1c9b92" },
            status: {
              type: "string",
              enum: ["pending", "accepted", "ended", "rejected", "timeout"],
              example: "pending",
            },
            createdAt: { type: "string", format: "date-time" },
            acceptedAt: { type: "string", format: "date-time" },
            endedAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            status: { type: "string", example: "fail" },
            message: { type: "string", example: "User not found" },
          },
        },
        Token: {
          type: "object",
          properties: {
            token: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
          },
        },
      },
    },
  },
  apis: ["./routes/*.js"],
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);

export default swaggerDocs;
