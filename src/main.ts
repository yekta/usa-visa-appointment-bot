import "dotenv/config";
import { bookEarlierAppointment } from "@/appointment.ts";
import {
  currentAppointmentDate,
  maxAppointmentDate,
  minAppointmentDate,
} from "@/constants";
import express from "express";
const app = express();

app.get("/health", (req, res) => {
  res.send("ok");
});

bookEarlierAppointment({
  currentDate: currentAppointmentDate,
  maxDate: maxAppointmentDate,
  minDate: minAppointmentDate,
});
