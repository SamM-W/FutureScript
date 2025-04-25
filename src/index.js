import { compile } from "./compiler.js";
import fs from "fs";
import tk from "terminal-kit";
import process from "process";
import { getReviewOfCode } from "./review/generator.js";
import { createHash } from "node:crypto";
import path from "node:path";

const hasOutput = process.argv.indexOf("-noout") === -1;
const hasReview = process.argv.indexOf("-review") !== -1;
const isCompileAndRun = process.argv.indexOf("-car") !== -1;

const term = tk.terminal;

var startTime = Date.now();
if (hasOutput) {
    term.grey("⎲ ");
    term.white("Starting compiler");
}

var activeCompileTasks = {};
function startCompileForFile(inFileName, filePath, outPath) {
    activeCompileTasks[filePath] = compile(filePath, outPath, compilerInfo, term, hasOutput, hasReview).then(() => {
        delete activeCompileTasks[filePath];
        if (hasOutput) term.grey("| ").white("✅ Finished for ").bold.blue(inFileName + "\n");
        checkForFinished();
    }, finishedWithError);
}

function finishedWithError(err) {
    term.grey("⎳ ")
    term.red("Failed compile in " + (Date.now() - startTime) + "ms\n");
    term.red("Error:\n");

    console.error(err);
    process.exit(-1);
}

function checkForFinished() {
    if (Object.keys(activeCompileTasks).length == 0) {
        if (!hasOutput) return;
        term.grey("⎳ ");
        term.green("🎉 Finished compile in ").bold.blue((Date.now() - startTime)).green(" ms\n");
    }
}

function readCompilerInfo() {
    var compilerInfo = {};
    var compilerInfoRaw = fs.readFileSync("./compilerinfo.txt").toString().split("\n");

    for (var entry of compilerInfoRaw) {
        var split = entry.indexOf("=");
        var key = entry.substr(0, split);
        var value = entry.substr(split+1);
        compilerInfo[key] = value;
    }

    return compilerInfo;
}

const compilerInfo = readCompilerInfo();

if (hasOutput) {
    term.white(": ");
    term.bold.blue(compilerInfo.version + "\n");
}

var srcFileLocation = path.resolve(process.argv[2]);
var outFileLocation = path.resolve(process.argv[3]);

var srcLocationHash = createHash("sha256");
srcLocationHash.update(srcFileLocation);
const srcLocationDigest = srcLocationHash.copy().digest('hex');

const srcIsFolder = !fs.lstatSync(srcFileLocation).isFile();

if (srcIsFolder) {
    fs.rmSync(outFileLocation, { force: true, recursive: true });
    fs.mkdirSync(outFileLocation, { recursive: true });
    function compileDir(dir) {
        var files = fs.readdirSync(dir, { withFileTypes: true });
        
        for (var file of files) {
            const filename = file.path + path.sep + file.name;
            const outFileName = outFileLocation + path.sep + filename.substr(srcFileLocation.length);
            if (file.isDirectory()) {
                compileDir(filename);
            } else {
                if (file.name.endsWith(".pfs")) {
                    startCompileForFile(file.name, filename, outFileName)
                }
            }
        }
    }
    compileDir(srcFileLocation);
} else {}