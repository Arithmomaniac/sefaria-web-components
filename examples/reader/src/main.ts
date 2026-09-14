import "./style.css";
import { startReaderWorkspace } from "./app.js";
import { initialReaderReference } from "./initial-reference.js";

const initialRef = initialReaderReference(location.search);
const workspace = startReaderWorkspace(document);
void workspace.navigate(initialRef, false);
