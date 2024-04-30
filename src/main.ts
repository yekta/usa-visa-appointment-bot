import { bookEarlierAppointment } from "@/appointment.ts";
import { currentAppointmentDate, minAppointmentDate } from "@/constants";
import express from "express";
const app = express();

app.get("/health", (req, res) => {
  res.send("ok");
});

bookEarlierAppointment({
  currentDate: currentAppointmentDate,
  minDate: minAppointmentDate,
});
