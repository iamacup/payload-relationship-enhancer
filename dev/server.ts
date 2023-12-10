import express from "express";
import payload from "payload";

import config from "./payload.config";

require("dotenv").config({ path: ".env.local" });
const app = express();

// Redirect root to Admin panel
app.get("/", (_, res) => {
  res.redirect("/admin");
});

const seedInit = async () => {
  const res = await payload.find({
    collection: "users",
    where: {
      email: {
        equals: "test@test.com",
      },
    },
  });

  // test to see if we have already done a seed
  if (res.docs.length !== 0) {
    return;
  }

  await payload.create({
    collection: "users",
    data: {
      email: "test@test.com",
      password: "test",
    },
  });
};

const start = async () => {
  // Initialize Payload
  await payload.init({
    secret: process.env.PAYLOAD_SECRET!,
    express: app,
    onInit: async () => {
      payload.logger.info(`Payload Admin URL: ${payload.getAdminURL()}`);
    },
    config: Promise.resolve(config),
  });

  // Add your own express routes here

  app.listen(3000);

  seedInit();
};

start();
