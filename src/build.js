import fs from "fs";
import { parseCodeBlock, removeComments } from "./parser.js";
import path from "path";
import { createContentForGeneratedDefinition } from "./generator.js";

export async function buildFile(inFileName, outFileName, compilerInfo, term) {
    var inText = fs.readFileSync(inFileName).toString();
    var outText = await build(inText, compilerInfo, term);
    term.grey("| ");
    term.white("🔨 Built file successfully\n");
    fs.mkdirSync(path.dirname(outFileName), { recursive: true });
    fs.writeFileSync(outFileName, outText);
}

async function build(fileContent, compilerInfo, term) {
    fileContent = removeComments(fileContent);
    var parsed = parseCodeBlock(fileContent);
    term.grey("| ");
    term.white("📖 Parsed file successfully\n");

    // console.dir(parsed, {depth: 2000});
    parsed = await preProcess(parsed, term);

    var resultContent = "";
    resultContent += `//Compile result of Prototype Future Script ${compilerInfo.version}\nimport { Composed } from "../pjs-lib/Composition.js";\n`;
    resultContent += construct(parsed, 0);

    return resultContent;
}

async function preProcess(parsed, term) {
    var result = [];
    for (var element of parsed) {
        var newElement = element;
        if (element.type == "function") {
            newElement.content = await preProcess(element.content, term);
        } else if (element.type == "instruction" && (/^generated/).test(element.value)) {
            newElement = await createContentForGeneratedDefinition(element.value, term);
        }
        result.push(newElement);
    }
    return result;
}

function construct(parsed, indent) {
    var content = "";
    var space = "   ".repeat(indent);
    for (var element of parsed) {
        var type = element.type;
        if (type == "instruction") {
            content += space + transformInstruction(element.value) + "\n";
        } else if (type == "class") {
            var classComposition = getClassComposition(element.content, indent);

            content += `${space}${transformClassHeader(element.header)} {\n${constructClass(element, indent + 1, classComposition)}${space}}\n`; 
        } else if (type == "function") {
            content += `${space}${transformGenericFunctionHeader(element.header)} {\n${construct(element.content, indent +1)}${space}}\n`; 
        }
    }
    return content;
}

