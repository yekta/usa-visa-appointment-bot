import "dotenv/config";
import { bookEarlierAppointment } from "@/appointment.ts";
import {
  botVersion,
  currentAppointmentDate,
  maxAppointmentDate,
  minAppointmentDate,
  minio,
} from "@/constants";
import express from "express";
import { consoleLog } from "@/utils";
import { continuouslySaveLogsToMinio } from "@/minio";
const app = express();

app.get("/", (req, res) => {
  res.send("ok");
});
app.get("/health", (req, res) => {
  res.send("ok");
});

consoleLog(`Bot version: ${botVersion}`);

bookEarlierAppointment({
  currentDate: currentAppointmentDate,
  maxDate: maxAppointmentDate,
  minDate: minAppointmentDate,
});

if (minio) {
  continuouslySaveLogsToMinio();
}
