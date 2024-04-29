import cron from "node-cron";
import { checkAppointmentDate } from "@/appointment.ts";
import express from "express";
const app = express();

app.get("/health", (req, res) => {
  res.send("ok");
});

checkAppointmentDate();
cron.schedule("*/15 * * * *", () => {
  console.log("Running a task every 15 minutes");
});
