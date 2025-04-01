import { buildFile } from "./build.js";
import { parseV2 } from "./parserv2/parserv2.js";
import fs from "fs";
import tk from "terminal-kit";
import process from "process";

const term = tk.terminal;
var startTime = Date.now();
term.grey("⎲ ");
term.white("Starting compiler");

var srcFileLocation = process.argv[2];
var buildFileLocation = "./usage/build/" + process.argv[3];

var compilerInfoRaw = fs.readFileSync("./compilerinfo.txt").toString().split("\n");
var compilerInfo = {};
for (var entry of compilerInfoRaw) {
    var split = entry.indexOf("=");
    var key = entry.substr(0, split);
    var value = entry.substr(split+1);
    compilerInfo[key] = value;
}

term.white(": ")
term.bold.blue(compilerInfo.version + "\n");

// buildFile(srcFileLocation, buildFileLocation, compilerInfo, term).then(() => {
//     term.grey("⎳ ");
//     term.green("✅ Finished compile in ").bold.blue((Date.now() - startTime)).green(" ms\n");
// }, (err) => {
//     term.grey("⎳ ")
//     term.red("Failed compile in " + (Date.now() - startTime) + "ms\n");
//     term.red("Error:\n");

//     console.error(err);
//     process.exit(-1);
// });

parseV2(srcFileLocation, buildFileLocation, compilerInfo, term).then(() => {
    term.grey("⎳ ");
    term.green("✅ Finished compile in ").bold.blue((Date.now() - startTime)).green(" ms\n");
}, (err) => {
    term.grey("⎳ ")
    term.red("Failed compile in " + (Date.now() - startTime) + "ms\n");
    term.red("Error:\n");

    console.error(err);
    process.exit(-1);
});