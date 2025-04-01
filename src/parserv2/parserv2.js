import fs from "fs";
import { tokenize } from "./tokenizer.js";

export async function parseV2(inFileName) {
    var inText = fs.readFileSync(inFileName).toString();
    var tokenized = tokenize(inText);
}