const classIsComposedRegex = /^composed /;
const argumentIsPropertyRegex = /^property /;
const nameOfArgumentSignature = /[a-zA-Z_][a-zA-Z_0-9]*$/;
const functionHeaderRegex = /^((expect)|(function) )?/;
const functionNameRegex = /([a-zA-Z_][a-zA-Z_0-9]*\.)?[a-zA-Z_][a-zA-Z_0-9]* *(?=\()/;
const argumentNameExtractRegex = /([a-zA-Z_][a-zA-Z_0-9]*)+ *(,|\))/g;
const classNameExtractRegex = /class [a-zA-Z_][a-zA-Z_0-9]*/;
const typedVariableInstruction = /[a-zA-Z_][<>a-zA-Z_0-9]*( *< *([a-zA-Z_][<>a-zA-Z_0-9]*(( *, *)[a-zA-Z_][<>a-zA-Z_0-9]*)*)? *>)? +(?=[[a-zA-Z_][a-zA-Z_0-9]* *=)/;

function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

function constructClass(element, indent, classComposition) {
    var space = "   ".repeat(indent);
    var innerSpace = "   ".repeat(indent+1);

    var isComposed = classIsComposedRegex.test(element.header);

    var constructorArguments = classComposition.constructorArguments;
    var hasProperties = false;
    var properties = [];
    var collectedArguments = [];
    
    for (var argument of constructorArguments) {
        var name = nameOfArgumentSignature.exec(argument)[0];
        if (argumentIsPropertyRegex.test(argument)) {
            properties.push(name);
            hasProperties = true;
        }
        collectedArguments.push(name);
    }
    
    var content = "";

    var constructorSignature = `constructor(${collectedArguments.join(", ")})`;

    var constructorContent = "";
    
    for (var property of properties) {
        constructorContent += `${innerSpace}this.${property} = ${property};\n`;

        var methodName = capitalizeFirstLetter(property);
        content += `\n${space}get${methodName}() {\n${innerSpace}return this.${property};\n${space}}\n`
            + `\n${space}set${methodName}(${property}) {\n${innerSpace}this.${property} = ${property};\n${space}}\n`;
    }

    if (isComposed) {
        var expectedNames = [];
        for (var method of classComposition.expectMethods) {
            expectedNames.push(`"${method.name}"`);
        }
        constructorContent += `${innerSpace}this._composed = { expectMethods: [${expectedNames.join(", ")}] }\n`
    }
    
    content += `${space}${constructorSignature} {\n${constructorContent}${space}}\n`;

    for (var method of classComposition.classMethods) {
        content += `${space}${addComposedArgument(method.signature)} {\n${method.body}${space}}\n`;
    }

    return content;
}

function addComposedArgument(signature) {
    var argumentsStart = signature.indexOf("(")+1;
    var remainder = signature.substr(argumentsStart);
    return signature.substr(0, argumentsStart) + "comp" + (remainder.trim() == ")" ? "" : ", ") + remainder
}

function transformInstruction(instruction) {
    var variableTyped = typedVariableInstruction.exec(instruction);
    if (variableTyped != undefined) {
        var prefix = variableTyped[0];
        if (prefix.trim() == "let" || prefix.trim() == "var") {
            return instruction;
        }
        return "var " + (instruction.substr(variableTyped.index + prefix.length));
    }
    return instruction;
}

function transformClassHeader(header) {
    return classNameExtractRegex.exec(header);
}

export function transformGenericFunctionHeader(header) {
    var argument = extractArugmentsOfFunctionSignature(header, true);
    var argumentNames = "(";
    
    while (true) {
        var result = argumentNameExtractRegex.exec(argument);
        if (result == null) break;
        if (argumentNames == "(") argumentNames += result[0];
        else argumentNames += " " + result[0];
    }
    argumentNameExtractRegex.lastIndex = 0;
    return header.substr(0, header.indexOf("(")) + (argumentNames == "(" ? "()" : argumentNames);
}

function extractArugmentsOfFunctionSignature(signature, inclusive) {
    var argStart = signature.indexOf("(");
    var from = argStart + (inclusive ? 0 : 1);
    var argument = signature.substr(from, (signature.length + (inclusive ? 0 : -1)) - from);
    return argument;
}

function getClassComposition(content, indent) {
    var composition = {
        expectMethods: [],
        constructorBody: "",
        constructorArguments: "",
        classMethods: []
    };
    for (var element of content) {
        if (element.type == "class") {
            throw "Classes inside a class definition are not allowed!";
        } else if (element.type == "function" || element.type == "instruction") {
            var header = element.type == "instruction" ? element.value : element.header;
            var functionSignature = functionHeaderRegex.exec(header)[0];
            var functionName = functionNameRegex.exec(header)[0];

            if (functionSignature == undefined) throw "Unknown signature " + functionSignature;
            if (functionSignature == "function") throw "Illegal signature " + functionSignature;
            
            if (element.type == "instruction" ) {
                if (functionSignature != "expect") throw "Illegal instruction " + header + " with signature '" + functionSignature + "'";

                if (functionSignature == "expect") {
                    composition.expectMethods.push({
                        name: functionName 
                    });
                    continue;
                }
            }
            if (functionName != "constructor") {
                composition.classMethods.push({
                    signature: transformGenericFunctionHeader(header),
                    body: construct(element.content, indent+2),
                });
            } else {
                composition.constructorArguments = extractArugmentsOfFunctionSignature(header, false).split(",").map(str => str.trim()).filter(str => str!="");
                composition.constructorBody = construct(element.content, indent+2);
            }
        }
    }
    return composition;
} 