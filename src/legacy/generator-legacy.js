import { transformGenericFunctionHeader } from "./build.js";
import { parseCodeBlock, removeComments } from "./parser.js";
import fs from "fs";
import z from "zod";
import process from "node:process";
import { openrouter } from '@openrouter/ai-sdk-provider';

import { generateObject } from 'ai';

//TODO: hide
process.env.OPENROUTER_API_KEY = "sk-or-v1-d2bd53b19f1123448a61d1ecdf033c7b429e12322d4fc4db5aad1ffb2b608e48a88";

function readCacheFromFile() {
    generationsCache = JSON.parse(fs.readFileSync("./generation_cache.json")).generated;
}

function writeCacheToFile() {
    fs.writeFileSync("./generation_cache.json", JSON.stringify({ generated: generationsCache }));
}

var generationsCache = [];
readCacheFromFile();

const codeGenerationSchema = z
    .object({
        "function_description": z.string().nonempty(), //Hint during generation
        "function_header": z.string().nonempty(),
        "open_brace": z.string("{"), //Implicitly tell ai not to include these
        "method_body": z.string().nonempty(),
        "close_brace": z.string("}"),
    })
    .describe("Result of code generation");

function getExistingGenerationForSignature(header, usage) {
    for (var content of generationsCache) {
        if (content.header == header && content.usage == content.usage) {
            return content;
        }
    }
    return undefined;
}

const getJsCodeBlockFromResponse = /(?<=\`\`\`javascript)[^\`]*(?=\`\`\`)/;

export async function createContentForGeneratedDefinition(definition, term) {
    var colonSplit = definition.indexOf(":");

    var header = definition.substr(0, colonSplit).trim();
    header = header.substr("generated".length).trim(); // Remove generated keyword
    header = transformGenericFunctionHeader(header); // Convert to normal header

    var usage = definition.substr(colonSplit + 1).trim();
    usage = usage.substr(0, usage.length - 1).trim();
    usage = usage.substr(1, usage.length - 2).trim();

    var cacheResult = getExistingGenerationForSignature(header, usage);
    var newContent = "missing!";
    if (cacheResult) {
        term.grey("| ");
        term.white("🗝️  Retrived cache result of a previous generation\n");
        newContent = cacheResult.content;
    } else {
        term.grey("| ");
        term.white(`❕ Invoking AI generator for new method, header '${header}'\n`);

        var prompt = `[Javascript] Write code for a function \`\`\`${header} {\n\t//...code here\n}\`\`\` its descriotion is ${usage}`;
        
        term.grey("| ");
        term.white("🏗️ Generating response...\n");

        var generationStartTime = Date.now();
        
        const generationResult = await generateObject({
            model: openrouter('google/gemini-2.0-flash-lite-preview-02-05:free'),
            prompt: prompt,
            schema: codeGenerationSchema
        });

        var generationTime = Date.now() - generationStartTime;
        term.grey("| ").white("⌚ Generated body in ").blue(generationTime).white(" ms\n");

        var result = generationResult.object;
        var codeBody = (result.method_body);

        newContent = codeBody;

        generationsCache.push({
            header: header,
            usage: usage,
            content: newContent
        });
        writeCacheToFile();
    }

    return {
        type: "function",
        header: header,
        content: parseCodeBlock(newContent)
    };
}