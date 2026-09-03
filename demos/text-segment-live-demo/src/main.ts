import "../../live-demo.css";

import { startTextSegmentLiveDemo } from "./app.js";

const demo = startTextSegmentLiveDemo(document);
void demo.loadCurrentRequest();
