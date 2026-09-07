import "./style.css";
import { startControlledReader } from "./controlled-app.js";

const reader = startControlledReader(document);
void reader.navigate("Micah 6:8");
