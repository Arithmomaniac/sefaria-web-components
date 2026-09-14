import "./style.css";
import { startReaderWorkspace } from "./app.js";

const workspace = startReaderWorkspace(document);
void workspace.navigate("Micah 6:8", false);
