import cron from "node-cron";
import { checkAppointmentDateWithBackoff } from "@/appointment.ts";
import express from "express";
const app = express();

app.get("/health", (req, res) => {
  res.send("ok");
});

checkAppointmentDateWithBackoff();
cron.schedule("*/15 * * * *", checkAppointmentDateWithBackoff);
