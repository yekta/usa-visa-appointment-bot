import { checkAppointmentDate } from "@/appointment.ts";
import express from "express";
const app = express();

app.get("/health", (req, res) => {
  res.send("ok");
});

checkAppointmentDate();
