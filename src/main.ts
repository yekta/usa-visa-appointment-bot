import "dotenv/config";
import { bookEarlierAppointment } from "@/appointment.ts";
import {
  currentAppointmentDate,
  maxAppointmentDate,
  minAppointmentDate,
} from "@/constants";
import express from "express";
import { consoleLog } from "@/utils";
const app = express();

app.get("/", (req, res) => {
  res.send("ok");
});
app.get("/health", (req, res) => {
  res.send("ok");
});

consoleLog("Version is: 1.0.1");

bookEarlierAppointment({
  currentDate: currentAppointmentDate,
  maxDate: maxAppointmentDate,
  minDate: minAppointmentDate,
});
