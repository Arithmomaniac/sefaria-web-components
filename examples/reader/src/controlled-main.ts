import "./style.css";
import { startControlledReader } from "./controlled-app.js";
import { initialReaderReference } from "./initial-reference.js";

const initialRef = initialReaderReference(location.search);
const reader = startControlledReader(document);
void reader.navigate(initialRef);
